const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { createAgreement, downloadAgreementPDF, getAgreements, signAgreement, proposeRenewal, respondToRenewal } = require('../controllers/agreementController');
// Route to Create a new Agreement (Protected)
/**
 * @swagger
 * /api/agreements:
 *   get:
 *     summary: Get all agreements for the logged-in user
 *     tags: [Agreements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agreements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agreement'
 *
 *   post:
 *     summary: Create a new rental agreement
 *     tags: [Agreements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, propertyId, startDate, endDate, rentAmount, depositAmount]
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: 64a1b2c3d4e5f6789
 *               propertyId:
 *                 type: string
 *                 example: 64a1b2c3d4e5f6789
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2027-01-01"
 *               rentAmount:
 *                 type: number
 *                 example: 50000
 *               depositAmount:
 *                 type: number
 *                 example: 100000
 *     responses:
 *       201:
 *         description: Agreement created
 *       403:
 *         description: Not authorized to lease this property
 *
 * /api/agreements/{id}/pdf:
 *   get:
 *     summary: Download agreement as PDF
 *     tags: [Agreements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agreement ID
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Agreement not found
 */
router.route('/')
  .post(protect, createAgreement)
  .get(protect, getAgreements);


// Route to Download Agreement PDF (Protected)
router.get('/:id/pdf', protect, downloadAgreementPDF);


router.put('/:id/sign', protect, signAgreement);
router.post('/:id/renew',          protect, proposeRenewal);
router.put('/:id/renew/respond',   protect, respondToRenewal);

module.exports = router;