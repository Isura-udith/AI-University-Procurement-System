/**
 * Route Index - API Route Registration
 */
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const procurementRoutes = require('./procurement.routes');
const tenderRoutes = require('./tender.routes');
const vendorRoutes = require('./vendor.routes');
const contractRoutes = require('./contract.routes');
const paymentRoutes = require('./payment.routes');
const notificationRoutes = require('./notification.routes');
const userRoutes = require('./user.routes');
const reportRoutes = require('./report.routes');
const auditLogRoutes = require('./audit.log.routes');
const aiRoutes = require('./ai.routes');
const messageRoutes = require('./message.routes');
const documentRoutes = require('./document.routes');
// Phase 1-4: Strategic Planning & Budget
const masterPlanRoutes = require('./master.plan.routes');
const draftProcurementRoutes = require('./draft.procurement.routes');
const finalMasterPlanRoutes = require('./final.master.plan.routes');
const annualPlanRoutes = require('./annual.plan.routes');
const budgetAllocationRoutes = require('./budget.allocation.routes');
// Phase 7-8: Store & Inventory
const inventoryRoutes = require('./inventory.routes');
// Workflow Engine
const workflowRoutes = require('./workflow.routes');

router.use('/auth', authRoutes);
router.use('/procurements', procurementRoutes);
router.use('/tenders', tenderRoutes);
router.use('/vendors', vendorRoutes);
router.use('/contracts', contractRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);
router.use('/reports', reportRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/ai', aiRoutes);
router.use('/messages', messageRoutes);
router.use('/documents', documentRoutes);
// Strategic Planning (Phases 1-4)
router.use('/master-plans', masterPlanRoutes);
router.use('/draft-procurements', draftProcurementRoutes);
router.use('/final-master-plans', finalMasterPlanRoutes);
router.use('/annual-plans', annualPlanRoutes);
router.use('/budget-allocations', budgetAllocationRoutes);
// Store & Inventory (Phases 7-8)
router.use('/inventory', inventoryRoutes);
// Workflow Engine (45-Step Lifecycle)
router.use('/workflow', workflowRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'UWU Smart Procurement API', version: '1.0.0', timestamp: new Date().toISOString() });
});

module.exports = router;
