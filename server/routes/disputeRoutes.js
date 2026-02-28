const express = require('express');
const router  = express.Router();
const { protect, isAdmin } = require('../middlewares/authMiddleware');
const {
  fileDispute,
  getDisputes,
  getDisputeById,
  updateDispute,
  addComment,
} = require('../controllers/disputeController');

router.route('/')
  .get(protect, getDisputes)
  .post(protect, fileDispute);

router.route('/:id')
  .get(protect, getDisputeById)
  .put(protect, isAdmin, updateDispute);

router.post('/:id/comments', protect, addComment);

module.exports = router;
