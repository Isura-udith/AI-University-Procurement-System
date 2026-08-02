/**
 * Tender Routes - RBAC-enforced for 15 roles
 *
 * Access:
 *   - procurement_officer: Full tendering lifecycle (draft SPN, manage bid box, BOC)
 *   - tec_member: Evaluation workspace (view technical proposals, input marks)
 *   - admin: Full management
 *   - auditor: Read-only to all tender data (blocked from writes by readOnlyGuard)
 *   - vc, dean, bursar: Read access for oversight
 *   - supplier: Submit bids via bid box, request debriefing, submit appeals
 */
const express = require('express');
const router = express.Router();
const {
  createTender, getAllTenders, getTender, updateTender, deleteTender,
  publishTender, cancelTender, extendDeadline, closeBidding, openBidBox,
  getBids, getMyBids, submitBid, withdrawBid, generateMinutes, unsealBid,
  recordBidPrice, awardTender, issueLOA, submitAppeal, resolveAppeal,
  requestDebriefing, addClarification, answerClarification,
  evaluateBid, completeBidOpening, getEvaluationResults, submitEvaluation,
  addAddendum, assignCommittee, resolveDebriefing,
} = require('../controllers/tender.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { readOnlyGuard } = require('../middlewares/role.middleware');

router.use(protect);

// Read (oversight roles + procurement roles + auditor read-only + supplier for bid box)
router.get('/',
  authorize('procurement_officer', 'supplies_division', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'contract_manager', 'tec_member', 'auditor', 'super_admin', 'supplier'),
  getAllTenders
);
router.get('/my-bids',
  authorize('supplier', 'admin', 'super_admin'),
  getMyBids
);
router.get('/:id',
  authorize('procurement_officer', 'supplies_division', 'admin', 'vc', 'dean', 'bursar', 'finance_officer', 'contract_manager', 'tec_member', 'auditor', 'super_admin', 'supplier'),
  getTender
);

// Create, Update & Delete (write roles only)
router.post('/',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  createTender
);
router.put('/:id',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  updateTender
);
router.delete('/:id',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  deleteTender
);

// Publish & Cancel
router.post('/:id/publish',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  publishTender
);
router.post('/:id/cancel',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  cancelTender
);

// Deadline extension
router.post('/:id/extend-deadline',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  extendDeadline
);

// Bidding lifecycle
router.post('/:id/close-bidding',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  closeBidding
);
router.post('/:id/open-bid-box',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'super_admin'),
  readOnlyGuard,
  openBidBox
);

// Bids - read (includes auditor for oversight + supplier to see own bids)
router.get('/:id/bids',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'vc', 'auditor', 'super_admin', 'supplier'),
  getBids
);

// Bids - submit (supplier only + admin)
router.post('/:id/bids',
  authorize('supplier', 'admin', 'super_admin'),
  readOnlyGuard,
  submitBid
);
router.post('/:id/bids/:bidId/withdraw',
  authorize('supplier', 'admin', 'super_admin'),
  readOnlyGuard,
  withdrawBid
);

// Bids - unseal & record price (procurement operations)
router.post('/:id/bids/:bidId/unseal',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'super_admin'),
  readOnlyGuard,
  unsealBid
);
router.post('/:id/bids/:bidId/record-price',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'super_admin'),
  readOnlyGuard,
  recordBidPrice
);

// Opening minutes
router.post('/:id/generate-minutes',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'super_admin'),
  readOnlyGuard,
  generateMinutes
);

// Award (VC signs off on high-value awards)
router.post('/:id/award',
  authorize('procurement_officer', 'supplies_division', 'contract_manager', 'tec_member', 'admin', 'vc', 'super_admin'),
  readOnlyGuard,
  awardTender
);

// LOA (VC as Accounting Officer signs the Letter of Acceptance)
router.post('/:id/issue-loa',
  authorize('vc', 'contract_manager', 'admin', 'super_admin'),
  readOnlyGuard,
  issueLOA
);

// Appeals (supplier submits, procurement/admin/vc resolves)
router.post('/:id/appeals',
  authorize('supplier', 'procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  submitAppeal
);
router.post('/:id/appeals/:appealId/resolve',
  authorize('procurement_officer', 'supplies_division', 'admin', 'vc', 'super_admin'),
  readOnlyGuard,
  resolveAppeal
);

// Debriefing (supplier requests, procurement facilitates)
router.post('/:id/debriefing',
  authorize('supplier', 'procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  requestDebriefing
);

// Clarifications (suppliers + procurement)
router.post('/:id/clarifications',
  authorize('supplier', 'procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  addClarification
);
router.post('/:id/clarifications/:index/answer',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  answerClarification
);

// Evaluation (TEC members + procurement)
router.post('/:id/bids/:bidId/evaluate',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'super_admin'),
  readOnlyGuard,
  evaluateBid
);
router.get('/:id/evaluation-results',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'vc', 'auditor', 'super_admin'),
  getEvaluationResults
);
router.post('/:id/submit-evaluation',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'super_admin'),
  readOnlyGuard,
  submitEvaluation
);

// Complete bid opening ceremony
router.post('/:id/complete-opening',
  authorize('procurement_officer', 'supplies_division', 'tec_member', 'admin', 'super_admin'),
  readOnlyGuard,
  completeBidOpening
);

// Addenda
router.post('/:id/addenda',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  addAddendum
);

// Committee assignment (BEC/BOC)
router.put('/:id/committee',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  assignCommittee
);

// Debriefing resolution
router.post('/:id/debriefing/:debriefIndex/resolve',
  authorize('procurement_officer', 'supplies_division', 'admin', 'super_admin'),
  readOnlyGuard,
  resolveDebriefing
);

module.exports = router;
