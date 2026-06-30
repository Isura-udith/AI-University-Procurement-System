/**
 * Workflow Routes
 * Exposes the 45-step workflow engine definition and status computation.
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { WORKFLOW_STEPS, PHASES, APPROVAL_THRESHOLDS, getApprovalAuthority } = require('../services/workflow.engine');
const { success } = require('../utils/response');

// Public: Get workflow definition (steps + phases)
router.get('/definition', (req, res) => {
  return success(res, { steps: WORKFLOW_STEPS, phases: PHASES, approvalThresholds: APPROVAL_THRESHOLDS });
});

// Protected: Get approval authority for a given amount
router.get('/approval-authority', protect, (req, res) => {
  const amount = Number(req.query.amount);
  if (!amount || isNaN(amount)) return res.status(400).json({ message: 'amount query param required' });
  return success(res, getApprovalAuthority(amount));
});

module.exports = router;
