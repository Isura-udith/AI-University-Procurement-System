/** Cron Jobs - Scheduled tasks */
const checkEscalations = async () => {
  const Procurement = require('../models/procurement.model');
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours
  const stalled = await Procurement.find({
    status: { $in: ['submitted', 'hod_approved', 'dean_approved', 'pmd_review'] },
    updatedAt: { $lt: cutoff },
  });
  for (const proc of stalled) {
    const pendingStage = proc.approvalChain.find(s => s.status === 'pending');
    if (pendingStage) {
      pendingStage.status = 'escalated';
      pendingStage.escalatedAt = new Date();
      pendingStage.escalationReason = 'Auto-escalated: No action for 48 hours';
      await proc.save();
    }
  }
  return stalled.length;
};

const checkContractExpiries = async () => {
  const Contract = require('../models/contract.model');
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return Contract.find({ status: 'active', endDate: { $lte: thirtyDays } });
};

module.exports = { checkEscalations, checkContractExpiries };
