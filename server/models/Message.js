const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    // A conversation is scoped to a property (or agreement for more specificity)
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    agreement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agreement',
      default: null, // Optional — link to specific agreement
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional attachments (Cloudinary URLs)
    attachments: [
      {
        url: String,
        name: String,
        type: String, // 'image', 'pdf', 'doc'
      }
    ],

    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    // Soft delete — hide from one side without destroying the record
    deletedBySender: { type: Boolean, default: false },
    deletedByReceiver: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fast conversation thread lookups
messageSchema.index({ property: 1, sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 }); // For unread count queries

module.exports = mongoose.model('Message', messageSchema);