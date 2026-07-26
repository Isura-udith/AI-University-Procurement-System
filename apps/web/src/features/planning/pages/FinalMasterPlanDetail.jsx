import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaSpinner, FaArrowLeft, FaCheckCircle, FaTimesCircle,
  FaClock, FaMoneyBillWave, FaThumbsUp, FaThumbsDown,
  FaPaperPlane, FaCartPlus, FaClipboardList, FaUserShield,
  FaEdit
} from 'react-icons/fa';
import planningService from '../../../services/planning.service';

const STAGE_LABELS = {
  bursar: 'Chief Bursar',
  finance_committee: 'Finance Committee',
  vice_chancellor: 'Vice-Chancellor',
  council: 'University Council',
};

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FaEdit },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: FaPaperPlane },
  bursar_review: { label: 'Bursar Review', color: 'bg-blue-100 text-blue-800', icon: FaClock },
  bursar_approved: { label: 'Bursar Approved', color: 'bg-cyan-100 text-cyan-800', icon: FaCheckCircle },
  finance_committee_review: { label: 'Finance Committee Review', color: 'bg-orange-100 text-orange-800', icon: FaClock },
  finance_committee_approved: { label: 'Finance Committee Approved', color: 'bg-lime-100 text-lime-800', icon: FaCheckCircle },
  vc_review: { label: 'VC Review', color: 'bg-violet-100 text-violet-800', icon: FaClock },
  vc_approved: { label: 'VC Approved', color: 'bg-fuchsia-100 text-fuchsia-800', icon: FaCheckCircle },
  council_review: { label: 'Council Review', color: 'bg-rose-100 text-rose-800', icon: FaClock },
  council_approved: { label: 'Council Approved', color: 'bg-emerald-100 text-emerald-800', icon: FaCheckCircle },
  active: { label: 'Active ✓', color: 'bg-emerald-100 text-emerald-900', icon: FaCheckCircle },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-800', icon: FaTimesCircle },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-700', icon: FaClipboardList },
};

// Approval chain stages in order (Starts at Chief Bursar)
const APPROVAL_STAGES = ['bursar', 'finance_committee', 'vice_chancellor', 'council'];

// Which roles can approve at which stage
const ROLE_CAN_APPROVE = {
  bursar: 'bursar',
  finance_committee: 'finance_committee',
  finance_officer: 'finance_committee',
  vc: 'vice_chancellor',
  council: 'council',
  council_member: 'council',
  admin: 'council',
  super_admin: '*', // can approve any stage
};

// Status → required stage for approval
const STATUS_REQUIRED_STAGE = {
  bursar_review: 'bursar',
  finance_committee_review: 'finance_committee',
  vc_review: 'vice_chancellor',
  council_review: 'council',
};

export default function FinalMasterPlanDetail() {
  const { id } = useParams();
  const { user } = useSelector(s => s.auth);
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');

  useEffect(() => {
    let ignore = false;
    async function fetchPlan() {
      try {
        const res = await planningService.getFinalMasterPlan(id);
        if (!ignore) {
          const data = res?.data?.data || res?.data;
          setPlan(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          toast.error('Failed to load plan details');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchPlan();
    return () => { ignore = true; };
  }, [id]);

  const loadPlan = async () => {
    try {
      const res = await planningService.getFinalMasterPlan(id);
      const data = res?.data?.data || res?.data;
      setPlan(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load plan details');
    }
  };

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      await planningService.submitFinalMasterPlan(id);
      toast.success('Plan submitted for Bursar review!');
      await loadPlan();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveReject = async (action) => {
    setActionLoading(true);
    try {
      const data = { action, comments };
      if (estimatedBudget) data.estimatedBudget = Number(estimatedBudget);
      await planningService.approveFinalMasterPlan(id, data);
      toast.success(action === 'approve' ? 'Plan approved!' : 'Plan rejected.');
      setComments('');
      setEstimatedBudget('');
      await loadPlan();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${action} plan`);
    } finally {
      setActionLoading(false);
    }
  };

  // Determine if current user can approve/reject at the current stage
  const canApprove = () => {
    if (!plan || !user) return false;
    const requiredStage = STATUS_REQUIRED_STAGE[plan.status];
    if (!requiredStage) return false;
    const userStage = ROLE_CAN_APPROVE[user.role];
    return userStage === '*' || userStage === requiredStage;
  };

  const canSubmit = plan?.status === 'draft' && (
    plan?.createdBy?._id === user?._id ||
    user?.role === 'super_admin' ||
    user?.role === 'admin'
  );

  const isActive = plan?.status === 'active';

  // Build approval timeline from approvalChain
  const getApprovalTimeline = () => {
    if (!plan?.approvalChain) return [];
    return plan.approvalChain.map(entry => ({
      stage: STAGE_LABELS[entry.stage] || entry.stage,
      status: entry.status,
      approver: entry.approver?.name || entry.approver?.email || 'System',
      comments: entry.comments,
      date: entry.actionDate ? new Date(entry.actionDate).toLocaleString() : '',
      estimatedBudget: entry.estimatedBudget,
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <FaSpinner className="text-4xl text-emerald-600 animate-spin" />
        <p className="text-slate-600 font-semibold">Loading Final Master Plan...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-slate-700">Plan not found</h2>
        <Link to="/planning/final-master-plans" className="text-emerald-600 font-semibold text-sm mt-2 block">← Back to list</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;
  const timeline = getApprovalTimeline();

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-linear-to-br from-slate-900 via-slate-800 to-emerald-900 text-white shadow-xl">
        <div className="relative z-10">
          <button
            onClick={() => navigate('/planning/final-master-plans')}
            className="flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold mb-3 transition-colors cursor-pointer"
          >
            <FaArrowLeft /> Back to Final Master Plans
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-slate-400 font-bold">{plan.referenceNumber || 'Pending...'}</p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">{plan.title}</h1>
              {plan.description && (
                <p className="text-xs text-slate-300 mt-1 max-w-xl">{plan.description}</p>
              )}
            </div>
            <div className="text-right space-y-2">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${statusCfg.color}`}>
                <StatusIcon /> {statusCfg.label}
              </div>
              <div className="text-emerald-300 flex items-center gap-1.5 font-bold text-lg justify-end">
                <FaMoneyBillWave />
                <span>LKR {(plan.totalEstimatedBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400">
            <span>Year: <strong className="text-white">{plan.planYear}</strong></span>
            <span>Faculty: <strong className="text-white">{plan.faculty || 'All'}</strong></span>
            <span>Items: <strong className="text-white">{plan.items?.length || 0}</strong></span>
            <span>Created: <strong className="text-white">{new Date(plan.createdAt).toLocaleDateString()}</strong></span>
            <span>By: <strong className="text-white">{plan.createdBy?.name || plan.createdBy?.email || 'Unknown'}</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FaClipboardList className="text-emerald-600" /> Plan Items ({plan.items?.length || 0})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr className="font-bold text-slate-700">
                    <th className="px-4 py-3">#</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Unit Cost</th>
                    <th className="px-3 py-3 text-right">Total Cost</th>
                    <th className="px-3 py-3">Priority</th>
                    {isActive && <th className="px-3 py-3 text-center">Procurement</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(plan.items || []).map((item, idx) => (
                    <tr key={item._id || idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800 max-w-xs">
                        <div className="truncate">{item.description}</div>
                        {item.dappNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">{item.dappNumber}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-[11px]">{item.department}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.category === 'Goods' ? 'bg-emerald-100 text-emerald-800' :
                          item.category === 'Services' ? 'bg-sky-100 text-sky-800' :
                          item.category === 'Works' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{item.estimatedQuantity} {item.unit}</td>
                      <td className="px-3 py-3 text-right font-mono">{(item.estimatedUnitCost || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-800">
                        {(item.estimatedTotalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          (item.priority || '').toLowerCase() === 'critical' ? 'bg-rose-100 text-rose-800' :
                          (item.priority || '').toLowerCase() === 'high' ? 'bg-amber-100 text-amber-800' :
                          (item.priority || '').toLowerCase() === 'medium' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      {isActive && (
                        <td className="px-3 py-3 text-center">
                          {item.procurementCreated ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                              Created
                            </span>
                          ) : (
                            <Link
                              to={`/procurements/new?fmpItemId=${item._id}&planId=${plan._id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition-all"
                            >
                              <FaCartPlus /> Create
                            </Link>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                  <tr>
                    <td colSpan={isActive ? 6 : 6} className="px-4 py-3 font-bold text-emerald-900 text-right">Total Estimated Budget:</td>
                    <td className="px-3 py-3 text-right font-mono font-black text-emerald-900 text-sm">
                      LKR {(plan.totalEstimatedBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={isActive ? 2 : 1}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Approval Chain Timeline + Actions */}
        <div className="space-y-6">
          {/* Approval Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <FaUserShield className="text-emerald-600" /> Approval Workflow
            </h2>

            {/* Visual Stage Progress */}
            <div className="space-y-1 mb-5">
              {APPROVAL_STAGES.map((stage, idx) => {
                const chainEntry = timeline.find(t => t.stage === STAGE_LABELS[stage] && t.status !== 'pending');
                const isPending = timeline.find(t => t.stage === STAGE_LABELS[stage] && t.status === 'pending');
                const isApproved = chainEntry?.status === 'approved';
                const isRejected = chainEntry?.status === 'rejected';

                return (
                  <div key={stage} className="flex items-center gap-3">
                    {/* Stage indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isApproved ? 'bg-emerald-500 text-white' :
                      isRejected ? 'bg-rose-500 text-white' :
                      isPending ? 'bg-amber-400 text-white animate-pulse' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {isApproved ? '✓' : isRejected ? '✗' : idx + 1}
                    </div>

                    {/* Stage info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${
                        isApproved ? 'text-emerald-700' :
                        isRejected ? 'text-rose-700' :
                        isPending ? 'text-amber-700' :
                        'text-slate-400'
                      }`}>
                        {STAGE_LABELS[stage]}
                      </p>
                      {chainEntry && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {chainEntry.approver} — {chainEntry.date}
                        </p>
                      )}
                      {isPending && !chainEntry && (
                        <p className="text-[10px] text-amber-600 font-semibold">Awaiting approval...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Timeline Log */}
            {timeline.length > 0 && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-600 uppercase">Activity Log</h3>
                {timeline.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      entry.status === 'approved' ? 'bg-emerald-500' :
                      entry.status === 'rejected' ? 'bg-rose-500' :
                      'bg-amber-400'
                    }`} />
                    <div>
                      <p className="font-semibold text-slate-700">
                        {entry.stage} — <span className={
                          entry.status === 'approved' ? 'text-emerald-700' :
                          entry.status === 'rejected' ? 'text-rose-700' :
                          'text-amber-700'
                        }>{entry.status.toUpperCase()}</span>
                      </p>
                      {entry.comments && <p className="text-slate-500 text-[11px]">{entry.comments}</p>}
                      {entry.estimatedBudget && (
                        <p className="text-blue-700 text-[11px] font-bold">Budget estimate: LKR {Number(entry.estimatedBudget).toLocaleString()}</p>
                      )}
                      <p className="text-slate-400 text-[10px]">{entry.approver} • {entry.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions Panel */}
          {(canSubmit || canApprove()) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Actions</h2>

              {canSubmit && (
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <FaPaperPlane /> {actionLoading ? 'Submitting...' : 'Submit for Approval'}
                </button>
              )}

              {canApprove() && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Comments</label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      placeholder="Add your review comments..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  {STATUS_REQUIRED_STAGE[plan.status] === 'bursar' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Budget (LKR)</label>
                      <input
                        type="number"
                        value={estimatedBudget}
                        onChange={(e) => setEstimatedBudget(e.target.value)}
                        placeholder="Enter bursar budget estimate..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApproveReject('reject')}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      <FaThumbsDown /> Reject
                    </button>
                    <button
                      onClick={() => handleApproveReject('approve')}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <FaThumbsUp /> Approve
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Procurement Action (only when Active) */}
          {isActive && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 text-center space-y-3">
              <FaCheckCircle className="text-3xl text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-900">Plan is Active!</h3>
              <p className="text-xs text-emerald-700">
                Items from this plan can now be used to create Procurement Requests.
              </p>
              <Link
                to="/procurements/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition-all"
              >
                <FaCartPlus /> Create Procurement Request
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
