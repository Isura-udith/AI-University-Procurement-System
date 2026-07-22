const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  getInventory, getInventoryItem, getInventoryStats, createInventoryItem, adjustStock, getItemHistory,
  createGRN, getGRNs, getGRN, inspectGRN,
  createIssuance, getIssuances, issueItems, confirmDeptReceipt, approveIssuance,
} = require('../controllers/inventory.controller');

router.use(protect);

// Inventory stock
router.get('/stats', getInventoryStats);
router.get('/items', getInventory);
router.post('/items', createInventoryItem);
router.get('/items/:id', getInventoryItem);
router.post('/items/:id/adjust', adjustStock);
router.get('/items/:id/history', getItemHistory);

// Goods Receipt Notes
router.get('/grn', getGRNs);
router.post('/grn', createGRN);
router.get('/grn/:id', getGRN);
router.post('/grn/:id/inspect', inspectGRN);

// Issuances (Phase 8: distribution to departments)
router.get('/issuances', getIssuances);
router.post('/issuances', createIssuance);
router.post('/issuances/:id/approve', approveIssuance);
router.post('/issuances/:id/issue', issueItems);
router.post('/issuances/:id/confirm-receipt', confirmDeptReceipt);

module.exports = router;
