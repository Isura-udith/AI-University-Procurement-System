import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FaCheckCircle,
  FaFileInvoiceDollar,
  FaChartPie,
  FaLayerGroup,
  FaShieldAlt,
  FaSync,
  FaChevronRight,
  FaBuilding,
  FaGavel,
  FaRobot
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import planningService from "../../services/planning.service";
import tenderService from "../../services/tender.service";
import aiService from "../../services/ai.service";

// Format currency in LKR
const fmtLKR = (v) => {
  if (!v && v !== 0) return "LKR 0";
  if (v >= 1_000_000_000) return `LKR ${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `LKR ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `LKR ${(v / 1_000).toFixed(0)}K`;
  return `LKR ${Number(v).toLocaleString()}`;
};

// Colors for charts
const FACULTY_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#0ea5e9"  // Sky
];

export default function CouncilDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [plans, setPlans] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionModal, setActionModal] = useState({ open: false, type: null, plan: null });
  const [resolutionNote, setResolutionNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const fetchDashboardData = async () => {
      try {
        const [finalPlansRes, pendingPlansRes, masterPlansRes, tendersRes, alertsRes] = await Promise.allSettled([
          planningService.getFinalMasterPlans({ limit: 100 }),
          planningService.getPendingFinalMasterPlans(),
          planningService.getMasterPlans({ limit: 100 }),
          tenderService.getAll({ limit: 100 }),
          aiService.getMarketAlerts()
        ]);

        if (ignore) return;

        let fetchedPlans = [];
        if (finalPlansRes.status === "fulfilled" && finalPlansRes.value?.data) {
          const resData = finalPlansRes.value.data;
          const list = Array.isArray(resData)
            ? resData
            : Array.isArray(resData.data)
            ? resData.data
            : resData.plans || [];
          fetchedPlans = [...list];
        }

        if (pendingPlansRes.status === "fulfilled" && pendingPlansRes.value?.data) {
          const pendingResData = pendingPlansRes.value.data;
          const pendingList = Array.isArray(pendingResData)
            ? pendingResData
            : Array.isArray(pendingResData.data)
            ? pendingResData.data
            : pendingResData.plans || [];

          pendingList.forEach((p) => {
            if (!fetchedPlans.some((existing) => String(existing._id) === String(p._id))) {
              fetchedPlans.push(p);
            }
          });
        }

        if (masterPlansRes.status === "fulfilled" && masterPlansRes.value?.data) {
          const mResData = masterPlansRes.value.data;
          const mList = Array.isArray(mResData)
            ? mResData
            : Array.isArray(mResData.data)
            ? mResData.data
            : mResData.plans || [];

          mList.forEach((p) => {
            if (!fetchedPlans.some((existing) => String(existing._id) === String(p._id))) {
              fetchedPlans.push(p);
            }
          });
        }

        let fetchedTenders = [];
        if (tendersRes.status === "fulfilled" && tendersRes.value?.data) {
          const tResData = tendersRes.value.data;
          fetchedTenders = Array.isArray(tResData)
            ? tResData
            : Array.isArray(tResData.data)
            ? tResData.data
            : tResData.tenders || [];
        }

        let fetchedAlerts = [];
        if (alertsRes.status === "fulfilled" && alertsRes.value?.data) {
          const aResData = alertsRes.value.data;
          fetchedAlerts = Array.isArray(aResData)
            ? aResData
            : Array.isArray(aResData.alerts)
            ? aResData.alerts
            : Array.isArray(aResData.data?.alerts)
            ? aResData.data.alerts
            : [];
        }

        setPlans(fetchedPlans);
        setTenders(fetchedTenders);
        setAlerts(fetchedAlerts);
      } catch (err) {
        if (!ignore) {
          console.error("Error loading council dashboard data:", err);
          setPlans([]);
          setTenders([]);
          setAlerts([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
  };

  const handleOpenAction = (plan, type) => {
    setActionModal({ open: true, type, plan });
    setResolutionNote("");
  };

  const handleConfirmAction = async () => {
    if (!actionModal.plan) return;
    setSubmittingAction(true);
    try {
      await planningService.approveFinalMasterPlan(actionModal.plan._id, {
        action: actionModal.type === "approve" ? "approve" : "reject",
        comments: resolutionNote
      });
      handleRefresh();
      setActionModal({ open: false, type: null, plan: null });
    } catch (err) {
      console.error("Failed to record council decision:", err);
      alert("Error submitting decision: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Dynamic KPI & Visualization Calculations directly from DB records
  const pendingRatificationsCount = plans.filter((p) => {
    const st = (p.status || "").toLowerCase();
    return (
      st === "pending_council_approval" ||
      st === "council_review" ||
      st === "submitted" ||
      st === "pending" ||
      st === "vc_review" ||
      st === "bursar_review" ||
      st === "finance_committee_review"
    );
  }).length;

  const totalMasterBudget = plans.reduce(
    (acc, p) => acc + (p.totalEstimatedBudget || p.estimatedTotalCost || p.budget || 0),
    0
  );

  const majorTendersCount = tenders.filter(
    (t) => (t.estimatedValue || t.budget || t.engineersEstimate || 0) >= 50_000_000
  ).length;

  const approvedPlansCount = plans.filter((p) => {
    const st = (p.status || "").toLowerCase();
    return (
      st === "active" ||
      st === "council_approved" ||
      st === "approved_by_council" ||
      st === "approved" ||
      st === "parliament_approved"
    );
  }).length;

  const totalPlansCount = plans.length;
  const governanceScore = totalPlansCount > 0
    ? `${Math.round((approvedPlansCount / totalPlansCount) * 100)}%`
    : "100%";

  const budgetByDepartmentData = (() => {
    const facultyMap = {};
    plans.forEach((p) => {
      const facName = p.faculty || "Central Administration";
      const cleanedName = facName.replace(/^Faculty of\s+/i, "").trim();
      const budgetM = (p.totalEstimatedBudget || p.estimatedTotalCost || p.budget || 0) / 1_000_000;
      facultyMap[cleanedName] = (facultyMap[cleanedName] || 0) + budgetM;
    });

    return Object.keys(facultyMap).map((name) => ({
      name,
      budget: Math.round(facultyMap[name] * 10) / 10
    }));
  })();

  const pipelineDistribution = (() => {
    let draftCount = 0;
    let reviewCount = 0;
    let pendingCouncilCount = 0;
    let approvedCount = 0;

    plans.forEach((p) => {
      const st = (p.status || "").toLowerCase();
      if (st === "draft") {
        draftCount++;
      } else if (
        st === "submitted" ||
        st === "bursar_review" ||
        st === "finance_committee_review" ||
        st === "vc_review"
      ) {
        reviewCount++;
      } else if (st === "council_review" || st === "pending_council_approval" || st === "pending") {
        pendingCouncilCount++;
      } else if (
        st === "active" ||
        st === "council_approved" ||
        st === "approved_by_council" ||
        st === "approved"
      ) {
        approvedCount++;
      }
    });

    const activeTendersCount = tenders.filter((t) => {
      const st = (t.status || "").toLowerCase();
      return st === "active" || st === "published" || st === "open";
    }).length;

    return [
      { name: "Draft Plans", value: draftCount, color: "#94a3b8" },
      { name: "Ministry & Review", value: reviewCount, color: "#f59e0b" },
      { name: "Council Review", value: pendingCouncilCount, color: "#ec4899" },
      { name: "Council Approved", value: approvedCount, color: "#10b981" },
      { name: "Active Tenders", value: activeTendersCount, color: "#3b82f6" }
    ];
  })();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 p-8 text-center space-y-4">
        <FaSync className="animate-spin text-purple-600" size={36} />
        <p className="text-sm font-semibold text-slate-600">Loading University Council Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Executive Council Header ───────────────────────────────────────── */}
      <div className="bg-linear-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-purple-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white mt-1">
                  University Council
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 backdrop-blur-md cursor-pointer"
            >
              <FaSync className={refreshing ? "animate-spin" : ""} size={14} />
              {refreshing ? "Refreshing..." : "Refresh Board Data"}
            </button>
            <Link
              to="/planning/final-master-plans"
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
            >
              View All Plans
            </Link>
          </div>
        </div>

        {/* Quick summary badges */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Member Session</p>
            <p className="text-sm font-bold text-white mt-0.5">{user?.name || "University Council Member"}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Approval Threshold</p>
            <p className="text-sm font-bold text-purple-300 mt-0.5">LKR 100,000,000+</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Board Reviews</p>
            <p className="text-sm font-bold text-amber-300 mt-0.5">{pendingRatificationsCount} Plan(s) Requiring Action</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">System Governance Status</p>
            <p className="text-sm font-bold text-emerald-300 mt-0.5">{approvedPlansCount} / {totalPlansCount} Plans Approved</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <FaGavel size={20} />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
              Action Required
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{pendingRatificationsCount}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              Master Plans Pending Ratification
            </p>
            <p className="text-[11px] text-amber-600 font-medium mt-2">
              High-value plans awaiting Council signature
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <FaFileInvoiceDollar size={20} />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700">
              Procurement Budget
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{fmtLKR(totalMasterBudget)}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              Total Master Procurement Budget
            </p>
            <p className="text-[11px] text-purple-600 font-medium mt-2">
              Statutory allocations across recorded faculties
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <FaBuilding size={20} />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              High Value
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{majorTendersCount} Tenders</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              Major Tenders Under Oversight
            </p>
            <p className="text-[11px] text-blue-600 font-medium mt-2">
              Value exceeds LKR 50M statutory threshold
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FaShieldAlt size={20} />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
              Audit Compliance
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{governanceScore}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              Statutory & Governance Score
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-2">
              {approvedPlansCount} of {totalPlansCount} Master Plans Ratified
            </p>
          </div>
        </div>
      </div>

      {/* ── Council Master Plan Ratification Queue Table ─────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Master Procurement Plans Pending Council Ratification
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                {plans.length} Total Plans
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review and grant final statutory approval for multi-year university master plans.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/planning/final-master-plans"
              className="text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition-colors border border-purple-200/60 inline-flex items-center gap-1.5"
            >
              View Full Master Sheet <FaChevronRight size={10} />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Plan Reference</th>
                <th className="py-4 px-6">Title & Faculty</th>
                <th className="py-4 px-6 text-right">Est. Total Budget</th>
                <th className="py-4 px-6 text-center">Items</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-medium">
                    No master procurement plans found in the database.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => {
                  const isPending =
                    plan.status === "pending_council_approval" ||
                    plan.status === "council_review" ||
                    plan.status === "submitted" ||
                    plan.status === "pending" ||
                    plan.status === "bursar_review" ||
                    plan.status === "finance_committee_review" ||
                    plan.status === "vc_review";

                  return (
                    <tr
                      key={plan._id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-4 px-6 font-mono font-bold text-purple-700">
                        {plan.planCode || plan.referenceNumber || plan._id}
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          {plan.title || plan.name || "University Master Plan"}
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <FaBuilding size={10} className="text-slate-400" />
                          {plan.faculty || "University Central"} • {plan.department || "All Depts"}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900 font-mono text-sm">
                        {fmtLKR(plan.totalEstimatedBudget || plan.estimatedTotalCost || plan.budget || 0)}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-700">
                        {plan.itemsCount || (plan.items ? plan.items.length : 0)}
                      </td>
                      <td className="py-4 px-6">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Pending Ratification
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <FaCheckCircle size={12} className="text-emerald-600" />
                            Council Approved
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenAction(plan, "approve")}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FaCheckCircle size={12} /> Ratify
                            </button>
                            <button
                              onClick={() => handleOpenAction(plan, "clarify")}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Review
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Ratified</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Strategic Charts Section (2-Column Grid) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Faculty Budget Allocation */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Budget Allocation by Faculty / Domain
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Estimated allocations in Millions (LKR M)
                </p>
              </div>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <FaLayerGroup size={18} />
              </span>
            </div>
            {budgetByDepartmentData.length > 0 ? (
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetByDepartmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val) => [`LKR ${val} Million`, "Budget"]}
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }}
                    />
                    <Bar dataKey="budget" radius={[8, 8, 0, 0]}>
                      {budgetByDepartmentData.map((entry, index) => (
                        <Cell key={`faculty-bar-${index}`} fill={FACULTY_COLORS[index % FACULTY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full mt-4 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-semibold text-slate-400">No departmental budget allocation data found in database.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Procurement Lifecycle Pipeline Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Procurement Stage Pipeline Distribution
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Distribution of university procurements across statutory phases
                </p>
              </div>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FaChartPie size={18} />
              </span>
            </div>
            {pipelineDistribution.some((d) => d.value > 0) ? (
              <div className="h-64 w-full mt-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pipelineDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} Procurements`, "Count"]}
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full mt-4 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-semibold text-slate-400">No active procurement pipeline items found in database.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Risk & Governance Feed for Council ──────────────────────────── */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30">
              <FaRobot size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Executive Governance Feed</h3>
              <p className="text-xs text-emerald-400 font-semibold">
                Real-time compliance monitoring & market price risk signals
              </p>
            </div>
          </div>
          <Link
            to="/ai/risk-assessment"
            className="text-xs font-bold px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl border border-emerald-500/30 transition-colors"
          >
            Launch Governance AI Risk Hub
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {alerts.length > 0 ? (
            alerts.slice(0, 2).map((alert, idx) => (
              <div key={alert._id || idx} className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <FaCheckCircle size={12} /> {alert.affectedCategory || "Market Signal"}
                  </span>
                  <span>{alert.severity ? alert.severity.toUpperCase() : "INFO"}</span>
                </div>
                <p className="text-xs font-semibold text-white">
                  {alert.title}: {alert.description || alert.recommendation}
                </p>
              </div>
            ))
          ) : (
            <>
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <FaCheckCircle size={12} /> Master Plans Status
                  </span>
                  <span>Database Synchronized</span>
                </div>
                <p className="text-xs font-semibold text-white">
                  {plans.length > 0
                    ? `${pendingRatificationsCount} plan(s) currently awaiting Council ratification out of ${plans.length} total plan(s).`
                    : "No Master Procurement Plans currently pending Council review in the database."}
                </p>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-bold text-blue-400 flex items-center gap-1">
                    <FaShieldAlt size={12} /> Tenders Governance
                  </span>
                  <span>Active Tracking</span>
                </div>
                <p className="text-xs font-semibold text-white">
                  {tenders.length > 0
                    ? `${tenders.length} total procurement tender(s) tracked with ${majorTendersCount} major tender(s) exceeding statutory threshold.`
                    : "No active procurement tenders recorded in the system database."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Approval Modal ─────────────────────────────────────────────────── */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                  <FaGavel size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {actionModal.type === "approve"
                      ? "Ratify Master Procurement Plan"
                      : "Request Revision / Clarification"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {actionModal.plan?.planCode || actionModal.plan?.referenceNumber || actionModal.plan?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionModal({ open: false, type: null, plan: null })}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50/60 rounded-2xl p-4 text-xs space-y-2 border border-purple-100">
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500 font-semibold">Faculty / Entity:</span>
                <span className="font-bold">{actionModal.plan?.faculty || "University Central"}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500 font-semibold">Total Estimated Budget:</span>
                <span className="font-bold text-purple-900 font-mono">
                  {fmtLKR(actionModal.plan?.totalEstimatedBudget || actionModal.plan?.estimatedTotalCost || actionModal.plan?.budget || 0)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Board Resolution & Council Minute Notes
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter official resolution notes for the council minute registry..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActionModal({ open: false, type: null, plan: null })}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={submittingAction}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FaCheckCircle size={14} />
                {submittingAction ? "Submitting..." : "Confirm Board Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
