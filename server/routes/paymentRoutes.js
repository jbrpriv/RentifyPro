const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createCheckoutSession,
  getRentSchedule,
  getPaymentHistory,
} = require('../controllers/paymentController');

// Create Stripe checkout session
router.post('/create-checkout-session', protect, createCheckoutSession);

// Get rent schedule for an agreement
router.get('/schedule/:agreementId', protect, getRentSchedule);

// Get payment history
router.get('/history', protect, getPaymentHistory);

// NOTE: Webhook route is registered directly in server.js BEFORE express.json()
// so that the raw body is preserved for Stripe signature verification

module.exports = router;