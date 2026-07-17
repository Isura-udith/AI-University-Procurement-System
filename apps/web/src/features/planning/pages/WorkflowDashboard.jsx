import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaLayerGroup, FaCalendarAlt, FaMoneyBillWave, FaShoppingCart, FaFileContract, FaTruck, FaBoxes, FaChevronRight, FaArrowRight, FaExclamationTriangle } from 'react-icons/fa';
import ProcurementWorkflowTracker from '../../../components/ProcurementWorkflowTracker';
import planningService from '../../../services/planning.service';

const APPROVAL_TABLE = [
  { range: 'Up to Rs. 200,000', authority: 'Faculty Dean', color: 'blue' },
  { range: 'Rs. 200,001 – 500,000', authority: 'Bursar', color: 'indigo' },
  { range: 'Rs. 500,001 – 1,000,000', authority: 'Procurement Committee', color: 'violet' },
  { range: 'Above Rs. 1,000,000', authority: 'Procurement Committee', color: 'rose' },
];

const PHASE_CARDS = [
  { id: 1, title: 'Strategic Planning', icon: FaLayerGroup, path: '/planning/master-plans', steps: '1–8', color: 'violet', desc: '3-Year Master Plan with approval chain' },
  { id: 2, title: 'Annual Planning', icon: FaCalendarAlt, path: '/planning/annual-plans', steps: '9–11', color: 'blue', desc: 'Split into yearly procurement plans' },
  { id: 3, title: 'Budget Approval', icon: FaMoneyBillWave, path: '/planning/annual-plans', steps: '12–20', color: 'amber', desc: 'Internal + UGC → Treasury → Parliament' },
  { id: 4, title: 'Budget Distribution', icon: FaMoneyBillWave, path: '/planning/budget-distribution', steps: '21–26', color: 'emerald', desc: 'VC → Finance → Bursar → Dean → HOD' },
  { id: 5, title: 'Procurement Request', icon: FaShoppingCart, path: '/procurements', steps: '27–29', color: 'cyan', desc: 'Create & approve based on value' },
  { id: 6, title: 'Tender & Selection', icon: FaFileContract, path: '/tenders', steps: '30–36', color: 'indigo', desc: 'Publish, bid, evaluate, award' },
  { id: 7, title: 'Purchase & Receive', icon: FaTruck, path: '/store', steps: '37–41', color: 'orange', desc: 'Delivery, GRN, inspection, inventory' },
  { id: 8, title: 'Distribution', icon: FaBoxes, path: '/store/issue', steps: '42–45', color: 'rose', desc: 'Issue to departments, complete' },
];

const COLOR_MAP = {
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-600', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'bg-cyan-600', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-600', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-600', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-600', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700' },
};

export default function WorkflowDashboard() {
  const [stats, setStats] = useState({ masterPlans: 0, annualPlans: 0, pendingApprovals: 0, budgetAllocations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [mpps, annual, pendingMPP, pendingAnnual, budget] = await Promise.all([
          planningService.getMasterPlans({ limit: 1 }),
          planningService.getAnnualPlans({ limit: 1 }),
          planningService.getPendingMasterPlans(),
          planningService.getPendingAnnualPlans(),
          planningService.getMyBudget(),
        ]);
        const mppTotal = mpps.pagination?.total ?? mpps.data?.pagination?.total ?? mpps.data?.total ?? 0;
        const annualTotal = annual.pagination?.total ?? annual.data?.pagination?.total ?? annual.data?.total ?? 0;
        const pendMPP = pendingMPP.data?.data || pendingMPP.data || [];
        const pendAnn = pendingAnnual.data?.data || pendingAnnual.data || [];
        setStats({
          masterPlans: mppTotal,
          annualPlans: annualTotal,
          pendingApprovals: (Array.isArray(pendMPP) ? pendMPP.length : 0) + (Array.isArray(pendAnn) ? pendAnn.length : 0),
          budget: budget.data?.data || budget.data || {},
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Procurement Workflow</h1>
          <p className="text-sm text-slate-500 mt-1">Complete 45-Step Lifecycle · 8 Phases · From Planning to Distribution</p>
        </div>
        {stats.pendingApprovals > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <FaExclamationTriangle className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{stats.pendingApprovals} pending your approval</span>
            <Link to="/approvals" className="text-xs font-bold text-amber-600 hover:underline ml-2">View →</Link>
          </div>
        )}
      </div>

      {/* 8-Phase Navigation Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Workflow Phases</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PHASE_CARDS.map((phase) => {
            const c = COLOR_MAP[phase.color];
            const Icon = phase.icon;
            return (
              <Link key={phase.id} to={phase.path} className={`group flex flex-col gap-3 p-4 rounded-2xl border ${c.border} ${c.bg} hover:shadow-md transition-all`}>
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
                    <Icon className="text-white" size={16} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>Steps {phase.steps}</span>
                </div>
                <div>
                  <p className={`text-sm font-bold ${c.text}`}>Phase {phase.id}: {phase.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{phase.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors mt-auto">
                  Open <FaChevronRight size={8} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Full 45-Step Tracker */}
      <ProcurementWorkflowTracker currentStep={1} />

      {/* Approval Thresholds Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Step 29: Value-Based Approval Authority</h3>
          <p className="text-xs text-slate-500 mt-0.5">Procurement requests are routed based on their estimated total cost</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Procurement Value</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Approval Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {APPROVAL_TABLE.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700">{row.range}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full bg-${row.color}-100 text-${row.color}-700`}>{row.authority}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* End-to-End Flow Banner */}
      <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">End-to-End Workflow · 45 Steps</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            'HOD Identifies Needs', 'Dean Reviews', 'Bursar Estimates', 'Finance Committee', 'VC Approves', 'Council Approves',
            '3-Year Master Plan', 'Annual Plans Created', 'Budget Prepared',
            'Dean → Bursar → Finance → VC → Council', 'UGC', 'Treasury', 'Parliament',
            'Budget Allocated', 'VC Distributes', 'Finance Verifies', 'Bursar Confirms', 'Dean Allocates', 'HOD Receives',
            'Procurement Request', 'Value-Based Approval', 'Tender Published', 'Bids Submitted', 'TEC Evaluates', 'Supplier Selected', 'Contract Awarded',
            'Goods Delivered', 'GRN Created', 'Inspection', 'Inventory Updated',
            'Dept. Requests', 'Store Issues', 'Dept. Receives', 'COMPLETED ✓',
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-lg font-medium ${
                ['3-Year Master Plan', 'Annual Plans Created', 'Budget Allocated', 'Contract Awarded', 'COMPLETED ✓'].includes(step)
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/10 text-slate-300'
              }`}>{step}</span>
              {i < arr.length - 1 && <FaArrowRight size={8} className="text-slate-500 shrink-0" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
