import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  FaUsers, FaUserPlus, FaSearch, FaEdit,
  FaCheck, FaTimes, FaKey,
  FaSpinner, FaUserCheck, FaUserTimes, FaChartPie
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import userService from '../../../services/user.service';
import { getRoleLabel, getRoleColor } from '../../../constants/roles';

const ROLE_OPTIONS = [
  'super_admin','admin','vc','dean','bursar','finance_committee','finance_officer',
  'procurement_officer','contract_manager','tec_member',
  'department_head','department_user','store_manager',
  'supplier','auditor','guest',
];

const DEPT_OPTIONS = [
  'Medicine','Applied Sciences','Technological Studies','Management',
  'Animal Science','Science & Technology','Procurement Management Division',
  'Finance Division','Registrar Office','Vice Chancellor Office','Supplies Division',
];

const FACULTY_OPTIONS = [
  'Medicine','Applied Sciences','Technological Studies','Management',
  'Animal Science','Science & Technology',
];

const COLOR_MAP = {
  rose:'bg-rose-100 text-rose-700 border-rose-200',
  purple:'bg-purple-100 text-purple-700 border-purple-200',
  blue:'bg-blue-100 text-blue-700 border-blue-200',
  emerald:'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber:'bg-amber-100 text-amber-700 border-amber-200',
  teal:'bg-teal-100 text-teal-700 border-teal-200',
  indigo:'bg-indigo-100 text-indigo-700 border-indigo-200',
  slate:'bg-slate-100 text-slate-700 border-slate-200',
};

// ─── Create / Edit User Modal ──────────────────────────────────
function UserFormModal({ onClose, onSubmit, editUser, loading }) {
  const [form, setForm] = useState(() => {
    if (editUser) {
      return {
        firstName: editUser.firstName || '',
        lastName: editUser.lastName || '',
        email: editUser.email || '',
        password: '',
        role: editUser.role || 'department_user',
        employeeId: editUser.employeeId || '',
        department: editUser.department || '',
        faculty: editUser.faculty || '',
        phone: editUser.phone || '',
      };
    }
    return { firstName:'', lastName:'', email:'', password:'Demo@1234', role:'department_user', employeeId:'', department:'', faculty:'', phone:'' };
  });

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (editUser && !data.password) delete data.password;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FaUserPlus className="text-emerald-500" />
            <span>{editUser ? 'Edit User' : 'Create New User'}</span>
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <FaTimes size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">First Name *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Last Name *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
          </div>

          {!editUser && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                placeholder="Default: Demo@1234"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Role *</label>
              <select name="role" value={form.role} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white">
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Employee ID</label>
              <input name="employeeId" value={form.employeeId} onChange={handleChange}
                placeholder="UWU-XXX-001"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Department</label>
              <select name="department" value={form.department} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white">
                <option value="">Select...</option>
                {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Faculty</label>
              <select name="faculty" value={form.faculty} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white">
                <option value="">Select...</option>
                {FACULTY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="+94 7X XXX XXXX"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md">
              {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
              <span>{editUser ? 'Update User' : 'Create User'}</span>
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-3 border border-slate-200 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main User Management Page ─────────────────────────────────
export default function UserManagement() {
  const { user: currentUser } = useSelector(state => state.auth);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetPwId, setResetPwId] = useState(null);
  const [newPw, setNewPw] = useState('');

  const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role);

  // Counter to trigger manual refetches from event handlers
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshData = () => setRefreshKey(k => k + 1);

  // Fetch users — runs on mount, filter changes, and manual refreshes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (search) params.search = search;
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.isActive = statusFilter;
        const res = await userService.getUsers(params);
        if (!cancelled) {
          setUsers(res.data || []);
          setPagination(res.pagination || null);
        }
      } catch {
        if (!cancelled) toast.error('Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [page, search, roleFilter, statusFilter, refreshKey]);

  // Fetch stats — runs on mount and manual refreshes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await userService.getStats();
        if (!cancelled) setStats(res.data || null);
      } catch { /* ignore */ }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleCreateOrUpdate = async (data) => {
    setFormLoading(true);
    try {
      if (editUser) {
        await userService.updateUser(editUser._id || editUser.id, data);
        toast.success('User updated successfully');
      } else {
        await userService.createUser(data);
        toast.success('User created successfully');
      }
      setModalOpen(false);
      setEditUser(null);
      refreshData();
    } catch (err) {
      toast.error(err?.message || 'Operation failed');
    } finally { setFormLoading(false); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await userService.deactivateUser(id);
      toast.success('User deactivated');
      refreshData();
    } catch (err) {
      toast.error(err?.message || 'Failed to deactivate');
    }
  };

  const handleActivate = async (id) => {
    try {
      await userService.activateUser(id);
      toast.success('User activated');
      refreshData();
    } catch (err) {
      toast.error(err?.message || 'Failed to activate');
    }
  };

  const handleResetPassword = async () => {
    if (!newPw || newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await userService.resetPassword(resetPwId, newPw);
      toast.success('Password reset successfully');
      setResetPwId(null); setNewPw('');
    } catch (err) {
      toast.error(err?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl"><FaUsers className="text-emerald-600" size={20} /></div>
            <span>User Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage all system users and role assignments. All data stored in database.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditUser(null); setModalOpen(true); }}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 shadow-md shadow-emerald-500/25 transition-all hover:-translate-y-0.5">
            <FaUserPlus size={14} /><span>Add New User</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-bold text-slate-500 uppercase">Total Users</p><p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p></div>
              <div className="p-3 bg-blue-100 rounded-xl"><FaUsers className="text-blue-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-bold text-slate-500 uppercase">Active</p><p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.active}</p></div>
              <div className="p-3 bg-emerald-100 rounded-xl"><FaUserCheck className="text-emerald-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-bold text-slate-500 uppercase">Inactive</p><p className="text-2xl font-extrabold text-red-500 mt-1">{stats.inactive}</p></div>
              <div className="p-3 bg-red-100 rounded-xl"><FaUserTimes className="text-red-500" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-bold text-slate-500 uppercase">Roles Active</p><p className="text-2xl font-extrabold text-purple-600 mt-1">{Object.keys(stats.byRole || {}).length}</p></div>
              <div className="p-3 bg-purple-100 rounded-xl"><FaChartPie className="text-purple-600" /></div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, or employee ID..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
          </div>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-w-[160px]">
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-w-[130px]">
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-emerald-500 mr-3" size={20} />
            <span className="text-sm text-slate-500 font-medium">Loading users from database...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <FaUsers className="mx-auto text-slate-300 mb-4" size={40} />
            <p className="text-slate-500 font-medium">No users found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">Employee ID</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  {isAdmin && <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => {
                  const color = getRoleColor(u.role);
                  const colorClass = COLOR_MAP[color] || COLOR_MAP.slate;
                  return (
                    <tr key={u._id || u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold border`}>
                            {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${colorClass}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{u.department || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs hidden lg:table-cell">{u.employeeId || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {u.isActive !== false ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                            <FaCheck size={8} /><span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg">
                            <FaTimes size={8} /><span>Inactive</span>
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => { setEditUser(u); setModalOpen(true); }} title="Edit"
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <FaEdit size={13} />
                            </button>
                            <button onClick={() => setResetPwId(u._id || u.id)} title="Reset Password"
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                              <FaKey size={13} />
                            </button>
                            {u.isActive !== false ? (
                              <button onClick={() => handleDeactivate(u._id || u.id)} title="Deactivate"
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <FaUserTimes size={13} />
                              </button>
                            ) : (
                              <button onClick={() => handleActivate(u._id || u.id)} title="Activate"
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                <FaUserCheck size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-500 font-medium">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} users)
            </p>
            <div className="flex items-center space-x-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <UserFormModal onClose={() => { setModalOpen(false); setEditUser(null); }}
          onSubmit={handleCreateOrUpdate} editUser={editUser} loading={formLoading} />
      )}

      {/* Reset Password Modal */}
      {resetPwId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4">
              <FaKey className="text-amber-500" /><span>Reset Password</span>
            </h3>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            <div className="flex space-x-3">
              <button onClick={handleResetPassword}
                className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-400 transition-colors">Reset</button>
              <button onClick={() => { setResetPwId(null); setNewPw(''); }}
                className="px-5 py-2.5 border border-slate-200 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
