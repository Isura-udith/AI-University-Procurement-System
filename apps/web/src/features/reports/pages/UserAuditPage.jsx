import { useState, useEffect, useCallback } from 'react';
import {
  FaShieldAlt, FaSignInAlt, FaSignOutAlt, FaExclamationTriangle,
  FaUserLock, FaKey, FaUserEdit, FaSearch, FaFilter, FaDownload,
  FaChevronLeft, FaChevronRight, FaClock, FaGlobe, FaDesktop,
  FaCheckCircle, FaTimesCircle, FaBan, FaUsers, FaChartLine,
  FaSync, FaEye, FaUserPlus, FaUserCheck, FaUserTimes,
  FaPlus, FaTimes, FaCopy, FaCheck, FaUserCog
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import auditLogService from '../../../services/audit.log.service';
import userService from '../../../services/user.service';
import useAuth from '../../../hooks/useAuth';

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

const ALL_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Procurement Admin' },
  { value: 'vc', label: 'Vice-Chancellor (VC)' },
  { value: 'dean', label: 'Faculty Dean' },
  { value: 'bursar', label: 'Chief Bursar' },
  { value: 'finance_committee', label: 'Finance Committee' },
  { value: 'procurement_committee', label: 'Procurement Committee' },
  { value: 'finance_officer', label: 'Finance Officer' },
  { value: 'procurement_officer', label: 'Procurement Officer' },
  { value: 'contract_manager', label: 'Contract Manager' },
  { value: 'tec_member', label: 'TEC Member' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'department_user', label: 'Department User' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'supplier', label: 'Supplier / Vendor' },
  { value: 'auditor', label: 'System Auditor' },
];

const ROLE_COLOR_BADGES = {
  super_admin: 'bg-rose-100 text-rose-700 border-rose-200',
  admin: 'bg-rose-100 text-rose-700 border-rose-200',
  vc: 'bg-purple-100 text-purple-700 border-purple-200',
  dean: 'bg-purple-100 text-purple-700 border-purple-200',
  bursar: 'bg-blue-100 text-blue-700 border-blue-200',
  finance_committee: 'bg-blue-100 text-blue-700 border-blue-200',
  procurement_committee: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  finance_officer: 'bg-blue-100 text-blue-700 border-blue-200',
  procurement_officer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  contract_manager: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  tec_member: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  department_head: 'bg-amber-100 text-amber-700 border-amber-200',
  department_user: 'bg-amber-100 text-amber-700 border-amber-200',
  store_manager: 'bg-teal-100 text-teal-700 border-teal-200',
  supplier: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  auditor: 'bg-slate-100 text-slate-700 border-slate-200',
};

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
export default function UserAuditPage({ defaultTab = 'logs' }) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || !currentUser;

  // Logs state
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters for Audit Log
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState(defaultTab); // 'logs' | 'dashboard' | 'users'

  // Users Directory & Management state
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [usersPagination, setUsersPagination] = useState({ total: 0, page: 1, limit: 30, pages: 1 });

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Modals state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);

  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'procurement_officer',
    employeeId: '',
    department: '',
    faculty: '',
    phone: '',
  });

  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState({ type: '', text: '' });
  const [copiedKey, setCopiedKey] = useState(false);

  /* ── Audit Logs Fetching ─────────────────────────────────────── */
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

  /* ── Users Directory Fetching ────────────────────────────────── */
  const fetchUsersList = useCallback(async (page = 1, overrides = {}) => {
    setUsersLoading(true);
    try {
      const params = { page, limit: 30 };
      const currentSearch = 'search' in overrides ? overrides.search : userSearch;
      const currentRole = 'role' in overrides ? overrides.role : userRoleFilter;
      const currentStatus = 'status' in overrides ? overrides.status : userStatusFilter;

      if (currentSearch) params.search = currentSearch;
      if (currentRole) params.role = currentRole;
      if (currentStatus !== '') params.isActive = currentStatus;

      const res = await userService.getUsers(params);
      setUsersList(res.data || []);
      setUsersPagination(res.pagination || { total: 0, page: 1, limit: 30, pages: 1 });
    } catch (err) {
      console.error('Failed to load users list', err);
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter]);

  const fetchUserStatsData = useCallback(async () => {
    setUserStatsLoading(true);
    try {
      const res = await userService.getStats();
      setUserStats(res.data || null);
    } catch (err) {
      console.error('Failed to load user stats', err);
    } finally {
      setUserStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
      fetchStats();
      fetchUsersList();
      fetchUserStatsData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => {
        fetchUsersList(1);
        fetchUserStatsData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchUsersList, fetchUserStatsData]);

  /* ── Filter Handlers ─────────────────────────────────────────── */
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

  const handleUserFilter = (e) => {
    e.preventDefault();
    fetchUsersList(1);
  };

  const clearUserFilters = () => {
    setUserSearch('');
    setUserRoleFilter('');
    setUserStatusFilter('');
    fetchUsersList(1, { search: '', role: '', status: '' });
  };

  const handleExportCSV = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (severity) params.severity = severity;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await auditLogService.exportLogs(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit-trail-logs.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export audit logs', err);
    }
  };

  /* ── User Modal Trigger Handlers ────────────────────────────── */
  const handleOpenAddUser = () => {
    setUserFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'procurement_officer',
      employeeId: '',
      department: '',
      faculty: '',
      phone: '',
    });
    setModalMessage({ type: '', text: '' });
    setShowAddUserModal(true);
  };

  const handleOpenEditUser = (u) => {
    setSelectedUserForModal(u);
    setUserFormData({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      role: u.role || 'procurement_officer',
      employeeId: u.employeeId || '',
      department: u.department || '',
      faculty: u.faculty || '',
      phone: u.phone || '',
    });
    setModalMessage({ type: '', text: '' });
    setShowEditUserModal(true);
  };

  const handleOpenResetPassword = (u) => {
    setSelectedUserForModal(u);
    setResetPasswordInput('');
    setCopiedKey(false);
    setModalMessage({ type: '', text: '' });
    setShowResetPasswordModal(true);
  };

  /* ── User API Actions ────────────────────────────────────────── */
  const submitAddUser = async (e) => {
    e.preventDefault();
    if (!userFormData.firstName || !userFormData.lastName || !userFormData.email || !userFormData.role) {
      setModalMessage({ type: 'error', text: 'First Name, Last Name, Email, and Role are required.' });
      return;
    }
    setModalLoading(true);
    setModalMessage({ type: '', text: '' });
    try {
      await userService.createUser(userFormData);
      setModalMessage({ type: 'success', text: 'User created successfully!' });
      setTimeout(() => {
        setShowAddUserModal(false);
        fetchUsersList(1);
        fetchUserStatsData();
        fetchLogs(1);
      }, 1000);
    } catch (err) {
      setModalMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to create user' });
    } finally {
      setModalLoading(false);
    }
  };

  const submitEditUser = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalMessage({ type: '', text: '' });
    try {
      await userService.updateUser(selectedUserForModal._id, userFormData);
      setModalMessage({ type: 'success', text: 'User details updated successfully!' });
      setTimeout(() => {
        setShowEditUserModal(false);
        fetchUsersList(usersPagination.page);
        fetchUserStatsData();
        fetchLogs(1);
      }, 1000);
    } catch (err) {
      setModalMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to update user' });
    } finally {
      setModalLoading(false);
    }
  };

  const submitResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordInput || resetPasswordInput.length < 8) {
      setModalMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    setModalLoading(true);
    setModalMessage({ type: '', text: '' });
    try {
      await userService.resetPassword(selectedUserForModal._id, resetPasswordInput);
      setModalMessage({ type: 'success', text: 'Password reset successfully!' });
      setTimeout(() => {
        setShowResetPasswordModal(false);
        fetchLogs(1);
      }, 1200);
    } catch (err) {
      setModalMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to reset password' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (u) => {
    const actionName = u.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionName} user ${u.firstName} ${u.lastName}?`)) return;
    try {
      if (u.isActive) {
        await userService.deactivateUser(u._id);
      } else {
        await userService.activateUser(u._id);
      }
      fetchUsersList(usersPagination.page);
      fetchUserStatsData();
      fetchLogs(1);
    } catch (err) {
      alert(err.response?.data?.message || err.message || `Failed to ${actionName} user`);
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordInput(pwd);
  };

  /* ── stat cards for Audit logs ────────────────────────────── */
  const statCards = stats ? [
    { label: 'Logins Today', value: stats.overview.todayLogins, icon: FaSignInAlt, color: 'emerald', subtext: `${stats.overview.activeUsersToday} unique users` },
    { label: 'Failed Attempts', value: stats.overview.todayFailedLogins, icon: FaExclamationTriangle, color: 'red', subtext: 'Today' },
    { label: 'Logouts Today', value: stats.overview.todayLogouts, icon: FaSignOutAlt, color: 'slate', subtext: 'Session ends' },
    { label: 'Security Events', value: stats.overview.securityEvents, icon: FaShieldAlt, color: 'amber', subtext: 'Last 30 days' },
  ] : [];

  const categoryPieData = stats?.byCategory?.map(c => ({
    name: c._id?.replace('_', ' ').replace(/^\w/, l => l.toUpperCase()) || 'Unknown',
    value: c.count,
  })) || [];

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
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Audit & Directory</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">System user management, security monitoring, and activity audit trails</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
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
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FaUsers className="inline mr-1.5" size={12} />
              Current Users
              {userStats?.total > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 rounded-full font-bold">
                  {userStats.total}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => { fetchLogs(); fetchStats(); fetchUsersList(); fetchUserStatsData(); }}
            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
            title="Refresh Data"
          >
            <FaSync size={14} />
          </button>
          {activeTab === 'logs' && (
            <button
              onClick={handleExportCSV}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center transform hover:-translate-y-0.5"
            >
              <FaDownload className="mr-2" size={12} />Export CSV
            </button>
          )}
          {activeTab === 'users' && isAdmin && (
            <button
              onClick={handleOpenAddUser}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all flex items-center transform hover:-translate-y-0.5"
            >
              <FaPlus className="mr-2" size={12} />Add New User
            </button>
          )}
        </div>
      </div>

      {/* ── CURRENT USERS TAB ──────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Directory Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">{userStatsLoading ? '...' : (userStats?.total || usersList.length)}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">System Users</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold shadow-xs">
                <FaUsers />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Users</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{userStatsLoading ? '...' : (userStats?.active || 0)}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">Can log in</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold shadow-xs">
                <FaUserCheck />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inactive / Suspended</p>
                <p className="text-3xl font-extrabold text-red-600 mt-1">{userStatsLoading ? '...' : (userStats?.inactive || 0)}</p>
                <p className="text-xs text-red-600 font-medium mt-1">Access disabled</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold shadow-xs">
                <FaUserTimes />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admins & Oversight</p>
                <p className="text-3xl font-extrabold text-purple-600 mt-1">
                  {userStatsLoading ? '...' : ((userStats?.byRole?.admin || 0) + (userStats?.byRole?.super_admin || 0) + (userStats?.byRole?.auditor || 0))}
                </p>
                <p className="text-xs text-purple-600 font-medium mt-1">Privileged accounts</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold shadow-xs">
                <FaUserCog />
              </div>
            </div>
          </div>

          {/* User Filters & Search */}
          <form onSubmit={handleUserFilter} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FaFilter className="text-indigo-400" size={13} />
              <h3 className="text-sm font-bold text-slate-700">Filter User Directory</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative lg:col-span-2">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, or employee ID..."
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white transition-all"
              >
                <option value="">All Roles</option>
                {ALL_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white transition-all"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button type="button" onClick={clearUserFilters} className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all">
                Clear Filters
              </button>
              <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-sm">
                Apply Search
              </button>
            </div>
          </form>

          {/* User Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-medium">Loading user directory...</p>
              </div>
            ) : usersList.length === 0 ? (
              <div className="p-12 text-center">
                <FaUsers className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-sm text-slate-500 font-medium">No users found matching query</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">User Details</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Employee ID</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Department / Faculty</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Registered</th>
                        {isAdmin && (
                          <th className="px-6 py-3.5 text-right font-bold text-slate-600 text-xs uppercase tracking-wider">Admin Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => {
                        const badgeStyle = ROLE_COLOR_BADGES[u.role] || 'bg-slate-100 text-slate-700 border-slate-200';
                        const roleObj = ALL_ROLES.find(r => r.value === u.role);
                        return (
                          <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                                  {u.firstName ? u.firstName[0].toUpperCase() : u.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{u.firstName} {u.lastName}</p>
                                  <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-xs text-slate-600 font-mono">
                              {u.employeeId || '—'}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold rounded-full border ${badgeStyle}`}>
                                {roleObj ? roleObj.label : u.role}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <p className="text-xs font-medium text-slate-700">{u.department || u.faculty || 'General'}</p>
                            </td>
                            <td className="px-6 py-3.5">
                              {u.isActive !== false ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <FaCheckCircle className="mr-1 text-emerald-500" size={9} /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                                  <FaBan className="mr-1 text-red-500" size={9} /> Deactivated
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-slate-500">
                              {formatDate(u.createdAt)}
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-3.5 text-right">
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    onClick={() => handleOpenResetPassword(u)}
                                    className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                                    title="Reset Password"
                                  >
                                    <FaKey size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                    title="Edit User Details & Role"
                                  >
                                    <FaUserEdit size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className={`p-2 rounded-lg transition-colors ${u.isActive !== false ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                                    title={u.isActive !== false ? 'Deactivate User' : 'Activate User'}
                                  >
                                    {u.isActive !== false ? <FaUserTimes size={12} /> : <FaUserCheck size={12} />}
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* User Pagination */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <p className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-700">{((usersPagination.page - 1) * usersPagination.limit) + 1}</span>–<span className="font-bold text-slate-700">{Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)}</span> of <span className="font-bold text-slate-700">{usersPagination.total?.toLocaleString()}</span> users
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchUsersList(usersPagination.page - 1)}
                      disabled={usersPagination.page <= 1}
                      className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <FaChevronLeft size={11} />
                    </button>
                    <span className="text-xs font-bold text-slate-600 px-2">
                      Page {usersPagination.page} of {usersPagination.pages || 1}
                    </span>
                    <button
                      onClick={() => fetchUsersList(usersPagination.page + 1)}
                      disabled={usersPagination.page >= usersPagination.pages}
                      className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <FaChevronRight size={11} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STATS / DASHBOARD TAB ──────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logins by Hour */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">Login Activity by Hour</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Last 7 days — peak usage analysis</p>
            </div>
            <div className="w-full h-65">
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
              <div className="w-full h-50">
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
          {/* Stat Cards */}
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
            {/* Date range */}
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

      {/* ── MODAL: ADD NEW USER ─────────────────────────────────── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddUserModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <FaTimes size={14} />
            </button>
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FaUserPlus size={18} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Add New System User</h2>
                <p className="text-xs text-slate-500">Create a user account with RBAC privileges</p>
              </div>
            </div>

            {modalMessage.text && (
              <div className={`p-3.5 rounded-xl mb-4 text-xs font-semibold ${modalMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {modalMessage.text}
              </div>
            )}

            <form onSubmit={submitAddUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    placeholder="e.g. John"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    placeholder="e.g. Doe"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="john.doe@uwu.ac.lk"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={userFormData.employeeId}
                    onChange={(e) => setUserFormData({ ...userFormData, employeeId: e.target.value })}
                    placeholder="EMP-2026-099"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Role *</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  >
                    {ALL_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department / Faculty</label>
                  <input
                    type="text"
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    placeholder="Faculty of Applied Sciences"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password (Optional)</label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Defaults to Change@1234 if left blank"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-6 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50 transition-all"
                >
                  {modalLoading ? 'Creating User...' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT USER ────────────────────────────────────── */}
      {showEditUserModal && selectedUserForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowEditUserModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <FaTimes size={14} />
            </button>
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <FaUserEdit size={18} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Edit User Profile</h2>
                <p className="text-xs text-slate-500">Update account role and organizational metadata</p>
              </div>
            </div>

            {modalMessage.text && (
              <div className={`p-3.5 rounded-xl mb-4 text-xs font-semibold ${modalMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {modalMessage.text}
              </div>
            )}

            <form onSubmit={submitEditUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={userFormData.employeeId}
                    onChange={(e) => setUserFormData({ ...userFormData, employeeId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RBAC Role *</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    {ALL_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department / Faculty</label>
                  <input
                    type="text"
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 transition-all"
                >
                  {modalLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET PASSWORD ───────────────────────────────── */}
      {showResetPasswordModal && selectedUserForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowResetPasswordModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <FaTimes size={14} />
            </button>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <FaKey size={18} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Reset User Password</h2>
                <p className="text-xs text-slate-500">Target: <span className="font-semibold text-slate-700">{selectedUserForModal.email}</span></p>
              </div>
            </div>

            {modalMessage.text && (
              <div className={`p-3.5 rounded-xl mb-4 text-xs font-semibold ${modalMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {modalMessage.text}
              </div>
            )}

            <form onSubmit={submitResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">New Password *</label>
                  <button
                    type="button"
                    onClick={generateTempPassword}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Auto-Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    className="w-full pr-10 pl-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                  {resetPasswordInput && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resetPasswordInput);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Copy Password"
                    >
                      {copiedKey ? <FaCheck className="text-emerald-500" size={12} /> : <FaCopy size={12} />}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">This will override the user's password and log a security audit record.</p>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/20 hover:bg-amber-500 disabled:opacity-50 transition-all"
                >
                  {modalLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
