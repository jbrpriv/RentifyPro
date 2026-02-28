const User = require('../models/User');
const Agreement = require('../models/Agreement');
const Property = require('../models/Property');

// @desc    Find user by email (used when landlord types tenant email to create agreement)
// @route   POST /api/users/lookup
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('name email role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get own profile (full data)
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      '-password -passwordResetToken -passwordResetExpiry -emailVerificationToken -otpCode -otpExpiry -otpAttempts -fcmToken -twoFactorSecret'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get own profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      '-password -passwordResetToken -passwordResetExpiry -emailVerificationToken -otpCode -otpExpiry -otpAttempts -fcmToken -twoFactorSecret'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update own profile (name, phone, profilePhoto, smsOptIn, emailOptIn)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'phoneNumber', 'profilePhoto', 'smsOptIn', 'emailOptIn', 'role'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Only allow role change for Google users completing profile (from tenant to another)
        if (key === 'role' && !['landlord', 'tenant', 'property_manager'].includes(req.body[key])) continue;
        updates[key] = req.body[key];
      }
    }
    // If phone changes, reset phone verification
    if (updates.phoneNumber && updates.phoneNumber !== req.user.phoneNumber) {
      updates.isPhoneVerified = false;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { returnDocument: 'after', runValidators: true }
    ).select('-password -passwordResetToken -passwordResetExpiry -emailVerificationToken -otpCode -otpExpiry -otpAttempts -fcmToken -twoFactorSecret');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update notification preferences
// @route   PATCH /api/users/me/preferences
// @access  Private
const updatePreferences = async (req, res) => {
  try {
    const { smsOptIn, emailOptIn } = req.body;
    const updates = {};
    if (smsOptIn !== undefined) updates.smsOptIn = smsOptIn;
    if (emailOptIn !== undefined) updates.emailOptIn = emailOptIn;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: 'after' })
      .select('smsOptIn emailOptIn');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get allowed messaging contacts based on role
// @route   GET /api/users/contacts
// @access  Private
const getContacts = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    let contacts = [];

    if (role === 'landlord') {
      // Landlord sees: active tenants + their PMs
      const agreements = await Agreement.find({ landlord: userId, status: 'active' })
        .populate('tenant', 'name email role profilePhoto')
        .populate('property', 'title _id');
      const properties = await Property.find({ landlord: userId, managedBy: { $ne: null } })
        .populate('managedBy', 'name email role profilePhoto');

      const tenants = agreements.map(a => ({
        user: a.tenant,
        propertyId: a.property?._id,
        propertyTitle: a.property?.title,
        context: 'Active Tenant',
      }));
      const managers = properties.map(p => ({
        user: p.managedBy,
        propertyId: p._id,
        propertyTitle: p.title,
        context: 'Property Manager',
      }));
      contacts = [...tenants, ...managers];

    } else if (role === 'tenant') {
      // Tenant sees: landlord of active lease + PM of that property (if any)
      const agreements = await Agreement.find({ tenant: userId, status: 'active' })
        .populate('landlord', 'name email role profilePhoto')
        .populate('property', 'title _id');

      for (const ag of agreements) {
        contacts.push({
          user: ag.landlord,
          propertyId: ag.property?._id,
          propertyTitle: ag.property?.title,
          context: 'Landlord',
        });
        // Check if property has PM
        const prop = await Property.findById(ag.property?._id).populate('managedBy', 'name email role profilePhoto');
        if (prop?.managedBy) {
          contacts.push({
            user: prop.managedBy,
            propertyId: prop._id,
            propertyTitle: prop.title,
            context: 'Property Manager',
          });
        }
      }

    } else if (role === 'property_manager') {
      // PM sees: landlords who assigned properties + tenants of those properties
      const properties = await Property.find({ managedBy: userId })
        .populate('landlord', 'name email role profilePhoto');

      for (const prop of properties) {
        contacts.push({
          user: prop.landlord,
          propertyId: prop._id,
          propertyTitle: prop.title,
          context: 'Landlord',
        });
        // Find active tenants of this property
        const agreements = await Agreement.find({ property: prop._id, status: 'active' })
          .populate('tenant', 'name email role profilePhoto');
        for (const ag of agreements) {
          contacts.push({
            user: ag.tenant,
            propertyId: prop._id,
            propertyTitle: prop.title,
            context: 'Tenant',
          });
        }
      }
    } else if (role === 'admin' || role === 'law_reviewer') {
      // Admin/law_reviewer can message any user on the platform
      const allUsers = await User.find({ _id: { $ne: userId }, isActive: true })
        .select('name email role profilePhoto')
        .limit(100);
      contacts = allUsers.map(u => ({
        user: u,
        propertyId: null,
        propertyTitle: 'Direct Message',
        context: u.role.replace('_', ' '),
      }));
    }

    // Deduplicate by user._id + propertyId combo
    const seen = new Set();
    contacts = contacts.filter(c => {
      const key = `${c.user?._id}-${c.propertyId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUserByEmail, getProfile, getMe, updateProfile, updatePreferences, getContacts };