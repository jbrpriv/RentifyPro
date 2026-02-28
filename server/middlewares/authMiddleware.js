const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Protect: Verifies JWT and attaches req.user ─────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// ─── requireRole: Role-based access control ──────────────────────────────────
// Usage: router.get('/route', protect, requireRole('admin'), controller)
// Usage: router.get('/route', protect, requireRole('landlord', 'property_manager'), controller)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

// ─── Convenience shorthand middleware ─────────────────────────────────────────
const isLandlord = requireRole('landlord', 'property_manager', 'admin');
const isAdmin = requireRole('admin');
const isTenant = requireRole('tenant');
const isPropertyManager = requireRole('property_manager', 'admin');
const isLawReviewer = requireRole('law_reviewer', 'admin');

module.exports = {
  protect,
  requireRole,
  isLandlord,
  isAdmin,
  isTenant,
  isPropertyManager,
  isLawReviewer,
};