const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
  deleteMessage,
} = require('../controllers/messageController');
const { body } = require('express-validator');

// Inbox (all conversations)
router.get('/', protect, getInbox);

// Unread count (for navbar badge)
router.get('/unread-count', protect, getUnreadCount);

// Send a message
router.post(
  '/',
  protect,
  [
    body('propertyId').notEmpty().withMessage('Property ID is required'),
    body('receiverId').notEmpty().withMessage('Receiver ID is required'),
    body('content').trim().notEmpty().withMessage('Message content cannot be empty'),
  ],
  sendMessage
);

// Get conversation thread
router.get('/:propertyId/:otherUserId', protect, getConversation);

// Delete a message
router.delete('/:id', protect, deleteMessage);

module.exports = router;