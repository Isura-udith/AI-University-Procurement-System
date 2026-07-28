import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaCheck, FaTimes, FaGlobeAsia, FaCheckCircle, FaMoneyBillWave, FaEdit,
  FaPaperPlane, FaCalendarAlt, FaSearch,
} from 'react-icons/fa';
import planningService from '../../../services/planning.service';

// Internal approval chain (Phase 3 — internal leg)
const INTERNAL_CHAIN = [
  { stage: 'dean', label: 'Faculty Dean', color: 'blue' },
  { stage: 'bursar', label: 'Chief Bursar', color: 'indigo' },
  { stage: 'finance_committee', label: 'Finance Committee', color: 'purple' },
  { stage: 'vice_chancellor', label: 'Vice Chancellor', color: 'violet' },
  { stage: 'council', label: 'University Council', color: 'emerald' },
];

// External approval chain (Phase 3 — national leg)
const EXTERNAL_CHAIN = [
  { body: 'ugc', label: 'University Grants Commission (UGC)', icon: '🏛️', color: 'blue' },
  { body: 'treasury', label: 'Ministry of Finance / Treasury', icon: '🏦', color: 'indigo' },
  { body: 'parliament', label: 'Parliament (Budget Approval)', icon: '🏫', color: 'purple' },
];

const ROLE_TO_INTERNAL_STAGE = {
  dean: 'dean', bursar: 'bursar',
  finance_committee: 'finance_committee', finance_officer: 'finance_committee', vc: 'vice_chancellor',
  admin: 'council', super_admin: 'council',
};

const INTERNAL_PENDING = {
  dean_review: 'dean', bursar_review: 'bursar',
  finance_committee_review: 'finance_committee', vc_review: 'vice_chancellor',
  council_review: 'council',
};

const EXTERNAL_STATUS_LABELS = {
  not_submitted: 'Not Submitted',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  revision_requested: 'Revision Requested',
};

function ExternalStepCard({ step, approval, canRecord, onRecord }) {
  const [editing, setEditing] = useState(false);
  const [prevApproval, setPrevApproval] = useState(approval);
  const [form, setForm] = useState({
    status: approval?.status || 'submitted',
    referenceNumber: approval?.referenceNumber || '',
    allocatedAmount: approval?.allocatedAmount || '',
    notes: approval?.notes || '',
  });

  if (approval !== prevApproval) {
    setPrevApproval(approval);
    setForm({
      status: approval?.status || 'submitted',
      referenceNumber: approval?.referenceNumber || '',
      allocatedAmount: approval?.allocatedAmount || '',
      notes: approval?.notes || '',
    });
  }

  const statusColors = {
    not_submitted: 'bg-slate-100 text-slate-500',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    revision_requested: 'bg-orange-100 text-orange-700',
  };

  const handleSave = () => {
    onRecord(step.body, { ...form, allocatedAmount: form.allocatedAmount ? Number(form.allocatedAmount) : undefined });
    setEditing(false);
  };

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${approval?.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{step.icon}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{step.label}</p>
            {approval?.referenceNumber && <p className="text-xs text-slate-400">Ref: {approval.referenceNumber}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[approval?.status || 'not_submitted']}`}>
            {EXTERNAL_STATUS_LABELS[approval?.status || 'not_submitted']}
          </span>
          {canRecord && !editing && (
            <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-700 transition-colors">
              <FaEdit size={13} />
            </button>
          )}
        </div>
      </div>

      {approval?.allocatedAmount && (
        <p className="text-sm font-bold text-emerald-700">Allocated: LKR {Number(approval.allocatedAmount).toLocaleString()}</p>
      )}
      {approval?.notes && <p className="text-xs text-slate-500 italic">"{approval.notes}"</p>}

      {editing && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
            {Object.entries(EXTERNAL_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input placeholder="Reference number" value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {form.status === 'approved' && (
            <input type="number" placeholder="Allocated amount (LKR)" value={form.allocatedAmount} onChange={e => setForm(f => ({ ...f, allocatedAmount: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          )}
          <input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500">Save</button>
            <button onClick={() => setEditing(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnnualPlanDetail() {
  const { id } = useParams();
  const { user } = useSelector(s => s.auth);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('all');

  useEffect(() => {
    planningService.getAnnualPlan(id)
      .then(res => setPlan(res.data?.data || res.data))
      .catch(() => {
        setPlan(null);
        toast.error('Failed to load annual plan. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const myStage = ROLE_TO_INTERNAL_STAGE[user?.role];
  const pendingInternal = plan ? INTERNAL_PENDING[plan.status] : null;
  const canActInternal = user?.role === 'super_admin' ? !!pendingInternal : (myStage && pendingInternal === myStage);
  const canRecordExternal = ['bursar', 'vc', 'admin', 'super_admin'].includes(user?.role);
  const canConfirmBudget = ['vc', 'bursar', 'admin', 'super_admin'].includes(user?.role);
  const canSubmit = plan?.status === 'draft' && ['department_head', 'procurement_officer', 'admin', 'super_admin'].includes(user?.role);

  // Show external approvals section when internal chain is done or already in external stage
  const showExternal = plan && (
    plan.status === 'ugc_submitted' ||
    plan.status === 'ugc_approved' ||
    plan.status === 'treasury_submitted' ||
    plan.status === 'treasury_approved' ||
    plan.status === 'parliament_submitted' ||
    plan.status === 'parliament_approved' ||
    plan.status === 'budget_received' ||
    plan.status === 'distribution_complete' ||
    // show once council approved
    (plan.internalApprovals?.some(a => a.stage === 'council' && a.status === 'approved'))
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await planningService.submitAnnualPlan(id);
      setPlan(res.data?.data || res.data);
      toast.success('Submitted for Dean review!');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const handleInternalAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await planningService.approveAnnualPlan(id, { action, comments: comment });
      setPlan(res.data?.data || res.data);
      toast.success(action === 'approve' ? 'Approved!' : 'Rejected.');
      setComment('');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleExternalRecord = async (body, data) => {
    try {
      const res = await planningService.recordExternalApproval(id, { body, ...data });
      setPlan(res.data?.data || res.data);
      toast.success(`${body.toUpperCase()} status updated`);
    } catch (err) { console.error(err); toast.error('Failed to update'); }
  };

  const handleConfirmBudget = async () => {
    setConfirming(true);
    try {
      const res = await planningService.confirmBudgetReceived(id, {});
      setPlan(res.data?.data || res.data);
      toast.success('Budget confirmed! Proceed to distribution.');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setConfirming(false); }
  };

  const fmtCurrency = (n) => n ? `LKR ${Number(n).toLocaleString()}` : '—';
  const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';
  const statusStyle = (s) => {
    if (['active', 'distribution_complete', 'budget_received', 'parliament_approved'].includes(s)) return 'bg-emerald-100 text-emerald-700';
    if (s === 'rejected') return 'bg-red-100 text-red-700';
    if (s === 'draft') return 'bg-slate-100 text-slate-600';
    return 'bg-amber-100 text-amber-700';
  };
  const priorityColor = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700' };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading annual plan…</p>
      </div>
    </div>
  );

  if (!plan) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
      <FaCalendarAlt size={40} className="text-slate-300" />
      <p className="text-lg font-semibold">Annual Plan not found</p>
      <Link to="/planning/annual-plans" className="text-sm text-blue-600 font-semibold hover:underline">
        ← Back to Annual Plans
      </Link>
    </div>
  );

  const getInternalApproval = (stage) => plan.internalApprovals?.find(a => a.stage === stage);
  const getExternalApproval = (body) => plan.externalApprovals?.find(a => a.body === body);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link to="/planning/annual-plans" className="mt-1 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{plan.referenceNumber}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle(plan.status)}`}>{fmtStatus(plan.status)}</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Year {plan.cycleYearNumber} of Cycle</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{plan.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Plan Year: {plan.planYear} · Budget Request: <strong>{fmtCurrency(plan.totalBudgetRequest)}</strong>
              {plan.totalAllocatedBudget && <> · Allocated: <strong className="text-emerald-700">{fmtCurrency(plan.totalAllocatedBudget)}</strong></>}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">MPP Ref: {plan.masterPlanRef} · Created by {plan.createdBy?.name || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {plan.status === 'draft' && (
            <Link to={`/planning/annual-plans/${plan._id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-400 transition-all shadow-sm">
              <FaEdit size={12} /> Edit Draft
            </Link>
          )}
          {canSubmit && (
            <button onClick={handleSubmit} disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-all disabled:opacity-60">
              <FaPaperPlane size={12} />
              {submitting ? 'Submitting…' : 'Submit for Dean Review'}
            </button>
          )}
          {plan.status === 'budget_received' && canConfirmBudget && (
            <Link to="/planning/budget-distribution"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-all">
              <FaMoneyBillWave size={12} /> Distribute Budget
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quarter breakdown */}
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(q => {
              const qItems = plan.items?.filter(i => Number(i.quarter) === q) || [];
              const qTotal = qItems.reduce((s, i) => s + (i.estimatedTotalCost || 0), 0);
              const isSelected = selectedQuarter === String(q);
              return (
                <div key={q}
                  onClick={() => setSelectedQuarter(isSelected ? 'all' : String(q))}
                  className={`bg-white rounded-xl border p-3 text-center cursor-pointer transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/30' : 'border-slate-100 hover:border-slate-300'}`}>
                  <p className="text-xs font-semibold text-slate-500">Q{q}</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">{qItems.length}</p>
                  <p className="text-xs text-slate-400">{qTotal > 0 ? `LKR ${(qTotal / 1000000).toFixed(1)}M` : '—'}</p>
                </div>
              );
            })}
          </div>

          {/* Items table */}
          {(() => {
            const filteredItems = (plan.items || []).filter(item => {
              const matchQ = selectedQuarter === 'all' || String(item.quarter || 1) === String(selectedQuarter);
              const matchSearch = !itemSearch ||
                item.description?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                item.dappNumber?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                item.faculty?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                item.department?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                item.category?.toLowerCase().includes(itemSearch.toLowerCase());
              return matchQ && matchSearch;
            });

            return (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="font-semibold text-slate-800">
                    Procurement Items ({filteredItems.length} of {plan.items?.length || 0})
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                        placeholder="Search items…"
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="all">All Quarters</option>
                      <option value="1">Q1</option>
                      <option value="2">Q2</option>
                      <option value="3">Q3</option>
                      <option value="4">Q4</option>
                    </select>
                  </div>
                </div>
                {filteredItems.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">No items found matching your filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-semibold">
                          <th className="text-left px-4 py-3">Description</th>
                          <th className="text-left px-3 py-3">DAPP No.</th>
                          <th className="text-left px-3 py-3">Category</th>
                          <th className="text-left px-3 py-3">Faculty / Dept</th>
                          <th className="text-right px-3 py-3">Qty & Unit</th>
                          <th className="text-right px-3 py-3">Unit Cost</th>
                          <th className="text-center px-3 py-3">Q</th>
                          <th className="text-right px-4 py-3">Est. Cost</th>
                          {plan.totalAllocatedBudget ? <th className="text-right px-4 py-3">Allocated</th> : null}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredItems.map((item, i) => (
                          <tr key={item._id || i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 min-w-45">
                              <p className="font-medium text-slate-800">{item.description}</p>
                              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${priorityColor[item.priority] || priorityColor.medium}`}>{item.priority}</span>
                            </td>
                            <td className="px-3 py-3">
                              {item.dappNumber
                                ? <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{item.dappNumber}</span>
                                : <span className="text-xs text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-500">{item.category}</td>
                            <td className="px-3 py-3 text-xs text-slate-500 min-w-32.5">
                              <div>{item.faculty}</div>
                              {item.department && item.department !== item.faculty && (
                                <div className="text-slate-400 text-[11px]">{item.department}</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right text-xs text-slate-700 font-medium">
                              {item.estimatedQuantity || 1} {item.unit || 'Units'}
                            </td>
                            <td className="px-3 py-3 text-right text-xs text-slate-600">
                              {fmtCurrency(item.estimatedUnitCost)}
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-semibold text-slate-600">Q{item.quarter || 1}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-700">{fmtCurrency(item.estimatedTotalCost)}</td>
                            {plan.totalAllocatedBudget ? (
                              <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                                {fmtCurrency(item.allocatedBudget || item.estimatedTotalCost)}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td colSpan={7} className="px-4 py-3 text-sm font-bold text-slate-700">Total Budget Request</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{fmtCurrency(plan.totalBudgetRequest)}</td>
                          {plan.totalAllocatedBudget ? (
                            <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">{fmtCurrency(plan.totalAllocatedBudget)}</td>
                          ) : null}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Internal Approval Chain */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-3 text-sm">Internal Approvals</h2>
            <div className="space-y-2">
              {INTERNAL_CHAIN.map(step => {
                const approval = getInternalApproval(step.stage);
                const isCurrent = pendingInternal === step.stage;
                return (
                  <div key={step.stage} className={`flex items-center gap-2.5 p-2 rounded-lg ${isCurrent ? 'bg-blue-50' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0
                      ${approval?.status === 'approved' ? 'bg-emerald-500' : approval?.status === 'rejected' ? 'bg-red-500' : isCurrent ? 'bg-blue-500' : 'bg-slate-200'}`}>
                      {approval?.status === 'approved' ? <FaCheck className="text-white" size={10} /> :
                       approval?.status === 'rejected' ? <FaTimes className="text-white" size={10} /> :
                       <span className="text-xs text-white font-bold">{INTERNAL_CHAIN.findIndex(s => s.stage === step.stage) + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${isCurrent ? 'text-blue-700' : approval?.status === 'approved' ? 'text-emerald-700' : 'text-slate-500'}`}>{step.label}</p>
                      {approval?.comments && <p className="text-xs text-slate-400 truncate">{approval.comments}</p>}
                      {isCurrent && !approval && <p className="text-xs text-blue-400 font-medium">Awaiting action</p>}
                    </div>
                    {approval?.actionDate && (
                      <span className="text-xs text-slate-400 shrink-0">{new Date(approval.actionDate).toLocaleDateString()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Status Banner */}
          {plan.status === 'active' && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                <FaCheckCircle className="text-emerald-600" size={14} /> Active Plan (Pre-Approved)
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                This Annual Procurement Plan is derived from an Approved 3-Year Master Plan ({plan.masterPlanRef}). No separate internal approval process is required!
              </p>
            </div>
          )}

          {/* Submit Action (draft) */}
          {canSubmit && plan.status === 'draft' && (
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-700">This plan is in Draft status.</p>
              <p className="text-xs text-blue-600">Click "Submit for Dean Review" above to begin the approval process.</p>
            </div>
          )}

          {/* Action: Internal */}
          {canActInternal && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-blue-800 text-sm">Your Approval Required</h2>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                placeholder="Comments…" />
              <div className="flex gap-2">
                <button onClick={() => handleInternalAction('approve')} disabled={actionLoading}
                  className="flex-1 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-60">
                  <FaCheck size={10} className="inline mr-1" /> Approve
                </button>
                <button onClick={() => handleInternalAction('reject')} disabled={actionLoading}
                  className="flex-1 py-2 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-400 disabled:opacity-60">
                  <FaTimes size={10} className="inline mr-1" /> Reject
                </button>
              </div>
            </div>
          )}

          {/* External Approval Chain */}
          {showExternal && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <FaGlobeAsia className="text-blue-600" /> External Approvals (Phase 3)
              </h2>
              {EXTERNAL_CHAIN.map(step => (
                <ExternalStepCard key={step.body} step={step}
                  approval={getExternalApproval(step.body)}
                  canRecord={canRecordExternal}
                  onRecord={handleExternalRecord} />
              ))}
            </div>
          )}

          {/* Confirm Budget Received */}
          {plan.status === 'parliament_approved' && canConfirmBudget && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 space-y-3">
              <h2 className="font-semibold text-emerald-800 text-sm">Confirm Budget Receipt</h2>
              <p className="text-xs text-emerald-600">Parliament has approved the budget. Confirm that the university has received the allocation to trigger Phase 4 distribution.</p>
              <button onClick={handleConfirmBudget} disabled={confirming}
                className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 disabled:opacity-60">
                <FaCheckCircle className="inline mr-2" size={12} />
                {confirming ? 'Confirming…' : 'Confirm Budget Received'}
              </button>
            </div>
          )}

          {/* Plan Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-slate-800 text-sm">Plan Summary</h2>
            {[
              { label: 'Plan Year', value: plan.planYear },
              { label: 'Cycle Year', value: `Year ${plan.cycleYearNumber} of 3` },
              { label: 'Budget Request', value: fmtCurrency(plan.totalBudgetRequest) },
              { label: 'Allocated', value: fmtCurrency(plan.totalAllocatedBudget) },
              { label: 'Items', value: `${plan.items?.length || 0} items` },
              { label: 'Status', value: fmtStatus(plan.status) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-semibold text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
