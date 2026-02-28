const Property = require('../models/Property');
const Application = require('../models/Application');
const Agreement = require('../models/Agreement');
const { sendEmail } = require('../utils/emailService');

// @desc    Get all public listings (no auth required)
// @route   GET /api/listings
const getPublicListings = async (req, res) => {
  try {
    const { city, type, minRent, maxRent } = req.query;

    const filter = { isListed: true, status: 'vacant' };

    if (city) filter['address.city'] = { $regex: new RegExp(city, 'i') };
    if (type) filter.type = type;
    if (minRent || maxRent) {
      filter['financials.monthlyRent'] = {};
      if (minRent) filter['financials.monthlyRent'].$gte = Number(minRent);
      if (maxRent) filter['financials.monthlyRent'].$lte = Number(maxRent);
    }

    const listings = await Property.find(filter)
      .populate('landlord', 'name')
      .sort('-createdAt');

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single listing detail
// @route   GET /api/listings/:id
const getListingById = async (req, res) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      isListed: true,
    }).populate('landlord', 'name');

    if (!property) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a rental application
// @route   POST /api/listings/:id/apply
// @access  Private (Tenant)
const applyForListing = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('landlord', 'name email');

    if (!property || !property.isListed) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (property.status !== 'vacant') {
      return res.status(400).json({ message: 'This property is no longer available' });
    }

    // Prevent landlord from applying to own property
    if (property.landlord._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot apply to your own property' });
    }

    // Check if user already applied via the embedded array
    const hasApplied = property.applications.some(
      (app) => app.tenant.toString() === req.user._id.toString()
    );

    if (hasApplied) {
      return res.status(400).json({ message: 'You have already applied for this property' });
    }

    // 1. Create the standalone Application record (for historical tracking)
    const application = await Application.create({
      property: property._id,
      landlord: property.landlord._id,
      tenant: req.user._id,
      message: req.body.message || '',
      applicantDetails: {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phoneNumber,
      },
    });

    // 2. ALSO push to the Property's embedded array (so the frontend works smoothly)
    property.applications.push({
      tenant: req.user._id,
      message: req.body.message || '',
      status: 'pending',
      createdAt: new Date()
    });
    await property.save();

    // Notify landlord of new application
    sendEmail(
      property.landlord.email,
      'newApplication',
      property.landlord.name,
      req.user.name,
      property.title
    );

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already applied for this property' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all applications for landlord's properties
// @route   GET /api/listings/applications
// @access  Private (Landlord)
const getLandlordApplications = async (req, res) => {
  try {
    const applications = await Application.find({ landlord: req.user._id })
      .populate('tenant', 'name email phoneNumber')
      .populate('property', 'title address financials')
      .sort('-createdAt');

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept or reject an application
// @route   PUT /api/listings/applications/:id
// @access  Private (Landlord)
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body; // Removed startDate/endDate from req.body, generating automatically

    const application = await Application.findById(req.params.id)
      .populate('tenant', 'name email')
      // Ensure we populate the leaseTerms and financial rules we need
      .populate('property', 'title financials leaseTerms')
      .populate('landlord', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.landlord._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    application.status = status;

    if (status === 'accepted') {
      // 1. Calculate dates based on Property's default duration
      const durationMonths = application.property.leaseTerms?.defaultDurationMonths || 12;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + durationMonths);

      // 2. Auto-create the agreement WITH Late Fees & Rules
      const agreement = await Agreement.create({
        landlord: req.user._id,
        tenant: application.tenant._id,
        property: application.property._id,
        term: {
          startDate: startDate,
          endDate: endDate,
          durationMonths: durationMonths,
        },
        financials: {
          rentAmount: application.property.financials.monthlyRent,
          depositAmount: application.property.financials.securityDeposit,
          // Pulling the new fields from the Property model
          lateFeeAmount: application.property.financials.lateFeeAmount || 0,
          lateFeeGracePeriodDays: application.property.financials.lateFeeGracePeriodDays || 5,
        },
        auditLog: [{
          action: 'CREATED_FROM_APPLICATION',
          actor: req.user._id,
          details: `Auto-created from application ${application._id}`,
        }],
      });

      application.agreement = agreement._id;

      // 3. Update the embedded status in the Property array
      const property = await Property.findById(application.property._id);
      if (property) {
        const embeddedApp = property.applications.find(a => a.tenant.toString() === application.tenant._id.toString());
        if (embeddedApp) {
          embeddedApp.status = 'accepted';
          await property.save();
        }
      }

      // Notify tenant of acceptance
      sendEmail(
        application.tenant.email,
        'applicationAccepted',
        application.tenant.name,
        application.property.title
      );
    }

    if (status === 'rejected') {
      // Update embedded status
      const property = await Property.findById(application.property._id);
      if (property) {
        const embeddedApp = property.applications.find(a => a.tenant.toString() === application.tenant._id.toString());
        if (embeddedApp) {
          embeddedApp.status = 'rejected';
          await property.save();
        }
      }

      // Notify tenant of rejection
      sendEmail(
        application.tenant.email,
        'applicationRejected',
        application.tenant.name,
        application.property.title
      );
    }

    await application.save();
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle listing published status
// @route   PUT /api/listings/:id/publish
// @access  Private (Landlord)
const toggleListingPublish = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property || property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    property.isListed = !property.isListed;
    if (req.body.listingDescription) {
      property.listingDescription = req.body.listingDescription;
    }

    await property.save();

    res.json({
      message: property.isListed ? 'Property is now publicly listed' : 'Property unlisted',
      isListed: property.isListed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicListings,
  getListingById,
  applyForListing,
  getLandlordApplications,
  updateApplicationStatus,
  toggleListingPublish,
};