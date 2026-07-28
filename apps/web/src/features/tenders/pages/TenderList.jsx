import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaSearch, FaFilter, FaEye, FaSpinner, FaTrash, FaCopy, 
  FaTimesCircle, FaPaperPlane, FaEdit, FaFileAlt, FaClock, 
  FaCheckCircle, FaBoxOpen, FaSync, FaTrophy, FaTag, FaClipboardList
} from 'react-icons/fa';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import Pagination from '../../../components/Pagination';
import ExportButton from '../../../components/ExportButton';
import StatusBadge from '../../../components/StatusBadge';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Bid Closed' },
  { value: 'opening', label: 'Bid Opening' },
  { value: 'evaluation', label: 'Under Evaluation' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'loa_issued', label: 'LOA Issued' },
  { value: 'cancelled', label: 'Cancelled' },
];

const METHOD_FILTERS = [
  { value: 'all', label: 'All Methods' },
  { value: 'NCB', label: 'NCB (National)' },
  { value: 'ICB', label: 'ICB (International)' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Direct', label: 'Direct Contracting' },
  { value: 'RFQ', label: 'RFQ' },
];

const calcClosingTime = (date) => {
  if (!date) return '—';
  const diff = new Date(date) - new Date();
  if (diff <= 0) return 'Closed';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
};

function ClosingCountdown({ date }) {
  const [left, setLeft] = useState(() => calcClosingTime(date));
  const [prevDate, setPrevDate] = useState(date);

  if (date !== prevDate) {
    setPrevDate(date);
    setLeft(calcClosingTime(date));
  }

  useEffect(() => {
    if (!date) return;
    const t = setInterval(() => setLeft(calcClosingTime(date)), 30000);
    return () => clearInterval(t);
  }, [date]);

  if (!date) return <span className="text-slate-400">—</span>;
  const isClosed = left === 'Closed';
  const diffMs = new Date(date) - new Date();
  const isUrgent = !isClosed && diffMs < 3 * 86400000;

  return (
    <div className="flex items-center space-x-1.5">
      <FaClock size={11} className={isClosed ? 'text-slate-400' : isUrgent ? 'text-rose-500 animate-pulse' : 'text-amber-500'} />
      <span className={`text-xs font-semibold ${
        isClosed 
          ? 'text-slate-400' 
          : isUrgent 
            ? 'text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200' 
            : 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded'
      }`}>
        {left}
      </span>
    </div>
  );
}

export default function TenderList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [publishTarget, setPublishTarget] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenderService.getAll();
      const items = res.data || res || [];
      const mapped = (Array.isArray(items) ? items : []).map(t => ({
        ...t,
        method: t.procurementMethod || 'NCB',
        closingDate: t.bidSubmissionDeadline,
        officer: t.createdBy ? `${t.createdBy.firstName} ${t.createdBy.lastName}` : 'System',
        bidsReceived: t.bidsReceived || 0
      }));
      setData(mapped);
    } catch (err) {
      toast.error(err.message || 'Failed to load tenders');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  const handleCopyTenderNum = (num, id) => {
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    toast.info(`Copied ${num} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    try {
      await tenderService.delete(deleteTarget._id);
      setData(prev => prev.filter(d => d._id !== deleteTarget._id));
      toast.success(`Tender ${deleteTarget.tenderNumber} deleted.`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete tender');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error('A cancellation reason is required.'); return; }
    try {
      await tenderService.cancel(cancelTarget._id, { reason: cancelReason });
      setData(prev => prev.map(d => d._id === cancelTarget._id ? { ...d, status: 'cancelled' } : d));
      toast.warning(`Tender ${cancelTarget.tenderNumber} cancelled.`);
    } catch (err) {
      toast.error(err.message || 'Failed to cancel tender');
    } finally {
      setCancelTarget(null);
      setCancelReason('');
    }
  };

  const handlePublish = async () => {
    try {
      await tenderService.publish(publishTarget._id);
      setData(prev => prev.map(d => d._id === publishTarget._id ? { ...d, status: 'published' } : d));
      toast.success(`🚀 Tender ${publishTarget.tenderNumber} published successfully!`);
    } catch (err) {
      toast.error(err.message || 'Failed to publish tender');
    } finally {
      setPublishTarget(null);
    }
  };

  const handleDuplicate = useCallback((tender) => {
    const duplicateDraft = async () => {
      try {
        const dupData = {
          title: `${tender.title} (Copy)`,
          description: tender.description,
          category: tender.category,
          procurementMethod: tender.method,
          estimatedValue: tender.estimatedValue,
          currency: tender.currency || 'LKR',
          bidSubmissionDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          evaluationType: tender.evaluationType || 'lowest_price',
          technicalCriteria: tender.technicalCriteria || [],
          procurementId: tender.procurementId?._id || tender.procurementId
        };
        const res = await tenderService.create(dupData);
        toast.success(`Tender duplicated successfully as draft: ${res.data?.tenderNumber || res.tenderNumber || ''}`);
        fetchData();
      } catch (err) {
        toast.error(err.message || 'Failed to duplicate tender');
      }
    };
    duplicateDraft();
  }, [fetchData]);

  // Calculated Stats
  const totalCount = data.length;
  const draftCount = data.filter(d => d.status === 'draft').length;
  const activeCount = data.filter(d => ['published', 'bidding', 'opening'].includes(d.status)).length;
  const totalValue = data.reduce((acc, curr) => acc + (Number(curr.estimatedValue) || 0), 0);
  const totalBidsReceived = data.reduce((acc, curr) => acc + (Number(curr.bidsReceived) || 0), 0);

  const filtered = data.filter(item => {
    const s = !search || item.title?.toLowerCase().includes(search.toLowerCase()) || item.tenderNumber?.toLowerCase().includes(search.toLowerCase());
    const st = statusFilter === 'all' || item.status === statusFilter;
    const m = methodFilter === 'all' || item.method === methodFilter;
    return s && st && m;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none"> 
          <FaFileAlt size={160} /> 
        </div>
        <div className="relative z-10 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Bid Preparation & Tenders</h1>
        </div>
        <div className="relative z-10 flex items-center space-x-3 shrink-0">
          <button 
            onClick={fetchData} 
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all shadow-sm"
            title="Refresh list"
          >
            <FaSync className={loading ? 'animate-spin' : ''} size={14} />
          </button>
          <ExportButton 
            data={filtered} 
            columns={[
              { key: 'tenderNumber', label: 'Tender #' }, 
              { key: 'title', label: 'Title' }, 
              { key: 'category', label: 'Category' },
              { key: 'method', label: 'Method' }, 
              { key: 'estimatedValue', label: 'Est. Value' }, 
              { key: 'status', label: 'Status' },
            ]} 
            filename="tenders_preparation" 
          />
          <Link 
            to="/tenders/new" 
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02]"
          >
            <FaPlus size={12} /> 
            <span>Create Tender</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tenders</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Est. LKR {totalValue.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <FaClipboardList size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drafts in Prep</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{draftCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting publication</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <FaEdit size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Bidding</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{totalBidsReceived} bids received</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <FaBoxOpen size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed / Awarded</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {data.filter(d => ['awarded', 'loa_issued'].includes(d.status)).length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Finalized tenders</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <FaTrophy size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            placeholder="Search by tender title, reference #, category..." 
            className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-slate-50/50" 
          />
          {search && (
            <button 
              onClick={() => setSearch('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FaTimesCircle size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600">
            <FaFilter size={10} className="text-slate-400" />
            <span>Filters:</span>
          </div>

          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }} 
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          <select 
            value={methodFilter} 
            onChange={e => { setMethodFilter(e.target.value); setPage(1); }} 
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {METHOD_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          {(statusFilter !== 'all' || methodFilter !== 'all' || search) && (
            <button 
              onClick={() => { setStatusFilter('all'); setMethodFilter('all'); setSearch(''); setPage(1); }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
            <FaSpinner className="animate-spin text-emerald-600" size={24} />
            <p className="text-sm font-medium">Loading tender bid preparations...</p>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
              <FaFileAlt size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No tenders match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Try adjusting your search keywords, clear filters, or create a new tender bid preparation.
            </p>
            <Link 
              to="/tenders/new" 
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <FaPlus size={11} />
              <span>Create New Tender</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Tender #</th>
                    <th className="px-5 py-3.5">Title & Category</th>
                    <th className="px-5 py-3.5 text-right">Est. Value (LKR)</th>
                    <th className="px-5 py-3.5">Method</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Deadline</th>
                    <th className="px-5 py-3.5 text-center">Bids</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map(t => (
                    <tr key={t._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                            {t.tenderNumber || 'N/A'}
                          </span>
                          <button 
                            onClick={() => handleCopyTenderNum(t.tenderNumber, t._id)}
                            className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all p-1"
                            title="Copy Tender Number"
                          >
                            {copiedId === t._id ? <FaCheckCircle size={11} className="text-emerald-600" /> : <FaCopy size={11} />}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <Link 
                          to={`/tenders/${t._id}`} 
                          className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors block truncate"
                        >
                          {t.title}
                        </Link>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="inline-flex items-center space-x-1">
                            <FaTag size={9} className="text-slate-400" />
                            <span>{t.category || 'Goods'}</span>
                          </span>
                          <span>•</span>
                          <span>{t.officer}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {(Number(t.estimatedValue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          t.method === 'ICB' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          t.method === 'Shopping' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          t.method === 'Direct' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {t.method}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <ClosingCountdown date={t.closingDate} />
                        {t.closingDate && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(t.closingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.bidsReceived > 0 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                        }`}>
                          {t.bidsReceived} {t.bidsReceived === 1 ? 'bid' : 'bids'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <Link 
                            to={`/tenders/${t._id}`} 
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Tender Details"
                          >
                            <FaEye size={14} />
                          </Link>

                          {t.status === 'draft' && (
                            <Link 
                              to={`/tenders/${t._id}/edit`} 
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit Draft"
                            >
                              <FaEdit size={13} />
                            </Link>
                          )}

                          {t.status === 'draft' && (
                            <button 
                              onClick={() => setPublishTarget(t)} 
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Publish Tender"
                            >
                              <FaPaperPlane size={13} />
                            </button>
                          )}

                          {t.status !== 'cancelled' && t.status !== 'awarded' && t.status !== 'loa_issued' && (
                            <button 
                              onClick={() => handleDuplicate(t)} 
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Duplicate Tender Draft"
                            >
                              <FaCopy size={13} />
                            </button>
                          )}

                          {t.status === 'published' && (
                            <button 
                              onClick={() => setCancelTarget(t)} 
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancel Tender"
                            >
                              <FaTimesCircle size={13} />
                            </button>
                          )}

                          {t.status === 'draft' && (
                            <button 
                              onClick={() => setDeleteTarget(t)} 
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Draft"
                            >
                              <FaTrash size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        onConfirm={handleDelete} 
        title="Delete Tender Draft" 
        message={`Are you sure you want to delete tender "${deleteTarget?.title}"? This action is permanent and cannot be undone.`} 
        confirmText="Delete Tender" 
        variant="danger" 
      />

      {/* Cancel Tender Modal */}
      <ConfirmModal 
        isOpen={!!cancelTarget} 
        onClose={() => { setCancelTarget(null); setCancelReason(''); }} 
        onConfirm={handleCancel} 
        title="Cancel Active Tender" 
        confirmText="Confirm Cancellation" 
        variant="danger"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            You are about to cancel tender <span className="font-bold text-slate-900">{cancelTarget?.tenderNumber} — {cancelTarget?.title}</span>.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Cancellation *</label>
            <textarea 
              value={cancelReason} 
              onChange={e => setCancelReason(e.target.value)} 
              rows={3} 
              placeholder="State the official justification for cancelling this solicitation..." 
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 resize-none" 
            />
          </div>
        </div>
      </ConfirmModal>

      {/* Publish Tender Modal */}
      <ConfirmModal 
        isOpen={!!publishTarget} 
        onClose={() => setPublishTarget(null)} 
        onConfirm={handlePublish} 
        title="Publish Tender Solicitation" 
        confirmText="Publish Tender" 
        variant="success"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Publish tender <span className="font-bold text-slate-900">{publishTarget?.tenderNumber} — {publishTarget?.title}</span>?
          </p>
          <p className="text-xs text-slate-500 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            This will make the tender live on the public e-Procurement Portal. Registered suppliers will be able to download bidding documents and prepare their electronic bid submissions.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}

