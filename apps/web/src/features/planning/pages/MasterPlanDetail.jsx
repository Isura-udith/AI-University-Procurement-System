import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaCheck, FaTimes, FaArrowLeft, FaCalendarAlt, FaPaperPlane, FaLayerGroup, FaEdit } from 'react-icons/fa';
import planningService from '../../../services/planning.service';

const APPROVAL_CHAIN = [
  { stage: 'bursar', label: 'Chief Bursar', color: 'indigo' },
  { stage: 'finance_committee', label: 'Finance Committee', color: 'purple' },
  { stage: 'vice_chancellor', label: 'Vice Chancellor', color: 'violet' },
  { stage: 'council', label: 'University Council', color: 'emerald' },
];

const ROLE_TO_STAGE = {
  bursar: 'bursar',
  finance_committee: 'finance_committee', finance_officer: 'finance_committee', vc: 'vice_chancellor',
  council: 'council', council_member: 'council', admin: 'council', super_admin: 'council',
};

const STATUS_PENDING = {
  bursar_estimation: 'bursar',
  finance_committee_review: 'finance_committee', vc_review: 'vice_chancellor',
  council_review: 'council',
};

function ChainStep({ step, approval, isCurrent }) {
  const stageApproval = approval?.find(a => a.stage === step.stage);
  const isApproved = stageApproval?.status === 'approved';
  const isRejected = stageApproval?.status === 'rejected';

  const colorMap = {
    amber: { dot: 'bg-amber-500', ring: 'ring-amber-200' },
    blue: { dot: 'bg-blue-500', ring: 'ring-blue-200' },
    indigo: { dot: 'bg-indigo-500', ring: 'ring-indigo-200' },
    purple: { dot: 'bg-purple-500', ring: 'ring-purple-200' },
    violet: { dot: 'bg-violet-500', ring: 'ring-violet-200' },
    emerald: { dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  };
  const c = colorMap[step.color];

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${isCurrent ? 'bg-violet-50 border border-violet-200' : ''}`}>
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5
        ${isApproved ? 'bg-emerald-500' : isRejected ? 'bg-red-500' : isCurrent ? `${c.dot} ring-4 ${c.ring}` : 'bg-slate-200'}`}>
        {isApproved ? <FaCheck className="text-white" size={12} /> :
         isRejected ? <FaTimes className="text-white" size={12} /> :
         <span className="text-xs font-bold text-white">{APPROVAL_CHAIN.findIndex(s => s.stage === step.stage) + 1}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isCurrent ? 'text-violet-700' : isApproved ? 'text-emerald-700' : 'text-slate-600'}`}>
          {step.label}
        </p>
        {stageApproval && (
          <p className="text-xs text-slate-400 mt-0.5">
            {stageApproval.comments && `"${stageApproval.comments}" · `}
            {stageApproval.actionDate && new Date(stageApproval.actionDate).toLocaleDateString()}
          </p>
        )}
        {isCurrent && !stageApproval && <p className="text-xs text-violet-500 font-medium mt-0.5">Awaiting action</p>}
      </div>
    </div>
  );
}

export default function MasterPlanDetail() {
  const { id } = useParams();
  const { user } = useSelector(s => s.auth);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    planningService.getMasterPlan(id)
      .then(res => setPlan(res.data?.data || res.data))
      .catch(() => {
        setPlan(null);
        toast.error('Failed to load master plan details. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await planningService.submitMasterPlan(id);
      setPlan(res.data?.data || res.data);
      toast.success('Submitted for Chief Bursar review!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const myStage = ROLE_TO_STAGE[user?.role];
  const pendingStage = plan ? STATUS_PENDING[plan.status] : null;
  const canAct = user?.role === 'super_admin' ? !!pendingStage : (myStage && pendingStage === myStage);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const payload = { action, comments: comment };
      if (user?.role === 'bursar' && estimatedBudget) payload.estimatedBudget = Number(estimatedBudget);
      const res = await planningService.approveMasterPlan(id, payload);
      setPlan(res.data?.data || res.data);
      toast.success(action === 'approve' ? 'Approved successfully!' : 'Rejected.');
      setComment('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const fmtCurrency = (n) => n ? `LKR ${Number(n).toLocaleString()}` : '—';
  const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';
  const priorityColor = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700' };
  const canSubmitDraft = plan?.status === 'draft' && ['department_head', 'bursar', 'procurement_officer', 'admin', 'super_admin'].includes(user?.role);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading master plan…</p>
      </div>
    </div>
  );

  if (!plan) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
      <FaLayerGroup size={40} className="text-slate-300" />
      <p className="text-lg font-semibold">Master Plan not found</p>
      <Link to="/planning/master-plans" className="text-sm text-violet-600 font-semibold hover:underline">← Back to Master Plans</Link>
    </div>
  );

  const getPlannedYr = (r) => {
    const py = Number(r.plannedYear || r.year);
    if (!py) return 1;
    if (py === 1 || py === plan.cycleStart) return 1;
    if (py === 2 || py === (plan.cycleStart + 1)) return 2;
    if (py === 3 || py === (plan.cycleStart + 2)) return 3;
    return 1;
  };

  const year1Items = plan.requirements?.filter(r => getPlannedYr(r) === 1) || [];
  const year2Items = plan.requirements?.filter(r => getPlannedYr(r) === 2) || [];
  const year3Items = plan.requirements?.filter(r => getPlannedYr(r) === 3) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link to="/planning/master-plans" className="mt-1 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-xs text-violet-700 bg-violet-50 px-2 py-1 rounded-lg">{plan.referenceNumber}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                plan.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                plan.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {fmtStatus(plan.status)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{plan.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Cycle: {plan.cycleStart}–{plan.cycleEnd} ·
              Created by {plan.createdBy?.name || '—'} ·
              Total: {fmtCurrency(plan.totalEstimatedBudget)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {plan.status === 'draft' && (
            <Link to={`/planning/master-plans/${plan._id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-400 transition-all shadow-sm">
              <FaEdit size={12} /> Edit Draft
            </Link>
          )}
          {canSubmitDraft && (
            <button onClick={handleSubmit} disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-all shadow-sm disabled:opacity-60">
              <FaPaperPlane size={12} />
              {submitting ? 'Submitting…' : 'Submit for Chief Bursar Review'}
            </button>
          )}
          {plan.status === 'active' && (
            <Link to="/planning/annual-plans/new" state={{ masterPlanId: plan._id }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-all shadow-sm">
              <FaCalendarAlt size={12} /> Create Annual Plan
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Year 1 Items', value: year1Items.length, sub: fmtCurrency(year1Items.reduce((s, r) => s + (r.estimatedTotalCost || 0), 0)), color: 'violet' },
              { label: 'Year 2 Items', value: year2Items.length, sub: fmtCurrency(year2Items.reduce((s, r) => s + (r.estimatedTotalCost || 0), 0)), color: 'blue' },
              { label: 'Year 3 Items', value: year3Items.length, sub: fmtCurrency(year3Items.reduce((s, r) => s + (r.estimatedTotalCost || 0), 0)), color: 'indigo' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                <p className={`text-2xl font-bold text-${c.color}-700`}>{c.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{c.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Requirements */}
          {[{ year: 1, items: year1Items }, { year: 2, items: year2Items }, { year: 3, items: year3Items }]
            .filter(g => g.items.length > 0).map(group => (
            <div key={group.year} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-700">Year {group.year} Requirements
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    ({group.year === 1 ? plan.cycleStart : group.year === 2 ? plan.cycleStart + 1 : plan.cycleStart + 2})
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {group.items.map((item, i) => (
                  <div key={item._id || i} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{item.category}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">{item.faculty}</span>
                        {item.justification && <><span className="text-xs text-slate-400">·</span><span className="text-xs text-slate-400 italic">{item.justification}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${priorityColor[item.priority] || priorityColor.medium}`}>{item.priority}</span>
                      <span className="text-sm font-bold text-slate-700">{fmtCurrency(item.estimatedTotalCost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar: Approval Chain */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Approval Chain</h2>
            <div className="space-y-2">
              {APPROVAL_CHAIN.map(step => (
                <ChainStep key={step.stage} step={step} approval={plan.approvalChain}
                  isCurrent={pendingStage === step.stage} />
              ))}
            </div>
          </div>

          {/* Action Panel */}
          {canAct && (
            <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-violet-800">Your Action Required</h2>
              {user?.role === 'bursar' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estimated Budget (LKR)</label>
                  <input type="number" value={estimatedBudget} onChange={e => setEstimatedBudget(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter your cost estimate" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Comments</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Add comments or remarks…" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAction('approve')} disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-all disabled:opacity-60">
                  <FaCheck size={12} /> Approve
                </button>
                <button onClick={() => handleAction('reject')} disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-400 transition-all disabled:opacity-60">
                  <FaTimes size={12} /> Reject
                </button>
              </div>
            </div>
          )}

          {/* Submit hint for draft */}
          {canSubmitDraft && (
            <div className="bg-violet-50 rounded-2xl border border-violet-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-violet-700">This plan is in Draft status.</p>
              <p className="text-xs text-violet-600">Click "Submit for Chief Bursar Review" to begin the 4-stage approval chain.</p>
            </div>
          )}

          {/* Plan Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">Plan Summary</h2>
            {[
              { label: 'Cycle', value: `${plan.cycleStart}–${plan.cycleEnd}` },
              { label: 'Total Est. Budget', value: fmtCurrency(plan.totalEstimatedBudget) },
              { label: 'Bursar Estimate', value: fmtCurrency(plan.bursarEstimatedBudget) },
              { label: 'Approved Ceiling', value: fmtCurrency(plan.approvedBudgetCeiling) },
              { label: 'Requirements', value: `${plan.requirements?.length || 0} items` },
              { label: 'Status', value: fmtStatus(plan.status) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-semibold text-slate-800">{row.value}</span>
              </div>
            ))}
            {plan.description && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 italic">{plan.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
