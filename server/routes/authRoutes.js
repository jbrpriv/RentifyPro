const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const { body } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const {
  registerUser, loginUser, refreshToken, logoutUser,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
  sendPhoneOTP, verifyPhoneOTP,
  setup2FA, verify2FA, disable2FA, send2FADisableOTP, validate2FALogin,
  registerFCMToken,
} = require('../controllers/authController');

// ─── Register — with descriptive validation messages ─────────────────────────
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  ],
  registerUser
);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  loginUser
);

router.post('/refresh',  refreshToken);
router.post('/logout',   protect, logoutUser);

router.post('/verify-email',        verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password',     forgotPassword);
router.post('/reset-password',      resetPassword);

router.post('/send-otp',   protect, sendPhoneOTP);
router.post('/verify-otp', protect, verifyPhoneOTP);

router.post('/2fa/setup',           protect, setup2FA);
router.post('/2fa/verify',          protect, verify2FA);
router.post('/2fa/disable/send-otp',protect, send2FADisableOTP);
router.post('/2fa/disable',         protect, disable2FA);
router.post('/2fa/validate',                 validate2FALogin);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Use passport's custom-callback pattern instead of chaining middleware.
// This avoids passport internally calling next() in a context where next
// may not be a function, which caused the "next is not a function" error.
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err) {
      console.error('Google OAuth error:', err.message);
      return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_error`);
    }
    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    }
    try {
      const accessToken  = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Set HttpOnly refresh cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge:   30 * 24 * 60 * 60 * 1000,
      });

      return res.redirect(
        `${process.env.CLIENT_URL}/auth/google/success` +
        `?token=${accessToken}` +
        `&name=${encodeURIComponent(user.name)}` +
        `&role=${user.role}` +
        `&id=${user._id}` +
        `&email=${encodeURIComponent(user.email)}`
      );
    } catch (callbackErr) {
      return next(callbackErr);
    }
  })(req, res, next);
});

router.post('/fcm-token', protect, registerFCMToken);

module.exports = router;