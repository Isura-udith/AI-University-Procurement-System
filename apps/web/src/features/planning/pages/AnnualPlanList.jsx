import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaEye, FaCalendarAlt, FaEdit } from 'react-icons/fa';
import planningService from '../../../services/planning.service';
import { DEPARTMENTS_AND_FACULTIES } from '../../../constants/departments';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'dean_review', label: 'Dean Review' },
  { value: 'finance_committee_review', label: 'Finance Committee' },
  { value: 'vc_review', label: 'VC Review' },
  { value: 'council_review', label: 'Council Review' },
  { value: 'ugc_submitted', label: 'UGC Submitted' },
  { value: 'ugc_approved', label: 'UGC Approved' },
  { value: 'treasury_approved', label: 'Treasury Approved' },
  { value: 'parliament_approved', label: 'Parliament Approved' },
  { value: 'budget_received', label: 'Budget Received' },
  { value: 'distribution_complete', label: 'Distributed' },
];



function statusStyle(s) {
  if (['active', 'distribution_complete', 'budget_received', 'parliament_approved'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'draft') return 'bg-slate-100 text-slate-600 border-slate-200';
  if (['ugc_submitted', 'ugc_approved', 'treasury_submitted', 'treasury_approved', 'parliament_submitted'].includes(s)) return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

const fmtCurrency = (n) => n ? `LKR ${(n / 1000000).toFixed(1)}M` : '—';
const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

export default function AnnualPlanList() {
  const { user } = useSelector(s => s.auth);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const canCreate = ['procurement_officer', 'admin', 'super_admin', 'department_head'].includes(user?.role);

  useEffect(() => {
    planningService.getAnnualPlans({ limit: 50 })
      .then(res => {
        const data = res.data?.data || res.data || [];
        setPlans(data);
      })
      .catch(() => {
        setPlans([]);
        toast.error('Failed to load annual plans');
      })
      .finally(() => setLoading(false));
  }, []);

  const [cycleYearFilter, setCycleYearFilter] = useState('all');

  const uniqueYears = [...new Set(plans.map(p => p.planYear))].sort((a, b) => b - a);

  const filtered = plans.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchYear = yearFilter === 'all' || String(p.planYear) === yearFilter;
    const matchCycleYear = cycleYearFilter === 'all' || String(p.cycleYearNumber || 1) === cycleYearFilter;
    const matchDept = deptFilter === 'all' || p.faculty === deptFilter || p.department === deptFilter || p.items?.some(i => i.faculty === deptFilter || i.department === deptFilter);
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.referenceNumber?.includes(search);
    return matchStatus && matchYear && matchCycleYear && matchDept && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Annual Procurement Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Phases 2 & 3 · Yearly plans derived from 3-Year Master Plans & Final Master Plans</p>
        </div>
        {canCreate && (
          <Link to="/planning/annual-plans/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-all shadow-sm">
            <FaPlus size={12} /> New Annual Plan
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plans…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={cycleYearFilter} onChange={e => setCycleYearFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-800">
          <option value="all">All 3-Year Cycle Years</option>
          <option value="1">Year 1 (Cycle Yr 1)</option>
          <option value="2">Year 2 (Cycle Yr 2)</option>
          <option value="3">Year 3 (Cycle Yr 3)</option>
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Calendar Years</option>
          {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Departments / Faculties</option>
          {DEPARTMENTS_AND_FACULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* External Approval Tracker Legend */}
      <div className="flex flex-wrap gap-2">
        {['Internal Review', 'UGC', 'Treasury', 'Parliament', 'Budget Received'].map((stage, i) => (
          <div key={stage} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className={`w-2.5 h-2.5 rounded-full ${['bg-amber-400', 'bg-blue-400', 'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500'][i]}`} />
            {stage}
            {i < 4 && <span className="text-slate-300 ml-1">→</span>}
          </div>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <FaCalendarAlt size={32} className="text-slate-300" />
          <p className="text-sm">No annual plans found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plan => (
            <Link key={plan._id} to={`/planning/annual-plans/${plan._id}`}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{plan.referenceNumber}</span>
                  <p className="font-semibold text-slate-800 mt-2 text-sm line-clamp-2">{plan.title}</p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full border ${statusStyle(plan.status)}`}>
                  {fmtStatus(plan.status)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                  <p className="text-slate-400">Year</p>
                  <p className="font-bold text-slate-700">{plan.planYear} <span className="font-normal text-slate-400">(Yr {plan.cycleYearNumber})</span></p>
                </div>
                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                  <p className="text-slate-400">Items</p>
                  <p className="font-bold text-blue-700">{plan.items?.length || 0} items</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                  <p className="text-slate-400">Requested</p>
                  <p className="font-bold text-slate-700">{fmtCurrency(plan.totalBudgetRequest)}</p>
                </div>
                {plan.totalAllocatedBudget && (
                  <div className="col-span-3 bg-emerald-50 rounded-lg px-3 py-2">
                    <p className="text-emerald-600 text-xs">Allocated</p>
                    <p className="font-bold text-emerald-700">{fmtCurrency(plan.totalAllocatedBudget)}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Master Plan:</span>
                <span className={`font-mono font-semibold px-2 py-0.5 rounded ${plan.masterPlanRef?.includes('FMP') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-violet-50 text-violet-700 border border-violet-200'}`}>
                  {plan.masterPlanRef || plan.masterPlanId?.referenceNumber || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {plan.status === 'draft' ? (
                  <Link to={`/planning/annual-plans/${plan._id}/edit`} onClick={e => e.stopPropagation()} className="text-xs text-amber-600 font-semibold flex items-center gap-1 hover:underline">
                    <FaEdit size={10} /> Edit Draft
                  </Link>
                ) : <span />}
                <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  View Details <FaEye size={10} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
