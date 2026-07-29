import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaFilter, FaEye, FaClock, FaCheckCircle, FaSpinner, FaClipboardList, FaTrash, FaSortAmountDown, FaSortAmountUp, FaBullhorn } from 'react-icons/fa';
import procurementService from '../../../services/procurement.service';
import ConfirmModal from '../../../components/ConfirmModal';
import Pagination from '../../../components/Pagination';
import ExportButton from '../../../components/ExportButton';
import StatusBadge from '../../../components/StatusBadge';



const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending-approval', label: 'Pending Approval' },
  { value: 'budget-locked', label: 'Budget Locked' },
  { value: 'published', label: 'Published' },
  { value: 'tendering', label: 'Tendering' },
  { value: 'rejected', label: 'Budget Insufficient' },
  { value: 'completed', label: 'Completed' },
];

const EXPORT_COLUMNS = [
  { key: 'id', label: 'Reference' },
  { key: 'title', label: 'Title' },
  { key: 'faculty', label: 'Faculty' },
  { key: 'tce', label: 'TCE (LKR)' },
  { key: 'method', label: 'Method' },
  { key: 'status', label: 'Status' },
  { key: 'stage', label: 'Stage' },
  { key: 'officer', label: 'Officer' },
  { key: 'date', label: 'Date' },
];

const sortFieldMap = {
  id: 'referenceNumber',
  tce: 'totalEstimatedCost',
  date: 'createdAt',
  title: 'title'
};

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return null;
  return sortDir === 'asc' ? <FaSortAmountUp size={9} className="inline ml-1 text-emerald-600" /> : <FaSortAmountDown size={9} className="inline ml-1 text-emerald-600" />;
};

export default function ProcurementList() {
  const { user } = useSelector(state => state.auth);
  const userRole = user?.role || 'department_user';
  const canPublish = ['procurement_officer', 'admin', 'super_admin'].includes(userRole);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, completed: 0 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);

  // Fetch dashboard stats from API
  const fetchStats = useCallback(async () => {
    try {
      const res = await procurementService.getDashboardStats();
      const statsData = res.data || res || {};
      setStats({
        total: statsData.total || 0,
        pending: statsData.pending || 0,
        active: statsData.active || 0,
        completed: statsData.completed || 0,
      });
    } catch {
      // ignore
    }
  }, []);

  // Fetch from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sortParam = (sortDir === 'desc' ? '-' : '') + (sortFieldMap[sortField] || sortField);
      const res = await procurementService.getAll({
        page,
        limit: perPage,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
        sort: sortParam
      });
      setData(res.data || []);
      setTotalItems(res.pagination?.total || res.total || 0);
    } catch {
      setData([]);
      setTotalItems(0);
      toast.error('Failed to load procurement requisitions');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, statusFilter, search, sortField, sortDir]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchData();
      fetchStats();
    });
  }, [fetchData, fetchStats]);

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await procurementService.delete(deleteTarget._id || deleteTarget.id);
      toast.success(`Requisition ${deleteTarget.referenceNumber || deleteTarget.id} deleted successfully`);
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to delete requisition');
    }
    setDeleteTarget(null);
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    try {
      await procurementService.publish(publishTarget._id || publishTarget.id);
      toast.success(`🚀 Requisition ${publishTarget.referenceNumber || publishTarget.id} published to suppliers.`);
      fetchData();
      fetchStats();
    } catch (err) {
      toast.error(err?.message || err?.error || 'Failed to publish');
    }
    setPublishTarget(null);
  };

  // Sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = data;
  const totalPages = Math.ceil(totalItems / perPage);
  const paged = data;

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* ── Hero Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">  
          <FaClipboardList size={160} /> 
        </div>

        <div className="relative z-10 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Procurement Requisitions</h1>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          <ExportButton data={filtered} columns={EXPORT_COLUMNS} filename="procurement-requisitions" />
          <Link to="/procurements/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95">
            <FaPlus size={11} /> <span>New Requisition</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requisitions</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">All Created Requests</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <FaClipboardList size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approval</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">In Review Pipeline</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FaClock size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active / Tendering</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{stats.active}</p>
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Approved & Published</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FaSpinner size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.completed}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Procurement Closed</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FaCheckCircle size={18} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-3 text-slate-400" size={13} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by title or reference number..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
        </div>
        <div className="flex items-center space-x-2">
          <FaFilter className="text-slate-400" size={12} />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
            <span className="text-sm text-slate-500">Loading requisitions...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-5 py-3 font-semibold text-slate-600 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('id')}>Reference<SortIcon field="id" sortField={sortField} sortDir={sortDir} /></th>
                    <th className="px-5 py-3 font-semibold text-slate-600 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('title')}>Title<SortIcon field="title" sortField={sortField} sortDir={sortDir} /></th>
                    <th className="px-5 py-3 font-semibold text-slate-600 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('tce')}>TCE (LKR)<SortIcon field="tce" sortField={sortField} sortDir={sortDir} /></th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Method</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Stage</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(item => (
                    <tr key={item._id || item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md inline-block">{item.referenceNumber || item.id}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.date || (item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '')}</p>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <Link to={`/procurements/${item._id || item.id}`} className="font-semibold text-slate-800 truncate block hover:text-emerald-600 transition-colors">{item.title}</Link>
                        <p className="text-xs text-slate-400">
                          {item.faculty} • {item.requestedBy ? `${item.requestedBy.firstName} ${item.requestedBy.lastName}` : (item.officer || 'Requisitioning Officer')}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">{(item.totalEstimatedCost || item.tce || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${item.procurementMethod === 'ICB' || item.method === 'ICB' ? 'bg-purple-100 text-purple-700' : item.procurementMethod === 'Shopping' || item.method === 'Shopping' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.procurementMethod || item.method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 15 }, (_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < item.stage ? 'bg-emerald-500' : i === item.stage ? 'bg-amber-400' : 'bg-slate-200'}`} />
                          ))}
                          <span className="text-[10px] text-slate-400 ml-1">{item.stage}/15</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Link to={`/procurements/${item._id || item.id}`} className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                            <FaEye size={11} /> <span>View</span>
                          </Link>
                          {(item.status === 'draft' || item.status === 'rejected' || ['super_admin', 'admin', 'vc', 'dean'].includes(userRole)) && (
                            <button onClick={() => setDeleteTarget(item)} className="inline-flex items-center space-x-1 text-xs font-semibold text-red-400 hover:text-red-600 transition-colors">
                              <FaTrash size={9} /> <span>Delete</span>
                            </button>
                          )}
                          {canPublish && ['pmd_review', 'budget_locked'].includes(item.status) && (
                            <button onClick={() => setPublishTarget(item)} className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors" title="Publish to Suppliers">
                              <FaBullhorn size={9} /> <span>Publish</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No requisitions found matching your criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-2 border-t border-slate-100">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={perPage}
                onPageChange={setPage}
                onItemsPerPageChange={(n) => { setPerPage(n); setPage(1); }}
              />
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Requisition"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Publish Confirmation */}
      <ConfirmModal
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={handlePublish}
        title="Publish to Suppliers"
        message={`Publish "${publishTarget?.title}" to the supplier portal? It will be visible to all registered suppliers and on the public page.`}
        confirmText="Publish Now"
        variant="success"
      />
    </div>
  );
}
