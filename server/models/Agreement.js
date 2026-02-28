const mongoose = require('mongoose');

const rentScheduleEntrySchema = new mongoose.Schema({
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'late_fee_applied'],
    default: 'pending',
  },
  paidDate: { type: Date, default: null },
  paidAmount: { type: Number, default: null },        // Actual amount paid (may differ if late fee added)
  lateFeeApplied: { type: Boolean, default: false },
  lateFeeAmount: { type: Number, default: 0 },
  stripePaymentIntent: { type: String, default: null },
}, { _id: false });

const agreementSchema = mongoose.Schema(
  {
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Property',
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'signed', 'active', 'expired', 'terminated'],
      default: 'draft',
    },

    // ─── Lease Term ────────────────────────────────────────────────
    term: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      durationMonths: { type: Number },
    },

    // ─── Financials ────────────────────────────────────────────────
    financials: {
      rentAmount: { type: Number, required: true },
      depositAmount: { type: Number, required: true },
      lateFeeAmount: { type: Number, default: 0 },
      lateFeeGracePeriodDays: { type: Number, default: 5 },
    },

    // ─── Rent Schedule (generated after initial payment) ───────────
    // FIX: This field was missing from schema but written by paymentController webhook
    rentSchedule: [rentScheduleEntrySchema],

    // ─── Renewal Rules ─────────────────────────────────────────────
    renewalRules: {
      autoRenew: { type: Boolean, default: false },
      notifyDaysBefore: { type: Number, default: 30 },
    },

    // ─── Policy Fields (from spec) ─────────────────────────────────
    utilitiesIncluded: { type: Boolean, default: false },
    utilitiesDetails: { type: String, default: '' },
    petPolicy: {
      allowed: { type: Boolean, default: false },
      deposit: { type: Number, default: 0 },
    },
    terminationPolicy: { type: String, default: '' },

    // ─── Clause Set (for template-based agreements) ────────────────
    clauseSet: [
      {
        clauseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clause' },
        title: { type: String },
        body: { type: String },
      }
    ],

    // ─── Document ──────────────────────────────────────────────────
    documentUrl: { type: String },
    documentVersion: { type: Number, default: 1 },

    // ─── Digital Signatures ────────────────────────────────────────
    signatures: {
      landlord: {
        signed: { type: Boolean, default: false },
        signedAt: Date,
        ipAddress: String,
      },
      tenant: {
        signed: { type: Boolean, default: false },
        signedAt: Date,
        ipAddress: String,
      },
    },

    // ─── Payment Tracking ──────────────────────────────────────────
    isPaid: { type: Boolean, default: false },
    stripeSessionId: { type: String },
    paymentHistory: [
      {
        amount: { type: Number },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['pending', 'paid', 'failed'] },
        stripePaymentIntent: { type: String },
      }
    ],


    // ─── Renewal Proposal ──────────────────────────────────────────
    renewalProposal: {
      proposedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      newEndDate:    { type: Date,   default: null },
      newRentAmount: { type: Number, default: null },
      notes:         { type: String, default: '' },
      status:        { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
      proposedAt:    { type: Date,   default: null },
    },

    // ─── Dispute Reference ─────────────────────────────────────────
    dispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispute',
      default: null,
    },

    // ─── Audit Log ─────────────────────────────────────────────────
    auditLog: [
      {
        action: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        ipAddress: String,
        details: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Agreement', agreementSchema);