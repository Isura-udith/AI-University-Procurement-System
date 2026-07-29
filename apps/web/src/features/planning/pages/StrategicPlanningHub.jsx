import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaCalendarAlt, FaMoneyBillWave, FaArrowRight, FaGlobeAsia, FaChevronRight, FaPlus, FaLayerGroup, FaSitemap, FaClipboardCheck, FaTable, FaFileAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import planningService from '../../../services/planning.service';
import ProcurementWorkflowTracker from '../../../components/ProcurementWorkflowTracker';

const PHASE_STEPS = [
  { phase: 1, label: '3-Year Master Plan', icon: FaLayerGroup, color: 'violet', path: '/planning/master-plans', desc: 'Chief Bursar → Finance Committee → VC → Council' },
  { phase: 2, label: 'Annual Plan', icon: FaCalendarAlt, color: 'blue', path: '/planning/annual-plans', desc: 'Split MPP into yearly procurement plans with budget estimates' },
  { phase: 3, label: 'Budget Approval', icon: FaGlobeAsia, color: 'amber', path: '/planning/annual-plans', desc: 'Finance Committee → VC → Council → UGC → Treasury → Parliament' },
  { phase: 4, label: 'Budget Distribution', icon: FaMoneyBillWave, color: 'emerald', path: '/planning/budget-distribution', desc: 'VC → Finance Committee → Bursar → Dean → HOD' },
];

const COLOR_MAP = {
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-600', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-600',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: 'bg-amber-500',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700' },
  emerald:{ bg: 'bg-emerald-50',border: 'border-emerald-200',icon: 'bg-emerald-600',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700' },
};

function StatCard({ label, value, sub, icon: Icon, color = 'emerald' }) {
  const colorMap = {
    violet: { text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100', icon: 'text-violet-600' },
    emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-600' },
    blue: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-600' },
    amber: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600' },
  }[color] || { text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-600' };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center justify-between hover:shadow-md transition-all">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl sm:text-3xl font-black mt-1 ${colorMap.text}`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{sub}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl ${colorMap.bg} ${colorMap.icon}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}

export default function StrategicPlanningHub() {
  const { user } = useSelector(s => s.auth);
  const [stats, setStats] = useState({ masterPlans: 0, annualPlans: 0, activeMPPs: 0, pendingApprovals: 0 });
  const [recentMPPs, setRecentMPPs] = useState([]);
  const [recentAnnual, setRecentAnnual] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [mpps, finalMPPs, annual, pendingMPP, pendingAnnual, pendingFinal] = await Promise.all([
          planningService.getMasterPlans({ limit: 100 }),
          planningService.getFinalMasterPlans({ limit: 100 }),
          planningService.getAnnualPlans({ limit: 100 }),
          planningService.getPendingMasterPlans().catch(() => ({ data: [] })),
          planningService.getPendingAnnualPlans().catch(() => ({ data: [] })),
          planningService.getPendingFinalMasterPlans().catch(() => ({ data: [] })),
        ]);

        const mppData = (mpps.data?.data || mpps.data || []).map(p => ({
          ...p,
          isFinal: false,
          detailPath: `/planning/master-plans/${p._id}`
        }));

        const finalData = (finalMPPs.data?.data || finalMPPs.data || []).map(p => ({
          ...p,
          isFinal: true,
          cycleStart: p.cycleStart || (p.planYear ? p.planYear : 2028),
          cycleEnd: p.cycleEnd || (p.planYear ? p.planYear + 2 : 2030),
          totalEstimatedBudget: p.totalEstimatedBudget || p.bursarEstimatedBudget || 0,
          detailPath: `/planning/final-master-plans/${p._id}`
        }));

        const combinedMPPs = [...mppData, ...finalData].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const annualData = annual.data?.data || annual.data || [];
        const pendMPP = pendingMPP.data?.data || pendingMPP.data || [];
        const pendAnn = pendingAnnual.data?.data || pendingAnnual.data || [];
        const pendFinal = pendingFinal.data?.data || pendingFinal.data || [];

        const mppTotal = (mpps.pagination?.total ?? mppData.length) + (finalMPPs.pagination?.total ?? finalData.length);
        const annualTotal = annual.pagination?.total ?? annual.data?.pagination?.total ?? annual.data?.total ?? annualData.length;

        setRecentMPPs(combinedMPPs.slice(0, 5));
        setRecentAnnual(annualData.slice(0, 5));
        setStats({
          masterPlans: mppTotal,
          annualPlans: annualTotal,
          activeMPPs: combinedMPPs.filter(p => p.status === 'active' || p.status === 'council_approved').length,
          pendingApprovals: (Array.isArray(pendMPP) ? pendMPP.length : 0) + (Array.isArray(pendAnn) ? pendAnn.length : 0) + (Array.isArray(pendFinal) ? pendFinal.length : 0),
        });
      } catch {
        // fallback to empty
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusColor = (s) => {
    if (['active', 'council_approved', 'parliament_approved', 'budget_received', 'distribution_complete'].includes(s)) return 'bg-emerald-100 text-emerald-700';
    if (['draft'].includes(s)) return 'bg-slate-100 text-slate-600';
    if (['rejected'].includes(s)) return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';
  const fmtCurrency = (n) => n ? `LKR ${Number(n).toLocaleString()}` : '—';

  const canCreate = ['department_head', 'bursar', 'procurement_officer', 'admin', 'super_admin'].includes(user?.role);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">  
          <FaFileAlt size={160} /> 
        </div>

        <div className="relative z-10 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">Strategic Planning Hub</h1>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          <Link to="/workflow" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold rounded-xl transition-all shadow-xs backdrop-blur-md">
            <FaSitemap size={12} className="text-emerald-400" />
            <span>45-Step Lifecycle</span>
          </Link>
          {canCreate && (
            <>
              <Link to="/planning/master-plans/new" className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-all shadow-md">
                <FaPlus size={11} />
                <span>New Master Plan</span>
              </Link>
              <Link to="/planning/annual-plans/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md">
                <FaPlus size={11} />
                <span>New Annual Plan</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Master Plans" value={loading ? '—' : stats.masterPlans} sub="3-Year MPP Total" icon={FaLayerGroup} color="violet" />
        <StatCard label="Active MPPs" value={loading ? '—' : stats.activeMPPs} sub="Council Approved" icon={FaCheckCircle} color="emerald" />
        <StatCard label="Annual Plans" value={loading ? '—' : stats.annualPlans} sub="Across All Years" icon={FaCalendarAlt} color="blue" />
        <StatCard label="Pending Action" value={loading ? '—' : stats.pendingApprovals} sub="Requires Approval" icon={FaExclamationTriangle} color="amber" />
      </div>


      {/* Workflow Progress Ring + Next Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progress Ring */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Overall Completion</p>
          {(() => {
            const pct = stats.activeMPPs > 0 ? Math.min(100, Math.round((stats.activeMPPs / Math.max(1, stats.masterPlans)) * 100)) : 0;
            const radius = 56;
            const circumference = 2 * Math.PI * radius;
            const dashOffset = circumference - (pct / 100) * circumference;
            return (
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle cx="64" cy="64" r={radius} fill="none" stroke="url(#gradRing)" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    className="transition-all duration-1000 ease-out" />
                  <defs>
                    <linearGradient id="gradRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-slate-800">{pct}%</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Plans Active</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Next Required Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
             Next Required Actions
          </h2>
          <div className="space-y-2">
            {!loading && recentMPPs.filter(p => p.status !== 'active' && p.status !== 'rejected').length === 0 &&
              recentAnnual.filter(p => p.status !== 'distribution_complete' && p.status !== 'budget_received' && p.status !== 'rejected').length === 0 && (
              <div className="text-center py-6 text-sm text-slate-400">All plans are up-to-date. No pending actions.</div>
            )}
            {recentMPPs.filter(p => p.status !== 'active' && p.status !== 'rejected').slice(0, 3).map(plan => {
              const nextAction = plan.status === 'draft' ? 'Submit for approval'
                : plan.status?.includes('review') ? `Pending ${fmtStatus(plan.status).split(' ')[0]} approval`
                : `Advance to next stage (${fmtStatus(plan.status)})`;
              return (
                <Link key={plan._id} to={`/planning/master-plans/${plan._id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-violet-100 bg-violet-50/50 hover:bg-violet-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                      <FaLayerGroup size={12} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{plan.title}</p>
                      <p className="text-xs text-violet-600 font-medium">{nextAction}</p>
                    </div>
                  </div>
                  <FaChevronRight size={10} className="text-slate-400 group-hover:text-violet-600 transition-colors" />
                </Link>
              );
            })}
            {recentAnnual.filter(p => p.status !== 'distribution_complete' && p.status !== 'budget_received' && p.status !== 'rejected').slice(0, 3).map(plan => {
              const nextAction = plan.status === 'draft' ? 'Submit for approval'
                : plan.status === 'parliament_approved' ? 'Confirm budget received'
                : plan.status?.includes('review') || plan.status?.includes('submitted') ? `Pending ${fmtStatus(plan.status).split(' ')[0]} approval`
                : `Advance (${fmtStatus(plan.status)})`;
              return (
                <Link key={plan._id} to={`/planning/annual-plans/${plan._id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <FaCalendarAlt size={12} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{plan.title}</p>
                      <p className="text-xs text-blue-600 font-medium">{nextAction}</p>
                    </div>
                  </div>
                  <FaChevronRight size={10} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phase Pipeline */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Planning Phases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PHASE_STEPS.map((phase) => {
            const c = COLOR_MAP[phase.color];
            const Icon = phase.icon;
            return (
              <Link key={phase.phase} to={phase.path} className={`group flex flex-col gap-3 p-5 rounded-2xl border ${c.border} ${c.bg} hover:shadow-md transition-all`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center`}>
                    <Icon className="text-white" size={18} />
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.badge}`}>Phase {phase.phase}</span>
                </div>
                <div>
                  <p className={`font-semibold ${c.text}`}>{phase.label}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{phase.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-slate-600 transition-colors mt-auto">
                  View <FaChevronRight size={10} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Draft Sheet & Final Master Plans Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/planning/draft-sheet" className="group flex items-center gap-4 p-5 rounded-2xl border border-teal-200 bg-teal-50/50 hover:bg-teal-50 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
            <FaTable size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-teal-900">Draft Plan Sheet</h3>
            <p className="text-xs text-teal-700 mt-0.5">Enter draft procurement requirements. Items go through HOD → Dean approval.</p>
          </div>
          <FaChevronRight className="text-teal-400 group-hover:text-teal-600 transition-colors" />
        </Link>

        <Link to="/planning/final-master-plans" className="group flex items-center gap-4 p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <FaClipboardCheck size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-emerald-900">Final Master Plans</h3>
            <p className="text-xs text-emerald-700 mt-0.5">Compile approved drafts into Final Plans with 6-stage approval before procurement.</p>
          </div>
          <FaChevronRight className="text-emerald-400 group-hover:text-emerald-600 transition-colors" />
        </Link>
      </div>

      {/* Two-column: Recent MPPs + Recent Annual Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Master Plans */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2"><FaLayerGroup className="text-violet-600" /> Master Plans</h2>
            <Link to="/planning/master-plans" className="text-xs text-violet-600 font-semibold hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
            ) : recentMPPs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No master plans yet.
                {canCreate && <Link to="/planning/master-plans/new" className="block mt-2 text-violet-600 font-semibold hover:underline">Create one →</Link>}
              </div>
            ) : recentMPPs.map(plan => (
              <Link key={plan._id} to={plan.detailPath || `/planning/master-plans/${plan._id}`} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-1">{plan.title}</p>
                  <p className="text-xs text-slate-500">{plan.referenceNumber} {plan.cycleStart && plan.cycleEnd ? `· ${plan.cycleStart}–${plan.cycleEnd}` : ''}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor(plan.status)}`}>{fmtStatus(plan.status)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Annual Plans */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2"><FaCalendarAlt className="text-blue-600" /> Annual Plans</h2>
            <Link to="/planning/annual-plans" className="text-xs text-blue-600 font-semibold hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
            ) : recentAnnual.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No annual plans yet.</div>
            ) : recentAnnual.map(plan => (
              <Link key={plan._id} to={`/planning/annual-plans/${plan._id}`} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-1">{plan.title}</p>
                  <p className="text-xs text-slate-500">{plan.referenceNumber} · Year {plan.planYear}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor(plan.status)}`}>{fmtStatus(plan.status)}</span>
                  <p className="text-xs text-slate-400 mt-1">{fmtCurrency(plan.totalBudgetRequest)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 45-Step Workflow Tracker (Compact) */}
      <ProcurementWorkflowTracker currentStep={1} compact />

      {/* End-to-end flow diagram */}
      <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">End-to-End Workflow</h2>
          <Link to="/workflow" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
            Full 45-Step View <FaChevronRight size={8} />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            'HOD (3-Yr Requirements)', 'Faculty Dean', 'Bursar Estimation', 'Finance Committee',
            'Vice Chancellor', 'Council', '3-Yr Master Plan', 'Annual Plans', 'Budget Plan',
            'Finance Committee', 'VC', 'Council', 'UGC', 'Treasury', 'Parliament',
            'University Budget', 'Dept. Allocation', 'Procurement Request',
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-lg font-medium ${
                ['3-Yr Master Plan','Annual Plans','University Budget','Dept. Allocation'].includes(step)
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
