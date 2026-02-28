const Application = require('../models/Application');
const Property    = require('../models/Property');

// ─── Helper: build a role-aware filter ───────────────────────────────────────
const buildFilter = (user, extraFilter = {}) => {
  const base =
    user.role === 'tenant'
      ? { tenant: user._id }
      : user.role === 'landlord'
      ? { landlord: user._id }
      : user.role === 'property_manager'
      ? {} // PM gets filtered by property in the query
      : {};          // admin — no base filter

  return { ...base, ...extraFilter };
};

// @desc    Get applications
//          Tenant  → their own applications
//          Landlord / PM → incoming applications on their properties
//          Admin   → all applications
// @route   GET /api/applications
// @access  Private
const getApplications = async (req, res) => {
  try {
    const { status, propertyId, page = 1, limit = 20 } = req.query;
    const filter = buildFilter(req.user);

    if (status) filter.status = status;

    // PM: restrict to properties they manage
    if (req.user.role === 'property_manager') {
      const managed = await Property.find({ managedBy: req.user._id }).select('_id');
      filter.property = { $in: managed.map((p) => p._id) };
    }

    if (propertyId) filter.property = propertyId;

    const skip = (Number(page) - 1) * Number(limit);

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('tenant',   'name email phoneNumber profilePhoto')
        .populate('landlord', 'name email')
        .populate('property', 'title address financials status')
        .populate('agreement', 'status term financials')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(filter),
    ]);

    res.json({
      applications,
      pagination: {
        total,
        page:  Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single application by ID
// @route   GET /api/applications/:id
// @access  Private — must be the tenant, landlord, or admin
const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('tenant',   'name email phoneNumber profilePhoto')
      .populate('landlord', 'name email phoneNumber')
      .populate('property', 'title address financials status images')
      .populate('agreement', 'status term financials signatures documentUrl');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Access control — only the parties or admin may view
    const uid = req.user._id.toString();
    const isParty =
      application.tenant._id.toString()   === uid ||
      application.landlord._id.toString() === uid ||
      req.user.role === 'admin';

    if (!isParty) {
      return res.status(403).json({ message: 'Not authorised to view this application' });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Tenant withdraws a pending application
// @route   DELETE /api/applications/:id
// @access  Private (Tenant only — and only their own pending applications)
const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Only the tenant who filed it can withdraw
    if (application.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    // Can only withdraw while still pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot withdraw — application is already ${application.status}`,
      });
    }

    // Remove the embedded entry from the Property's applications array too
    await Property.findByIdAndUpdate(application.property, {
      $pull: { applications: { tenant: req.user._id } },
    });

    await application.deleteOne();

    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getApplications, getApplicationById, withdrawApplication };