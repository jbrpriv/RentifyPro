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
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Reject banned / deactivated accounts even if their JWT is still valid
      if (user.isActive === false) {
        return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
      }

      req.user = user;
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