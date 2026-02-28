const mongoose = require('mongoose');

const disputeSchema = mongoose.Schema(
  {
    agreement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agreement',
      required: true,
    },
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    against: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },

    // ─── Dispute Details ───────────────────────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['rent', 'deposit', 'maintenance', 'noise', 'damage', 'lease_violation', 'other'],
      default: 'other',
    },

    // ─── Status Workflow ───────────────────────────────────────────
    status: {
      type: String,
      enum: ['open', 'under_review', 'mediation', 'resolved', 'closed'],
      default: 'open',
    },

    // ─── Evidence / Attachments ────────────────────────────────────
    attachments: [
      {
        url:  { type: String },
        name: { type: String },
        type: { type: String }, // 'image', 'pdf', 'doc'
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // ─── Admin Resolution ──────────────────────────────────────────
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNote: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    // ─── Comments / Communication Thread ──────────────────────────
    comments: [
      {
        author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        content:   { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dispute', disputeSchema);
