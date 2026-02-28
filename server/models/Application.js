const mongoose = require('mongoose');

const applicationSchema = mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Property',
    },
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
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    message: {
      type: String, // Tenant's intro message to landlord
      default: '',
    },
    // Auto-filled from tenant profile
    applicantDetails: {
      name: String,
      email: String,
      phone: String,
    },
    // If accepted, link to the created agreement
    agreement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agreement',
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent a tenant from applying to the same property twice
applicationSchema.index({ property: 1, tenant: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);