import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaCheck, FaTimes, FaUser, FaClock, FaCommentDots, FaCheckDouble, FaSpinner, FaEye, FaExclamationTriangle, FaInfoCircle, FaArrowRight } from 'react-icons/fa';
import WorkflowTracker from '../../../components/WorkflowTracker';
import ConfirmModal from '../../../components/ConfirmModal';
import procurementService from '../../../services/procurement.service';

// Approval thresholds from Step 29
const APPROVAL_THRESHOLDS = [
  { max: 200000, label: 'Up to Rs. 200,000', authority: 'Faculty Dean', color: 'blue' },
  { max: 500000, label: 'Rs. 200,001 – 500,000', authority: 'Faculty Dean', color: 'blue' },
  { max: 1000000, label: 'Rs. 500,001 – 1,000,000', authority: 'Vice Chancellor', color: 'violet' },
  { max: Infinity, label: 'Above Rs. 1,000,000', authority: 'Procurement Committee', color: 'rose' },
];

function getApprovalAuthority(tce) {
  if (!tce || tce <= 0) return null;
  return APPROVAL_THRESHOLDS.find(t => tce <= t.max) || APPROVAL_THRESHOLDS[APPROVAL_THRESHOLDS.length - 1];
}

// Map user role to the approval stage they can act on
const ROLE_TO_STAGE = {
  department_head: 'hod',
  dean: 'dean',
  bursar: 'bursar',
  finance_committee: 'finance_committee',
  finance_officer: 'finance_committee',
  procurement_officer: 'pmd',
  vc: 'vice_chancellor',
  admin: null,       // admin can approve any stage
  super_admin: null,  // super_admin can approve any stage
};

// Human-readable labels for each approval stage
const STAGE_LABELS = {
  hod: 'Head of Department (HOD)',
  dean: 'Faculty Dean',
  pmd: 'Procurement Officer (PMD)',
  bursar: 'Bursar',
  finance_committee: 'Finance Committee',
  vice_chancellor: 'Vice-Chancellor',
};

export default function ApprovalsPage() {
  const { user } = useSelector(state => state.auth);
  const userRole = user?.role || 'department_user';

  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);

  // The approval stage this user's role is responsible for
  const myStage = ROLE_TO_STAGE[userRole];
  const isAdminRole = userRole === 'admin' || userRole === 'super_admin';

  // Fetch pending approvals
  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await procurementService.getPendingApprovals();
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setRequisitions(data);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
      setError('Failed to load pending approvals. Please check your connection and try again.');
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await procurementService.getPendingApprovals();
        const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setRequisitions(data);
      } catch (err) {
        console.error('Failed to fetch pending approvals:', err);
        setError('Failed to load pending approvals. Please check your connection and try again.');
        setRequisitions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Get the mapped approval chain for display
  const getMappedApprovals = (procurement) => {
    if (!procurement) return [];
    if (procurement.approvals && !procurement.approvalChain) return procurement.approvals;
    return (procurement.approvalChain || []).map(a => {
      let roleLabel = 'Approver';
      if (a.stage === 'hod') roleLabel = `HOD - ${procurement.department || procurement.faculty || ''}`;
      else if (a.stage === 'dean') roleLabel = `Dean - ${procurement.faculty || ''}`;
      else if (a.stage === 'pmd') roleLabel = 'Procurement Officer (PMD)';
      else if (a.stage === 'bursar') roleLabel = 'Bursar';
      else if (a.stage === 'finance_committee') roleLabel = 'Finance Committee';
      else if (a.stage === 'vice_chancellor') roleLabel = 'Vice-Chancellor';

      const approverName = a.approver
        ? `${a.approver.firstName} ${a.approver.lastName}`
        : (a.stage === 'hod' ? 'Head of Department' : a.stage === 'dean' ? 'Faculty Dean' : a.stage === 'pmd' ? 'Procurement Officer (PMD)' : a.stage === 'bursar' ? 'Bursar' : a.stage === 'finance_committee' ? 'Finance Committee' : a.stage === 'vice_chancellor' ? 'Vice-Chancellor' : 'Approver');

      return {
        role: roleLabel,
        name: approverName,
        status: a.status,
        date: a.actionDate ? new Date(a.actionDate).toISOString().split('T')[0] : null,
        comments: a.comments,
        stage: a.stage
      };
    });
  };

  // Determine which stage is currently pending for a given procurement
  const getCurrentPendingStage = (procurement) => {
    if (!procurement) return null;
    const chain = procurement.approvalChain || [];
    const pendingEntry = chain.find(a => a.status === 'pending');
    return pendingEntry?.stage || null;
  };

  // Check if the current user can approve the selected procurement
  const canUserApprove = (procurement) => {
    if (!procurement) return false;
    if (isAdminRole) return true; // admins can approve any stage
    const pendingStage = getCurrentPendingStage(procurement);
    return pendingStage === myStage;
  };

  // Approve action
  const handleApprove = async () => {
    if (!selected) return;

    const pendingStage = getCurrentPendingStage(selected);
    const stageSlug = pendingStage || myStage || 'hod';

    try {
      await procurementService.approve(selected._id, {
        stage: stageSlug,
        comments: comment,
      });

      const stageLabel = STAGE_LABELS[stageSlug] || stageSlug;
      toast.success(`✅ Approved at ${stageLabel} stage`);

      // Refresh the approvals list from the API
      await fetchApprovals();
      setSelected(null);
    } catch (err) {
      const errMsg = err?.message || err?.error || 'Approval failed';
      toast.error(`❌ ${errMsg}`);
    }

    setComment('');
    setApproveModal(false);
  };

  // Reject action
  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error('Please provide a reason for returning the requisition.');
      return;
    }

    if (!selected) return;

    const pendingStage = getCurrentPendingStage(selected);
    const stageSlug = pendingStage || myStage || 'hod';

    try {
      await procurementService.reject(selected._id, {
        stage: stageSlug,
        comments: comment,
      });

      toast.warning(`↩ "${selected.title}" returned to requisitioning officer with remarks.`);

      // Refresh the approvals list from the API
      await fetchApprovals();
      setSelected(null);
    } catch (err) {
      const errMsg = err?.message || err?.error || 'Rejection failed';
      toast.error(`❌ ${errMsg}`);
    }

    setComment('');
    setRejectModal(false);
  };

  // Get a display label for the user's approval role
  const getRoleDisplayLabel = () => {
    if (isAdminRole) return 'Administrator (All Stages)';
    return STAGE_LABELS[myStage] || userRole;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Multi-Level Approval Queue</h1>
        <p className="text-sm text-slate-500 mt-1">Stage 3: HOD → Dean → PMD → Bursar → Finance Committee → VC approval chain</p>
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Your Role: {getRoleDisplayLabel()}
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start space-x-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" size={16} />
          <div>
            <p className="text-sm font-semibold text-red-800">Error Loading Approvals</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            <button onClick={fetchApprovals} className="text-xs font-semibold text-red-700 hover:text-red-900 mt-2 underline">
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
          <span className="text-sm text-slate-500">Loading approval queue...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Pending Approvals ({requisitions.length})</p>
            {requisitions.length === 0 && !error && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                <FaCheckDouble className="mx-auto text-emerald-400 mb-2" size={24} />
                <p className="text-sm text-emerald-700 font-semibold">All caught up!</p>
                <p className="text-xs text-emerald-600 mt-1">No pending approvals in your queue.</p>
              </div>
            )}
            {requisitions.map(req => {
              const pendingStage = getCurrentPendingStage(req);
              const displayStage = pendingStage === 'hod' ? 'HOD' : pendingStage === 'dean' ? 'Dean' : pendingStage === 'pmd' ? 'PMD' : pendingStage === 'bursar' ? 'Bursar' : pendingStage === 'finance_committee' ? 'Finance Com.' : pendingStage === 'vice_chancellor' ? 'VC' : pendingStage ? pendingStage.toUpperCase() : 'N/A';
              const isSelected = (selected?._id || selected?.id) === (req._id || req.id);
              return (
                <button
                  key={req._id || req.id}
                  onClick={() => setSelected(req)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <p className="text-xs font-mono text-slate-500">{req.referenceNumber || req.id}</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{req.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-555">{req.faculty}</span>
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Awaiting {displayStage}</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-700 mt-1.5">LKR {(req.totalEstimatedCost || req.tce || 0).toLocaleString()}</p>
                </button>
              );
            })}
          </div>

          {/* Detail View */}
          <div className="lg:col-span-2">
            {selected ? (() => {
              const userCanApprove = canUserApprove(selected);
              const pendingStage = getCurrentPendingStage(selected);
              const pendingStageLabel = STAGE_LABELS[pendingStage] || pendingStage || 'Unknown';

              return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-slide-up">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-slate-500">{selected.referenceNumber || selected.id}</p>
                        <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-700">LKR {(selected.totalEstimatedCost || selected.tce || 0).toLocaleString()}</span>
                        <Link to={`/procurements/${selected._id || selected.id}`} className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 mt-1 justify-end">
                          <FaEye size={9} /> <span>View Full Details</span>
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center space-x-1"><FaUser size={10} /> <span>{selected.officer || (selected.requestedBy ? `${selected.requestedBy.firstName} ${selected.requestedBy.lastName}` : 'Requisitioning Officer')}</span></span>
                      <span>{selected.faculty}</span>
                    </div>
                  </div>

                  {/* Compact Workflow */}
                  <div className="px-6 py-3 border-b border-slate-100 bg-white">
                    <WorkflowTracker currentStage={selected.stage || selected.currentStage || 3} compact />
                  </div>

                  {/* Current Stage Info */}
                  <div className="px-6 py-3 border-b border-slate-100">
                    <div className={`flex items-center space-x-3 p-3 rounded-lg ${userCanApprove ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                      {userCanApprove ? (
                        <>
                          <FaCheck className="text-emerald-600 shrink-0" size={14} />
                          <div>
                            <p className="text-sm font-semibold text-emerald-800">You can approve this requisition</p>
                            <p className="text-xs text-emerald-600">Current pending stage: {pendingStageLabel}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <FaClock className="text-amber-600 shrink-0" size={14} />
                          <div>
                            <p className="text-sm font-semibold text-amber-800">Awaiting {pendingStageLabel} approval</p>
                            <p className="text-xs text-amber-600">Your role ({getRoleDisplayLabel()}) cannot act on this stage</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Budget Compliance Summary (Step 27) ─────────────── */}
                  {selected.budgetComplianceCheck && (
                    <div className="px-6 py-3 border-b border-slate-100">
                      <div className={`rounded-lg border p-3 space-y-2 ${
                        selected.status === 'flagged_special_approval'
                          ? 'bg-amber-50 border-amber-300'
                          : selected.budgetComplianceCheck.passed
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <FaInfoCircle size={11} className="text-slate-500" />
                            Step 27: Budget Compliance Check
                          </p>
                          {selected.budgetComplianceCheck.checkedAt && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(selected.budgetComplianceCheck.checkedAt).toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Special Approval Banner */}
                        {selected.status === 'flagged_special_approval' && (
                          <div className="flex items-start gap-2 bg-amber-100 border border-amber-400 rounded-lg px-3 py-2">
                            <FaExclamationTriangle className="text-amber-600 mt-0.5 shrink-0" size={12} />
                            <div>
                              <p className="text-xs font-bold text-amber-900">⚠ Flagged for Special HOD Approval</p>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                This request exceeds the department budget by {selected.budgetComplianceCheck.overBudgetPercent}% (within 10% grace threshold). Your special approval is required.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* DAPP Item Row */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Annual Plan (DAPP)</span>
                          <span className={`font-semibold flex items-center gap-1 ${selected.budgetComplianceCheck.annualPlanPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                            {selected.budgetComplianceCheck.annualPlanPassed
                              ? <><FaCheck size={9} /> {selected.budgetComplianceCheck.annualPlanRef || 'Approved'}</>
                              : <><FaTimes size={9} /> {selected.budgetComplianceCheck.failureReason === 'no_annual_plan_linked' ? 'Not Linked' : selected.budgetComplianceCheck.failureReason === 'plan_not_approved' ? `Not Approved (${selected.budgetComplianceCheck.annualPlanStatus})` : 'Item Not Found'}</>
                            }
                          </span>
                        </div>

                        {/* Budget Row */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Dept. Budget</span>
                          <span className={`font-semibold flex items-center gap-1 ${
                            selected.budgetComplianceCheck.budgetPassed ? 'text-emerald-700'
                            : selected.budgetComplianceCheck.requiresSpecialApproval ? 'text-amber-700'
                            : 'text-red-700'
                          }`}>
                            {selected.budgetComplianceCheck.budgetPassed
                              ? <><FaCheck size={9} /> LKR {(selected.budgetComplianceCheck.remainingBudget || 0).toLocaleString()} remaining</>
                              : selected.budgetComplianceCheck.failureReason === 'no_budget_allocated'
                                ? <><FaTimes size={9} /> No Allocation</>
                                : <>
                                    <FaExclamationTriangle size={9} />
                                    {' '}LKR {(selected.budgetComplianceCheck.remainingBudget || 0).toLocaleString()} / Need {(selected.budgetComplianceCheck.requiredBudget || 0).toLocaleString()}
                                  </>
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Not yet checked warning — only visible to HOD */}
                  {!selected.budgetComplianceCheck && (userRole === 'department_head' || isAdminRole) && (
                    <div className="px-6 py-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                        <FaExclamationTriangle size={10} />
                        Budget compliance check not yet run for this requisition. The check will execute automatically on submission.
                      </div>
                    </div>
                  )}

                  {/* Value-Based Routing Indicator (Step 29) */}
                  {(() => {
                    const tce = selected.totalEstimatedCost || selected.tce || 0;
                    const threshold = getApprovalAuthority(tce);
                    if (!threshold || tce <= 0) return null;
                    return (
                      <div className="px-6 py-3 border-b border-slate-100">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                          <div className="flex items-center space-x-3">
                            <FaInfoCircle className="text-indigo-600 shrink-0" size={14} />
                            <div>
                              <p className="text-sm font-semibold text-indigo-800">Step 29: Value-Based Routing</p>
                              <p className="text-xs text-indigo-600">
                                TCE: <span className="font-bold">LKR {tce.toLocaleString()}</span>
                                <FaArrowRight size={8} className="inline mx-1.5" />
                                Required authority: <span className="font-bold">{threshold.authority}</span>
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full bg-${threshold.color}-100 text-${threshold.color}-700`}>
                            {threshold.label}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Approval Chain */}
                  <div className="p-6 space-y-4">
                    <p className="text-sm font-bold text-slate-700">Approval Chain</p>
                    {getMappedApprovals(selected).map((a, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${a.status === 'approved' ? 'border-emerald-200 bg-emerald-50' :
                        a.status === 'rejected' ? 'border-red-200 bg-red-50' :
                        (a.stage === pendingStage ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : 'border-slate-200 bg-slate-50')
                        }`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${a.status === 'approved' ? 'bg-emerald-500 text-white' :
                            a.status === 'rejected' ? 'bg-red-500 text-white' :
                            (a.stage === pendingStage ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-300 text-slate-600')
                            }`}>
                            {a.status === 'approved' ? <FaCheck size={12} /> :
                              a.status === 'rejected' ? <FaTimes size={12} /> : i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{a.role}</p>
                            <p className="text-xs text-slate-500">{a.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {a.status === 'approved' && (
                            <div>
                              <span className="text-xs font-semibold text-emerald-700">Approved</span>
                              <p className="text-[10px] text-slate-400 flex items-center justify-end space-x-1"><FaClock size={8} /> <span>{a.date}</span></p>
                              {a.comments && <p className="text-[10px] text-slate-400 mt-0.5 italic">"{a.comments}"</p>}
                            </div>
                          )}
                          {a.status === 'rejected' && (
                            <div>
                              <span className="text-xs font-semibold text-red-700">Rejected</span>
                              {a.comments && <p className="text-[10px] text-red-400 mt-0.5 italic">"{a.comments}"</p>}
                            </div>
                          )}
                          {a.status === 'pending' && a.stage === pendingStage && (
                            <span className="text-xs font-semibold text-amber-600 flex items-center space-x-1">
                              <FaSpinner className="animate-spin" size={10} /> <span>Awaiting</span>
                            </span>
                          )}
                          {a.status === 'pending' && a.stage !== pendingStage && (
                            <span className="text-xs font-medium text-slate-400">Pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Panel */}
                  <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
                    {userCanApprove ? (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            <FaCommentDots className="inline mr-1.5" size={12} /> Comments / Remarks
                          </label>
                          <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            rows={2}
                            placeholder="Add remarks for audit trail..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none"
                          />
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setApproveModal(true)}
                            className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors"
                          >
                            <FaCheck size={13} /> <span>Approve</span>
                          </button>
                          <button
                            onClick={() => setRejectModal(true)}
                            className="px-5 py-2.5 border border-red-300 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Return
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <FaClock className="mx-auto text-amber-400 mb-2" size={20} />
                        <p className="text-sm text-slate-500">This requisition is waiting for <span className="font-bold text-amber-700">{pendingStageLabel}</span> approval.</p>
                        <p className="text-xs text-slate-400 mt-1">You will be able to act when it reaches your stage.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                <FaCheckDouble className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-sm text-slate-500">Select a requisition from the queue to review and approve.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 29: Approval Threshold Reference Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Step 29: Value-Based Approval Authority Reference</h3>
          <p className="text-xs text-slate-500 mt-0.5">Procurement requests are automatically routed based on their Total Cost Estimate (TCE)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Procurement Value Range</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Required Approval Authority</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {APPROVAL_THRESHOLDS.map((row, i) => {
                const tce = selected?.totalEstimatedCost || selected?.tce || 0;
                const threshold = getApprovalAuthority(tce);
                const isMatch = selected && threshold?.label === row.label;
                return (
                  <tr key={i} className={`transition-colors ${isMatch ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700">{row.label}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full bg-${row.color}-100 text-${row.color}-700`}>
                        {row.authority}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {isMatch && (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full">
                          ← Selected
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {selected && (
        <ConfirmModal
          isOpen={approveModal}
          onClose={() => setApproveModal(false)}
          onConfirm={handleApprove}
          title="Confirm Approval"
          confirmText="Approve"
          variant="success"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              You are about to approve <span className="font-bold text-slate-800">"{selected?.title}"</span> at the <span className="font-bold text-emerald-700">{STAGE_LABELS[getCurrentPendingStage(selected)] || 'current'}</span> stage.
            </p>
            {(() => {
              const pendingStage = getCurrentPendingStage(selected);
              const chain = selected?.approvalChain || [];
              const pendingIndex = chain.findIndex(a => a.stage === pendingStage);
              const isLastStage = pendingIndex === chain.length - 1;
              return isLastStage ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-emerald-700">🎉 This is the final approval stage. After approval, this requisition will advance to Budget Lock (Stage 4).</p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700">After approval, this requisition will move to the next approver in the chain.</p>
                </div>
              );
            })()}
            {comment && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium">Your remarks:</p>
                <p className="text-sm text-slate-700 mt-1">"{comment}"</p>
              </div>
            )}
          </div>
        </ConfirmModal>
      )}

      {/* Reject Modal */}
      {selected && (
        <ConfirmModal
          isOpen={rejectModal}
          onClose={() => setRejectModal(false)}
          onConfirm={handleReject}
          title="Return Requisition"
          confirmText="Return with Remarks"
          variant="danger"
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Return <span className="font-bold text-slate-800">"{selected?.title}"</span> to the requisitioning officer.
            </p>
            {!comment.trim() && (
              <p className="text-xs text-red-500 font-semibold">⚠ A reason is required when returning a requisition. Please add comments above.</p>
            )}
            {comment.trim() && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <p className="text-xs text-red-500 font-medium">Return reason:</p>
                <p className="text-sm text-red-700 mt-1">"{comment}"</p>
              </div>
            )}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
