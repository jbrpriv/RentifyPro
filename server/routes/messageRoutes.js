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
const { body, validationResult } = require('express-validator');

// Inbox (all conversations)
router.get('/', protect, getInbox);

// Unread count (for navbar badge)
router.get('/unread-count', protect, getUnreadCount);

// Send a message
router.post(
  '/',
  protect,
  [
    body('receiverId').notEmpty().withMessage('Receiver ID is required'),
    body('content').trim().notEmpty().withMessage('Message content cannot be empty'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
  sendMessage
);

// Get conversation thread
router.get('/:propertyId/:otherUserId', protect, getConversation);

// Delete a message
router.delete('/:id', protect, deleteMessage);

module.exports = router;