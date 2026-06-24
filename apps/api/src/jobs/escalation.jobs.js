/**
 * Escalation Jobs - SLA monitoring and automatic escalation
 * Checks for stalled approvals at 48h (warning) and 72h (escalation).
 */
const Procurement = require('../models/procurement.model');
const User = require('../models/user.model');
const workflowTriggers = require('../services/workflow.triggers');
const logger = require('../config/logger');
const env = require('../config/env');

// Role escalation hierarchy
const ESCALATION_MAP = {
  department_head: 'dean',
  dean: 'vc',
  finance_officer: 'bursar',
  bursar: 'vc',
  procurement_officer: 'vc',
};

// Stage-to-role mapping for pending approvals
const STAGE_ROLE_MAP = {
  submitted: 'department_head',
  hod_approved: 'dean',
  dean_approved: 'finance_officer',
  pmd_review: 'bursar',
  budget_locked: 'procurement_officer',
};

/**
 * Check for SLA warnings (48h) and escalations (72h)
 */
const runSLACheck = async () => {
  const warningCutoff = new Date(Date.now() - env.SLA_WARNING_HOURS * 60 * 60 * 1000);
  const escalationCutoff = new Date(Date.now() - env.SLA_ESCALATION_HOURS * 60 * 60 * 1000);

  const stalledStatuses = Object.keys(STAGE_ROLE_MAP);
  const stalled = await Procurement.find({
    status: { $in: stalledStatuses },
    updatedAt: { $lt: warningCutoff },
  });

  let warnings = 0, escalations = 0;

  for (const proc of stalled) {
    const role = STAGE_ROLE_MAP[proc.status];
    if (!role) continue;

    const assignees = await User.find({ tenantId: proc.tenantId, role, isActive: true })
      .select('_id email role firstName lastName').lean();

    if (assignees.length === 0) continue;

    const hoursElapsed = Math.round((Date.now() - proc.updatedAt.getTime()) / (1000 * 60 * 60));

    if (proc.updatedAt < escalationCutoff) {
      // 72h+ → Escalate
      const escalateToRole = ESCALATION_MAP[role];
      if (escalateToRole) {
        const escalateTo = await User.findOne({ tenantId: proc.tenantId, role: escalateToRole, isActive: true })
          .select('_id email role firstName lastName').lean();

        if (escalateTo) {
          await workflowTriggers.slaEscalation(proc.tenantId, proc, assignees[0], escalateTo);

          // Mark stage as escalated
          const pendingStage = proc.approvalChain.find(s => s.status === 'pending');
          if (pendingStage) {
            pendingStage.status = 'escalated';
            pendingStage.escalatedAt = new Date();
            pendingStage.escalationReason = `Auto-escalated: No action for ${hoursElapsed} hours`;
            proc.lastEscalationCheck = new Date();
            await proc.save();
          }

          escalations++;
        }
      }
    } else {
      // 48-72h → Warning reminder
      for (const assignee of assignees) {
        await workflowTriggers.slaWarning(proc.tenantId, proc, assignee, hoursElapsed);
      }
      proc.lastEscalationCheck = new Date();
      await proc.save();
      warnings++;
    }
  }

  logger.info('SLA check complete', { stalled: stalled.length, warnings, escalations });
  return { stalled: stalled.length, warnings, escalations };
};

module.exports = { runSLACheck };
