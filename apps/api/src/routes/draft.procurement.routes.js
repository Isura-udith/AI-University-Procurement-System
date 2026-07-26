const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  getDraftItems,
  saveDraftItems,
  submitDraftItems,
  getPendingHodItems,
  hodApproveDraftItem,
  getPendingDraftItems,
  approveDraftItem,
  getApprovedDraftItems,
  compileToFinalMasterPlan,
  deleteDraftItem,
} = require('../controllers/draft.procurement.controller');

router.use(protect);

router.get('/', getDraftItems);
router.post('/save', saveDraftItems);
router.post('/submit', submitDraftItems);
router.get('/pending-hod', getPendingHodItems);
router.get('/pending', getPendingDraftItems);
router.get('/approved', getApprovedDraftItems);
router.post('/compile-final', compileToFinalMasterPlan);
router.post('/:id/hod-approve', hodApproveDraftItem);
router.post('/:id/approve', approveDraftItem);
router.delete('/:id', deleteDraftItem);

module.exports = router;
