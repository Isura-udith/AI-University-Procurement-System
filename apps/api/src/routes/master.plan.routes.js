const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  createMasterPlan, getMasterPlans, getMasterPlan,
  updateMasterPlan, submitMasterPlan, approveMasterPlan, getPendingMasterPlans,
} = require('../controllers/master.plan.controller');

router.use(protect);

router.get('/pending', getPendingMasterPlans);
router.get('/', getMasterPlans);
router.post('/', createMasterPlan);
router.get('/:id', getMasterPlan);
router.put('/:id', updateMasterPlan);
router.post('/:id/submit', submitMasterPlan);
router.post('/:id/approve', approveMasterPlan);

module.exports = router;
