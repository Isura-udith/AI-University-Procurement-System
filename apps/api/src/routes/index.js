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

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'UWU Smart Procurement API', version: '1.0.0', timestamp: new Date().toISOString() });
});

module.exports = router;
