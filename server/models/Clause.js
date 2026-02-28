const mongoose = require('mongoose');

const clauseSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // The actual clause text. Supports {{variables}} for dynamic substitution
    // e.g. "Tenant {{tenantName}} agrees to pay Rs. {{rentAmount}} per month."
    body: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'rent',
        'deposit',
        'maintenance',
        'utilities',
        'pets',
        'termination',
        'renewal',
        'late_fee',
        'subletting',
        'noise',
        'general',
      ],
      default: 'general',
    },

    // ─── Jurisdiction / Region ─────────────────────────────────────
    jurisdiction: {
      type: String,
      default: 'Pakistan', // e.g. 'Punjab', 'Sindh', 'KPK', 'Global'
    },

    // ─── Versioning ────────────────────────────────────────────────
    version: {
      type: Number,
      default: 1,
    },
    isLatestVersion: {
      type: Boolean,
      default: true,
    },

    // ─── Approval Workflow ─────────────────────────────────────────
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Must be a law_reviewer or admin
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },

    // ─── Usage ─────────────────────────────────────────────────────
    isArchived: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false, // If true, auto-included in all new agreements
    },
    usageCount: {
      type: Number,
      default: 0, // How many agreements have used this clause
    },

    // Who created it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Clause', clauseSchema);