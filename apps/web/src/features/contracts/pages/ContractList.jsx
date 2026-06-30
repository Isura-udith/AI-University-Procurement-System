import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaFilter, FaEye, FaSpinner, FaTrash, FaFileContract, FaExclamationTriangle, FaStar, FaStarHalfAlt } from 'react-icons/fa';
import contractService from '../../../services/contract.service';
import ConfirmModal from '../../../components/ConfirmModal';
import Pagination from '../../../components/Pagination';
import ExportButton from '../../../components/ExportButton';
import StatusBadge from '../../../components/StatusBadge';



const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring Soon' },
  { value: 'completed', label: 'Completed' },
  { value: 'terminated', label: 'Terminated' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'goods', label: 'Goods' },
  { value: 'works', label: 'Works' },
  { value: 'services', label: 'Services' },
];

function PerformanceStars({ rating }) {
  if (!rating) return <span className="text-xs text-slate-400">N/A</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center space-x-0.5">
      {Array.from({ length: full }, (_, i) => <FaStar key={i} className="text-amber-400" size={10} />)}
      {half && <FaStarHalfAlt className="text-amber-400" size={10} />}
      <span className="text-xs text-slate-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function ContractList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contractService.getAll();
      const rawData = res.data || res || [];
      const mapped = rawData.map(c => {
        const totalDeliv = c.deliverables?.length || 0;
        const acceptedDeliv = c.deliverables?.filter(d => d.status === 'accepted').length || 0;
        const progressPct = totalDeliv > 0 ? Math.round((acceptedDeliv / totalDeliv) * 100) : 0;
        
        return {
          _id: c._id,
          contractNumber: c.contractNumber,
          title: c.title,
          vendor: c.vendorId?.companyName || 'Unknown Vendor',
          value: c.contractValue || 0,
          status: c.status,
          type: c.contractType || 'goods',
          startDate: c.startDate ? c.startDate.split('T')[0] : '—',
          endDate: c.endDate ? c.endDate.split('T')[0] : '—',
          progress: progressPct,
          performanceRating: c.performanceRating || (c.slaMetrics?.[0]?.actual ? parseFloat(c.slaMetrics[0].actual) : null),
        };
      });
      setData(mapped);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
      setData([]);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  const handleDelete = async () => {
    try { await contractService.delete(deleteTarget._id); } catch { toast.error('Failed to delete contract'); }
    setData(prev => prev.filter(d => d._id !== deleteTarget._id));
    toast.success(`Contract ${deleteTarget.contractNumber} deleted.`);
    setDeleteTarget(null);
  };

  const filtered = data.filter(item => {
    const s = !search || item.title?.toLowerCase().includes(search.toLowerCase()) || item.contractNumber?.toLowerCase().includes(search.toLowerCase()) || item.vendor?.toLowerCase().includes(search.toLowerCase());
    const st = statusFilter === 'all' || item.status === statusFilter;
    const tp = typeFilter === 'all' || item.type === typeFilter;
    return s && st && tp;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const stats = {
    active: data.filter(d => d.status === 'active').length,
    expiring: data.filter(d => d.status === 'expiring').length,
    totalValue: data.filter(d => d.status === 'active' || d.status === 'expiring').reduce((s, d) => s + (d.value || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contract Management</h1>
          <p className="text-sm text-slate-500 mt-1">Stages 11–12: Draft, sign, manage, and track contract lifecycle with performance monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <ExportButton data={filtered} columns={[
            { key: 'contractNumber', label: 'Contract #' }, { key: 'title', label: 'Title' }, { key: 'vendor', label: 'Vendor' },
            { key: 'value', label: 'Value' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' },
          ]} filename="contracts" />
          <Link to="/contracts/new" className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">
            <FaPlus size={11} /> <span>New Contract</span>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg"><FaFileContract size={16} /></div>
          <div><p className="text-lg font-bold text-slate-900">{stats.active}</p><p className="text-xs text-slate-500">Active Contracts</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-lg"><FaExclamationTriangle size={16} /></div>
          <div><p className="text-lg font-bold text-slate-900">{stats.expiring}</p><p className="text-xs text-slate-500">Expiring Soon</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg"><FaFileContract size={16} /></div>
          <div><p className="text-lg font-bold text-slate-900">LKR {(stats.totalValue / 1000000).toFixed(1)}M</p><p className="text-xs text-slate-500">Active Value</p></div>
        </div>
      </div>

      {/* Expiry Alerts */}
      {stats.expiring > 0 && (
        <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <FaExclamationTriangle className="text-amber-600 mt-0.5 shrink-0" size={14} />
          <p className="text-sm text-amber-700"><strong>{stats.expiring} contract(s)</strong> expiring within 30 days. Review and initiate renewal or re-tendering process.</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-3 text-slate-400" size={13} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search contracts, vendors..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
        </div>
        <div className="flex items-center space-x-2">
          <FaFilter className="text-slate-400" size={12} />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            {TYPE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
            <span className="text-sm text-slate-500">Loading contracts...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-5 py-3 font-semibold text-slate-600">Contract #</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Title / Vendor</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Value (LKR)</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Type</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Progress</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Rating</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(c => (
                    <tr key={c._id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${c.status === 'expiring' ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{c.contractNumber}</td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <Link to={`/contracts/${c._id}`} className="font-medium text-slate-800 truncate block hover:text-emerald-600 transition-colors">{c.title}</Link>
                        <p className="text-xs text-slate-400">{c.vendor}</p>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 text-right">{(c.value || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.type === 'works' ? 'bg-orange-100 text-orange-700' : c.type === 'services' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>{c.type}</span>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${c.progress >= 80 ? 'bg-emerald-500' : c.progress >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${c.progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{c.progress}%</span>
                        </div>
                        {c.startDate && c.endDate && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{c.startDate} → {c.endDate}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5"><PerformanceStars rating={c.performanceRating} /></td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Link to={`/contracts/${c._id}`} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View">
                            <FaEye size={12} />
                          </Link>
                          {c.status === 'draft' && (
                            <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <FaTrash size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">No contracts found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2 border-t border-slate-100">
              <Pagination currentPage={page} totalPages={totalPages} totalItems={totalItems} itemsPerPage={perPage} onPageChange={setPage} onItemsPerPageChange={n => { setPerPage(n); setPage(1); }} />
            </div>
          </>
        )}
      </div>

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Contract" message={`Delete draft contract "${deleteTarget?.title}"? This cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  );
}
