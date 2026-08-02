/**
 * Universal status badge with consistent color mapping.
 */
const STATUS_COLORS = {
  // Procurement
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'pending-approval': { label: 'Pending Approval', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  submitted: { label: 'Submitted', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  under_review: { label: 'Under Review', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  hod_approved: { label: 'HOD Approved', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  dean_approved: { label: 'Dean Approved', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  pmd_approved: { label: 'PMD Approved', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  bursar_approved: { label: 'Bursar Approved', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  finance_committee_approved: { label: 'Finance Com. Approved', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  vc_approved: { label: 'VC Approved', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  council_approved: { label: 'Council Approved', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  procurement_committee_approved: { label: 'Proc. Committee Approved', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pmd_review: { label: 'PMD Review', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-550' },
  'budget-locked': { label: 'Budget Locked', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  budget_locked: { label: 'Budget Locked', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  tendering: { label: 'Tendering', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  committee_assigned: { label: 'Committee Assigned', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-450' },
  tender_preparation: { label: 'Tender Prep', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  three_way_match: { label: '3-Way Match', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  payment_pending: { label: 'Payment Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  completed: { label: 'Completed', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  // Tenders
  preparation: { label: 'Preparation', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  published: { label: 'Published', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  evaluation: { label: 'Under Evaluation', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  awarded: { label: 'Awarded', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  // Awards
  standstill: { label: 'Standstill', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  cleared: { label: 'Cleared', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  appealed: { label: 'Appealed', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  // Contracts
  active: { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  expiring: { label: 'Expiring Soon', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  terminated: { label: 'Terminated', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  suspended: { label: 'Suspended', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  // Bids
  received: { label: 'Received', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  opened: { label: 'Opened', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  sealed: { label: 'Sealed', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  // Generic
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  paid: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  overdue: { label: 'Overdue', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  matched: { label: 'Matched', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  discrepancy: { label: 'Discrepancy', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  locked: { label: 'Locked', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  insufficient: { label: 'Insufficient', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function StatusBadge({ status, label, size = 'sm', showDot = false }) {
  const config = STATUS_COLORS[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
  const displayLabel = label || config.label;

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center space-x-1.5 rounded-full font-semibold ${config.bg} ${config.text} ${sizes[size]}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      <span>{displayLabel}</span>
    </span>
  );
}

export { STATUS_COLORS };
