import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaLayerGroup,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaShoppingCart,
  FaFileContract,
  FaTruck,
  FaBoxes,
  FaChevronRight,
  FaArrowRight,
  FaExclamationTriangle,
  FaFileAlt
} from 'react-icons/fa';
import ProcurementWorkflowTracker from '../../../components/ProcurementWorkflowTracker';
import planningService from '../../../services/planning.service';

const APPROVAL_TABLE = [
  {
    range: 'Up to Rs. 200,000',
    authority: 'Finance Committee',
    chain: 'Dept User → HOD → Dean → Finance Committee → PMD (Publish)',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    range: 'Rs. 200,001 – 500,000',
    authority: 'Finance Committee',
    chain: 'Dept User → HOD → Dean → Bursar → Finance Committee → PMD (Publish)',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    range: 'Rs. 500,001 – 1,000,000',
    authority: 'Finance Committee',
    chain: 'Dept User → HOD → Dean → Bursar → VC → Finance Committee → PMD (Publish)',
    badgeBg: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  {
    range: 'Above Rs. 1,000,000',
    authority: 'University Council',
    chain: 'Dept User → HOD → Dean → Bursar → VC → Council → Finance Committee → PMD (Publish)',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
  },
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
  const [simulatedStep, setSimulatedStep] = useState(1);

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
        // silent fallback
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="text-xs text-slate-500 font-medium">Loading 45-Step Lifecycle Workflow...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
            </div>
            <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">  
                      <FaFileAlt size={160} /> 
                    </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 flex items-center space-x-3">
              <span>Procurement Workflow Dashboard</span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {stats.pendingApprovals > 0 && (
              <div className="flex items-center space-x-2 bg-amber-500/20 border border-amber-400/30 rounded-xl px-4 py-2 text-xs">
                <FaExclamationTriangle className="text-amber-400" size={12} />
                <span className="font-bold text-amber-200">{stats.pendingApprovals} Approvals Pending</span>
                <Link to="/approvals" className="font-bold text-amber-400 hover:underline ml-1">
                  View →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Step Simulator Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div>
            <p className="text-xs font-bold text-slate-900">Simulate Active Lifecycle Step</p>
            <p className="text-[11px] text-slate-500">Drag or select to test step progress across all 8 phases</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
          <input
            type="range"
            min={1}
            max={45}
            value={simulatedStep}
            onChange={(e) => setSimulatedStep(Number(e.target.value))}
            className="w-48 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-black text-emerald-800 min-w-24 text-center">
            Step {simulatedStep} / 45
          </div>
          <button
            onClick={() => setSimulatedStep(1)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 8-Phase Navigation Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            8 Workflow Phases Navigation
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Click any phase to navigate to its module
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PHASE_CARDS.map((phase) => {
            const c = COLOR_MAP[phase.color];
            const Icon = phase.icon;
            return (
              <Link
                key={phase.id}
                to={phase.path}
                className={`group flex flex-col justify-between p-4 rounded-2xl border ${c.border} ${c.bg} hover:shadow-md transition-all space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center shadow-sm`}>
                    <Icon className="text-white" size={15} />
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${c.badge}`}>
                    Steps {phase.steps}
                  </span>
                </div>

                <div>
                  <p className={`text-xs font-extrabold ${c.text}`}>
                    Phase {phase.id}: {phase.title}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{phase.desc}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-slate-800 transition-colors pt-1 border-t border-slate-200/50">
                  <span>Open Module</span>
                  <FaChevronRight size={9} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Full 45-Step Lifecycle Tracker */}
      <ProcurementWorkflowTracker currentStep={simulatedStep} />

      {/* Step 29 Value-Based Approval Thresholds Reference Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>Step 29: Value-Based Approval Authority Matrix</span>
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Procurement Value Range</th>
                <th className="px-6 py-3">Full Approval Chain</th>
                <th className="px-6 py-3 text-center">Approval Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {APPROVAL_TABLE.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900">{row.range}</td>
                  <td className="px-6 py-3.5 text-xs text-slate-600 font-mono tracking-tight">
                    {row.chain}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${row.badgeBg}`}>
                      {row.authority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* End-to-End 45 Steps Flow Banner */}
      <div className="bg-linear-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
            End-to-End Workflow Flowchart · 45 Sequential Steps
          </h2>
          <span className="text-[11px] text-slate-400 font-semibold">
            Section 1 to 45 Progression
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            'HOD Identifies Needs',
            'Dean Reviews',
            'Bursar Estimates',
            'Finance Committee',
            'VC Approves',
            'Council Approves',
            '3-Year Master Plan',
            'Annual Plans Created',
            'Budget Prepared',
            'Dean → Bursar → Finance → VC → Council',
            'UGC Review',
            'Treasury Review',
            'Parliament Approval',
            'Budget Allocated',
            'VC Distributes',
            'Finance Verifies',
            'Bursar Confirms',
            'Dean Allocates',
            'HOD Receives Budget',
            'Procurement Requisition',
            'Value-Based Approval',
            'Tender Published',
            'Bids Submitted',
            'TEC Evaluation',
            'Supplier Selection',
            'Contract Awarded',
            'Goods Delivered',
            'GRN Created',
            'Quality Inspection',
            'Inventory Updated',
            'Dept Requisition',
            'Store Issues Items',
            'Dept Receives Items',
            'Procurement Completed ✓',
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                  ['3-Year Master Plan', 'Annual Plans Created', 'Budget Allocated', 'Contract Awarded', 'Procurement Completed ✓'].includes(
                    step
                  )
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 shadow-sm'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {step}
              </span>
              {i < arr.length - 1 && <FaArrowRight size={8} className="text-slate-500 shrink-0" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
