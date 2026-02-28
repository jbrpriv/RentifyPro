const Property = require('../models/Property');
const { validationResult } = require('express-validator');

// @desc    Create a new property
// @route   POST /api/properties
// @access  Private (Landlord)
const createProperty = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  try {
    const property = await Property.create({
      landlord: req.user._id,
      title: req.body.title,
      type: req.body.type,
      address: req.body.address,
      specs: req.body.specs,
      financials: req.body.financials,
      leaseTerms: req.body.leaseTerms,
      amenities: req.body.amenities || [],
      listingDescription: req.body.listingDescription,
      images: req.body.images || [],
      isListed: false,
    });
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get properties for the logged-in user
//          - Landlord: sees their own properties
//          - Property Manager: sees properties where managedBy === their ID
//          - Admin: sees all
// @route   GET /api/properties
// @access  Private
const getProperties = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'landlord') {
      filter.landlord = req.user._id;
    } else if (req.user.role === 'property_manager') {
      filter.managedBy = req.user._id;
    }
    // Admin: no filter — sees all

    const properties = await Property.find(filter)
      .populate('landlord', 'name email')
      .populate('managedBy', 'name email')
      .populate('pmInvitation.invitedManager', 'name email')
      .sort('-createdAt');

    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single property by ID
// @route   GET /api/properties/:id
// @access  Private (Owner, assigned PM, or Admin)
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('landlord', 'name email')
      .populate('managedBy', 'name email');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const userId = req.user._id.toString();
    const isOwner = property.landlord._id.toString() === userId;
    const isPM = property.managedBy?._id?.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isPM && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a property
// @route   PUT /api/properties/:id
// @access  Private (Landlord owner or Admin)
const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const isOwner = property.landlord.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit this property' });
    }

    const allowedFields = [
      'title', 'address', 'type', 'specs', 'financials',
      'leaseTerms', 'amenities', 'listingDescription', 'images', 'status',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        property[field] = req.body[field];
      }
    });

    await property.save();
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Invite a property manager (creates invitation, PM must accept)
// @route   POST /api/properties/:id/invite-manager
// @access  Private (Landlord owner or Admin)
const inviteManager = async (req, res) => {
  try {
    const { managerId } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const isOwner = property.landlord.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    const User = require('../models/User');
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'property_manager') {
      return res.status(400).json({ message: 'User is not a registered property manager' });
    }

    property.pmInvitation = { invitedManager: managerId, status: 'pending', invitedAt: new Date() };
    await property.save();

    const landlord = await User.findById(req.user._id);
    const { sendEmail } = require('../utils/emailService');
    await sendEmail(manager.email, 'pmInvitation', manager.name, landlord.name, property.title, property._id);

    res.json({ message: 'Invitation sent to property manager', property });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    PM responds to invitation (accept/decline)
// @route   PUT /api/properties/:id/respond-invitation
// @access  Private (PropertyManager)
const respondToInvitation = async (req, res) => {
  try {
    const { accept } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const userId = req.user._id.toString();
    const invitedId = property.pmInvitation?.invitedManager?.toString();
    if (invitedId !== userId) return res.status(403).json({ message: 'This invitation is not for you' });
    if (property.pmInvitation?.status !== 'pending') return res.status(400).json({ message: 'No pending invitation' });

    if (accept) {
      property.managedBy = req.user._id;
      property.pmInvitation.status = 'accepted';
    } else {
      property.pmInvitation.status = 'declined';
    }
    await property.save();

    const populated = await Property.findById(property._id).populate('managedBy', 'name email').populate('pmInvitation.invitedManager', 'name email');
    res.json({ message: accept ? 'Invitation accepted — property assigned to you' : 'Invitation declined', property: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending PM invitations for logged-in PM
// @route   GET /api/properties/my-invitations
// @access  Private (PropertyManager)
const getMyInvitations = async (req, res) => {
  try {
    const properties = await Property.find({
      'pmInvitation.invitedManager': req.user._id,
      'pmInvitation.status': 'pending',
    }).populate('landlord', 'name email');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign a property manager to a property (kept for backward compat / admin use)
// @route   PUT /api/properties/:id/assign-manager
// @access  Private (Admin only)
const assignManager = async (req, res) => {
  try {
    const { managerId } = req.body;

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can directly assign managers. Use invite-manager instead.' });
    }

    if (managerId) {
      const manager = await require('../models/User').findById(managerId);
      if (!manager || manager.role !== 'property_manager') {
        return res.status(400).json({ message: 'User is not a registered property manager' });
      }
      property.managedBy = managerId;
    } else {
      property.managedBy = null;
    }

    await property.save();
    const populated = await Property.findById(property._id).populate('managedBy', 'name email');

    res.json({
      message: managerId ? 'Property manager assigned' : 'Property manager removed',
      property: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  assignManager,
  inviteManager,
  respondToInvitation,
  getMyInvitations,
};