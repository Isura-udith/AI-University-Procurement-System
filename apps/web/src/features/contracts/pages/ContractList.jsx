import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import contractService from '../../../services/contract.service';
import ConfirmModal from '../../../components/ConfirmModal';
import StatusBadge from '../../../components/StatusBadge';
import { FaFileAlt } from 'react-icons/fa';

import usePermissions from '../../../hooks/usePermissions';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
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

export default function ContractList() {
  const { role } = usePermissions();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [backendStats, setBackendStats] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.allSettled([
        contractService.getAll(),
        contractService.getStats()
      ]);

      if (res.status === 'fulfilled') {
        const rawData = res.value.data || res.value || [];
        const mapped = rawData.map((c) => {
          const totalDeliv = c.deliverables?.length || 0;
          const acceptedDeliv = c.deliverables?.filter((d) => d.status === 'accepted').length || 0;
          const progressPct = totalDeliv > 0 ? Math.round((acceptedDeliv / totalDeliv) * 100) : 0;

          return {
            _id: c._id,
            contractNumber: c.contractNumber,
            title: c.title,
            vendor:
              (typeof c.vendorId === 'object' && c.vendorId !== null)
                ? (c.vendorId.companyName || c.vendorId.tradingName || c.vendorId.name || c.vendorId.contactPerson || 'Unknown Vendor')
                : (c.vendorName || c.supplierName || (typeof c.tenderId === 'object' && c.tenderId?.awardedVendorId?.companyName) || (typeof c.vendorId === 'string' && !c.vendorId.match(/^[0-9a-fA-F]{24}$/) ? c.vendorId : 'Unknown Vendor')),
            value: c.contractValue || 0,
            status: c.status,
            type: c.contractType || 'goods',
            startDate: c.startDate ? c.startDate.split('T')[0] : '—',
            endDate: c.endDate ? c.endDate.split('T')[0] : '—',
            progress: progressPct,
            performanceRating:
              c.performanceRating ||
              (c.slaMetrics?.[0]?.actual ? parseFloat(c.slaMetrics[0].actual) : null),
          };
        });
        setData(mapped);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setBackendStats(statsRes.value.data);
      }
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
    try {
      await contractService.delete(deleteTarget._id);
      setData((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      toast.success(`Contract ${deleteTarget.contractNumber} deleted successfully.`);
    } catch {
      toast.error('Failed to delete contract');
    }
    setDeleteTarget(null);
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.info('No contract records available to export.');
      return;
    }
    const columns = [
      { key: 'contractNumber', label: 'Contract #' },
      { key: 'title', label: 'Title' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'value', label: 'Value (LKR)' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
    ];
    const header = columns.map((c) => c.label).join(',');
    const rows = filtered.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV Export downloaded successfully.');
  };

  const filtered = data.filter((item) => {
    const s =
      !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.contractNumber?.toLowerCase().includes(search.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(search.toLowerCase());
    const st = statusFilter === 'all' || item.status === statusFilter;
    const tp = typeFilter === 'all' || item.type === typeFilter;
    return s && st && tp;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / perPage) || 1;
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const calculatedStats = {
    total: data.length,
    active: data.filter((d) => ['active', 'in_progress', 'pending_signature', 'loa_issued', 'draft'].includes(d.status)).length,
    expiring: data.filter((d) => d.status === 'expiring' || (d.endDate && d.endDate !== '—' && new Date(d.endDate) >= now && new Date(d.endDate) <= thirtyDaysFromNow)).length,
    completed: data.filter((d) => d.status === 'completed').length,
    totalValue: data
      .filter((d) => d.status !== 'terminated')
      .reduce((s, d) => s + (d.value || 0), 0),
  };

  const stats = backendStats || calculatedStats;

  const startItem = totalItems > 0 ? (page - 1) * perPage + 1 : 0;
  const endItem = Math.min(page * perPage, totalItems);

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none"> 
                    <FaFileAlt size={160} /> 
                  </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
              Contract Management
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors shadow-sm"
            >
              Export CSV
            </button>
            {role !== 'supplier' && (
              <Link
                to="/contracts/new"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-colors shadow-md"
              >
                + Create Contract
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Contracts</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.active}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Currently under execution</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expiring Soon</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.expiring}</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Within 30 days deadline</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Value</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            LKR {(stats.totalValue / 1000000).toFixed(2)}M
          </p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Committed budget value</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{stats.completed}</p>
          <p className="text-[11px] text-purple-700 font-semibold mt-0.5">Fully fulfilled contracts</p>
        </div>
      </div>

      {/* Expiry Alerts Banner */}
      {stats.expiring > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div>
            <span className="font-extrabold uppercase tracking-wide bg-amber-200/80 px-2 py-0.5 rounded text-[10px] mr-2">
              Contract Renewal Notice
            </span>
            <span>
              <strong>{stats.expiring} contract(s)</strong> are expiring within 30 days. Review performance and initiate renewal or re-tendering process.
            </span>
          </div>
          <button
            onClick={() => setStatusFilter('expiring')}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline whitespace-nowrap self-end sm:self-auto"
          >
            View Expiring Contracts
          </button>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search contract #, title, or vendor..."
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto text-xs">
          <span className="font-semibold text-slate-400">Filter by:</span>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-semibold"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-semibold"
          >
            {TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
                setPage(1);
              }}
              className="text-xs font-bold text-emerald-600 hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-500">
            Loading contract records...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-3.5">Contract #</th>
                    <th className="p-3.5">Title & Vendor</th>
                    <th className="p-3.5 text-right">Contract Value (LKR)</th>
                    <th className="p-3.5 text-center">Type</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Execution Progress</th>
                    <th className="p-3.5 text-center">Rating</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map((c) => (
                    <tr
                      key={c._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        c.status === 'expiring' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          {c.contractNumber}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <Link
                          to={`/contracts/${c._id}`}
                          className="font-bold text-slate-900 hover:text-emerald-600 transition-colors truncate block"
                        >
                          {c.title}
                        </Link>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{c.vendor}</p>
                      </td>

                      <td className="p-3.5 text-right font-extrabold text-slate-900">
                        {(c.value || 0).toLocaleString()}
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            c.type === 'works'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : c.type === 'services'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {c.type}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <StatusBadge status={c.status} />
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>{c.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                c.progress >= 80
                                  ? 'bg-emerald-500'
                                  : c.progress >= 40
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${c.progress}%` }}
                            />
                          </div>
                          {c.startDate && c.endDate && (
                            <p className="text-[10px] text-slate-400">
                              {c.startDate} → {c.endDate}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-bold">
                        {c.performanceRating ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            {c.performanceRating.toFixed(1)} / 5.0
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not Rated</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Link
                            to={`/contracts/${c._id}`}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                          >
                            View
                          </Link>
                          {c.status === 'draft' && (
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-xs text-slate-400">
                        No matching contracts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Icon-free Pagination Footer */}
            {totalItems > 0 && (
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Showing <strong className="text-slate-900">{startItem}</strong> to{' '}
                  <strong className="text-slate-900">{endItem}</strong> of{' '}
                  <strong className="text-slate-900">{totalItems}</strong> contracts
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">Per Page:</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>

                    <span className="px-2 font-bold text-slate-700">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Draft Contract"
        message={`Are you sure you want to delete draft contract "${deleteTarget?.contractNumber} - ${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Contract"
        variant="danger"
      />
    </div>
  );
}
