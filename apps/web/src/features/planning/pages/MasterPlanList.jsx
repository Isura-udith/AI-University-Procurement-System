import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaEye, FaLayerGroup, FaEdit } from 'react-icons/fa';
import planningService from '../../../services/planning.service';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'dean_review', label: 'Dean Review' },
  { value: 'bursar_estimation', label: 'Bursar Estimation' },
  { value: 'finance_committee_review', label: 'Finance Committee' },
  { value: 'vc_review', label: 'VC Review' },
  { value: 'council_review', label: 'Council Review' },
  { value: 'active', label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
];



function statusStyle(s) {
  if (s === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'draft') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

export default function MasterPlanList() {
  const { user } = useSelector(s => s.auth);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const canCreate = ['department_head', 'bursar', 'procurement_officer', 'admin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    planningService.getMasterPlans({ limit: 50 })
      .then(res => {
        const data = res.data?.data || res.data || [];
        setPlans(data);
      })
      .catch(() => {
        setPlans([]);
        toast.error('Failed to load master plans');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = plans.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.referenceNumber?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const fmtCurrency = (n) => n ? `LKR ${(n / 1000000).toFixed(1)}M` : '—';
  const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Procurement Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Phase 1 · 3-Year strategic procurement planning</p>
        </div>
        {canCreate && (
          <Link to="/planning/master-plans/new" className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-all shadow-sm">
            <FaPlus size={12} /> New Master Plan
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or reference…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
            <FaLayerGroup size={32} className="text-slate-300" />
            <p className="text-sm">No master plans found.</p>
            {canCreate && <Link to="/planning/master-plans/new" className="text-sm text-violet-600 font-semibold hover:underline">Create the first one →</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cycle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Budget Est.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(plan => (
                  <tr key={plan._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-violet-700 bg-violet-50 px-2 py-1 rounded-lg">{plan.referenceNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 line-clamp-1">{plan.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{plan.faculty}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{plan.cycleStart}–{plan.cycleEnd}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{fmtCurrency(plan.totalEstimatedBudget)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full border ${statusStyle(plan.status)}`}>
                        {fmtStatus(plan.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {plan.status === 'draft' && (
                          <Link to={`/planning/master-plans/${plan._id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors">
                            <FaEdit size={11} /> Edit
                          </Link>
                        )}
                        <Link to={`/planning/master-plans/${plan._id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-colors">
                          <FaEye size={11} /> View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
