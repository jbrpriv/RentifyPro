const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/authMiddleware');
const {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  assignManager,
  inviteManager,
  respondToInvitation,
  getMyInvitations,
} = require('../controllers/propertyController');
const { body } = require('express-validator');

router.route('/')
  .post(
    protect,
    requireRole('landlord', 'admin'),
    [
      body('title').trim().escape().notEmpty().withMessage('Title is required'),
      body('financials.monthlyRent').isNumeric().withMessage('Rent must be a number'),
      body('financials.securityDeposit').isNumeric().withMessage('Deposit must be a number'),
      body('address.city').trim().escape().notEmpty().withMessage('City is required'),
      body('address.street').trim().escape().notEmpty().withMessage('Street is required'),
    ],
    createProperty
  )
  .get(protect, getProperties);

router.get('/my-invitations', protect, requireRole('property_manager'), getMyInvitations);

router.route('/:id')
  .get(protect, getPropertyById)
  .put(protect, requireRole('landlord', 'admin'), updateProperty);

// Landlord invites PM (sends email invitation, PM must accept)
router.post('/:id/invite-manager', protect, requireRole('landlord', 'admin'), inviteManager);
// PM accepts or declines invitation
router.put('/:id/respond-invitation', protect, requireRole('property_manager'), respondToInvitation);
// Admin-only direct assignment (legacy)
router.put('/:id/assign-manager', protect, requireRole('admin'), assignManager);

module.exports = router;