import { Link, useOutletContext } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import SupplierDashboard from "./SupplierDashboard";
import CouncilDashboard from "./CouncilDashboard";
import SuppliesDivisionDashboard from "./SuppliesDivisionDashboard";
import {
  FaClipboardList,
  FaMoneyCheckAlt,
  FaUsers,
  FaFileContract,
  FaClock,
  FaRobot,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBoxOpen,
  FaShieldAlt,
  FaChevronRight,
  FaStar,
  FaTrophy,
  FaSync,
  FaBuilding,
  FaSlidersH,
  FaEye,
  FaEyeSlash,
  FaArrowUp,
  FaArrowDown,
  FaUndo,
  FaTimes
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
  Area,
  AreaChart,
  ComposedChart,
  Line,
} from "recharts";
import dashboardService from "../../services/dashboard.service";

// ── Default Widget Catalog & Storage ──────────────────────────────────────────
const DEFAULT_WIDGETS = [
  {
    id: "kpi_cards",
    title: "Executive KPI Cards",
    category: "Metrics",
    description: "Summary metrics for active requisitions, spend, contracts, and vendors",
    visible: true,
  },
  {
    id: "spend_chart",
    title: "Procurement Spend Chart",
    category: "Analytics",
    description: "Monthly spend estimation trend area chart",
    visible: true,
  },
  {
    id: "status_donut",
    title: "Procurement Status Breakdown",
    category: "Analytics",
    description: "Distribution of requisitions by lifecycle status",
    visible: true,
  },
  {
    id: "pipeline_chart",
    title: "Procurement Pipeline",
    category: "Analytics",
    description: "Items count grouped by lifecycle stage",
    visible: true,
  },
  {
    id: "faculty_spend",
    title: "Dept / Faculty Spend",
    category: "Analytics",
    description: "Estimated spend breakdown per department or faculty",
    visible: true,
  },
  {
    id: "category_donut",
    title: "Category Breakdown",
    category: "Analytics",
    description: "Procurement categories proportion donut chart",
    visible: true,
  },
  {
    id: "action_items",
    title: "My Action Items",
    category: "Workflows",
    description: "Pending approvals and high priority task queue",
    visible: true,
  },
  {
    id: "top_vendors",
    title: "Top Vendors",
    category: "Vendors",
    description: "Highest rated and preferred supplier list",
    visible: true,
  },
  {
    id: "recent_activity",
    title: "Recent Procurement Activity",
    category: "Activity",
    description: "Real-time updates and requisitions event log",
    visible: true,
  },
  {
    id: "ai_feed",
    title: "AI Intelligence Feed",
    category: "AI & ML",
    description: "Automated ML risk analysis and demand forecasting hub link",
    visible: true,
  },
];

const STORAGE_KEY = "smartprocure_dashboard_widget_settings";

const loadWidgetSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const map = new Map(parsed.map((w) => [w.id, w]));
        const merged = DEFAULT_WIDGETS.map((def) => {
          const savedW = map.get(def.id);
          return savedW ? { ...def, visible: savedW.visible ?? def.visible } : def;
        });
        const savedOrderIds = parsed.map((w) => w.id);
        merged.sort((a, b) => {
          const idxA = savedOrderIds.indexOf(a.id);
          const idxB = savedOrderIds.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
        return merged;
      }
    }
  } catch {
    /* ignore storage error */
  }
  return DEFAULT_WIDGETS;
};

// ── Color maps ────────────────────────────────────────────────────────────────
const colorMap = {
  emerald: {
    bg: "bg-emerald-500",
    text: "text-emerald-600",
    light: "bg-emerald-100",
  },
  amber: { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-100" },
  blue: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-100" },
  indigo: {
    bg: "bg-indigo-500",
    text: "text-indigo-600",
    light: "bg-indigo-100",
  },
};

const CATEGORY_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
];

// Status → pipeline stage grouping
const STATUS_TO_STAGE = {
  draft: "Draft",
  submitted: "Submitted",
  flagged_special_approval: "Submitted",
  hod_approved: "HOD Approved",
  dean_approved: "Dean Approved",
  pmd_approved: "PMD Approved",
  bursar_approved: "Bursar Approved",
  finance_committee_approved: "Finance Approved",
  pmd_review: "PMD Review",
  budget_locked: "Budget Locked",
  tender_preparation: "Tendering",
  published: "Tendering",
  bidding: "Tendering",
  evaluation: "Evaluation",
  technical_evaluation: "Evaluation",
  financial_evaluation: "Evaluation",
  contract_award: "Awarded",
  contract_signing: "Awarded",
  in_progress: "In Progress",
  delivery_pending: "Delivery",
  grn_pending: "Delivery",
  three_way_match: "Delivery",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// Status → broad group for pie chart
const STATUS_GROUPS = {
  Draft: { statuses: ["draft"], color: "#94a3b8" },
  Pending: {
    statuses: ["submitted", "flagged_special_approval"],
    color: "#f59e0b",
  },
  Approved: {
    statuses: [
      "hod_approved",
      "dean_approved",
      "pmd_approved",
      "bursar_approved",
      "finance_committee_approved",
      "pmd_review",
      "budget_locked",
    ],
    color: "#3b82f6",
  },
  Active: {
    statuses: [
      "tender_preparation",
      "published",
      "bidding",
      "evaluation",
      "technical_evaluation",
      "financial_evaluation",
      "contract_award",
      "contract_signing",
      "delivery_pending",
      "grn_pending",
      "three_way_match",
      "in_progress",
    ],
    color: "#8b5cf6",
  },
  Completed: { statuses: ["completed"], color: "#10b981" },
  Rejected: { statuses: ["rejected", "cancelled"], color: "#ef4444" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTimeDiff = (date) => {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const fmtLKR = (v) => {
  if (!v) return "0";
  if (v >= 1_000_000) return `LKR ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `LKR ${(v / 1_000).toFixed(0)}K`;
  return `LKR ${v}`;
};

const getActivityType = (status = "") => {
  const s = status.toLowerCase();
  if (s.includes("submit")) return "create";
  if (s.includes("approved")) return "approve";
  if (s.includes("lock") || s.includes("budget")) return "lock";
  if (s.includes("bid") || s.includes("tender")) return "bid";
  if (s.includes("reject") || s.includes("cancel")) return "alert";
  return "other";
};

// ── UI helpers ────────────────────────────────────────────────────────────────
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
);

const EmptyState = ({ icon: Icon, msg, link, linkLabel }) => (
  <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 gap-2">
    {Icon && <Icon size={28} className="mb-1 opacity-50" />}
    <p className="text-sm font-medium text-slate-500">{msg}</p>
    {link && (
      <Link to={link} className="text-xs text-emerald-600 hover:underline">
        {linkLabel} →
      </Link>
    )}
  </div>
);

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, path, loading }) {
  const c = colorMap[color] || colorMap.blue;
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between min-h-37">
        <div className="flex items-center justify-between">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2 mt-4">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  const badgeText = sub || (label === "Active Contracts" ? "In force" : "Active");
  const badgeBg = c.light || "bg-slate-50";
  const badgeTextClass = c.text || "text-slate-500";

  return (
    <Link
      to={path}
      className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-37 h-full"
    >
      <div
        className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${c.light} opacity-40 group-hover:scale-150 transition-transform duration-500 pointer-events-none`}
      />
      <div className="flex items-center justify-between relative z-10 w-full">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${c.bg} shrink-0 transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon size={20} />
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeBg} ${badgeTextClass} max-w-27.5 truncate shrink-0`}
        >
          {badgeText}
        </span>
      </div>

      <div className="relative z-10 mt-4 flex flex-col">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-slate-800 transition-colors duration-300">
          {value}
        </h3>
        <p className="text-[11px] font-bold text-slate-400 mt-2 tracking-wider uppercase">
          {label}
        </p>
      </div>
    </Link>
  );
}

// ── Chart Skeleton ────────────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div className="flex flex-col justify-end gap-2 h-full pb-4 pt-6 px-2">
    {[65, 40, 80, 55, 90, 35].map((h, i) => (
      <Skeleton key={i} className="w-full rounded" style={{ height: `${h}%` }} />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const userRole = user?.role;
  const { category = "all", timeRange = "month" } = useOutletContext() || {};

  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);

  // Widget Customization & Persistence State
  const [widgets, setWidgets] = useState(() => loadWidgetSettings());
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Spend Chart View Type: 'area' | 'bar' | 'composed'
  const [spendGraphType, setSpendGraphType] = useState("area");

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const saveWidgetSettings = (newWidgets) => {
    setWidgets(newWidgets);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
    } catch {
      /* ignore storage error */
    }
  };

  const toggleWidgetVisibility = (id) => {
    const updated = widgets.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    saveWidgetSettings(updated);
  };

  const moveWidget = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= widgets.length) return;
    const updated = [...widgets];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    saveWidgetSettings(updated);
  };

  const resetWidgetsDefault = () => {
    saveWidgetSettings(DEFAULT_WIDGETS);
  };

  const setAllWidgetsVisibility = (visible) => {
    const updated = widgets.map((w) => ({ ...w, visible }));
    saveWidgetSettings(updated);
  };

  const isWidgetVisible = (id) => {
    const found = widgets.find((w) => w.id === id);
    return found ? found.visible : true;
  };

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Fetch all dashboard data ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const privileged = [
          "admin",
          "super_admin",
          "procurement_officer",
          "vc",
          "bursar",
          "finance_officer",
          "finance_committee",
          "department_head",
          "dean",
          "contract_manager",
          "store_manager",
          "tec_member",
          "auditor",
          "council",
        ].includes(userRole);

        const filterParams = {};
        if (category && category !== "all") filterParams.category = category;
        if (timeRange && timeRange !== "all") filterParams.timeRange = timeRange;

        const results = await Promise.allSettled([
          dashboardService.getProcurementStats(filterParams),
          dashboardService.getPendingApprovals(),
          privileged ? dashboardService.getContracts() : Promise.resolve(null),
          privileged ? dashboardService.getVendors() : Promise.resolve(null),
          privileged ? dashboardService.getTenders() : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const getValue = (r) => (r.status === "fulfilled" ? r.value : null);

        setRawData({
          procStatsRaw: getValue(results[0]),
          pendingRaw: getValue(results[1]),
          contractsRaw: getValue(results[2]),
          vendorsRaw: getValue(results[3]),
          tendersRaw: getValue(results[4]),
        });
        setLastRefresh(new Date());
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [userRole, refreshKey, category, timeRange]);

  const [now] = useState(() => Date.now());

  // ── Role-specific short-circuits ──────────────────────────────────────────
  if (user?.role === "supplier") return <SupplierDashboard />;
  if (user?.role === "council") return <CouncilDashboard />;
  if (user?.role === "supplies_division") return <SuppliesDivisionDashboard />;

  // ── Extract typed data ────────────────────────────────────────────────────
  const procStats = rawData?.procStatsRaw?.data || null;
  const pendingList = Array.isArray(rawData?.pendingRaw?.data)
    ? rawData.pendingRaw.data
    : Array.isArray(rawData?.pendingRaw)
      ? rawData.pendingRaw
      : [];
  const contractsList = Array.isArray(rawData?.contractsRaw?.data)
    ? rawData.contractsRaw.data
    : [];
  const vendorsList = Array.isArray(rawData?.vendorsRaw?.data)
    ? rawData.vendorsRaw.data
    : [];

  // ── KPI values ────────────────────────────────────────────────────────────
  const activeReqs = procStats?.active ?? 0;
  const pendingCount = procStats?.pending ?? pendingList.length;
  const totalSpend = procStats?.totalSpend ?? 0;
  const vendorTotal =
    rawData?.vendorsRaw?.pagination?.total ?? vendorsList.length;
  const activeContracts =
    contractsList.filter((c) => c.status === "active").length ||
    rawData?.contractsRaw?.pagination?.total ||
    0;

  // ── Full 12-Month Spend Chart Data ───────────────────────────────────────
  const spendChartData = (() => {
    const recentItems = procStats?.recentItems || [];
    const monthlySpendBackend = procStats?.monthlySpend || [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const currentYear = new Date().getFullYear();
    const map = {};
    months.forEach((m, idx) => {
      map[idx] = {
        month: m,
        spend: 0,
        count: 0,
        monthIdx: idx,
        year: currentYear,
      };
    });

    // Populate actual procurement items
    recentItems.forEach((item) => {
      const date = item.createdAt ? new Date(item.createdAt) : new Date();
      const monthIdx = date.getMonth();
      if (map[monthIdx]) {
        map[monthIdx].spend += (item.totalEstimatedCost || 0) / 1_000_000;
        map[monthIdx].count += 1;
      }
    });

    // If backend provided monthlySpend array
    if (Array.isArray(monthlySpendBackend) && monthlySpendBackend.length > 0) {
      monthlySpendBackend.forEach((ms) => {
        const mIdx = ms.month ? ms.month - 1 : ms._id?.month ? ms._id.month - 1 : -1;
        if (mIdx >= 0 && mIdx < 12) {
          map[mIdx].spend = (ms.totalAmount || ms.totalCost || ms.spend || 0) / 1_000_000;
          map[mIdx].count = ms.count || map[mIdx].count;
        }
      });
    }

    return Object.values(map);
  })();



  // ── Pipeline (by status stage groups) ─────────────────────────────────────
  const pipelineData = (() => {
    const byStatus = procStats?.byStatus || [];
    const buckets = {};
    byStatus.forEach(({ _id: status, count }) => {
      const stage = STATUS_TO_STAGE[status] || status;
      buckets[stage] = (buckets[stage] || 0) + count;
    });
    return Object.entries(buckets)
      .map(([stage, count]) => ({ stage, count }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  })();

  // ── Status donut ──────────────────────────────────────────────────────────
  const statusDonutData = (() => {
    const byStatus = procStats?.byStatus || [];
    const total = byStatus.reduce((s, x) => s + x.count, 0) || 1;
    return Object.entries(STATUS_GROUPS)
      .map(([name, { statuses, color }]) => {
        const count = byStatus
          .filter((s) => statuses.includes(s._id))
          .reduce((a, s) => a + s.count, 0);
        return {
          name,
          value: Math.round((count / total) * 100),
          rawCount: count,
          color,
        };
      })
      .filter((s) => s.rawCount > 0);
  })();

  // ── Category spend (from byCategory) ─────────────────────────────────────
  const categoryData = (() => {
    const byCategory = procStats?.byCategory || [];
    const total = byCategory.reduce((s, c) => s + c.count, 0) || 1;
    return byCategory.slice(0, 6).map((c, i) => ({
      name: c._id || "Other",
      value: Math.round((c.count / total) * 100),
      amount: c.totalValue || 0,
      color: CATEGORY_COLORS[i] || "#8b5cf6",
    }));
  })();

  // ── Faculty / Department spend ─────────────────────────────────────────────
  const facultySpend = (() => {
    const byDept = procStats?.byDepartment || [];
    return byDept
      .filter((d) => d._id && d.totalValue > 0)
      .slice(0, 6)
      .map((d) => ({
        name: (d._id || "Other").replace(/^Faculty of /i, "").substring(0, 12),
        spend: parseFloat(((d.totalValue || 0) / 1_000_000).toFixed(2)),
        count: d.count || 0,
      }));
  })();

  // ── Top vendors (by score) ─────────────────────────────────────────────────
  const topVendors = vendorsList
    .filter((v) => v.performanceScore != null || v.status === "preferred")
    .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
    .slice(0, 5)
    .map((v) => ({
      id: v._id,
      name: v.companyName || v.name || "Vendor",
      score: Math.round(v.performanceScore || 75),
      category: v.categories?.[0] || "—",
      status: v.status,
    }));

  // ── Pending tasks ─────────────────────────────────────────────────────────
  const pendingTasks = pendingList.slice(0, 5).map((p) => {
    const nextStage =
      p.approvalChain?.find((s) => s.status === "pending")?.stage || "review";
    const daysWaiting = p.submittedAt
      ? Math.max(
          1,
          Math.ceil((now - new Date(p.submittedAt).getTime()) / 86400000)
        )
      : null;
    return {
      id: p._id,
      task: `Approve at ${nextStage.replace("_", " ").toUpperCase()} stage`,
      ref: p.referenceNumber || "—",
      deadline: daysWaiting ? `${daysWaiting}d pending` : "Awaiting",
      priority: ["hod", "dean"].includes(nextStage) ? "high" : "medium",
      path: "/approvals",
    };
  });

  // ── Recent activity (from recentItems) ────────────────────────────────────
  const recentActivity = (procStats?.recentItems || [])
    .slice(0, 6)
    .map((item, i) => ({
      id: item._id || i,
      action: item.title || "Procurement updated",
      ref: item.referenceNumber || "—",
      user: item.requestedBy
        ? `${item.requestedBy.firstName || ""} ${item.requestedBy.lastName || ""}`.trim()
        : "System",
      status: item.status || "",
      time: getTimeDiff(item.updatedAt || item.createdAt),
      type: getActivityType(item.status),
      path: `/procurements/${item._id}`,
      amount: item.totalEstimatedCost || 0,
    }));

  // ── Error / empty ─────────────────────────────────────────────────────────
  if (error && !rawData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <FaExclamationTriangle className="text-red-500" size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          Failed to load dashboard
        </h2>
        <p className="text-slate-500 text-sm max-w-sm text-center">{error}</p>
        <button
          onClick={triggerRefresh}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm"
        >
          <FaSync size={12} /> Retry
        </button>
      </div>
    );
  }

  const activeWidgetCount = widgets.filter((w) => w.visible).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-10">
      {/* Top Action & Refresh strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">
            {lastRefresh ? `Updated ${getTimeDiff(lastRefresh)}` : "Loading…"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCustomizeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300"
          >
            Customize Layout 
          </button>

          <button
            onClick={triggerRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40"
          >
            <FaSync size={10} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Empty Dashboard State ────────────────────────────────────────── */}
      {activeWidgetCount === 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center">
            <FaEyeSlash size={28} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">
              All Dashboard Widgets are Hidden
            </h3>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              You have hidden all widgets from your custom view. Open the customization panel to re-enable widgets.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setIsCustomizeOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2"
            >
              <FaSlidersH size={12} /> Customize Layout
            </button>
            <button
              onClick={resetWidgetsDefault}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <FaUndo size={12} /> Reset to Default
            </button>
          </div>
        </div>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      {isWidgetVisible("kpi_cards") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <KpiCard
            loading={loading}
            label="Active Requisitions"
            value={activeReqs}
            sub={procStats ? `${procStats.total || 0} total` : null}
            icon={FaClipboardList}
            color="emerald"
            path="/procurements"
          />
          <KpiCard
            loading={loading}
            label="Pending Approvals"
            value={pendingCount}
            sub={pendingCount > 0 ? "Needs action" : "All clear"}
            icon={FaClock}
            color="amber"
            path="/approvals"
          />
          <KpiCard
            loading={loading}
            label="Total Spend"
            value={fmtLKR(totalSpend)}
            sub={procStats ? `${procStats.completed || 0} completed` : null}
            icon={FaMoneyCheckAlt}
            color="emerald"
            path="/procurements"
          />
          <KpiCard
            loading={loading}
            label="Active Contracts"
            value={activeContracts}
            sub={null}
            icon={FaFileContract}
            color="blue"
            path="/contracts"
          />
          <KpiCard
            loading={loading}
            label="Registered Vendors"
            value={vendorTotal.toLocaleString()}
            sub={
              vendorsList.filter((v) => v.status === "preferred").length > 0
                ? `${vendorsList.filter((v) => v.status === "preferred").length} preferred`
                : null
            }
            icon={FaUsers}
            color="indigo"
            path="/vendors"
          />
        </div>
      )}

      {/* ── Spend Chart + Methods Pie ─────────────────────────────────── */}
      {(isWidgetVisible("spend_chart") || isWidgetVisible("status_donut")) && (
        <div
          className={`grid grid-cols-1 gap-6 ${
            isWidgetVisible("spend_chart") && isWidgetVisible("status_donut")
              ? "lg:grid-cols-3"
              : "lg:grid-cols-1"
          }`}
        >
          {/* Spend Area / Bar / Combo Chart */}
          {isWidgetVisible("spend_chart") && (
            <div
              className={`${
                isWidgetVisible("status_donut") ? "lg:col-span-2" : "lg:col-span-1"
              } bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow`}
            >
              {/* Header with Title & Mode Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Procurement Spend
                    </h3>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-emerald-700">
                      Annual Timeline
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Total estimated cost by month (LKR Millions)
                  </p>
                </div>

                {/* View selector buttons */}
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setSpendGraphType("area")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      spendGraphType === "area"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                     Area
                  </button>
                  <button
                    onClick={() => setSpendGraphType("bar")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      spendGraphType === "bar"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                         Bars
                  </button>
                  <button
                    onClick={() => setSpendGraphType("composed")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      spendGraphType === "composed"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                     Combo
                  </button>
                </div>
              </div>

              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Year Spend</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-0.5">
                    {fmtLKR(totalSpend)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg / Month</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-0.5">
                    {fmtLKR(totalSpend / 12)}
                  </span>
                </div>
                <div className="flex flex-col col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Months</span>
                  <span className="text-sm font-extrabold text-emerald-600 mt-0.5">
                    {spendChartData.filter((d) => d.spend > 0).length} Months Logged
                  </span>
                </div>
              </div>

              {/* Chart container */}
              <div className="w-full" style={{ height: 260 }}>
                {loading ? (
                  <ChartSkeleton />
                ) : hasMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {spendGraphType === "bar" ? (
                      <BarChart
                        data={spendChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="barSpendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                          unit="M"
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "14px",
                            border: "none",
                            boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                            fontWeight: 600,
                          }}
                          formatter={(v) => [`LKR ${Number(v).toFixed(2)}M`, "Estimated Spend"]}
                        />
                        <Bar
                          dataKey="spend"
                          fill="url(#barSpendGrad)"
                          radius={[8, 8, 0, 0]}
                          barSize={20}
                          animationDuration={1000}
                        />
                      </BarChart>
                    ) : spendGraphType === "composed" ? (
                      <ComposedChart
                        data={spendChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                          unit="M"
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "14px",
                            border: "none",
                            boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                            fontWeight: 600,
                          }}
                          formatter={(v) => [`LKR ${Number(v).toFixed(2)}M`, "Spend"]}
                        />
                        <Bar
                          dataKey="spend"
                          fill="#10b981"
                          radius={[6, 6, 0, 0]}
                          barSize={18}
                          name="spend"
                        />
                        <Line
                          type="monotone"
                          dataKey="spend"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#3b82f6" }}
                          name="spend"
                        />
                      </ComposedChart>
                    ) : (
                      <AreaChart
                        data={spendChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                          unit="M"
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "14px",
                            border: "none",
                            boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                            fontWeight: 600,
                          }}
                          formatter={(v) => [`LKR ${Number(v).toFixed(2)}M`, "Spend"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="spend"
                          stroke="#10b981"
                          strokeWidth={3}
                          fill="url(#spendGrad)"
                          name="spend"
                          activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
                          animationDuration={1200}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={FaChartLine}
                    msg="Spend data will appear as procurements are created"
                    link="/procurements"
                    linkLabel="Create requisition"
                  />
                )}
              </div>
            </div>
          )}

          {/* Methods / Status Donut */}
          {isWidgetVisible("status_donut") && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Procurement Status
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Distribution of all requisitions
                </p>
              </div>
              <div
                className="flex flex-col justify-center items-center"
                style={{ minHeight: 260 }}
              >
                {loading ? (
                  <div className="w-36 h-36 rounded-full animate-pulse bg-slate-200 mx-auto" />
                ) : statusDonutData.length > 0 && hasMounted ? (
                  <>
                    <div style={{ height: 190, width: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDonutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={82}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {statusDonutData.map((e, i) => (
                              <Cell
                                key={i}
                                fill={e.color}
                                className="hover:opacity-80 cursor-pointer transition-opacity"
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "none",
                              boxShadow: "0 4px 15px -3px rgb(0 0 0 / 0.1)",
                              fontWeight: 600,
                            }}
                            formatter={(v, n, p) => [
                              `${p.payload.rawCount} items (${v}%)`,
                              p.payload.name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-4 w-full px-3">
                      {statusDonutData.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-1"
                        >
                          <span className="flex items-center text-[11px] font-bold text-slate-600 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full mr-1.5 shrink-0"
                              style={{ background: m.color }}
                            />
                            <span className="truncate">{m.name}</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-900 shrink-0">
                            {m.rawCount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={FaClipboardList}
                    msg="No procurement data yet"
                    link="/procurements"
                    linkLabel="Get started"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Pipeline + Faculty Spend ──────────────────────────────────── */}
      {(isWidgetVisible("pipeline_chart") || isWidgetVisible("faculty_spend")) && (
        <div
          className={`grid grid-cols-1 gap-6 ${
            isWidgetVisible("pipeline_chart") && isWidgetVisible("faculty_spend")
              ? "lg:grid-cols-2"
              : "lg:grid-cols-1"
          }`}
        >
          {/* Pipeline */}
          {isWidgetVisible("pipeline_chart") && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Procurement Pipeline
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Items by lifecycle stage
                </p>
              </div>
              <div style={{ height: 260, width: "100%" }}>
                {loading ? (
                  <ChartSkeleton />
                ) : pipelineData.length > 0 && hasMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={pipelineData}
                      layout="vertical"
                      margin={{ left: 5, right: 30 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        horizontal={false}
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="stage"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                        width={90}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(v) => [v, "Items"]}
                      />
                      <Bar
                        dataKey="count"
                        fill="#10b981"
                        radius={[0, 7, 7, 0]}
                        barSize={22}
                        name="Items"
                        label={{
                          position: "right",
                          fontSize: 11,
                          fill: "#64748b",
                          fontWeight: 700,
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={FaClipboardList} msg="No pipeline data yet" />
                )}
              </div>
            </div>
          )}

          {/* Faculty Spend */}
          {isWidgetVisible("faculty_spend") && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Dept / Faculty Spend
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Estimated spend in LKR Millions
                </p>
              </div>
              <div style={{ height: 260, width: "100%" }}>
                {loading ? (
                  <ChartSkeleton />
                ) : facultySpend.length > 0 && hasMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={facultySpend}
                      layout="vertical"
                      margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                        width={90}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(v) => [`LKR ${v}M`, "Est. Spend"]}
                      />
                      <Bar
                        dataKey="spend"
                        fill="#6366f1"
                        radius={[0, 7, 7, 0]}
                        barSize={22}
                        name="Spend"
                        label={{
                          position: "right",
                          fontSize: 11,
                          fill: "#64748b",
                          fontWeight: 700,
                          formatter: (v) => `${v}M`,
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={FaBuilding}
                    msg="No department spend data yet"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Category Spend + My Action Items + Top Vendors ───────────── */}
      {(isWidgetVisible("category_donut") ||
        isWidgetVisible("action_items") ||
        isWidgetVisible("top_vendors")) && (
        <div
          className={`grid grid-cols-1 gap-6 ${
            [
              isWidgetVisible("category_donut"),
              isWidgetVisible("action_items"),
              isWidgetVisible("top_vendors"),
            ].filter(Boolean).length === 3
              ? "lg:grid-cols-3"
              : [
                  isWidgetVisible("category_donut"),
                  isWidgetVisible("action_items"),
                  isWidgetVisible("top_vendors"),
                ].filter(Boolean).length === 2
                ? "lg:grid-cols-2"
                : "lg:grid-cols-1"
          }`}
        >
          {/* Category Spend Donut */}
          {isWidgetVisible("category_donut") && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Category Breakdown
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Requisitions by item category
                </p>
              </div>
              <div
                className="flex flex-col justify-center items-center"
                style={{ minHeight: 260 }}
              >
                {loading ? (
                  <div className="w-32 h-32 rounded-full animate-pulse bg-slate-200 mx-auto" />
                ) : categoryData.length > 0 && hasMounted ? (
                  <>
                    <div style={{ height: 190, width: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={78}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {categoryData.map((e, i) => (
                              <Cell
                                key={i}
                                fill={e.color}
                                className="hover:opacity-80 cursor-pointer transition-opacity"
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "none",
                              boxShadow: "0 4px 15px -3px rgb(0 0 0 / 0.1)",
                              fontWeight: 600,
                            }}
                            formatter={(v, n, p) => [
                              fmtLKR(p.payload.amount),
                              p.payload.name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 w-full px-2">
                      {categoryData.map((m, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="flex items-center text-[11px] font-bold text-slate-600 truncate mr-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full mr-1.5 shrink-0"
                              style={{ background: m.color }}
                            />
                            <span className="truncate">{m.name}</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-900 shrink-0">
                            {m.value}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState icon={FaChartLine} msg="No category data yet" />
                )}
              </div>
            </div>
          )}

          {/* My Action Items */}
          {isWidgetVisible("action_items") && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    My Action Items
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Tasks requiring your attention
                  </p>
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-inner
                  ${pendingTasks.length > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}
                >
                  {loading ? "…" : pendingTasks.length}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingTasks.length > 0 ? (
                  pendingTasks.map((task, i) => (
                    <Link
                      to={task.path}
                      key={task.id}
                      className={`group px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${i < pendingTasks.length - 1 ? "border-b border-slate-100" : ""}`}
                    >
                      <div className="flex items-center space-x-4 min-w-0">
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${task.priority === "high" ? "bg-amber-500" : "bg-blue-400"}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                            {task.task}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {task.ref}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 pl-3">
                        <span className="text-xs font-semibold text-slate-500 flex items-center bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                          <FaClock className="mr-1 text-slate-400" size={10} />{" "}
                          {task.deadline}
                        </span>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 group-hover:border-emerald-500 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-all">
                          <FaChevronRight size={9} />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <FaCheckCircle size={30} className="text-emerald-400 mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                      All caught up!
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      No pending approvals
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Vendors */}
          {isWidgetVisible("top_vendors") && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    <FaTrophy className="text-amber-500 mr-2" size={15} /> Top
                    Vendors
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Preferred & highest rated
                  </p>
                </div>
                <Link
                  to="/vendors"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  All
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : topVendors.length > 0 ? (
                  topVendors.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 mx-1 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                          <FaStar className="text-amber-400" size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {v.name}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                            {v.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <span
                          className={`text-sm font-extrabold ${v.score >= 90 ? "text-emerald-600" : v.score >= 80 ? "text-blue-600" : "text-amber-600"}`}
                        >
                          {v.score}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5 capitalize">
                          {v.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={FaUsers}
                    msg="No vendor performance data"
                    link="/vendors"
                    linkLabel="Manage vendors"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recent Activity ────────────────────────────────────────────── */}
      {isWidgetVisible("recent_activity") && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Recent Procurement Activity
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Latest requisitions and updates from the database
              </p>
            </div>
            <Link
              to="/procurements"
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
                {recentActivity.map((act) => (
                  <Link
                    to={act.path}
                    key={act.id}
                    className="group p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors border-b border-r border-slate-50 last:border-b-0"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5
                      ${
                        act.type === "create"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : act.type === "approve"
                            ? "bg-blue-50 text-blue-600 border border-blue-100"
                            : act.type === "lock"
                              ? "bg-purple-50 text-purple-600 border border-purple-100"
                              : act.type === "bid"
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : act.type === "alert"
                                  ? "bg-red-50 text-red-600 border border-red-100"
                                  : "bg-slate-50 text-slate-600 border border-slate-100"
                      }`}
                    >
                      {act.type === "create" ? (
                        <FaClipboardList size={14} />
                      ) : act.type === "approve" ? (
                        <FaCheckCircle size={14} />
                      ) : act.type === "lock" ? (
                        <FaMoneyCheckAlt size={14} />
                      ) : act.type === "bid" ? (
                        <FaBoxOpen size={14} />
                      ) : act.type === "alert" ? (
                        <FaExclamationTriangle size={14} />
                      ) : (
                        <FaShieldAlt size={14} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                        {act.action}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {act.ref}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            act.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : act.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : act.status === "in_progress"
                                  ? "bg-purple-100 text-purple-700"
                                  : act.status === "submitted"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {(act.status || "—").replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {act.time}
                        </span>
                      </div>
                      {act.amount > 0 && (
                        <p className="text-[11px] font-bold text-slate-700 mt-1">
                          {fmtLKR(act.amount)}
                        </p>
                      )}
                    </div>
                    <FaChevronRight
                      size={10}
                      className="text-slate-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-16">
                <EmptyState
                  icon={FaChartLine}
                  msg="No recent activity yet"
                  link="/procurements"
                  linkLabel="Create your first requisition"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI Intelligence Feed ───────────────────────────────────────── */}
      {isWidgetVisible("ai_feed") && (
        <div className="bg-slate-900 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
                <FaRobot size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  AI Intelligence Feed
                </h3>
                <p className="text-xs font-medium text-emerald-400 mt-0.5">
                  Automated ML risk analysis & demand forecasting
                </p>
              </div>
            </div>
            <Link
              to="/ai/market-monitoring"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20"
            >
              Open AI Hub
            </Link>
          </div>
          <div className="p-8 relative z-10 flex flex-col items-center text-center gap-3">
            <FaRobot size={40} className="text-emerald-500/30" />
            <p className="text-slate-300 font-semibold text-sm">
              AI insights are generated from live procurement data.
            </p>
            <p className="text-slate-500 text-xs max-w-md">
              Visit the AI Hub for real-time risk analysis, bid anomaly detection,
              and demand forecasting tailored to your procurement pipeline.
            </p>
            <Link
              to="/ai/market-monitoring"
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-sm rounded-xl border border-emerald-500/20 transition-colors"
            >
              <FaRobot size={14} /> Launch AI Analysis
            </Link>
          </div>
        </div>
      )}

      {/* ── Widget Customization Modal ─────────────────────────────────────── */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                  <FaSlidersH size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Customize Dashboard Layout
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Toggle visibility and reorder dashboard widgets
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Sub-toolbar */}
            <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">
                {widgets.filter((w) => w.visible).length} of {widgets.length} items visible
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAllWidgetsVisibility(true)}
                  className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                >
                  Show All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => setAllWidgetsVisibility(false)}
                  className="text-slate-500 hover:text-slate-700 font-bold hover:underline"
                >
                  Hide All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={resetWidgetsDefault}
                  className="flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-bold"
                >
                  <FaUndo size={10} /> Reset Default
                </button>
              </div>
            </div>

            {/* Widget List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {widgets.map((widget, index) => (
                <div
                  key={widget.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    widget.visible
                      ? "bg-white border-slate-200 shadow-sm"
                      : "bg-slate-50 border-slate-100 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Move Up/Down Controls */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveWidget(index, -1)}
                        disabled={index === 0}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-30 transition-colors"
                        title="Move Up"
                      >
                        <FaArrowUp size={9} />
                      </button>
                      <button
                        onClick={() => moveWidget(index, 1)}
                        disabled={index === widgets.length - 1}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-30 transition-colors"
                        title="Move Down"
                      >
                        <FaArrowDown size={9} />
                      </button>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {widget.title}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {widget.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {widget.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle switch button */}
                  <button
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                      widget.visible
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {widget.visible ? (
                      <>
                        <FaEye size={12} /> Visible
                      </>
                    ) : (
                      <>
                        <FaEyeSlash size={12} /> Hidden
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}