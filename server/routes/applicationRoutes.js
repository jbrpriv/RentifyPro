const express = require('express');
const router  = express.Router();
const { protect, requireRole } = require('../middlewares/authMiddleware');
const {
  getApplications,
  getApplicationById,
  withdrawApplication,
} = require('../controllers/applicationController');

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: >
 *       Get applications — tenant sees their own, landlord/PM sees incoming on
 *       their properties, admin sees all
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of applications
 *
 * /api/applications/{id}:
 *   get:
 *     summary: Get a single application by ID (tenant, landlord, or admin)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *   delete:
 *     summary: Tenant withdraws a pending application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

// GET all applications (role-aware)
router.get('/', protect, getApplications);

// GET / DELETE single application
router.route('/:id')
  .get(protect, getApplicationById)
  .delete(protect, requireRole('tenant'), withdrawApplication);

module.exports = router;