const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/authMiddleware');
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
} = require('../controllers/maintenanceController');
const { body } = require('express-validator');

// GET all + POST new
router.route('/')
  .get(protect, getRequests)
  .post(
    protect,
    requireRole('tenant'),
    [
      body('propertyId').notEmpty().withMessage('Property ID is required'),
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('description').trim().notEmpty().withMessage('Description is required'),
      body('priority').optional().isIn(['low', 'medium', 'urgent']),
      body('category').optional().isIn(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other']),
    ],
    createRequest
  );

// GET single + PUT update + DELETE
router.route('/:id')
  .get(protect, getRequestById)
  .put(protect, requireRole('landlord', 'property_manager', 'admin'), updateRequest)
  .delete(protect, deleteRequest);

module.exports = router;