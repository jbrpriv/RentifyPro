const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { upload, cloudinary } = require('../config/cloudinary');

// @desc    Upload up to 5 property images
// @route   POST /api/upload/property-images
// @access  Private
router.post('/property-images', protect, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const urls = req.files.map((file) => file.path);
    res.json({ urls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete an image from Cloudinary
// @route   DELETE /api/upload/property-images
// @access  Private
router.delete('/property-images', protect, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    // Extract public_id from URL
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const publicId = `rentifypro/properties/${filename}`;

    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;