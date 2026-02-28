const Message = require('../models/Message');
const Property = require('../models/Property');
const User = require('../models/User');

// Get io from server module (lazy to avoid circular deps)
const getIO = () => {
  try { return require('../server').io; } catch { return null; }
};
const getOnlineUsers = () => {
  try { return require('../server').onlineUsers; } catch { return new Map(); }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { propertyId, receiverId, content, agreementId, attachments } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId).select('name email');
    if (!receiver) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Property is optional (admin/law_reviewer may message without property context)
    if (propertyId) {
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }
    }

    const message = await Message.create({
      property: propertyId || null,
      agreement: agreementId || null,
      sender: req.user._id,
      receiver: receiverId,
      content: content.trim(),
      attachments: attachments || [],
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name profilePhoto role')
      .populate('receiver', 'name profilePhoto role')
      .populate('property', 'title');

    // Emit real-time event to receiver if online
    const io = getIO();
    const onlineUsers = getOnlineUsers();
    if (io) {
      const receiverSocketId = onlineUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', populated);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get conversation thread between two users for a property
// @route   GET /api/messages/:propertyId/:otherUserId
// @access  Private
const getConversation = async (req, res) => {
  try {
    const { propertyId, otherUserId } = req.params;
    const userId = req.user._id;

    // 'null' string means no property context (admin/law_reviewer messaging)
    const propertyFilter = propertyId === 'null' ? null : propertyId;

    const messages = await Message.find({
      property: propertyFilter,
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .populate('sender', 'name profilePhoto role')
      .populate('receiver', 'name profilePhoto role')
      .sort('createdAt');

    // Mark received messages as read
    await Message.updateMany(
      {
        property: propertyFilter,
        sender: otherUserId,
        receiver: userId,
        isRead: false,
      },
      { isRead: true, readAt: new Date() }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all conversations for the logged-in user (inbox)
// @route   GET /api/messages
// @access  Private
const getInbox = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get last message per unique conversation (propertyId + other user)
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            property: '$property',
            // Create a stable conversation ID regardless of sender/receiver order
            participants: {
              $cond: [
                { $lt: ['$sender', '$receiver'] },
                { first: '$sender', second: '$receiver' },
                { first: '$receiver', second: '$sender' },
              ],
            },
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$isRead', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    // Populate property and other user details
    const populated = await Message.populate(
      conversations.map(c => c.lastMessage),
      [
        { path: 'sender', select: 'name profilePhoto role' },
        { path: 'receiver', select: 'name profilePhoto role' },
        { path: 'property', select: 'title address' },
      ]
    );

    // Zip back unread counts
    const result = populated.map((msg, i) => ({
      ...msg.toObject(),
      unreadCount: conversations[i].unreadCount,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread message count for badge display
// @route   GET /api/messages/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false,
    });
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Soft-delete a message (hide from one side)
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const userId = req.user._id.toString();

    if (message.sender.toString() === userId) {
      message.deletedBySender = true;
    } else if (message.receiver.toString() === userId) {
      message.deletedByReceiver = true;
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await message.save();
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
  deleteMessage,
};