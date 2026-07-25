const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  getDraftItems,
  saveDraftItems,
  submitDraftItems,
  getPendingDraftItems,
  approveDraftItem,
  getApprovedDraftItems,
  deleteDraftItem,
} = require('../controllers/draft.procurement.controller');

router.use(protect);

router.get('/', getDraftItems);
router.post('/save', saveDraftItems);
router.post('/submit', submitDraftItems);
router.get('/pending', getPendingDraftItems);
router.get('/approved', getApprovedDraftItems);
router.post('/:id/approve', approveDraftItem);
router.delete('/:id', deleteDraftItem);

module.exports = router;
