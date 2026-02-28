const Dispute  = require('../models/Dispute');
const Agreement = require('../models/Agreement');

// @desc    File a new dispute
// @route   POST /api/disputes
// @access  Private (Tenant, Landlord)
const fileDispute = async (req, res) => {
  try {
    const { agreementId, title, description, category } = req.body;

    const agreement = await Agreement.findById(agreementId)
      .populate('tenant',   'name')
      .populate('landlord', 'name')
      .populate('property', 'title');

    if (!agreement) return res.status(404).json({ message: 'Agreement not found' });

    const userId = req.user._id.toString();
    const isParty =
      agreement.tenant._id.toString()   === userId ||
      agreement.landlord._id.toString() === userId;

    if (!isParty) return res.status(403).json({ message: 'Not authorized' });

    // Determine the opposing party
    const against =
      agreement.tenant._id.toString() === userId
        ? agreement.landlord._id
        : agreement.tenant._id;

    const dispute = await Dispute.create({
      agreement:   agreementId,
      filedBy:     req.user._id,
      against,
      property:    agreement.property._id,
      title,
      description,
      category: category || 'other',
    });

    // Link dispute to agreement
    await Agreement.findByIdAndUpdate(agreementId, { dispute: dispute._id });

    const populated = await Dispute.findById(dispute._id)
      .populate('filedBy',  'name email')
      .populate('against',  'name email')
      .populate('property', 'title');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get disputes (role-aware)
// @route   GET /api/disputes
// @access  Private
const getDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    const { role, _id } = req.user;

    // Scope by role
    if (role === 'tenant' || role === 'landlord') {
      filter.$or = [{ filedBy: _id }, { against: _id }];
    }
    // admin/property_manager see all

    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate('filedBy',   'name email role')
        .populate('against',   'name email role')
        .populate('property',  'title address')
        .populate('agreement', 'status term financials')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Dispute.countDocuments(filter),
    ]);

    res.json({
      disputes,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single dispute
// @route   GET /api/disputes/:id
// @access  Private
const getDisputeById = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('filedBy',          'name email role')
      .populate('against',          'name email role')
      .populate('property',         'title address')
      .populate('agreement',        'status term financials')
      .populate('resolvedBy',       'name email')
      .populate('comments.author',  'name email role');

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const userId = req.user._id.toString();
    const hasAccess =
      dispute.filedBy._id.toString() === userId ||
      dispute.against._id.toString() === userId ||
      req.user.role === 'admin';

    if (!hasAccess) return res.status(403).json({ message: 'Not authorized' });

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update dispute status / add resolution (Admin)
// @route   PUT /api/disputes/:id
// @access  Private (Admin)
const updateDispute = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    if (status)         dispute.status = status;
    if (resolutionNote) dispute.resolutionNote = resolutionNote;

    if (status === 'resolved' || status === 'closed') {
      dispute.resolvedBy = req.user._id;
      dispute.resolvedAt = new Date();
    }

    await dispute.save();

    const updated = await Dispute.findById(dispute._id)
      .populate('filedBy',  'name email')
      .populate('against',  'name email')
      .populate('property', 'title');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a comment to a dispute thread
// @route   POST /api/disputes/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const userId = req.user._id.toString();
    const canComment =
      dispute.filedBy.toString() === userId ||
      dispute.against.toString() === userId ||
      req.user.role === 'admin';

    if (!canComment) return res.status(403).json({ message: 'Not authorized' });

    dispute.comments.push({ author: req.user._id, content: content.trim() });
    await dispute.save();

    const updated = await Dispute.findById(dispute._id)
      .populate('comments.author', 'name email role');

    res.status(201).json(updated.comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { fileDispute, getDisputes, getDisputeById, updateDispute, addComment };
