const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getPublicListings,
  getListingById,
  applyForListing,
  getLandlordApplications,
  updateApplicationStatus,
  toggleListingPublish,
} = require('../controllers/listingController');

// Public routes (no auth)
router.get('/', getPublicListings);
router.get('/applications', protect, getLandlordApplications);
router.get('/:id', getListingById);

// Protected routes
router.post('/:id/apply', protect, applyForListing);
router.put('/applications/:id', protect, updateApplicationStatus);
router.put('/:id/publish', protect, toggleListingPublish);

module.exports = router;