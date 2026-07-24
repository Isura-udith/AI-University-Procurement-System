import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaCheck, FaPlus, FaShoppingCart, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import planningService from '../../../services/planning.service';

const DISTRIBUTION_STEPS = [
  { key: 'vc_distributed', label: 'VC → Finance Committee', role: 'vc' },
  { key: 'finance_committee_verified', label: 'Finance Committee Verified', role: 'finance_committee' },
  { key: 'bursar_confirmed', label: 'Bursar Confirmed', role: 'bursar' },
  { key: 'dean_notified', label: 'Deans Notified', role: 'dean' },
  { key: 'hod_notified', label: 'HODs Notified', role: 'department_head' },
  { key: 'complete', label: 'Distribution Complete', role: null },
];

const FACULTIES = [
  'Faculty of Applied Sciences', 'Faculty of Medicine', 'Faculty of Management Studies',
  'Faculty of Technology', 'Faculty of Graduate Studies', 'ICT Centre', 'Library',
  'Works Division', 'Supplies Division', 'Finance Division',
];



function BudgetBar({ consumed, allocated }) {
  const pct = allocated > 0 ? Math.min(100, (consumed / allocated) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }} />
    </div>
  );
}

function DistributionStep({ step, currentStatus, userRole, onAdvance, loading }) {
  const steps = DISTRIBUTION_STEPS.map(s => s.key);
  const currentIdx = steps.indexOf(currentStatus);
  const stepIdx = steps.indexOf(step.key);
  const isDone = stepIdx <= currentIdx;
  const isCurrent = stepIdx === currentIdx + 1;
  const canAct = isCurrent && step.role === userRole;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${isCurrent ? 'bg-emerald-50 border border-emerald-200' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
        ${isDone ? 'bg-emerald-500' : isCurrent ? 'bg-amber-500' : 'bg-slate-200'}`}>
        {isDone ? <FaCheck className="text-white" size={12} /> : <span className="text-xs font-bold text-white">{stepIdx + 1}</span>}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${isDone ? 'text-emerald-700' : isCurrent ? 'text-amber-700' : 'text-slate-500'}`}>{step.label}</p>
      </div>
      {canAct && (
        <button onClick={onAdvance} disabled={loading}
          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-60">
          {loading ? '…' : 'Confirm'}
        </button>
      )}
    </div>
  );
}

export default function BudgetDistribution() {
  const { user } = useSelector(s => s.auth);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [annualPlans, setAnnualPlans] = useState([]);
  const [createForm, setCreateForm] = useState({
    annualPlanId: '', budgetYear: new Date().getFullYear(),
    totalUniversityBudget: '', procurementBudget: '',
    departmentAllocations: [{ faculty: FACULTIES[0], department: '', allocatedAmount: '' }],
  });

  useEffect(() => {
    Promise.all([
      planningService.getBudgetAllocations(),
      planningService.getAnnualPlans({ limit: 50 }),
    ]).then(([allocRes, planRes]) => {
      const data = allocRes.data?.data || allocRes.data || [];
      setAllocations(data);
      setAnnualPlans(planRes.data?.data || planRes.data || []);
    }).catch(() => {
      setAllocations([]);
      toast.error('Failed to load budget allocations');
    })
      .finally(() => setLoading(false));
  }, []);

  const handleAdvance = async (id) => {
    setAdvanceLoading(true);
    try {
      const res = await planningService.advanceDistribution(id);
      const updated = res.data?.data || res.data;
      setAllocations(prev => prev.map(a => a._id === id ? { ...a, distributionStatus: updated.distributionStatus } : a));
      toast.success('Distribution status advanced!');
    } catch (err) { console.error(err); toast.error('Failed to advance'); }
    finally { setAdvanceLoading(false); }
  };

  const handleCreate = async () => {
    if (!createForm.annualPlanId) {
      toast.error('Please select an Annual Plan');
      return;
    }
    try {
      const payload = {
        ...createForm,
        budgetYear: Number(createForm.budgetYear),
        totalUniversityBudget: Number(createForm.totalUniversityBudget),
        procurementBudget: Number(createForm.procurementBudget),
        departmentAllocations: createForm.departmentAllocations.map(d => ({ ...d, allocatedAmount: Number(d.allocatedAmount) })),
      };
      const res = await planningService.createBudgetAllocation(payload);
      const newAlloc = res.data?.data || res.data;
      setAllocations(prev => [newAlloc, ...prev]);
      setShowCreate(false);
      toast.success('Budget allocation created!');
    } catch (err) { console.error(err); toast.error(err?.message || err?.response?.data?.message || 'Failed to create allocation'); }
  };

  const addDeptRow = () => setCreateForm(f => ({ ...f, departmentAllocations: [...f.departmentAllocations, { faculty: FACULTIES[0], department: '', allocatedAmount: '' }] }));
  const removeDeptRow = (i) => setCreateForm(f => ({ ...f, departmentAllocations: f.departmentAllocations.filter((_, idx) => idx !== i) }));

  const fmtCurrency = (n) => n ? `LKR ${(Number(n) / 1000000).toFixed(1)}M` : '—';
  const fmtFull = (n) => n ? `LKR ${Number(n).toLocaleString()}` : '—';
  const canCreate = ['vc', 'admin', 'super_admin'].includes(user?.role);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Distribution</h1>
          <p className="text-sm text-slate-500 mt-1">Phase 4 · VC → Finance Committee → Bursar → Dean → HOD</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-all shadow-sm">
            <FaPlus size={12} /> New Allocation
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 space-y-5 animate-scale-in">
          <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Create Budget Allocation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Annual Plan</label>
              <select value={createForm.annualPlanId} onChange={e => setCreateForm(f => ({ ...f, annualPlanId: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">— Select Plan —</option>
                {annualPlans.map(p => <option key={p._id} value={p._id}>{p.referenceNumber} ({p.planYear})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Budget Year</label>
              <input type="number" value={createForm.budgetYear} onChange={e => setCreateForm(f => ({ ...f, budgetYear: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Total University Budget (LKR)</label>
              <input type="number" value={createForm.totalUniversityBudget} onChange={e => setCreateForm(f => ({ ...f, totalUniversityBudget: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. 2500000000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Procurement Budget (LKR)</label>
              <input type="number" value={createForm.procurementBudget} onChange={e => setCreateForm(f => ({ ...f, procurementBudget: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. 850000000" />
            </div>
          </div>
          {/* Department rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Department Allocations</label>
              <button type="button" onClick={addDeptRow} className="text-xs text-emerald-600 font-semibold hover:underline"><FaPlus size={10} className="inline mr-1" /> Add Row</button>
            </div>
            {createForm.departmentAllocations.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <select value={row.faculty} onChange={e => setCreateForm(f => { const d = [...f.departmentAllocations]; d[i].faculty = e.target.value; return { ...f, departmentAllocations: d }; })}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  {FACULTIES.map(f => <option key={f}>{f}</option>)}
                </select>
                <input placeholder="Department" value={row.department} onChange={e => setCreateForm(f => { const d = [...f.departmentAllocations]; d[i].department = e.target.value; return { ...f, departmentAllocations: d }; })}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount (LKR)" value={row.allocatedAmount} onChange={e => setCreateForm(f => { const d = [...f.departmentAllocations]; d[i].allocatedAmount = e.target.value; return { ...f, departmentAllocations: d }; })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  {createForm.departmentAllocations.length > 1 && (
                    <button type="button" onClick={() => removeDeptRow(i)} className="text-red-400 hover:text-red-600 px-2">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500">Create Allocation</button>
          </div>
        </div>
      )}

      {/* Allocation Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
      ) : allocations.map(alloc => (
        <div key={alloc._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Alloc Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-linear-to-r from-emerald-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="font-mono text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">{alloc.referenceNumber}</span>
                <h3 className="font-bold text-slate-900 mt-1">Budget Year {alloc.budgetYear}</h3>
                <p className="text-sm text-slate-500">University Budget: {fmtCurrency(alloc.totalUniversityBudget)} · Procurement: {fmtCurrency(alloc.procurementBudget)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Consumed</p>
                  <p className="text-lg font-bold text-slate-800">{fmtCurrency(alloc.totalConsumed)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Remaining</p>
                  <p className="text-lg font-bold text-emerald-700">{fmtCurrency(alloc.totalRemaining)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* Distribution Progress */}
            <div className="p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Distribution Progress</h3>
              <div className="space-y-1">
                {DISTRIBUTION_STEPS.map(step => (
                  <DistributionStep key={step.key} step={step}
                    currentStatus={alloc.distributionStatus}
                    userRole={user?.role}
                    onAdvance={() => handleAdvance(alloc._id)}
                    loading={advanceLoading} />
                ))}
              </div>
            </div>

            {/* Department Allocations */}
            <div className="lg:col-span-2 p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Department Allocations</h3>
              <div className="space-y-3">
                {alloc.departmentAllocations?.map((dept, i) => {
                  const pct = dept.allocatedAmount > 0 ? Math.round((dept.consumedAmount / dept.allocatedAmount) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-700">{dept.department}</span>
                          <span className="text-slate-400 ml-1">({dept.faculty})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-700">{fmtFull(dept.allocatedAmount)}</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${pct > 80 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{pct}%</span>
                        </div>
                      </div>
                      <BudgetBar consumed={dept.consumedAmount} allocated={dept.allocatedAmount} />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Consumed: {fmtFull(dept.consumedAmount)}</span>
                        <span className="text-emerald-600 font-medium">Remaining: {fmtFull(dept.remainingAmount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Enable Procurement Action — shown when distribution is complete */}
          {alloc.distributionStatus === 'complete' && (
            <div className="px-6 py-4 border-t border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                    <FaCheckCircle className="text-white" size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Distribution Complete — Procurement Enabled</p>
                    <p className="text-xs text-emerald-600">Departments can now raise procurement requests against their allocated budgets.</p>
                  </div>
                </div>
                <Link to="/procurements/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-all shadow-sm hover:shadow-md">
                  <FaShoppingCart size={12} /> Create Request <FaArrowRight size={10} />
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
