import { useState, useEffect, useCallback } from 'react';
import {
  FaShieldAlt, FaSignInAlt, FaSignOutAlt, FaExclamationTriangle,
  FaUserLock, FaKey, FaUserEdit, FaSearch, FaFilter, FaDownload,
  FaChevronLeft, FaChevronRight, FaClock, FaGlobe, FaDesktop,
  FaCheckCircle, FaTimesCircle, FaBan, FaUsers, FaChartLine,
  FaSync, FaEye, FaUserPlus, FaUserCheck, FaUserTimes
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import auditLogService from '../../../services/audit.log.service';

/* ── helpers ──────────────────────────────────────────────────── */
const ACTION_LABELS = {
  LOGIN_SUCCESS: 'Login',
  LOGIN_FAILED: 'Failed Login',
  LOGOUT: 'Logout',
  SESSION_EXPIRED: 'Session Expired',
  TOKEN_REFRESHED: 'Token Refresh',
  PASSWORD_CHANGED: 'Password Changed',
  PASSWORD_RESET_REQUESTED: 'Reset Requested',
  PASSWORD_RESET_COMPLETED: 'Reset Completed',
  ACCOUNT_LOCKED: 'Account Locked',
  ACCOUNT_UNLOCKED: 'Account Unlocked',
  ACCOUNT_DEACTIVATED: 'Account Deactivated',
  ACCOUNT_ACTIVATED: 'Account Activated',
  USER_REGISTERED: 'Registration',
  PROFILE_UPDATED: 'Profile Updated',
  ROLE_CHANGED: 'Role Changed',
  MFA_ENABLED: 'MFA Enabled',
  MFA_DISABLED: 'MFA Disabled',
  DELEGATION_STARTED: 'Delegation Started',
  DELEGATION_ENDED: 'Delegation Ended',
  USER_CREATED_BY_ADMIN: 'User Created (Admin)',
  USER_DELETED_BY_ADMIN: 'User Deleted (Admin)',
  USER_ROLE_CHANGED_BY_ADMIN: 'Role Changed (Admin)',
  BULK_USER_IMPORT: 'Bulk Import',
};

const ACTION_ICONS = {
  LOGIN_SUCCESS: FaSignInAlt,
  LOGIN_FAILED: FaExclamationTriangle,
  LOGOUT: FaSignOutAlt,
  SESSION_EXPIRED: FaClock,
  PASSWORD_CHANGED: FaKey,
  PASSWORD_RESET_REQUESTED: FaKey,
  PASSWORD_RESET_COMPLETED: FaKey,
  ACCOUNT_LOCKED: FaUserLock,
  ACCOUNT_UNLOCKED: FaUserLock,
  ACCOUNT_DEACTIVATED: FaUserTimes,
  ACCOUNT_ACTIVATED: FaUserCheck,
  USER_REGISTERED: FaUsers,
  PROFILE_UPDATED: FaUserEdit,
  ROLE_CHANGED: FaShieldAlt,
  USER_CREATED_BY_ADMIN: FaUserPlus,
  USER_DELETED_BY_ADMIN: FaUserTimes,
  USER_ROLE_CHANGED_BY_ADMIN: FaShieldAlt,
  BULK_USER_IMPORT: FaUsers,
  DELEGATION_STARTED: FaUsers,
  DELEGATION_ENDED: FaUsers,
};

const ACTION_COLORS = {
  LOGIN_SUCCESS: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500' },
  LOGIN_FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-500' },
  LOGOUT: { bg: 'bg-slate-100', text: 'text-slate-700', icon: 'text-slate-500' },
  SESSION_EXPIRED: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
  PASSWORD_CHANGED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-500' },
  PASSWORD_RESET_REQUESTED: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
  PASSWORD_RESET_COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-500' },
  ACCOUNT_LOCKED: { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-500' },
  ACCOUNT_UNLOCKED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500' },
  ACCOUNT_DEACTIVATED: { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-500' },
  ACCOUNT_ACTIVATED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500' },
  USER_REGISTERED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'text-purple-500' },
  PROFILE_UPDATED: { bg: 'bg-sky-100', text: 'text-sky-700', icon: 'text-sky-500' },
  ROLE_CHANGED: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'text-indigo-500' },
  USER_CREATED_BY_ADMIN: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500' },
  USER_DELETED_BY_ADMIN: { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-500' },
  USER_ROLE_CHANGED_BY_ADMIN: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'text-indigo-500' },
  BULK_USER_IMPORT: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'text-purple-500' },
  DELEGATION_STARTED: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
  DELEGATION_ENDED: { bg: 'bg-slate-100', text: 'text-slate-700', icon: 'text-slate-500' },
};

const SEVERITY_CONFIG = {
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const STATUS_CONFIG = {
  success: { icon: FaCheckCircle, color: 'text-emerald-500', label: 'Success' },
  failure: { icon: FaTimesCircle, color: 'text-red-500', label: 'Failed' },
  blocked: { icon: FaBan, color: 'text-amber-500', label: 'Blocked' },
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'security', label: 'Security' },
  { value: 'user_management', label: 'User Management' },
  { value: 'delegation', label: 'Delegation' },
  { value: 'administrative', label: 'Administrative' },
];

const PIE_COLORS = ['#10b981', '#ef4444', '#64748b', '#f59e0b', '#8b5cf6', '#06b6d4'];

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDateTime = (d) => `${formatDate(d)} ${formatTime(d)}`;

/* ── main component ───────────────────────────────────────────── */
export default function UserAuditPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'dashboard'

  const fetchLogs = useCallback(async (page = 1, overrides = {}) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, sort: '-createdAt' };
      
      const currentSearch = 'search' in overrides ? overrides.search : search;
      const currentCategory = 'category' in overrides ? overrides.category : category;
      const currentSeverity = 'severity' in overrides ? overrides.severity : severity;
      const currentStartDate = 'startDate' in overrides ? overrides.startDate : startDate;
      const currentEndDate = 'endDate' in overrides ? overrides.endDate : endDate;

      if (currentSearch) params.search = currentSearch;
      if (currentCategory) params.category = currentCategory;
      if (currentSeverity) params.severity = currentSeverity;
      if (currentStartDate) params.startDate = currentStartDate;
      if (currentEndDate) params.endDate = currentEndDate;

      const res = await auditLogService.getLogs(params);
      setLogs(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, severity, startDate, endDate]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await auditLogService.getStats();
      setStats(res.data || null);
    } catch (err) {
      console.error('Failed to load audit stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
      fetchStats();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setSeverity('');
    setStartDate('');
    setEndDate('');
    fetchLogs(1, {
      search: '',
      category: '',
      severity: '',
      startDate: '',
      endDate: ''
    });
  };

  /* ── stat cards ─────────────────────────────────────────────── */
  const statCards = stats ? [
    { label: 'Logins Today', value: stats.overview.todayLogins, icon: FaSignInAlt, color: 'emerald', subtext: `${stats.overview.activeUsersToday} unique users` },
    { label: 'Failed Attempts', value: stats.overview.todayFailedLogins, icon: FaExclamationTriangle, color: 'red', subtext: 'Today' },
    { label: 'Logouts Today', value: stats.overview.todayLogouts, icon: FaSignOutAlt, color: 'slate', subtext: 'Session ends' },
    { label: 'Security Events', value: stats.overview.securityEvents, icon: FaShieldAlt, color: 'amber', subtext: 'Last 30 days' },
  ] : [];

  /* ── pie data ───────────────────────────────────────────────── */
  const categoryPieData = stats?.byCategory?.map(c => ({
    name: c._id?.replace('_', ' ').replace(/^\w/, l => l.toUpperCase()) || 'Unknown',
    value: c.count,
  })) || [];

  /* ── bar data (logins by hour) ──────────────────────────────── */
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const match = stats?.loginsByHour?.find(h => h._id === i);
    return { hour: `${String(i).padStart(2, '0')}:00`, logins: match?.count || 0 };
  });

  const colorClasses = {
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', shadow: 'shadow-emerald-500/20' },
    red: { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-700', shadow: 'shadow-red-500/20' },
    slate: { bg: 'bg-slate-500', light: 'bg-slate-50', text: 'text-slate-700', shadow: 'shadow-slate-500/20' },
    amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', shadow: 'shadow-amber-500/20' },
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-indigo-100/40 via-purple-50/30 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-8">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <FaShieldAlt size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Audit Trail</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3 relative z-10">
          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FaChartLine className="inline mr-1.5" size={12} />Dashboard
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FaEye className="inline mr-1.5" size={12} />Activity Log
            </button>
          </div>
          <button
            onClick={() => { fetchLogs(); fetchStats(); }}
            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
            title="Refresh"
          >
            <FaSync size={14} />
          </button>
          <button className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center transform hover:-translate-y-0.5">
            <FaDownload className="mr-2" size={12} />Export CSV
          </button>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
            </div>
          ))
        ) : statCards.map((card, i) => {
          const Icon = card.icon;
          const cc = colorClasses[card.color];
          return (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
              <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${cc.light} opacity-60 group-hover:scale-150 transition-transform duration-500`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-500">{card.label}</p>
                  <div className={`w-9 h-9 rounded-xl ${cc.bg} flex items-center justify-center text-white shadow-md ${cc.shadow}`}>
                    <Icon size={16} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-slate-900">{card.value?.toLocaleString() || '0'}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DASHBOARD TAB ────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logins by Hour */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">Login Activity by Hour</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Last 7 days — peak usage analysis</p>
            </div>
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} interval={2} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600, fontSize: 12 }} />
                  <Bar dataKey="logins" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} name="Logins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">Events by Category</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Last 30 days distribution</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                      {categoryPieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3">
                {categoryPieData.map((c, i) => (
                  <div key={i} className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full mr-1.5 shadow-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs font-bold text-slate-600">{c.name} <span className="text-slate-400 font-medium">({c.value})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Critical Events */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 lg:col-span-2 hover:shadow-md transition-shadow">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-2" size={16} />
                Recent Critical Security Events
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Account lockouts, deactivations, and critical incidents</p>
            </div>
            {stats?.recentCritical?.length > 0 ? (
              <div className="space-y-2.5">
                {stats.recentCritical.map((evt, i) => {
                  const ac = ACTION_COLORS[evt.action] || ACTION_COLORS.LOGIN_FAILED;
                  return (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg ${ac.bg} flex items-center justify-center`}>
                          <FaExclamationTriangle className={ac.icon} size={13} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{evt.description}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {evt.userId?.firstName} {evt.userId?.lastName} ({evt.userId?.role?.replace(/_/g, ' ')})
                            {evt.ipAddress && <> · <FaGlobe className="inline mx-0.5" size={9} />{evt.ipAddress}</>}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-400 shrink-0">{formatDateTime(evt.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">No critical events recorded</div>
            )}
          </div>
        </div>
      )}

      {/* ── LOGS TAB ─────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <>
          {/* Filters */}
          <form onSubmit={handleFilter} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FaFilter className="text-indigo-400" size={13} />
              <h3 className="text-sm font-bold text-slate-700">Filters</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative lg:col-span-2">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email, name, or IP..."
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white transition-all"
              >
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white transition-all"
              >
                <option value="">All Severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <div className="flex items-center space-x-2">
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-sm">
                  Apply
                </button>
                <button type="button" onClick={clearFilters} className="px-3 py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50 transition-all">
                  Clear
                </button>
              </div>
            </div>
            {/* Date range (collapsible row) */}
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <FaClock size={10} />
                <span className="font-semibold">Date Range:</span>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          </form>

          {/* Audit Log Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-medium">Loading audit trail...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center">
                <FaShieldAlt className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-sm text-slate-500 font-medium">No audit records found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">User</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">IP Address</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => {
                        const ac = ACTION_COLORS[log.action] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: 'text-slate-500' };
                        const Icon = ACTION_ICONS[log.action] || FaShieldAlt;
                        const sc = STATUS_CONFIG[log.status] || STATUS_CONFIG.success;
                        const StatusIcon = sc.icon;
                        const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;

                        return (
                          <tr
                            key={log._id || i}
                            onClick={() => setSelectedLog(selectedLog?._id === log._id ? null : log)}
                            className={`border-b border-slate-50 cursor-pointer transition-colors ${selectedLog?._id === log._id ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}
                          >
                            <td className="px-6 py-3.5">
                              <p className="text-xs font-semibold text-slate-800">{formatDate(log.createdAt)}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(log.createdAt)}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                  {(log.userName || log.userEmail || '?')[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{log.userName || '—'}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{log.userEmail || log.userRole || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-2">
                                <div className={`w-6 h-6 rounded-md ${ac.bg} flex items-center justify-center`}>
                                  <Icon className={ac.icon} size={11} />
                                </div>
                                <span className={`text-xs font-bold ${ac.text}`}>{ACTION_LABELS[log.action] || log.action}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-1.5">
                                <StatusIcon className={sc.color} size={12} />
                                <span className="text-xs font-medium text-slate-600">{sc.label}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-1.5">
                                <FaGlobe className="text-slate-300" size={10} />
                                <span className="text-xs text-slate-600 font-mono">{log.ipAddress || '—'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${sev.bg} ${sev.text} border ${sev.border}`}>
                                {log.severity}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Expanded Detail Row */}
                {selectedLog && (
                  <div className="border-t border-indigo-100 bg-indigo-50/30 p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Description</p>
                        <p className="text-xs text-slate-700 font-medium">{selectedLog.description || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">User Agent</p>
                        <p className="text-xs text-slate-600 truncate flex items-center">
                          <FaDesktop className="mr-1.5 text-slate-400 shrink-0" size={10} />
                          {selectedLog.userAgent?.substring(0, 80) || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Role</p>
                        <p className="text-xs text-slate-700 font-medium">{selectedLog.userRole?.replace(/_/g, ' ') || '—'}</p>
                      </div>
                      {selectedLog.failureReason && (
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Failure Reason</p>
                          <p className="text-xs text-red-600 font-semibold">{selectedLog.failureReason}</p>
                        </div>
                      )}
                      {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Metadata</p>
                          <pre className="text-[10px] text-slate-600 bg-white rounded-lg p-2 border border-slate-100 overflow-x-auto font-mono">
                            {JSON.stringify(selectedLog.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <p className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-700">{((pagination.page - 1) * pagination.limit) + 1}</span>–<span className="font-bold text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-bold text-slate-700">{pagination.total?.toLocaleString()}</span> records
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchLogs(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <FaChevronLeft size={11} />
                    </button>
                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                      const start = Math.max(1, pagination.page - 2);
                      const p = start + i;
                      if (p > pagination.pages) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => fetchLogs(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === pagination.page ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm'}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => fetchLogs(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <FaChevronRight size={11} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
