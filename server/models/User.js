const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: true,
      select: false, // Security: Never return password by default
    },
    role: {
      type: String,
      enum: ['landlord', 'tenant', 'admin', 'property_manager', 'law_reviewer'],
      default: 'tenant',
    },
    phoneNumber: {
      type: String,
      required: true,
    },

    // ─── Profile ───────────────────────────────────────────────────
    profilePhoto: {
      type: String,
      default: null, // Cloudinary URL
    },

    // ─── Account Status ────────────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false, // Email verification
    },
    isActive: {
      type: Boolean,
      default: true,  // Admin can set false to ban/suspend account
    },
    lastLogin: {
      type: Date,
      default: null,
    },

    // ─── OTP / Phone Verification ──────────────────────────────────
    otpCode: {
      type: String,
      default: null,
      select: false, // Never expose OTP in API responses
    },
    otpExpiry: {
      type: Date,
      default: null,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false, // Track failed OTP attempts to prevent brute force
    },

    // ─── Notification Preferences ──────────────────────────────────
    smsOptIn: {
      type: Boolean,
      default: false, // User must explicitly opt in to SMS
    },
    emailOptIn: {
      type: Boolean,
      default: true,
    },

    // ─── Platform Subscription ─────────────────────────────────────
    subscriptionTier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },

    // ─── Push Notifications ────────────────────────────────────────
    fcmToken: {
      type: String,
      default: null, // Firebase Cloud Messaging token for push notifications
      select: false,
    },

    // ─── Two-Factor Authentication (TOTP) ──────────────────────────
    twoFactorSecret: {
      type: String,
      default: null,
      select: false, // Never expose TOTP secret in API responses
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    // ─── Phone Verification ────────────────────────────────────────
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // ─── Password Reset ────────────────────────────────────────────
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    // ─── Email Verification ────────────────────────────────────────
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Encrypt password before saving ──────────────────────────────────────────
// Mongoose 7+: async pre-hooks do not receive next — just return early
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Match entered password to hashed password ───────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Check if OTP is valid and not expired ───────────────────────────────────
userSchema.methods.isOtpValid = function (code) {
  return (
    this.otpCode === code &&
    this.otpExpiry &&
    this.otpExpiry > new Date()
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;