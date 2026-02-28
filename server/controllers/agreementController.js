const Agreement = require('../models/Agreement');
const Property = require('../models/Property');
const User = require('../models/User');
const { generateAgreementPDF } = require('../utils/pdfGenerator');
const { sendEmail } = require('../utils/emailService');

// @desc    Create a new rental agreement
// @route   POST /api/agreements
// @access  Private (Landlord)
const createAgreement = async (req, res) => {
  try {
    const { tenantId, propertyId, startDate, endDate, rentAmount, depositAmount } = req.body;

    // 1. Verify Property belongs to Landlord
    const property = await Property.findById(propertyId);
    if (!property || property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to lease this property' });
    }

    // 2. Create Agreement Record
    const agreement = await Agreement.create({
      landlord: req.user._id,
      tenant: tenantId,
      property: propertyId,
      term: { startDate, endDate },
      financials: { rentAmount, depositAmount },
      auditLog: [{
        action: 'CREATED',
        actor: req.user._id,
        ipAddress: req.ip,
        details: 'Initial Draft Created'
      }]
    });

    const populated = await Agreement.findById(agreement._id)
      .populate('landlord', 'name')
      .populate('tenant', 'name email')
      .populate('property', 'title');

    sendEmail(
      populated.tenant.email,
      'agreementCreated',
      populated.tenant.name,
      populated.landlord.name,
      populated.property.title,
      agreement.term.startDate,
      agreement.term.endDate,
      agreement.financials.rentAmount
    );

    res.status(201).json(agreement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Sign an agreement
// @route   PUT /api/agreements/:id/sign
// @access  Private (Landlord or Tenant)
const signAgreement = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id)
      .populate('landlord', 'name email')
      .populate('tenant', 'name email')
      .populate('property', 'title');

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    const userId = req.user._id.toString();
    const isLandlord = agreement.landlord._id.toString() === userId;
    const isTenant = agreement.tenant._id.toString() === userId;

    if (!isLandlord && !isTenant) {
      return res.status(403).json({ message: 'Not authorized to sign this agreement' });
    }

    // Prevent double signing
    if (isLandlord && agreement.signatures.landlord.signed) {
      return res.status(400).json({ message: 'You have already signed this agreement' });
    }
    if (isTenant && agreement.signatures.tenant.signed) {
      return res.status(400).json({ message: 'You have already signed this agreement' });
    }

    // Stamp the signature
    const signatureData = {
      signed: true,
      signedAt: new Date(),
      ipAddress: req.ip,
    };

    if (isLandlord) {
      agreement.signatures.landlord = signatureData;
      agreement.status = 'sent'; // Landlord signed first, waiting for tenant
    }

    if (isTenant) {
      agreement.signatures.tenant = signatureData;
    }

    // If BOTH have signed → wait for payment (status: 'signed')
    const landlordSigned = isLandlord ? true : agreement.signatures.landlord.signed;
    const tenantSigned = isTenant ? true : agreement.signatures.tenant.signed;

    if (landlordSigned && tenantSigned) {
      agreement.status = 'signed'; // Awaiting Stripe payment to become active

      // Notify landlord that tenant has signed
      sendEmail(
        agreement.landlord.email,
        'agreementSigned',
        agreement.landlord.name,
        agreement.tenant.name,
        agreement.property.title
      );
      
      agreement.auditLog.push({
        action: 'FULLY_SIGNED',
        actor: req.user._id,
        ipAddress: req.ip,
        details: 'Both parties signed. Awaiting security deposit payment to activate.',
      });
    } else {
      agreement.auditLog.push({
        action: isLandlord ? 'SIGNED_LANDLORD' : 'SIGNED_TENANT',
        actor: req.user._id,
        ipAddress: req.ip,
        details: `Signed by ${req.user.name} at ${new Date().toISOString()}`,
      });
    }

    await agreement.save();

    res.json({
      message: 'Agreement signed successfully',
      status: agreement.status,
      signatures: agreement.signatures,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Agreements
// @route   GET /api/agreements
// @access  Private (Landlord or Tenant)
const getAgreements = async (req, res) => {
  try {
    // Find agreements where the user is EITHER the landlord OR the tenant
    const agreements = await Agreement.find({
      $or: [{ landlord: req.user._id }, { tenant: req.user._id }]
    })
    .populate('property', 'title address')
    .populate('landlord', 'name email')
    .populate('tenant', 'name email')
    .sort('-createdAt');

    res.json(agreements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate PDF for an Agreement
// @route   GET /api/agreements/:id/pdf
// @access  Private (Landlord or Tenant)
const downloadAgreementPDF = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id)
      .populate('landlord', 'name email')
      .populate('tenant', 'name email')
      .populate('property');

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    // Security Check: Only involved parties or admin can download
    const isAdmin = req.user.role === 'admin';
    if (
      !isAdmin &&
      agreement.landlord._id.toString() !== req.user._id.toString() &&
      agreement.tenant._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Log the download action
    agreement.auditLog.push({
      action: 'PDF_DOWNLOADED',
      actor: req.user._id,
      ipAddress: req.ip,
      details: 'PDF Document Generated'
    });
    await agreement.save();

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=agreement-${agreement._id}.pdf`);

    // Generate PDF
    generateAgreementPDF(agreement, agreement.landlord, agreement.tenant, agreement.property, res);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ─── RENEWAL WORKFLOW ─────────────────────────────────────────────────────────

// @desc   Propose a lease renewal (Landlord initiates)
// @route  POST /api/agreements/:id/renew
// @access Private (Landlord)
const proposeRenewal = async (req, res) => {
  try {
    const { newEndDate, newRentAmount, notes } = req.body;
    const agreement = await Agreement.findById(req.params.id)
      .populate('tenant', 'name email')
      .populate('property', 'title');

    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });
    if (agreement.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the landlord can propose renewal' });
    }
    if (!['active', 'expired'].includes(agreement.status)) {
      return res.status(400).json({ message: 'Only active or expired agreements can be renewed' });
    }

    agreement.renewalProposal = {
      proposedBy:    req.user._id,
      newEndDate:    newEndDate    || null,
      newRentAmount: newRentAmount || agreement.financials.rentAmount,
      notes:         notes        || '',
      status:        'pending',
      proposedAt:    new Date(),
    };

    agreement.auditLog.push({
      action:    'RENEWAL_PROPOSED',
      actor:     req.user._id,
      ipAddress: req.ip,
      details:   `Renewal proposed until ${newEndDate}. New rent: Rs. ${newRentAmount || agreement.financials.rentAmount}`,
    });

    await agreement.save();

    // Notify tenant
    const { sendEmail } = require('../utils/emailService');
    await sendEmail(
      agreement.tenant.email,
      'renewalProposed',
      agreement.tenant.name,
      agreement.property.title,
      newEndDate,
      newRentAmount || agreement.financials.rentAmount
    );

    res.json({ message: 'Renewal proposal sent to tenant', agreement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Tenant responds to renewal proposal
// @route  PUT /api/agreements/:id/renew/respond
// @access Private (Tenant)
const respondToRenewal = async (req, res) => {
  try {
    const { accept } = req.body;
    const agreement = await Agreement.findById(req.params.id)
      .populate('landlord', 'name email')
      .populate('property', 'title');

    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });
    if (agreement.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the tenant can respond to renewal' });
    }
    if (!agreement.renewalProposal || agreement.renewalProposal.status !== 'pending') {
      return res.status(400).json({ message: 'No pending renewal proposal found' });
    }

    if (accept) {
      const proposal = agreement.renewalProposal;

      // Apply renewal: extend term, update rent if changed
      agreement.term.endDate         = proposal.newEndDate || agreement.term.endDate;
      agreement.financials.rentAmount = proposal.newRentAmount || agreement.financials.rentAmount;
      agreement.status               = 'active';
      agreement.renewalProposal.status = 'accepted';

      agreement.auditLog.push({
        action: 'RENEWAL_ACCEPTED',
        actor:  req.user._id,
        details: `Tenant accepted renewal until ${agreement.term.endDate}`,
      });
    } else {
      agreement.renewalProposal.status = 'rejected';
      agreement.auditLog.push({
        action: 'RENEWAL_REJECTED',
        actor:  req.user._id,
        details: 'Tenant declined renewal proposal',
      });
    }

    await agreement.save();
    res.json({ message: accept ? 'Renewal accepted — lease extended!' : 'Renewal declined', agreement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createAgreement, getAgreements, downloadAgreementPDF, signAgreement, proposeRenewal, respondToRenewal };