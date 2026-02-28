const express = require('express');
const router = express.Router();
const { protect, isAdmin, isLawReviewer } = require('../middlewares/authMiddleware');
const {
  getStats,
  getUsers,
  getUserById,
  toggleUserBan,
  changeUserRole,
  getAllAgreements,
  getAuditLogs,
  getClauses,
  createClause,
  reviewClause,
  archiveClause,
  getAllProperties,
  kickTenantFromProperty,
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(protect, isAdmin);

// ─── Platform Stats ───────────────────────────────────────────────────────────
router.get('/stats', getStats);

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/ban', toggleUserBan);
router.put('/users/:id/role', changeUserRole);

// ─── Agreements Monitor ───────────────────────────────────────────────────────
router.get('/agreements', getAllAgreements);

// ─── Property Management ─────────────────────────────────────────────────────
router.get('/properties', getAllProperties);
router.post('/properties/:id/kick-tenant', kickTenantFromProperty);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', getAuditLogs);

// ─── Clause / Template Management (Admin + Law Reviewer) ─────────────────────
// Override isAdmin for clause routes to also allow law_reviewer
router.get('/clauses', protect, isLawReviewer, getClauses);
router.post('/clauses', protect, isLawReviewer, createClause);
router.put('/clauses/:id/approve', protect, isLawReviewer, reviewClause);
router.put('/clauses/:id/archive', protect, isAdmin, archiveClause);

module.exports = router;