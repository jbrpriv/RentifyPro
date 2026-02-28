const User      = require('../models/User');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const speakeasy = require('speakeasy');
const qrcode    = require('qrcode');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { validationResult } = require('express-validator');
const { sendEmail } = require('../utils/emailService');
const { sendOTP, verifyOTP } = require('../utils/smsService');

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   30 * 24 * 60 * 60 * 1000,
  });
};

// ─── REGISTER ─────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { name, email, password, role, phoneNumber } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const user = await User.create({ name, email, password, role, phoneNumber, otpCode: emailOtp, otpExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), isVerified: false });

  if (user) {
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setRefreshCookie(res, refreshToken);
    await sendEmail(user.email, 'emailOTP', user.name, emailOtp);
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, isVerified: false, token: accessToken });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid credentials format' });

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) return res.status(401).json({ message: 'Invalid email or password' });
  if (!user.isActive) return res.status(403).json({ message: 'Account suspended. Contact support.' });

  // Check email verification (skip for admin/law_reviewer)
  if (!user.isVerified && !['admin', 'law_reviewer'].includes(user.role)) {
    return res.status(403).json({ message: 'EMAIL_NOT_VERIFIED', email: user.email });
  }
  // Check phone verification (skip for admin/law_reviewer/google users with placeholder)
  if (!user.isPhoneVerified && !['admin', 'law_reviewer'].includes(user.role) && user.phoneNumber !== '0000000000') {
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setRefreshCookie(res, refreshToken);
    return res.status(403).json({ message: 'PHONE_NOT_VERIFIED', token: accessToken, phoneNumber: user.phoneNumber });
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  setRefreshCookie(res, refreshToken);

  res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified, isPhoneVerified: user.isPhoneVerified, twoFactorEnabled: user.twoFactorEnabled || false, token: accessToken });
};

// ─── REFRESH ──────────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    res.json({ token: generateAccessToken(user._id) });
  } catch {
    res.status(401).json({ message: 'Refresh token expired, please log in again' });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
const logoutUser = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

// ─── EMAIL VERIFICATION ────────────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
    const user = await User.findOne({ email }).select('+otpCode +otpExpiry');
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.json({ message: 'Email already verified' });
    if (!user.otpCode || user.otpCode !== code.toString()) return res.status(400).json({ message: 'Invalid verification code' });
    if (!user.otpExpiry || user.otpExpiry < new Date()) return res.status(400).json({ message: 'Verification code expired, please request a new one' });
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiry = null;
    await user.save();
    res.json({ message: 'Email verified successfully!' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+otpCode +otpExpiry');
    if (!user)           return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = emailOtp;
    user.otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendEmail(user.email, 'emailOTP', user.name, emailOtp);
    res.json({ message: 'Verification code resent' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ─── PASSWORD RESET ────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' });

    const resetToken  = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendEmail(user.email, 'passwordReset', user.name, resetUrl);
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Reset link invalid or expired' });
    user.password = password;
    user.passwordResetToken  = null;
    user.passwordResetExpiry = null;
    await user.save();
    res.json({ message: 'Password reset successfully.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ─── OTP PHONE VERIFICATION ───────────────────────────────────────────────────
const sendPhoneOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.phoneNumber) return res.status(400).json({ message: 'No phone number on your account' });
    const sent = await sendOTP(user.phoneNumber);
    if (!sent) return res.status(500).json({ message: 'Failed to send OTP. Check Twilio config.' });
    res.json({ message: 'OTP sent to your phone number' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const verifyPhoneOTP = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'OTP code required' });
    const user  = await User.findById(req.user._id);
    const valid = await verifyOTP(user.phoneNumber, code);
    if (!valid) return res.status(400).json({ message: 'Invalid or expired OTP code' });
    user.isPhoneVerified = true;
    await user.save();
    res.json({ message: 'Phone number verified!' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ─── 2FA TOTP ─────────────────────────────────────────────────────────────────
const setup2FA = async (req, res) => {
  try {
    const user   = await User.findById(req.user._id);
    const secret = speakeasy.generateSecret({ name: `RentifyPro (${user.email})`, length: 20 });
    user.twoFactorSecret  = secret.base32;
    user.twoFactorEnabled = false;
    await user.save();
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode, otpauthUrl: secret.otpauth_url });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'TOTP token required' });
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user.twoFactorSecret) return res.status(400).json({ message: 'Run 2FA setup first' });
    const ok = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 1 });
    if (!ok) return res.status(400).json({ message: 'Invalid 2FA code' });
    user.twoFactorEnabled = true;
    await user.save();
    res.json({ message: '2FA enabled successfully.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const disable2FA = async (req, res) => {
  try {
    const { otpCode } = req.body;
    const user = await User.findById(req.user._id).select('+otpCode +otpExpiry');
    if (!user.twoFactorEnabled) return res.status(400).json({ message: '2FA is not enabled' });
    if (!otpCode) return res.status(400).json({ message: 'OTP code required' });
    if (!user.isOtpValid(otpCode)) return res.status(400).json({ message: 'Invalid or expired OTP code' });
    user.twoFactorEnabled = false;
    user.twoFactorSecret  = null;
    user.otpCode = null;
    user.otpExpiry = null;
    await user.save();
    res.json({ message: '2FA disabled successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// Send OTP to email for 2FA disable confirmation
const send2FADisableOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.twoFactorEnabled) return res.status(400).json({ message: '2FA is not enabled' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    // Try phone first, then email
    const { sendOTP } = require('../utils/smsService');
    if (user.isPhoneVerified && user.phoneNumber) {
      await sendOTP(user.phoneNumber);
      res.json({ message: 'OTP sent to your phone number', via: 'phone' });
    } else {
      await sendEmail(user.email, 'emailOTP', user.name, otp);
      res.json({ message: 'OTP sent to your email address', via: 'email' });
    }
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const validate2FALogin = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user?.twoFactorEnabled) return res.status(400).json({ message: '2FA not enabled' });
    const ok = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 1 });
    if (!ok) return res.status(400).json({ message: 'Invalid 2FA code' });
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setRefreshCookie(res, refreshToken);
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: accessToken });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────
const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setRefreshCookie(res, refreshToken);
    // Check if profile is complete (Google users get placeholder phone)
    const profileComplete = user.phoneNumber !== '0000000000' && user.isPhoneVerified;
    res.redirect(`${process.env.CLIENT_URL}/auth/google/success?token=${accessToken}&name=${encodeURIComponent(user.name)}&role=${user.role}&id=${user._id}&email=${encodeURIComponent(user.email)}&profileComplete=${profileComplete}&isPhoneVerified=${user.isPhoneVerified}`);
  } catch {
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_error`);
  }
};

// ─── FCM TOKEN ────────────────────────────────────────────────────────────────
const registerFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ message: 'FCM token required' });
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.json({ message: 'Push notification token registered' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  registerUser, loginUser, refreshToken, logoutUser,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
  sendPhoneOTP, verifyPhoneOTP,
  setup2FA, verify2FA, disable2FA, send2FADisableOTP, validate2FALogin,
  googleCallback, registerFCMToken,
};
