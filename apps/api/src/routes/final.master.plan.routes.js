const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  createFinalMasterPlan,
  getFinalMasterPlans,
  getFinalMasterPlan,
  updateFinalMasterPlan,
  addItemsToFinalPlan,
  submitFinalMasterPlan,
  approveFinalMasterPlan,
  getPendingFinalMasterPlans,
  getApprovedFinalPlanItems,
} = require('../controllers/final.master.plan.controller');

router.use(protect);

router.get('/pending', getPendingFinalMasterPlans);
router.get('/approved-items', getApprovedFinalPlanItems);
router.get('/', getFinalMasterPlans);
router.post('/', createFinalMasterPlan);
router.get('/:id', getFinalMasterPlan);
router.put('/:id', updateFinalMasterPlan);
router.post('/:id/add-items', addItemsToFinalPlan);
router.post('/:id/submit', submitFinalMasterPlan);
router.post('/:id/approve', approveFinalMasterPlan);

module.exports = router;
