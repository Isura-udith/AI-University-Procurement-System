const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  createAnnualPlan, getAnnualPlans, getAnnualPlan, updateAnnualPlan,
  submitAnnualPlan, approveAnnualPlan, recordExternalApproval,
  confirmBudgetReceived, getPendingAnnualPlans,
} = require('../controllers/annual.plan.controller');

router.use(protect);

router.get('/pending', getPendingAnnualPlans);
router.get('/', getAnnualPlans);
router.post('/', createAnnualPlan);
router.get('/:id', getAnnualPlan);
router.put('/:id', updateAnnualPlan);
router.post('/:id/submit', submitAnnualPlan);
router.post('/:id/approve', approveAnnualPlan);
router.post('/:id/external-approval', recordExternalApproval);
router.post('/:id/confirm-budget', confirmBudgetReceived);

module.exports = router;
