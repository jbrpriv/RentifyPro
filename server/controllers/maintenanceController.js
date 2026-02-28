const MaintenanceRequest = require('../models/MaintenanceRequest');
const Property = require('../models/Property');
const Agreement = require('../models/Agreement');
const notificationQueue = require('../queues/notificationQueue');

// @desc    Create a new maintenance request
// @route   POST /api/maintenance
// @access  Private (Tenant)
const createRequest = async (req, res) => {
  try {
    const { propertyId, title, description, priority, category, images } = req.body;

    // Verify property exists
    const property = await Property.findById(propertyId).populate('landlord', 'name email phoneNumber smsOptIn');
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Verify this tenant has an active lease on this property
    const activeAgreement = await Agreement.findOne({
      property: propertyId,
      tenant: req.user._id,
      status: 'active',
    });

    if (!activeAgreement) {
      return res.status(403).json({ message: 'You do not have an active lease on this property' });
    }

    const request = await MaintenanceRequest.create({
      property: propertyId,
      tenant: req.user._id,
      landlord: property.landlord._id,
      assignedTo: property.managedBy || null,
      title,
      description,
      priority: priority || 'medium',
      category: category || 'other',
      images: images || [],
      statusHistory: [
        {
          status: 'open',
          changedBy: req.user._id,
          note: 'Request submitted by tenant',
        },
      ],
    });

    const populated = await MaintenanceRequest.findById(request._id)
      .populate('tenant', 'name email')
      .populate('landlord', 'name email')
      .populate('property', 'title address');

    // Notify landlord / PM via queue
    const notifyUser = property.managedBy || property.landlord;
    if (notifyUser) {
      await notificationQueue.add(
        `maintenance-new-${request._id}`,
        {
          type: 'MAINTENANCE_RECEIVED',
          data: {
            landlordEmail: property.landlord.email,
            landlordPhone: property.landlord.phoneNumber,
            landlordSmsOptIn: property.landlord.smsOptIn,
            tenantName: req.user.name,
            propertyTitle: property.title,
            requestTitle: title,
          },
        },
        { jobId: `maintenance-new-${request._id}` }
      );
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get maintenance requests (role-aware)
// @route   GET /api/maintenance
// @access  Private
const getRequests = async (req, res) => {
  try {
    const { status, priority, propertyId, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Role-based scoping
    const { role, _id } = req.user;
    if (role === 'tenant') {
      filter.tenant = _id;
    } else if (role === 'landlord') {
      filter.landlord = _id;
    } else if (role === 'property_manager') {
      filter.assignedTo = _id;
    }
    // admin sees all — no additional filter

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (propertyId) filter.property = propertyId;

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      MaintenanceRequest.find(filter)
        .populate('tenant', 'name email phoneNumber')
        .populate('landlord', 'name email')
        .populate('property', 'title address')
        .populate('assignedTo', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      MaintenanceRequest.countDocuments(filter),
    ]);

    res.json({
      requests,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single maintenance request by ID
// @route   GET /api/maintenance/:id
// @access  Private
const getRequestById = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id)
      .populate('tenant', 'name email phoneNumber')
      .populate('landlord', 'name email')
      .populate('property', 'title address')
      .populate('assignedTo', 'name email')
      .populate('statusHistory.changedBy', 'name');

    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });

    // Authorization check
    const userId = req.user._id.toString();
    const isOwner =
      request.tenant._id.toString() === userId ||
      request.landlord._id.toString() === userId ||
      request.assignedTo?._id.toString() === userId ||
      req.user.role === 'admin';

    if (!isOwner) {
      return res.status(403).json({ message: 'Not authorized to view this request' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update maintenance request (status, notes, assignedTo)
// @route   PUT /api/maintenance/:id
// @access  Private (Landlord, Property Manager, Admin)
const updateRequest = async (req, res) => {
  try {
    const { status, resolutionNotes, assignedTo, note } = req.body;

    const request = await MaintenanceRequest.findById(req.params.id)
      .populate('tenant', 'name email phoneNumber smsOptIn');

    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });

    const oldStatus = request.status;

    if (status) {
      request.status = status;

      // Push to status history
      request.statusHistory.push({
        status,
        changedBy: req.user._id,
        note: note || '',
      });

      // Set resolvedAt timestamp if resolved
      if (status === 'resolved' || status === 'closed') {
        request.resolvedAt = new Date();
      }
    }

    if (resolutionNotes !== undefined) {
      request.resolutionNotes = resolutionNotes;
    }

    if (assignedTo !== undefined) {
      request.assignedTo = assignedTo;
    }

    await request.save();

    // Notify tenant of status change
    if (status && status !== oldStatus && request.tenant) {
      await notificationQueue.add(
        `maintenance-update-${request._id}-${status}`,
        {
          type: 'MAINTENANCE_UPDATE',
          data: {
            tenantEmail: request.tenant.email,
            tenantPhone: request.tenant.phoneNumber,
            tenantName: request.tenant.name,
            tenantSmsOptIn: request.tenant.smsOptIn,
            requestTitle: request.title,
            newStatus: status,
          },
        },
        { jobId: `maintenance-update-${request._id}-${status}` }
      );
    }

    const updated = await MaintenanceRequest.findById(request._id)
      .populate('tenant', 'name email phoneNumber')
      .populate('landlord', 'name email')
      .populate('property', 'title address')
      .populate('assignedTo', 'name email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a maintenance request (tenant can delete their own open requests)
// @route   DELETE /api/maintenance/:id
// @access  Private
const deleteRequest = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });

    const userId = req.user._id.toString();
    const isTenantOwner = request.tenant.toString() === userId && request.status === 'open';
    const isAdmin = req.user.role === 'admin';

    if (!isTenantOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this request' });
    }

    await request.deleteOne();
    res.json({ message: 'Maintenance request deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
};
