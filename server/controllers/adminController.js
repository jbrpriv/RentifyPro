const User = require('../models/User');
const Property = require('../models/Property');
const Agreement = require('../models/Agreement');
const Payment = require('../models/Payment');
const Clause = require('../models/Clause');
const MaintenanceRequest = require('../models/MaintenanceRequest');

// @desc    Get platform-wide stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProperties,
      totalAgreements,
      activeAgreements,
      pendingAgreements,
      expiredAgreements,
      totalPayments,
      openMaintenanceRequests,
    ] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments(),
      Agreement.countDocuments(),
      Agreement.countDocuments({ status: 'active' }),
      Agreement.countDocuments({ status: { $in: ['draft', 'sent', 'signed'] } }),
      Agreement.countDocuments({ status: 'expired' }),
      Payment.countDocuments({ status: 'paid' }),
      MaintenanceRequest.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    ]);

    // Total platform revenue from all paid payments
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    // Agreements created per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const agreementsByMonth = await Agreement.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      totals: {
        users: totalUsers,
        properties: totalProperties,
        agreements: totalAgreements,
        activeAgreements,
        pendingAgreements,
        expiredAgreements,
        paidPayments: totalPayments,
        openMaintenanceRequests,
      },
      revenue: totalRevenue,
      usersByRole,
      agreementsByMonth,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users with filtering
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -otpCode -otpExpiry -fcmToken -passwordResetToken -emailVerificationToken')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
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

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otpCode -otpExpiry -fcmToken -passwordResetToken -emailVerificationToken');

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get their agreements and properties
    const [agreements, properties] = await Promise.all([
      Agreement.find({ $or: [{ landlord: user._id }, { tenant: user._id }] })
        .select('status term financials property')
        .populate('property', 'title'),
      Property.find({ landlord: user._id }).select('title status isListed'),
    ]);

    res.json({ user, agreements, properties });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ban or unban a user
// @route   PUT /api/admin/users/:id/ban
// @access  Private (Admin)
const toggleUserBan = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent admin from banning themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot ban your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: user.isActive ? 'User account reactivated' : 'User account suspended',
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change a user's role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['landlord', 'tenant', 'admin', 'property_manager', 'law_reviewer'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: `Role updated to ${role}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all agreements platform-wide
// @route   GET /api/admin/agreements
// @access  Private (Admin)
const getAllAgreements = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [agreements, total] = await Promise.all([
      Agreement.find(filter)
        .populate('landlord', 'name email')
        .populate('tenant', 'name email')
        .populate('property', 'title address')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Agreement.countDocuments(filter),
    ]);

    res.json({
      agreements,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get platform-wide audit log (from all agreements)
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Unwind agreement audit logs and sort by timestamp
    const matchStage = action ? { 'auditLog.action': action } : {};

    const logs = await Agreement.aggregate([
      { $unwind: '$auditLog' },
      ...(action ? [{ $match: { 'auditLog.action': action } }] : []),
      { $sort: { 'auditLog.timestamp': -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          action: '$auditLog.action',
          actor: '$auditLog.actor',
          timestamp: '$auditLog.timestamp',
          ipAddress: '$auditLog.ipAddress',
          details: '$auditLog.details',
          agreementId: '$_id',
        },
      },
    ]);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Clause / Template Management ─────────────────────────────────────────────

// @desc    Get all clauses
// @route   GET /api/admin/clauses
// @access  Private (Admin, Law Reviewer)
const getClauses = async (req, res) => {
  try {
    const { category, isApproved, isArchived = false } = req.query;
    const filter = { isArchived: isArchived === 'true' };

    if (category) filter.category = category;
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';

    const clauses = await Clause.find(filter)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort('-createdAt');

    res.json(clauses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new clause template
// @route   POST /api/admin/clauses
// @access  Private (Admin, Law Reviewer)
const createClause = async (req, res) => {
  try {
    const { title, body, category, jurisdiction, isDefault } = req.body;

    const clause = await Clause.create({
      title,
      body,
      category: category || 'general',
      jurisdiction: jurisdiction || 'Pakistan',
      isDefault: isDefault || false,
      createdBy: req.user._id,
    });

    res.status(201).json(clause);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve or reject a clause
// @route   PUT /api/admin/clauses/:id/approve
// @access  Private (Admin, Law Reviewer)
const reviewClause = async (req, res) => {
  try {
    const { approved, rejectionReason } = req.body;

    const clause = await Clause.findById(req.params.id);
    if (!clause) return res.status(404).json({ message: 'Clause not found' });

    clause.isApproved = approved;
    clause.approvedBy = approved ? req.user._id : null;
    clause.approvedAt = approved ? new Date() : null;
    clause.rejectionReason = approved ? '' : (rejectionReason || 'Not approved');

    await clause.save();
    res.json(clause);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Archive a clause
// @route   PUT /api/admin/clauses/:id/archive
// @access  Private (Admin)
const archiveClause = async (req, res) => {
  try {
    const clause = await Clause.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, isLatestVersion: false },
      { returnDocument: 'after' }
    );
    if (!clause) return res.status(404).json({ message: 'Clause not found' });
    res.json({ message: 'Clause archived', clause });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all properties with tenant info
// @route   GET /api/admin/properties
// @access  Private (Admin)
const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find()
      .populate('landlord', 'name email')
      .populate('managedBy', 'name email')
      .sort({ createdAt: -1 });

    // Attach current tenant for each property
    const propIds = properties.map(p => p._id);
    const activeAgreements = await Agreement.find({
      property: { $in: propIds },
      status: 'active',
    }).populate('tenant', 'name email');

    const tenantMap = {};
    activeAgreements.forEach(ag => {
      tenantMap[ag.property.toString()] = ag;
    });

    const result = properties.map(p => ({
      ...p.toObject(),
      activeAgreement: tenantMap[p._id.toString()] || null,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Kick tenant from property (terminate agreement)
// @route   POST /api/admin/properties/:id/kick-tenant
// @access  Private (Admin)
const kickTenantFromProperty = async (req, res) => {
  try {
    const { reason } = req.body;
    const propertyId = req.params.id;

    const agreement = await Agreement.findOne({
      property: propertyId,
      status: 'active',
    }).populate('tenant', 'name email').populate('property', 'title');

    if (!agreement) {
      return res.status(404).json({ message: 'No active tenant found for this property' });
    }

    // Terminate the agreement
    agreement.status = 'terminated';
    agreement.auditLog.push({
      action: 'TERMINATED_BY_ADMIN',
      actor: req.user._id,
      ipAddress: req.ip,
      details: reason || 'Terminated by administrator',
    });
    await agreement.save();

    // Mark property as available
    await Property.findByIdAndUpdate(propertyId, { status: 'available' });

    res.json({ message: `Tenant ${agreement.tenant?.name} has been removed from ${agreement.property?.title}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStats,
  getUsers,
  getUserById,
  toggleUserBan,
  changeUserRole,
  getAllAgreements,
  getAuditLogs,
  getClauses,
  createClause,
  reviewClause,
  archiveClause,
  getAllProperties,
  kickTenantFromProperty,
};