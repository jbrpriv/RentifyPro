const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema(
  {
    agreement: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Agreement',
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Property',
    },

    // ─── Payment Details ───────────────────────────────────────────
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['initial', 'rent', 'deposit', 'late_fee', 'maintenance', 'refund'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    // ─── Schedule Reference ────────────────────────────────────────
    // Which month this payment covers (matches rentSchedule entry)
    dueDate: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },

    // ─── Late Fee Tracking ─────────────────────────────────────────
    lateFeeIncluded: {
      type: Boolean,
      default: false,
    },
    lateFeeAmount: {
      type: Number,
      default: 0,
    },

    // ─── Stripe Integration ────────────────────────────────────────
    stripePaymentIntent: {
      type: String,
      default: null,
    },
    stripeSessionId: {
      type: String,
      default: null,
    },

    // ─── Receipt ──────────────────────────────────────────────────
    receiptUrl: {
      type: String,
      default: null, // PDF receipt stored on Cloudinary/S3
    },
    receiptNumber: {
      type: String,
      default: null, // Human-readable e.g. "RCP-2026-00042"
    },

    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Auto-generate receipt number before saving a paid payment
paymentSchema.pre('save', async function () {
  if (this.isNew && this.status === 'paid' && !this.receiptNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    this.receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);