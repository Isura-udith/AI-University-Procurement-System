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

const MOCK_DATA = [
  { _id: '1', id: 'UWU/G/NCB/2026/001', title: 'Laboratory Spectrophotometers for Faculty of Applied Sciences', faculty: 'Faculty of Applied Sciences', tce: 12500000, method: 'NCB', status: 'pending-approval', stage: 3, officer: 'Dr. A. Perera', date: '2026-05-08', priority: 'normal' },
  { _id: '2', id: 'UWU/W/NCB/2026/003', title: 'Construction of New Student Hostel Complex Phase II', faculty: 'Works Division', tce: 85000000, method: 'NCB', status: 'budget-locked', stage: 4, officer: 'Eng. M. Fernando', date: '2026-05-06', priority: 'urgent' },
  { _id: '3', id: 'UWU/S/ICB/2026/002', title: 'Enterprise Resource Planning (ERP) System Integration', faculty: 'ICT Center', tce: 125000000, method: 'ICB', status: 'tendering', stage: 7, officer: 'Mr. S. Rathnayake', date: '2026-04-28', priority: 'normal' },
  { _id: '4', id: 'UWU/G/NCB/2026/005', title: 'IT Infrastructure Network Upgrade — Fiber Backbone', faculty: 'ICT Center', tce: 8500000, method: 'NCB', status: 'rejected', stage: 4, officer: 'Mr. S. Rathnayake', date: '2026-05-01', priority: 'normal' },
  { _id: '5', id: 'UWU/G/SH/2026/010', title: 'Office Furniture for Faculty of Management', faculty: 'Faculty of Management', tce: 2400000, method: 'Shopping', status: 'draft', stage: 1, officer: 'Dr. K. Jayasuriya', date: '2026-05-10', priority: 'normal' },
  { _id: '6', id: 'UWU/G/NCB/2026/012', title: 'Medical Imaging Equipment — Ultrasound Scanner', faculty: 'Faculty of Medicine', tce: 35000000, method: 'NCB', status: 'pending-approval', stage: 2, officer: 'Dr. N. Wickramasinghe', date: '2026-05-11', priority: 'urgent' },
  { _id: '7', id: 'UWU/G/NCB/2025/088', title: 'Laboratory Chemicals and Reagents — Annual Supply', faculty: 'Faculty of Applied Sciences', tce: 4800000, method: 'NCB', status: 'completed', stage: 15, officer: 'Dr. A. Perera', date: '2025-12-15', priority: 'normal' },
  { _id: '8', id: 'UWU/G/NCB/2026/015', title: 'Solar Panel Installation for Admin Building', faculty: 'Works Division', tce: 18500000, method: 'NCB', status: 'draft', stage: 1, officer: 'Eng. M. Fernando', date: '2026-05-15', priority: 'normal' },
  { _id: '9', id: 'UWU/S/NCB/2026/020', title: 'Library Management System Upgrade', faculty: 'Library', tce: 5600000, method: 'NCB', status: 'pending-approval', stage: 3, officer: 'Ms. D. Kumari', date: '2026-05-12', priority: 'normal' },
  { _id: '10', id: 'UWU/G/SH/2026/025', title: 'Printing Supplies — Annual Contract', faculty: 'Supplies Division', tce: 1200000, method: 'Shopping', status: 'budget-locked', stage: 4, officer: 'Mr. R. Fernando', date: '2026-05-03', priority: 'normal' },
];

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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);

  // Fetch from API with mock fallback
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procurementService.getAll({ page, limit: perPage, status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined });
      setData(res.data || []);
    } catch {
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, statusFilter, search]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await procurementService.delete(deleteTarget._id || deleteTarget.id);
      toast.success(`Requisition ${deleteTarget.referenceNumber || deleteTarget.id} deleted successfully`);
      setData(prev => prev.filter(d => (d._id || d.id) !== (deleteTarget._id || deleteTarget.id)));
    } catch {
      // Mock mode: remove from local state
      setData(prev => prev.filter(d => (d._id || d.id) !== (deleteTarget._id || deleteTarget.id)));
      toast.success(`Requisition ${deleteTarget.referenceNumber || deleteTarget.id} deleted`);
    }
    setDeleteTarget(null);
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    try {
      await procurementService.publish(publishTarget._id || publishTarget.id);
      toast.success(`\uD83D\uDE80 Requisition ${publishTarget.referenceNumber || publishTarget.id} published to suppliers.`);
      fetchData();
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

  // Filter + Sort + Paginate locally (for mock mode)
  const filtered = data
    .filter(item => {
      const matchesSearch = !search || 
        item.title?.toLowerCase().includes(search.toLowerCase()) || 
        (item.referenceNumber || item.id)?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        item.status === statusFilter ||
        (statusFilter === 'pending-approval' && ['pending-approval', 'submitted', 'hod_approved', 'dean_approved', 'pmd_approved', 'bursar_approved', 'finance_committee_approved', 'pmd_review'].includes(item.status)) ||
        (statusFilter === 'budget-locked' && ['budget-locked', 'budget_locked'].includes(item.status)) ||
        (statusFilter === 'tendering' && ['tendering', 'published', 'bidding', 'evaluation'].includes(item.status));
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let sortF = sortField;
      if (sortField === 'id') sortF = 'referenceNumber';
      if (sortField === 'tce') sortF = 'totalEstimatedCost';

      let aVal = a[sortF] !== undefined ? a[sortF] : a[sortField];
      let bVal = b[sortF] !== undefined ? b[sortF] : b[sortField];

      if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const stats = {
    total: data.length,
    pending: data.filter(d => ['pending-approval', 'submitted', 'hod_approved', 'dean_approved', 'pmd_approved', 'bursar_approved', 'finance_committee_approved', 'pmd_review'].includes(d.status)).length,
    active: data.filter(d => ['budget-locked', 'budget_locked', 'tendering', 'published', 'bidding', 'evaluation'].includes(d.status)).length,
    completed: data.filter(d => d.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Procurement Requisitions</h1>
          <p className="text-sm text-slate-500 mt-1">Stages 1–2: Requirement identification and smart requisition intake</p>
        </div>
        <div className="flex items-center space-x-3">
          <ExportButton data={filtered} columns={EXPORT_COLUMNS} filename="procurement-requisitions" />
          <Link to="/procurements/new" className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">
            <FaPlus size={11} /> <span>New Requisition</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-3 text-slate-400" size={13} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by title or reference number..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
        </div>
        <div className="flex items-center space-x-2">
          <FaFilter className="text-slate-400" size={12} />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: stats.total, icon: FaClipboardList, color: 'text-slate-600' },
          { label: 'Pending', count: stats.pending, icon: FaClock, color: 'text-amber-600' },
          { label: 'Active', count: stats.active, icon: FaSpinner, color: 'text-blue-600' },
          { label: 'Completed', count: stats.completed, icon: FaCheckCircle, color: 'text-emerald-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center space-x-3 shadow-sm">
            <s.icon className={s.color} size={16} />
            <div>
              <p className="text-lg font-bold text-slate-900">{s.count}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                        <p className="font-mono text-xs text-slate-550">{item.referenceNumber || item.id}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.date || (item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '')}</p>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <Link to={`/procurements/${item._id || item.id}`} className="font-medium text-slate-800 truncate block hover:text-emerald-600 transition-colors">{item.title}</Link>
                        <p className="text-xs text-slate-400">
                          {item.faculty} • {item.requestedBy ? `${item.requestedBy.firstName} ${item.requestedBy.lastName}` : (item.officer || 'Requisitioning Officer')}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{(item.totalEstimatedCost || item.tce || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.procurementMethod === 'ICB' || item.method === 'ICB' ? 'bg-purple-100 text-purple-700' : item.procurementMethod === 'Shopping' || item.method === 'Shopping' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
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
                          <Link to={`/procurements/${item._id || item.id}`} className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                            <FaEye size={11} /> <span>View</span>
                          </Link>
                          {(item.status === 'draft' || item.status === 'rejected') && (
                            <button onClick={() => setDeleteTarget(item)} className="inline-flex items-center space-x-1 text-xs font-medium text-red-400 hover:text-red-600 transition-colors">
                              <FaTrash size={9} /> <span>Delete</span>
                            </button>
                          )}
                          {canPublish && ['pmd_review', 'budget_locked'].includes(item.status) && (
                            <button onClick={() => setPublishTarget(item)} className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors" title="Publish to Suppliers">
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
