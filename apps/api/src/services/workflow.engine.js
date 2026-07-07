/**
 * Workflow Engine Service
 * ─────────────────────────────────────────────────────────────
 * Centralized 45-step procurement lifecycle management.
 * Maps each workflow step to its phase, actor, and status.
 * Provides helpers for auto-advancement between phases.
 */

// ─── 45-Step Workflow Definition ───────────────────────────────
const WORKFLOW_STEPS = [
  // Phase 1: Strategic Procurement Planning (3-Year Master Procurement Plan)
  { step: 1,  phase: 1, title: 'Department Division (HOD)',          actor: 'HOD',              entity: 'MasterPlan', status: 'draft' },
  { step: 2,  phase: 1, title: 'Identify Requirements for 3 Years', actor: 'HOD',              entity: 'MasterPlan', status: 'submitted' },
  { step: 3,  phase: 1, title: 'Faculty Dean Review',               actor: 'Dean',             entity: 'MasterPlan', status: 'dean_review' },
  { step: 4,  phase: 1, title: 'Bursar Cost Estimation',            actor: 'Bursar',           entity: 'MasterPlan', status: 'bursar_estimation' },
  { step: 5,  phase: 1, title: 'Finance Committee Review',          actor: 'Finance Committee',entity: 'MasterPlan', status: 'finance_committee_review' },
  { step: 6,  phase: 1, title: 'Vice Chancellor Approval',          actor: 'Vice Chancellor',  entity: 'MasterPlan', status: 'vc_review' },
  { step: 7,  phase: 1, title: 'Council Approval',                  actor: 'Council',          entity: 'MasterPlan', status: 'council_review' },
  { step: 8,  phase: 1, title: '3-Year Master Procurement Plan',    actor: 'System',           entity: 'MasterPlan', status: 'active' },

  // Phase 2: Annual Procurement Planning
  { step: 9,  phase: 2, title: 'Divide into Annual Plans',          actor: 'Procurement Officer', entity: 'AnnualPlan', status: 'draft' },
  { step: 10, phase: 2, title: 'Item Budget Preparation',           actor: 'Procurement Officer', entity: 'AnnualPlan', status: 'draft' },
  { step: 11, phase: 2, title: 'Annual Budget Plan',                actor: 'Procurement Officer', entity: 'AnnualPlan', status: 'submitted' },

  // Phase 3: Budget Approval Process
  { step: 12, phase: 3, title: 'Faculty Dean Approval',             actor: 'Dean',             entity: 'AnnualPlan', status: 'dean_review' },
  { step: 13, phase: 3, title: 'Bursar Review',                     actor: 'Bursar',           entity: 'AnnualPlan', status: 'bursar_review' },
  { step: 14, phase: 3, title: 'Finance Committee Review',          actor: 'Finance Committee',entity: 'AnnualPlan', status: 'finance_committee_review' },
  { step: 15, phase: 3, title: 'Vice Chancellor Approval',          actor: 'Vice Chancellor',  entity: 'AnnualPlan', status: 'vc_review' },
  { step: 16, phase: 3, title: 'Council Approval',                  actor: 'Council',          entity: 'AnnualPlan', status: 'council_review' },
  { step: 17, phase: 3, title: 'UGC Review',                        actor: 'UGC',              entity: 'AnnualPlan', status: 'ugc_submitted' },
  { step: 18, phase: 3, title: 'Treasury Review',                   actor: 'Treasury',         entity: 'AnnualPlan', status: 'treasury_submitted' },
  { step: 19, phase: 3, title: 'Parliament Approval',               actor: 'Parliament',       entity: 'AnnualPlan', status: 'parliament_submitted' },
  { step: 20, phase: 3, title: 'Budget Allocation to University',   actor: 'System',           entity: 'AnnualPlan', status: 'parliament_approved' },

  // Phase 4: Internal Budget Distribution
  { step: 21, phase: 4, title: 'University Receives Approved Budget',actor: 'Bursar',          entity: 'AnnualPlan',       status: 'budget_received' },
  { step: 22, phase: 4, title: 'Vice Chancellor Distribution',      actor: 'Vice Chancellor',  entity: 'BudgetAllocation', status: 'vc_distributed' },
  { step: 23, phase: 4, title: 'Finance Committee Allocation',      actor: 'Finance Committee',entity: 'BudgetAllocation', status: 'finance_committee_verified' },
  { step: 24, phase: 4, title: 'Bursar Distribution',               actor: 'Bursar',           entity: 'BudgetAllocation', status: 'bursar_confirmed' },
  { step: 25, phase: 4, title: 'Faculty Dean Allocation',           actor: 'Dean',             entity: 'BudgetAllocation', status: 'dean_notified' },
  { step: 26, phase: 4, title: 'Department Division (HOD)',          actor: 'HOD',              entity: 'BudgetAllocation', status: 'complete' },

  // Phase 5: Procurement Request Process
  { step: 27, phase: 5, title: 'Department User Request',           actor: 'Department User',  entity: 'Procurement', status: 'draft' },
  { step: 28, phase: 5, title: 'Department Head (HOD) Review',      actor: 'HOD',              entity: 'Procurement', status: 'submitted' },
  { step: 29, phase: 5, title: 'Value-Based Approval',              actor: 'Varies',           entity: 'Procurement', status: 'under_review' },

  // Phase 6: Tender and Supplier Selection
  { step: 30, phase: 6, title: 'Procurement Committee Review',      actor: 'Procurement Committee', entity: 'Procurement', status: 'committee_assigned' },
  { step: 31, phase: 6, title: 'Publish Tender',                    actor: 'Procurement Officer',   entity: 'Tender', status: 'published' },
  { step: 32, phase: 6, title: 'Suppliers Submit Bids',             actor: 'Suppliers',             entity: 'Tender', status: 'bidding' },
  { step: 33, phase: 6, title: 'Technical Evaluation (TEC)',        actor: 'TEC',                   entity: 'Tender', status: 'evaluation' },
  { step: 34, phase: 6, title: 'Bid Evaluation',                    actor: 'BEC',                   entity: 'Tender', status: 'evaluation' },
  { step: 35, phase: 6, title: 'Supplier Selection',                actor: 'Procurement Committee', entity: 'Tender', status: 'awarded' },
  { step: 36, phase: 6, title: 'Award Contract',                    actor: 'VC',                    entity: 'Contract', status: 'active' },

  // Phase 7: Purchasing and Receiving
  { step: 37, phase: 7, title: 'Selected Supplier Delivers',        actor: 'Supplier',         entity: 'Contract',  status: 'in_progress' },
  { step: 38, phase: 7, title: 'Supplies Department Receives',      actor: 'Store Manager',    entity: 'GRN',       status: 'pending_inspection' },
  { step: 39, phase: 7, title: 'Store Acceptance',                  actor: 'Store Manager',    entity: 'GRN',       status: 'accepted' },
  { step: 40, phase: 7, title: 'Goods Inspection',                  actor: 'Inspector',        entity: 'GRN',       status: 'inventory_updated' },
  { step: 41, phase: 7, title: 'Inventory Update',                  actor: 'System',           entity: 'InventoryItem', status: 'active' },

  // Phase 8: Distribution to Departments
  { step: 42, phase: 8, title: 'Department Request',                actor: 'Department User',  entity: 'Issuance', status: 'requested' },
  { step: 43, phase: 8, title: 'Store Issues Items',                actor: 'Store Manager',    entity: 'Issuance', status: 'issued' },
  { step: 44, phase: 8, title: 'Department Receives Items',         actor: 'Department User',  entity: 'Issuance', status: 'received_by_department' },
  { step: 45, phase: 8, title: 'Procurement Completed',             actor: 'System',           entity: 'Procurement', status: 'completed' },
];

// ─── Phase Definitions ─────────────────────────────────────────
const PHASES = [
  { id: 1, title: 'Strategic Procurement Planning',   steps: [1, 8],   color: 'violet' },
  { id: 2, title: 'Annual Procurement Planning',      steps: [9, 11],  color: 'blue' },
  { id: 3, title: 'Budget Approval Process',          steps: [12, 20], color: 'amber' },
  { id: 4, title: 'Internal Budget Distribution',     steps: [21, 26], color: 'emerald' },
  { id: 5, title: 'Procurement Request Process',      steps: [27, 29], color: 'cyan' },
  { id: 6, title: 'Tender & Supplier Selection',      steps: [30, 36], color: 'indigo' },
  { id: 7, title: 'Purchasing & Receiving',            steps: [37, 41], color: 'orange' },
  { id: 8, title: 'Distribution to Departments',      steps: [42, 45], color: 'rose' },
];

// ─── Value-Based Approval Thresholds (Step 29) ─────────────────
const APPROVAL_THRESHOLDS = [
  { maxValue: 200000,   authority: 'dean',               label: 'Faculty Dean' },
  { maxValue: 500000,   authority: 'bursar',             label: 'Bursar' },
  { maxValue: 1000000,  authority: 'vice_chancellor',    label: 'Vice Chancellor' },
  { maxValue: Infinity, authority: 'procurement_committee', label: 'Procurement Committee' },
];

/**
 * Determine the approval authority for a procurement based on its value.
 */
function getApprovalAuthority(totalEstimatedCost) {
  for (const threshold of APPROVAL_THRESHOLDS) {
    if (totalEstimatedCost <= threshold.maxValue) {
      return threshold;
    }
  }
  return APPROVAL_THRESHOLDS[APPROVAL_THRESHOLDS.length - 1];
}

/**
 * Get the current workflow step number based on entity type and status.
 */
function getWorkflowStep(entity, status) {
  const match = WORKFLOW_STEPS.find(s => s.entity === entity && s.status === status);
  return match ? match.step : null;
}

/**
 * Get the phase information for a given step number.
 */
function getPhaseForStep(stepNumber) {
  return PHASES.find(p => stepNumber >= p.steps[0] && stepNumber <= p.steps[1]) || null;
}

/**
 * Get all steps in a phase.
 */
function getStepsInPhase(phaseId) {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) return [];
  return WORKFLOW_STEPS.filter(s => s.step >= phase.steps[0] && s.step <= phase.steps[1]);
}

/**
 * Compute the overall workflow step for a procurement based on its linked entities.
 * This resolves the highest completed step across all related entities.
 */
function computeOverallStep(procurement, linkedEntities = {}) {
  let highestStep = 0;

  // Check procurement status itself
  const procStep = getWorkflowStep('Procurement', procurement.status);
  if (procStep) highestStep = Math.max(highestStep, procStep);

  // Check linked tender
  if (linkedEntities.tender) {
    const tenderStep = getWorkflowStep('Tender', linkedEntities.tender.status);
    if (tenderStep) highestStep = Math.max(highestStep, tenderStep);
  }

  // Check linked contract
  if (linkedEntities.contract) {
    const contractStep = getWorkflowStep('Contract', linkedEntities.contract.status);
    if (contractStep) highestStep = Math.max(highestStep, contractStep);
  }

  // Check linked GRN
  if (linkedEntities.grn) {
    const grnStep = getWorkflowStep('GRN', linkedEntities.grn.status);
    if (grnStep) highestStep = Math.max(highestStep, grnStep);
  }

  // Check linked issuance
  if (linkedEntities.issuance) {
    const issStep = getWorkflowStep('Issuance', linkedEntities.issuance.status);
    if (issStep) highestStep = Math.max(highestStep, issStep);
  }

  return highestStep || 27; // Default to step 27 (procurement draft)
}

/**
 * Get the next required action based on current step.
 */
function getNextAction(currentStep) {
  const nextStep = WORKFLOW_STEPS.find(s => s.step === currentStep + 1);
  if (!nextStep) return { step: 45, title: 'Procurement Completed', actor: 'System' };
  return nextStep;
}

/**
 * Check if a phase is complete based on current step.
 */
function isPhaseComplete(phaseId, currentStep) {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) return false;
  return currentStep > phase.steps[1];
}

/**
 * Get phase progress percentage.
 */
function getPhaseProgress(phaseId, currentStep) {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) return 0;
  const [start, end] = phase.steps;
  const totalSteps = end - start + 1;
  if (currentStep < start) return 0;
  if (currentStep > end) return 100;
  return Math.round(((currentStep - start + 1) / totalSteps) * 100);
}

module.exports = {
  WORKFLOW_STEPS,
  PHASES,
  APPROVAL_THRESHOLDS,
  getApprovalAuthority,
  getWorkflowStep,
  getPhaseForStep,
  getStepsInPhase,
  computeOverallStep,
  getNextAction,
  isPhaseComplete,
  getPhaseProgress,
};
