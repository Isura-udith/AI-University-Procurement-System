import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaFilter, FaEye, FaSpinner, FaTrash, FaCopy, FaTimesCircle, FaPaperPlane } from 'react-icons/fa';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import Pagination from '../../../components/Pagination';
import ExportButton from '../../../components/ExportButton';
import StatusBadge from '../../../components/StatusBadge';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
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
  { value: 'NCB', label: 'NCB' },
  { value: 'ICB', label: 'ICB' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Direct', label: 'Direct' },
  { value: 'RFQ', label: 'RFQ' },
];

const calcClosingTime = (date) => {
  if (!date) return '—';
  const diff = new Date(date) - new Date();
  if (diff <= 0) return 'Closed';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
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
    const t = setInterval(() => setLeft(calcClosingTime(date)), 60000);
    return () => clearInterval(t);
  }, [date]);

  if (!date) return <span className="text-slate-400">—</span>;
  const isUrgent = new Date(date) - new Date() < 3 * 86400000;
  return <span className={`text-xs font-semibold ${left === 'Closed' ? 'text-slate-400' : isUrgent ? 'text-red-600' : 'text-amber-600'}`}>{left}</span>;
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

  const filtered = data.filter(item => {
    const s = !search || item.title?.toLowerCase().includes(search.toLowerCase()) || item.tenderNumber?.toLowerCase().includes(search.toLowerCase());
    const st = statusFilter === 'all' || item.status === statusFilter;
    const m = methodFilter === 'all' || item.method === methodFilter;
    return s && st && m;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tender Management</h1>
          <p className="text-sm text-slate-500 mt-1">Stages 6–7: Prepare, publish and manage tenders with full lifecycle tracking</p>
        </div>
        <div className="flex items-center space-x-3">
          <ExportButton data={filtered} columns={[
            { key: 'tenderNumber', label: 'Tender #' }, { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' },
            { key: 'method', label: 'Method' }, { key: 'estimatedValue', label: 'Est. Value' }, { key: 'status', label: 'Status' },
          ]} filename="tenders" />
          <Link to="/tenders/new" className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">
            <FaPlus size={11} /> <span>New Tender</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-3 text-slate-400" size={13} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search tenders..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
        </div>
        <div className="flex items-center space-x-2">
          <FaFilter className="text-slate-400" size={12} />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
            {METHOD_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
            <span className="text-sm text-slate-500">Loading tenders...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-5 py-3 font-semibold text-slate-600">Tender #</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Title</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-right">Est. Value</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Method</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Closing</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-center">Bids</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(t => (
                    <tr key={t._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{t.tenderNumber}</td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <Link to={`/tenders/${t._id}`} className="font-medium text-slate-800 truncate block hover:text-emerald-600 transition-colors">{t.title}</Link>
                        <p className="text-xs text-slate-400">{t.category} • {t.officer}</p>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 text-right">{(t.estimatedValue || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.method === 'ICB' ? 'bg-purple-100 text-purple-700' : t.method === 'Shopping' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{t.method}</span>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3.5">
                        <div>
                          {t.closingDate && <p className="text-xs text-slate-600">{new Date(t.closingDate).toLocaleDateString()}</p>}
                          <ClosingCountdown date={t.closingDate} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${t.bidsReceived > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {t.bidsReceived}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Link to={`/tenders/${t._id}`} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View">
                            <FaEye size={12} />
                          </Link>
                          {t.status === 'draft' && (
                            <button onClick={() => setPublishTarget(t)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Publish">
                              <FaPaperPlane size={11} />
                            </button>
                          )}
                          {t.status !== 'cancelled' && t.status !== 'awarded' && t.status !== 'loa_issued' && (
                            <button onClick={() => handleDuplicate(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Duplicate">
                              <FaCopy size={11} />
                            </button>
                          )}
                          {t.status === 'published' && (
                            <button onClick={() => setCancelTarget(t)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                              <FaTimesCircle size={11} />
                            </button>
                          )}
                          {t.status === 'draft' && (
                            <button onClick={() => setDeleteTarget(t)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <FaTrash size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">No tenders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2 border-t border-slate-100">
              <Pagination currentPage={page} totalPages={totalPages} totalItems={totalItems} itemsPerPage={perPage} onPageChange={setPage} onItemsPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
            </div>
          </>
        )}
      </div>

      {/* Delete Modal */}
      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Tender" message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />

      {/* Cancel Modal */}
      <ConfirmModal isOpen={!!cancelTarget} onClose={() => { setCancelTarget(null); setCancelReason(''); }} onConfirm={handleCancel} title="Cancel Tender" confirmText="Cancel Tender" variant="danger">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Cancel tender <span className="font-bold">{cancelTarget?.tenderNumber}</span>?</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for cancellation *</label>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2} placeholder="Provide a reason..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none" />
          </div>
        </div>
      </ConfirmModal>

      {/* Publish Modal */}
      <ConfirmModal isOpen={!!publishTarget} onClose={() => setPublishTarget(null)} onConfirm={handlePublish} title="Publish Tender" confirmText="Publish Now" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Publish tender <span className="font-bold">{publishTarget?.tenderNumber} — {publishTarget?.title}</span>?</p>
          <p className="text-xs text-slate-500">This will make the tender visible to all registered suppliers on the e-GP portal and university website.</p>
        </div>
      </ConfirmModal>
    </div>
  );
}
