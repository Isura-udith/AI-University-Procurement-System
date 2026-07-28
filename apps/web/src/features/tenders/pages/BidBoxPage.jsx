import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaBoxOpen, FaLock, FaClock, FaUpload, FaFileAlt, FaTimes, FaCheckCircle,
  FaShieldAlt, FaSpinner, FaPlus, FaTrash, FaBan, FaChevronDown, FaChevronUp,
  FaHistory, FaTrophy, FaExclamationTriangle, FaSearch,
  FaClipboardList, FaThumbsUp, FaThumbsDown, FaInfoCircle, FaUnlock, FaEye
} from 'react-icons/fa';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import { useSelector } from 'react-redux';

/* ─── Countdown Timer ─── */
const calcTimeLeft = (deadline) => {
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return { expired: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
};

function CountdownTimer({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(deadline));
  useEffect(() => {
    const iv = setInterval(() => setTimeLeft(calcTimeLeft(deadline)), 1000);
    return () => clearInterval(iv);
  }, [deadline]);
  if (timeLeft.expired) return <span className="text-xs font-bold text-red-600 animate-pulse bg-red-50 px-2 py-0.5 rounded border border-red-200">CLOSED</span>;
  const urgent = timeLeft.days === 0 && timeLeft.hours < 6;
  return (
    <div className="flex items-center space-x-1">
      {[
        { val: timeLeft.days, label: 'd' },
        { val: timeLeft.hours, label: 'h' },
        { val: timeLeft.minutes, label: 'm' },
        { val: timeLeft.seconds, label: 's' },
      ].map((u, i) => (
        <div key={i} className="flex items-center">
          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded min-w-7 text-center ${urgent ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-white'}`}>
            {String(u.val || 0).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-slate-400 ml-0.5 mr-1 font-semibold">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const map = {
    published:  { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',  label: '🔓 Accepting Bids' },
    bidding:    { cls: 'bg-blue-100 text-blue-800 border-blue-200',         label: '🔵 Active Bidding' },
    bid_closed: { cls: 'bg-orange-100 text-orange-800 border-orange-200',   label: '🔒 Bidding Closed' },
    opening:    { cls: 'bg-purple-100 text-purple-800 border-purple-200',   label: '📂 Opening Phase' },
    evaluation: { cls: 'bg-indigo-100 text-indigo-800 border-indigo-200',   label: '📊 Under Evaluation' },
    awarded:    { cls: 'bg-amber-100 text-amber-800 border-amber-200',       label: '🏆 Awarded' },
  };
  const { cls, label } = map[status] || { cls: 'bg-slate-100 text-slate-700 border-slate-200', label: status };
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${cls}`}>{label}</span>;
}

/* ─── Bid Status Chip ─── */
function BidStatusChip({ status }) {
  const map = {
    submitted:             { cls: 'bg-blue-100 text-blue-800 border-blue-200',        icon: '🔒', label: 'Sealed & Submitted' },
    opened:                { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '🔓', label: 'Opened' },
    preliminary_exam:      { cls: 'bg-sky-100 text-sky-800 border-sky-200',           icon: '🔍', label: 'Preliminary Exam' },
    technically_evaluated: { cls: 'bg-violet-100 text-violet-800 border-violet-200',  icon: '📊', label: 'Tech Evaluated' },
    financially_evaluated: { cls: 'bg-indigo-100 text-indigo-800 border-indigo-200',  icon: '💰', label: 'Fin. Evaluated' },
    substantially_responsive: { cls: 'bg-teal-100 text-teal-800 border-teal-200',    icon: '✅', label: 'Responsive' },
    non_responsive:        { cls: 'bg-orange-100 text-orange-800 border-orange-200',  icon: '⚠️', label: 'Non-Responsive' },
    awarded:               { cls: 'bg-amber-100 text-amber-800 border-amber-200',     icon: '🏆', label: 'Awarded' },
    rejected:              { cls: 'bg-red-100 text-red-800 border-red-200',           icon: '❌', label: 'Rejected' },
    withdrawn:             { cls: 'bg-slate-100 text-slate-600 border-slate-200',     icon: '↩️', label: 'Withdrawn' },
  };
  const { cls, icon, label } = map[status] || { cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: '●', label: status };
  return (
    <span className={`inline-flex items-center space-x-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      <span>{icon}</span><span>{label}</span>
    </span>
  );
}

/* ─── Decrypted Bids View Modal (For Procurement / Officers / TEC) ─── */
function DecryptedBidsModal({ tender, onClose }) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingBox, setOpeningBox] = useState(false);
  const [expandedBidId, setExpandedBidId] = useState(null);

  const fetchBids = useCallback(async () => {
    if (!tender?._id) return;
    try {
      const res = await tenderService.getBids(tender._id);
      const list = Array.isArray(res.data || res) ? (res.data || res) : [];
      setBids(list);
    } catch (err) {
      console.error('Failed to load bids for tender:', err);
      toast.error('Failed to fetch decrypted bids.');
    } finally {
      setLoading(false);
    }
  }, [tender]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchBids();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchBids]);

  const handleOpenBidBox = async () => {
    setOpeningBox(true);
    try {
      await tenderService.openBidBox(tender._id);
      toast.success('Bid Box unsealed & decrypted successfully!');
      setLoading(true);
      fetchBids();
    } catch (err) {
      toast.error(err.message || 'Failed to open bid box.');
    } finally {
      setOpeningBox(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <FaUnlock size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">Bid Box Vault &amp; Decrypted Submissions</h3>
                <StatusBadge status={tender.status} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{tender.tenderNumber} — {tender.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors">
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Status & Unseal Action bar */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FaShieldAlt className="text-emerald-400 text-2xl shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">AES-256 Digital Vault</p>
                <p className="text-sm font-medium text-slate-200">
                  {bids.length} Total Submissions Recorded · {bids.filter(b => b.status !== 'submitted').length} Unsealed
                </p>
              </div>
            </div>
            {['bid_closed', 'opening'].includes(tender.status) && (
              <button
                onClick={handleOpenBidBox}
                disabled={openingBox}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg transition-colors disabled:opacity-50 shrink-0"
              >
                {openingBox ? <FaSpinner className="animate-spin" size={14} /> : <FaUnlock size={14} />}
                <span>{openingBox ? 'Decrypting Vault...' : 'Official Bid Box Unsealing'}</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
              <span className="text-sm text-slate-500">Decrypting &amp; retrieving bids...</span>
            </div>
          ) : bids.length === 0 ? (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-10 text-center">
              <FaBoxOpen className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-sm font-semibold text-slate-600">No bids submitted for this tender</p>
              <p className="text-xs text-slate-400 mt-1">No vendor submissions were received before the closing deadline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Submitted Bids ({bids.length})</h4>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {bids.map((bid, idx) => {
                  const isExpanded = expandedBidId === bid._id;
                  const supplierName = bid.supplierId?.companyName || bid.supplierId?.name || `Bidder #${idx + 1}`;
                  return (
                    <div key={bid._id} className="p-4 hover:bg-slate-50/80 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-slate-900">{supplierName}</span>
                              <span className="text-[10px] font-mono text-slate-400">({bid.bidNumber || 'NO-NUM'})</span>
                              <BidStatusChip status={bid.status} />
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                              <span>Submitted: {new Date(bid.submittedAt || bid.createdAt).toLocaleString('en-LK')}</span>
                              {bid.encryptionHash && (
                                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-50" title={bid.encryptionHash}>
                                  SHA: {bid.encryptionHash.substring(0, 16)}…
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Bid Amount</span>
                            <span className="text-base font-extrabold text-slate-900">
                              LKR {(bid.totalBidAmount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <button
                            onClick={() => setExpandedBidId(isExpanded ? null : bid._id)}
                            className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors flex items-center space-x-1"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded bid details for officer */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 text-xs bg-slate-50/70 rounded-xl p-4">
                          {/* Bid Security info */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                            <span className="font-semibold text-slate-700">Bid Security Instrument:</span>
                            {bid.bidSecurityDocument ? (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                                <FaCheckCircle size={10} />
                                <span>Attached ({bid.bidSecurityType?.replace(/_/g, ' ') || 'Security'})</span>
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Not Attached / Not Required
                              </span>
                            )}
                          </div>

                          {/* Line items BOQ */}
                          {bid.lineItems && bid.lineItems.length > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                              <h5 className="font-bold text-slate-800">Bill of Quantities (BoQ)</h5>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b text-slate-400 font-semibold">
                                    <th className="pb-1">Item Description</th>
                                    <th className="pb-1 text-center w-16">Qty</th>
                                    <th className="pb-1 text-right w-24">Unit Price</th>
                                    <th className="pb-1 text-right w-24">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {bid.lineItems.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="py-1">{item.itemDescription}</td>
                                      <td className="py-1 text-center text-slate-600">{item.quantity} {item.unit}</td>
                                      <td className="py-1 text-right font-mono">{(item.unitPrice || 0).toLocaleString()}</td>
                                      <td className="py-1 text-right font-mono font-bold">{(item.totalPrice || 0).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Specification Compliance */}
                          {bid.specificationVotes && bid.specificationVotes.length > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                              <h5 className="font-bold text-slate-800">Technical Specification Compliance</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {bid.specificationVotes.map((sv, idx) => (
                                  <div key={idx} className={`p-2 rounded border text-[11px] flex items-center justify-between ${
                                    sv.vote === 'yes' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                                  }`}>
                                    <span className="font-semibold text-slate-800 truncate mr-2">#{sv.specNumber} {sv.specTitle}</span>
                                    <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                                      sv.vote === 'yes' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                    }`}>
                                      {sv.vote === 'yes' ? 'Comply' : 'Non-Comply'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Documents list */}
                          {bid.documents && bid.documents.length > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                              <h5 className="font-bold text-slate-800 mb-1.5">Submitted Documents ({bid.documents.length})</h5>
                              <div className="flex flex-wrap gap-2">
                                {bid.documents.map((doc, idx) => (
                                  <span key={idx} className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 rounded text-slate-700 text-xs font-medium border border-slate-200">
                                    <FaFileAlt size={10} className="text-slate-400" />
                                    <span>{doc.name}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl hover:bg-slate-700 transition-colors">
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── My Bids Section (Supplier view) ─── */
function MyBidsSection({ refreshKey }) {
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawConfirm, setWithdrawConfirm] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedBidId, setExpandedBidId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await tenderService.getMyBids();
      const bids = Array.isArray(res.data || res) ? (res.data || res) : [];
      setMyBids(bids);
    } catch (err) {
      console.error('Failed to load my bids:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey]);

  const handleWithdraw = async () => {
    if (!withdrawConfirm) return;
    setWithdrawing(true);
    try {
      await tenderService.withdrawBid(withdrawConfirm.tenderId?._id, withdrawConfirm._id);
      toast.warning('Bid withdrawn successfully.');
      setWithdrawConfirm(null);
      setLoading(true);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to withdraw bid.');
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredBids = myBids.filter(bid => {
    const tender = bid.tenderId;
    const matchesSearch = !searchQuery.trim() ||
      (tender?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tender?.tenderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bid.bidNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || bid.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
        <span className="text-sm text-slate-500 font-medium">Loading your submitted bids...</span>
      </div>
    );
  }

  if (myBids.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FaHistory className="text-slate-400" size={24} />
        </div>
        <p className="text-base font-bold text-slate-700">No bids submitted yet</p>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Your submitted bids will appear here with encrypted proof hashes. Switch to the Active Tenders tab to participate in open bids.
        </p>
      </div>
    );
  }

  const statsData = [
    { label: 'Total Bids', value: myBids.length, color: 'bg-slate-50 border-slate-200 text-slate-700' },
    {
      label: 'Active Submissions',
      value: myBids.filter(b => ['submitted','opened','preliminary_exam','technically_evaluated','financially_evaluated','substantially_responsive'].includes(b.status)).length,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
    },
    { label: 'Awarded', value: myBids.filter(b => b.status === 'awarded').length, color: 'bg-amber-50 border-amber-200 text-amber-800' },
    { label: 'Withdrawn', value: myBids.filter(b => b.status === 'withdrawn').length, color: 'bg-slate-50 border-slate-200 text-slate-500' },
  ];

  return (
    <>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statsData.map(s => (
          <div key={s.label} className={`rounded-xl border p-4 shadow-xs ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-semibold opacity-80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by tender title, tender #, or bid #..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <FaTimes size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs"
          >
            <option value="all">All Bid Statuses</option>
            <option value="submitted">Sealed &amp; Submitted</option>
            <option value="opened">Opened</option>
            <option value="technically_evaluated">Tech Evaluated</option>
            <option value="awarded">Awarded</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Bid cards */}
      {filteredBids.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No bids match your search criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBids.map(bid => {
            const tender = bid.tenderId;
            const isWithdrawn = bid.status === 'withdrawn';
            const isExpanded = expandedBidId === bid._id;
            const canWithdraw = ['submitted'].includes(bid.status) &&
              tender?.status && ['published', 'bidding'].includes(tender.status);

            return (
              <div key={bid._id} className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all ${isWithdrawn ? 'opacity-70 border-slate-200' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start space-x-4 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      bid.status === 'awarded' ? 'bg-amber-100 text-amber-600' :
                      bid.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      bid.status === 'withdrawn' ? 'bg-slate-100 text-slate-400' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {bid.status === 'awarded' ? <FaTrophy size={18} /> :
                       bid.status === 'rejected' ? <FaExclamationTriangle size={18} /> :
                       bid.status === 'withdrawn' ? <FaBan size={18} /> :
                       <FaLock size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-mono text-slate-400">
                        {tender?.tenderNumber || '—'} · <span className="font-semibold text-slate-500">{bid.bidNumber || '—'}</span>
                      </p>
                      <h4 className="text-base font-bold text-slate-900 truncate mt-0.5">{tender?.title || 'Unknown Tender'}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <BidStatusChip status={bid.status} />
                        {tender?.category && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100 font-semibold">{tender.category}</span>
                        )}
                        {bid.encryptionHash && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-mono flex items-center space-x-1 border border-slate-200">
                            <FaShieldAlt size={9} className="text-emerald-600" />
                            <span>SHA-256 Sealed</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Bid Amount</p>
                      <p className="text-base font-black text-slate-900">
                        LKR {(bid.totalBidAmount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {bid.submittedAt ? new Date(bid.submittedAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>

                    <button
                      onClick={() => setExpandedBidId(isExpanded ? null : bid._id)}
                      className="px-3 py-2 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors flex items-center space-x-1.5"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                      {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                    </button>

                    {canWithdraw && (
                      <button
                        onClick={() => setWithdrawConfirm(bid)}
                        className="px-3 py-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl font-semibold transition-colors border border-red-200 flex items-center space-x-1 whitespace-nowrap"
                      >
                        <FaBan size={10} /><span>Withdraw</span>
                      </button>
                    )}
                  </div>
                </div>

                {bid.bidSecurityDocument && (
                  <div className="px-5 py-2 bg-amber-50/80 border-t border-amber-100 flex items-center space-x-2 text-[11px] text-amber-800 font-medium">
                    <FaShieldAlt size={10} className="text-amber-600" />
                    <span>
                      Bid Security Instrument Attached — {bid.bidSecurityType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Document'}
                    </span>
                  </div>
                )}

                {/* Expanded details section */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-5 space-y-4 text-xs text-slate-700">
                    {/* Security Hash & Integrity */}
                    {bid.encryptionHash && (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px]">
                        <div className="flex items-center space-x-2 text-slate-600 min-w-0">
                          <FaLock size={12} className="text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-700">Hash:</span>
                          <span className="text-slate-500 text-[10px] truncate">{bid.encryptionHash}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-sans font-bold w-fit">AES-256 Sealed</span>
                      </div>
                    )}

                    {/* BoQ Line Items */}
                    {bid.lineItems && bid.lineItems.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h5 className="font-bold text-slate-900 text-xs mb-2.5">Bill of Quantities (BoQ Line Items)</h5>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                              <th className="pb-2">Description</th>
                              <th className="pb-2 w-16 text-center">Qty</th>
                              <th className="pb-2 w-16 text-center">Unit</th>
                              <th className="pb-2 w-28 text-right">Unit Price (LKR)</th>
                              <th className="pb-2 w-28 text-right">Total Price (LKR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bid.lineItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-2 font-medium text-slate-800">{item.itemDescription}</td>
                                <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                                <td className="py-2 text-center text-slate-500">{item.unit}</td>
                                <td className="py-2 text-right font-mono">{(item.unitPrice || 0).toLocaleString('en-LK')}</td>
                                <td className="py-2 text-right font-mono font-bold text-slate-900">{(item.totalPrice || 0).toLocaleString('en-LK')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(bid.vatAmount > 0 || bid.discountOffered > 0) && (
                          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end space-x-6 text-[11px]">
                            {bid.vatAmount > 0 && <span>VAT: <strong>LKR {bid.vatAmount.toLocaleString()}</strong></span>}
                            {bid.discountOffered > 0 && <span className="text-emerald-700">Discount: <strong>-LKR {bid.discountOffered.toLocaleString()}</strong></span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Technical Specification Compliance */}
                    {bid.specificationVotes && bid.specificationVotes.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                        <h5 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                          <FaClipboardList className="text-blue-600" size={13} />
                          <span>Technical Specification Compliance</span>
                        </h5>
                        <div className="space-y-1.5">
                          {bid.specificationVotes.map((sv, idx) => (
                            <div key={idx} className="flex items-start justify-between bg-slate-50 p-2.5 rounded-lg text-[11px] border border-slate-100">
                              <div className="flex items-start space-x-2">
                                <span className="font-bold text-slate-500">#{sv.specNumber}</span>
                                <div>
                                  <p className="font-semibold text-slate-800">{sv.specTitle}</p>
                                  {sv.vote === 'no' && sv.reason && (
                                    <p className="text-red-600 mt-0.5 font-medium">Reason: {sv.reason}</p>
                                  )}
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                sv.vote === 'yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {sv.vote === 'yes' ? 'Comply' : 'Non-Comply'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technical Proposal */}
                    {bid.technicalProposal && (bid.technicalProposal.methodology || bid.technicalProposal.timeline || bid.technicalProposal.experience) && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                        <h5 className="font-bold text-slate-900 text-xs">Technical Proposal Details</h5>
                        {bid.technicalProposal.methodology && (
                          <div>
                            <span className="font-semibold text-slate-600 block text-[11px]">Methodology:</span>
                            <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{bid.technicalProposal.methodology}</p>
                          </div>
                        )}
                        {bid.technicalProposal.timeline && (
                          <div>
                            <span className="font-semibold text-slate-600 block text-[11px]">Timeline:</span>
                            <p className="text-slate-700 text-[11px] mt-0.5">{bid.technicalProposal.timeline}</p>
                          </div>
                        )}
                        {bid.technicalProposal.experience && (
                          <div>
                            <span className="font-semibold text-slate-600 block text-[11px]">Relevant Experience:</span>
                            <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{bid.technicalProposal.experience}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submitted Documents */}
                    {bid.documents && bid.documents.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h5 className="font-bold text-slate-900 text-xs mb-2">Submitted Bid Documents</h5>
                        <div className="flex flex-wrap gap-2">
                          {bid.documents.map((doc, idx) => (
                            <span key={idx} className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-200">
                              <FaFileAlt className="text-slate-400" size={11} />
                              <span>{doc.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Withdraw confirm modal */}
      <ConfirmModal
        isOpen={!!withdrawConfirm}
        onClose={() => !withdrawing && setWithdrawConfirm(null)}
        onConfirm={handleWithdraw}
        title="Withdraw Bid"
        confirmText={withdrawing ? 'Withdrawing…' : 'Withdraw Bid'}
        variant="danger"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Withdraw your bid for <span className="font-bold">{withdrawConfirm?.tenderId?.title || 'this tender'}</span>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            This action is <strong>irreversible</strong> and permanently logged. You cannot re-submit after withdrawing.
          </div>
        </div>
      </ConfirmModal>
    </>
  );
}

/* ─── Main Component ─── */
export default function BidBoxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector(s => s.auth);
  const role = user?.role || '';
  const isProcurement = ['procurement_officer', 'admin', 'super_admin', 'tec_member', 'pc_member'].includes(role);
  const isSupplier = role === 'supplier';

  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tenders'); // 'tenders' | 'my-bids' | 'accepting' | 'pending-opening' | 'opened'
  const [submitModal, setSubmitModal] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const [decryptedModalTender, setDecryptedModalTender] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [myBidsRefreshKey, setMyBidsRefreshKey] = useState(0);

  // Search & Filter controls
  const [tenderSearchQuery, setTenderSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('closing_soon');

  // Bid form state
  const [bidAmount, setBidAmount] = useState('');
  const [lineItems, setLineItems] = useState([{ itemDescription: '', quantity: 1, unit: 'units', unitPrice: '' }]);
  const [vatAmount, setVatAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [methodology, setMethodology] = useState('');
  const [timeline, setTimeline] = useState('');
  const [experience, setExperience] = useState('');
  const [bidFiles, setBidFiles] = useState([]);
  const [securityFile, setSecurityFile] = useState(null);
  const [securityType, setSecurityType] = useState('bank_guarantee');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [useLineItems, setUseLineItems] = useState(false);

  // Specification voting state
  const [tenderSpecs, setTenderSpecs] = useState([]);
  const [specVotes, setSpecVotes] = useState([]);
  const [specsLoading, setSpecsLoading] = useState(false);

  const resetForm = useCallback(() => {
    setBidAmount('');
    setLineItems([{ itemDescription: '', quantity: 1, unit: 'units', unitPrice: '' }]);
    setVatAmount(''); setDiscount(''); setMethodology(''); setTimeline(''); setExperience('');
    setBidFiles([]); setSecurityFile(null); setSecurityType('bank_guarantee');
    setTermsAccepted(false); setShowTechnical(false); setUseLineItems(false);
    setTenderSpecs([]); setSpecVotes([]);
  }, []);

  // Load technical specifications when submit modal opens
  const openSubmitModal = useCallback(async (tender) => {
    resetForm();
    setSubmitModal(tender);
    setSpecsLoading(true);
    try {
      const res = await tenderService.getById(tender._id);
      const tenderDetail = res.data?.data || res.data || res;
      const procurement = tenderDetail.procurementId;
      const specs = procurement?.technicalSpecifications || [];
      setTenderSpecs(specs);
      setSpecVotes(specs.map(s => ({
        specNumber: s.specNumber,
        specTitle: s.title,
        vote: '',
        reason: '',
      })));
    } catch (err) {
      console.error('Failed to load tender specs:', err);
      setTenderSpecs([]);
      setSpecVotes([]);
    } finally {
      setSpecsLoading(false);
    }
  }, [resetForm]);

  const lineItemsTotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  }, 0);
  const computedTotal = useLineItems
    ? lineItemsTotal + (parseFloat(vatAmount) || 0) - (parseFloat(discount) || 0)
    : parseFloat(bidAmount) || 0;

  const urlParamHandled = useRef(false);

  const loadTenders = useCallback(async () => {
    try {
      const res = await tenderService.getAll();
      const items = res.data || res || [];
      const mapped = (Array.isArray(items) ? items : []).map(t => ({
        ...t,
        deadline: t.bidSubmissionDeadline || t.deadline,
        tce: t.estimatedValue || t.tce,
      }));
      setTenders(mapped);

      if (!urlParamHandled.current) {
        urlParamHandled.current = true;
        const targetId = searchParams.get('tenderId') || searchParams.get('tender');
        if (targetId) {
          const target = mapped.find(t => t._id === targetId);
          if (target && new Date(target.deadline) > new Date()) {
            openSubmitModal(target);
            const next = new URLSearchParams(searchParams);
            next.delete('tenderId'); next.delete('tender');
            setSearchParams(next, { replace: true });
          }
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load active tenders.');
      setTenders([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams, setSearchParams, openSubmitModal]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await loadTenders(); })();
    return () => { cancelled = true; };
  }, [loadTenders]);

  const handleSubmitBid = async () => {
    if (!termsAccepted) { toast.error('Please accept the terms and conditions.'); return; }

    if (useLineItems) {
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        if (!item.itemDescription?.trim()) { toast.error(`Line item ${i + 1}: description is required.`); return; }
        if (!parseFloat(item.quantity) || parseFloat(item.quantity) <= 0) { toast.error(`Line item ${i + 1}: quantity must be > 0.`); return; }
        if (!parseFloat(item.unitPrice) || parseFloat(item.unitPrice) <= 0) { toast.error(`Line item ${i + 1}: unit price must be > 0.`); return; }
      }
      if (computedTotal <= 0) { toast.error('Grand total must be greater than zero.'); return; }
    } else {
      if (!bidAmount || isNaN(parseFloat(bidAmount)) || parseFloat(bidAmount) <= 0) {
        toast.error('Please enter a valid bid amount greater than zero.'); return;
      }
    }

    if (bidFiles.length === 0) { toast.error('Please upload at least one bid document.'); return; }
    if (submitModal?.bidSecurityRequired && !securityFile) { toast.error('Bid security document is required.'); return; }

    // Validate specification votes
    if (tenderSpecs.length > 0) {
      const mandatorySpecs = tenderSpecs.filter(s => s.isMandatory);
      for (const ms of mandatorySpecs) {
        const vote = specVotes.find(v => v.specNumber === ms.specNumber);
        if (!vote || !vote.vote) {
          toast.error(`Please vote on mandatory specification #${ms.specNumber}: "${ms.title}"`);
          return;
        }
      }
      for (const v of specVotes) {
        if (v.vote === 'no' && (!v.reason || !v.reason.trim())) {
          toast.error(`Specification #${v.specNumber} "${v.specTitle}": please provide a reason for voting No.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const bidData = {
        totalBidAmount: computedTotal,
        vatAmount: parseFloat(vatAmount) || 0,
        discountOffered: parseFloat(discount) || 0,
        lineItems: useLineItems ? lineItems.map(item => ({
          itemDescription: item.itemDescription.trim(),
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit || 'units',
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
        })) : [],
        technicalProposal: { methodology: methodology || '', timeline: timeline || '', experience: experience || '' },
        documents: bidFiles.map(f => ({ name: f.name, url: 'uploads/' + f.name, type: f.name.split('.').pop() })),
        bidSecurityDocument: securityFile ? securityFile.name : undefined,
        bidSecurityAmount: submitModal.bidSecurityAmount || 0,
        bidSecurityType: securityType,
        bidSecurityExpiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        bidSecurityValid: !!securityFile,
        currency: 'LKR',
        specificationVotes: specVotes.filter(v => v.vote).map(v => ({
          specNumber: v.specNumber,
          specTitle: v.specTitle,
          vote: v.vote,
          reason: v.vote === 'no' ? v.reason.trim() : '',
        })),
      };

      await tenderService.submitBid(submitModal._id, bidData);
      toast.success(`Bid submitted for "${submitModal.title}". Now encrypted and sealed.`);
      setSubmitModal(null);
      resetForm();
      setLoading(true);
      loadTenders();
      setMyBidsRefreshKey(k => k + 1);
      if (isSupplier) setActiveTab('my-bids');
    } catch (err) {
      toast.error(err.message || 'Failed to submit bid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      const bidsRes = await tenderService.getBids(withdrawModal._id);
      const bids = Array.isArray(bidsRes.data || bidsRes) ? (bidsRes.data || bidsRes) : [];
      const myBid = bids.find(b => b.status !== 'withdrawn');
      if (myBid) {
        await tenderService.withdrawBid(withdrawModal._id, myBid._id);
        toast.warning(`Bid withdrawn from "${withdrawModal.title}".`);
        setLoading(true);
        loadTenders();
        setMyBidsRefreshKey(k => k + 1);
      } else {
        toast.error('No active submitted bid found to withdraw.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to withdraw bid.');
    } finally {
      setWithdrawModal(null);
    }
  };

  const handleCloseBidding = async () => {
    try {
      await tenderService.closeBidding(closeModal._id);
      toast.success(`Bidding closed for "${closeModal.title}". Bid box is now sealed.`);
      setLoading(true);
      loadTenders();
    } catch (err) {
      toast.error(err.message || 'Failed to close bidding.');
    } finally {
      setCloseModal(null);
    }
  };

  const addLineItem = () => setLineItems(prev => [...prev, { itemDescription: '', quantity: 1, unit: 'units', unitPrice: '' }]);
  const removeLineItem = (i) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLineItem = (i, field, val) => setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  // Filter & Sort tenders
  const processedTenders = useMemo(() => {
    return tenders.filter(t => {
      // Tab filter
      if (isProcurement) {
        if (activeTab === 'accepting' && !['published', 'bidding'].includes(t.status)) return false;
        if (activeTab === 'pending-opening' && t.status !== 'bid_closed') return false;
        if (activeTab === 'opened' && !['opening', 'evaluation', 'awarded'].includes(t.status)) return false;
      }

      // Search query
      const matchesSearch = !tenderSearchQuery.trim() ||
        (t.title || '').toLowerCase().includes(tenderSearchQuery.toLowerCase()) ||
        (t.tenderNumber || '').toLowerCase().includes(tenderSearchQuery.toLowerCase());

      // Category filter
      const matchesCat = categoryFilter === 'all' || t.category === categoryFilter;

      // Status filter dropdown
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    }).sort((a, b) => {
      if (sortOption === 'closing_soon') {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      if (sortOption === 'most_bids') {
        return (b.bidsReceived || 0) - (a.bidsReceived || 0);
      }
      if (sortOption === 'highest_value') {
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      }
      if (sortOption === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });
  }, [tenders, activeTab, isProcurement, tenderSearchQuery, categoryFilter, statusFilter, sortOption]);

  // Overall KPI stats
  const kpiStats = useMemo(() => {
    const totalActiveBoxes = tenders.filter(t => ['published', 'bidding'].includes(t.status)).length;
    const totalBidsCount = tenders.reduce((acc, t) => acc + (t.bidsReceived || 0), 0);
    const closingSoonCount = tenders.filter(t => {
      const diff = new Date(t.deadline) - new Date();
      return diff > 0 && diff < 172800000; // < 48h
    }).length;
    const pendingOpeningCount = tenders.filter(t => t.status === 'bid_closed').length;
    return { totalActiveBoxes, totalBidsCount, closingSoonCount, pendingOpeningCount };
  }, [tenders]);

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">  
          <FaFileAlt size={160} /> 
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4"> 
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Digital Bid Box</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Bid Boxes</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{kpiStats.totalActiveBoxes}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Accepting vendor bids</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <FaBoxOpen size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Sealed Bids Recorded</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{kpiStats.totalBidsCount}</p>
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Encrypted in vault</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <FaLock size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Closing Soon (&lt; 48h)</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{kpiStats.closingSoonCount}</p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Imminent deadline</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
            <FaClock size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Pending Opening</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{kpiStats.pendingOpeningCount}</p>
            <p className="text-[10px] text-purple-600 font-semibold mt-0.5">Ready for TEC/PC ceremony</p>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
            <FaUnlock size={18} />
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {isSupplier ? (
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'tenders', label: 'Active Tenders for Bidding', icon: <FaSearch size={12} /> },
              { id: 'my-bids', label: 'My Submitted Bids', icon: <FaHistory size={12} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon}<span>{tab.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap space-x-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'tenders', label: 'All Bid Boxes' },
              { id: 'accepting', label: 'Accepting Bids' },
              { id: 'pending-opening', label: 'Pending Opening' },
              { id: 'opened', label: 'Opened & Under Evaluation' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{processedTenders.length}</span> tenders
        </div>
      </div>

      {/* ── Active Tenders View ── */}
      {(!isSupplier || activeTab === 'tenders') && (
        <>
          {/* Active Tenders Toolbar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                value={tenderSearchQuery}
                onChange={e => setTenderSearchQuery(e.target.value)}
                placeholder="Search tenders by title, tender #, or department..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
              />
              {tenderSearchQuery && (
                <button onClick={() => setTenderSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <FaTimes size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(tenders.map(t => t.category).filter(Boolean))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs"
              >
                <option value="all">All Statuses</option>
                <option value="published">Accepting Bids</option>
                <option value="bidding">Active Bidding</option>
                <option value="bid_closed">Bidding Closed</option>
                <option value="opening">Opening Phase</option>
                <option value="evaluation">Under Evaluation</option>
                <option value="awarded">Awarded</option>
              </select>

              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs"
              >
                <option value="closing_soon">Closing Soonest</option>
                <option value="most_bids">Most Bids Received</option>
                <option value="newest">Newest Tenders</option>
                <option value="highest_value">Highest Value</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSpinner className="animate-spin text-emerald-600 mr-2" size={20} />
              <span className="text-sm font-medium text-slate-500">Loading digital bid boxes...</span>
            </div>
          ) : processedTenders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <FaBoxOpen className="mx-auto text-slate-300 mb-3" size={36} />
              <p className="text-base font-bold text-slate-700">No active tenders found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No tender bid boxes match your selected search or filter criteria. Try adjusting your search query or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {processedTenders.map(t => {
                const deadline = new Date(t.deadline);
                const isOpen = deadline > new Date() && ['published', 'bidding'].includes(t.status);

                return (
                  <div key={t._id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 hover:shadow-md transition-all hover:border-slate-300">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start space-x-4 min-w-0">
                        <div className={`p-3.5 rounded-2xl shrink-0 ${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {isOpen ? <FaBoxOpen size={22} /> : <FaLock size={22} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono text-slate-400">{t.tenderNumber}</span>
                            <StatusBadge status={t.status} />
                            {t.category && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100 font-semibold">{t.category}</span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-900 truncate mt-1">{t.title}</h3>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
                            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                              <FaClock size={11} />
                              <span>{isOpen ? 'Closes:' : 'Closed:'}</span>
                            </div>
                            {isOpen && <CountdownTimer deadline={t.deadline} />}
                            {!isOpen && <span className="text-xs font-bold text-red-600">DEADLINE PASSED</span>}

                            <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full">
                              <FaFileAlt size={10} className="text-slate-400" />
                              <span>{t.bidsReceived || 0} sealed bids</span>
                            </div>

                            {t.bidSecurityRequired && (
                              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center space-x-1">
                                <FaShieldAlt size={9} />
                                <span>Security Required (LKR {(t.bidSecurityAmount || 0).toLocaleString()})</span>
                              </span>
                            )}

                            {t.estimatedValue && (
                              <span className="text-xs text-slate-500 font-medium">TCE: <strong>LKR {t.estimatedValue.toLocaleString()}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end">
                        {/* Supplier Actions */}
                        {isSupplier && isOpen && (
                          <button
                            onClick={() => openSubmitModal(t)}
                            className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 flex items-center space-x-2 transition-colors shadow-sm"
                          >
                            <FaUpload size={12} /><span>Submit Bid</span>
                          </button>
                        )}

                        {isSupplier && isOpen && (
                          <button
                            onClick={() => setWithdrawModal(t)}
                            className="px-3 py-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl font-semibold transition-colors border border-red-200"
                          >
                            Withdraw
                          </button>
                        )}

                        {/* Officer Actions */}
                        {isProcurement && ['published', 'bidding'].includes(t.status) && (
                          <button
                            onClick={() => setCloseModal(t)}
                            className="px-3.5 py-2 text-xs text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 rounded-xl font-semibold transition-colors border border-orange-200 flex items-center space-x-1.5"
                          >
                            <FaBan size={11} /><span>Close Bidding</span>
                          </button>
                        )}

                        {isProcurement && (
                          <button
                            onClick={() => setDecryptedModalTender(t)}
                            className="px-4 py-2 text-xs text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors flex items-center space-x-1.5 border border-slate-200"
                          >
                            <FaEye size={12} /><span>View Vault / Decrypted Bids</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── My Submitted Bids Tab ── */}
      {isSupplier && activeTab === 'my-bids' && (
        <MyBidsSection refreshKey={myBidsRefreshKey} />
      )}

      {/* ── Procurement Decrypted Bids Modal ── */}
      {decryptedModalTender && (
        <DecryptedBidsModal
          tender={decryptedModalTender}
          onClose={() => { setDecryptedModalTender(null); loadTenders(); }}
        />
      )}

      {/* ── Submit Bid Modal ── */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && setSubmitModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <FaUpload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Submit &amp; Seal Bid</h3>
                  <p className="text-xs text-slate-400 font-mono">{submitModal.tenderNumber} — {submitModal.title}</p>
                </div>
              </div>
              <button onClick={() => !submitting && setSubmitModal(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Tender Overview Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-700">
                <div><span className="font-semibold text-slate-400 block text-[10px] uppercase">Category</span> <span className="font-bold text-slate-900">{submitModal.category || '—'}</span></div>
                <div><span className="font-semibold text-slate-400 block text-[10px] uppercase">Method</span> <span className="font-bold text-slate-900">{submitModal.procurementMethod || '—'}</span></div>
                <div><span className="font-semibold text-slate-400 block text-[10px] uppercase">Est. Value</span> <span className="font-bold text-slate-900">LKR {(submitModal.estimatedValue || 0).toLocaleString()}</span></div>
                <div><span className="font-semibold text-slate-400 block text-[10px] uppercase">Security Req.</span> <span className="font-bold text-amber-700">{submitModal.bidSecurityRequired ? `LKR ${(submitModal.bidSecurityAmount || 0).toLocaleString()}` : 'None'}</span></div>
              </div>

              {/* Line items toggle */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Financial Pricing Structure</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Choose between entering a single Lump Sum Total or detailed BOQ Line Items.</p>
                </div>
                <label className="flex items-center space-x-3 cursor-pointer shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{useLineItems ? 'Detailed BOQ' : 'Lump Sum'}</span>
                  <div onClick={() => setUseLineItems(v => !v)} className={`relative w-11 h-6 rounded-full transition-colors ${useLineItems ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${useLineItems ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>

              {/* Pricing section */}
              {!useLineItems ? (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Total Bid Amount (LKR) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">LKR</span>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-12 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 shadow-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Bill of Quantities (BoQ Line Items)</label>
                    <button onClick={addLineItem} className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 font-bold">
                      <FaPlus size={10} /><span>Add Item</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                          <th className="py-2.5 px-3 font-semibold">Description *</th>
                          <th className="py-2.5 px-2 font-semibold w-16 text-center">Qty *</th>
                          <th className="py-2.5 px-2 font-semibold w-20">Unit</th>
                          <th className="py-2.5 px-2 font-semibold w-28 text-right">Unit Price *</th>
                          <th className="py-2.5 px-3 font-semibold w-28 text-right">Total (LKR)</th>
                          <th className="py-2.5 px-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lineItems.map((item, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3">
                              <input
                                value={item.itemDescription}
                                onChange={e => updateLineItem(i, 'itemDescription', e.target.value)}
                                placeholder="Item description"
                                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 ${!item.itemDescription.trim() ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={e => updateLineItem(i, 'quantity', e.target.value)}
                                min="1"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-400 font-semibold"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={item.unit}
                                onChange={e => updateLineItem(i, 'unit', e.target.value)}
                                className="w-full px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              >
                                {['units', 'nos', 'kg', 'L', 'm', 'm²', 'm³', 'set', 'lot', 'pcs', 'rolls'].map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={e => updateLineItem(i, 'unitPrice', e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {lineItems.length > 1 && (
                                <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600"><FaTrash size={10} /></button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">VAT / Other Taxes (LKR)</label>
                      <input
                        type="number"
                        value={vatAmount}
                        onChange={e => setVatAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Discount Offered (LKR)</label>
                      <input
                        type="number"
                        value={discount}
                        onChange={e => setDiscount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-900">Grand Total Financial Offer</span>
                    <span className="text-lg font-black text-emerald-700">LKR {computedTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Technical Proposal (Optional accordion) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTechnical(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <span>Technical Proposal Details (Methodology &amp; Timeline)</span>
                  {showTechnical ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                </button>
                {showTechnical && (
                  <div className="p-4 space-y-3 bg-white">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Implementation Methodology</label>
                      <textarea
                        value={methodology}
                        onChange={e => setMethodology(e.target.value)}
                        rows={3}
                        placeholder="Describe your approach, work plan, and methodology..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Project Timeline &amp; Delivery Schedule</label>
                      <input
                        value={timeline}
                        onChange={e => setTimeline(e.target.value)}
                        placeholder="e.g., Delivery within 30 calendar days from contract signing"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Relevant Track Record / Past Experience</label>
                      <textarea
                        value={experience}
                        onChange={e => setExperience(e.target.value)}
                        rows={2}
                        placeholder="Describe similar supply or work contracts completed in the last 3-5 years..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Specification Compliance Matrix */}
              {specsLoading ? (
                <div className="flex items-center justify-center py-6 border border-slate-200 rounded-xl">
                  <FaSpinner className="animate-spin text-emerald-500 mr-2" size={14} />
                  <span className="text-xs text-slate-500">Loading technical specifications...</span>
                </div>
              ) : tenderSpecs.length > 0 && (
                <div className="border border-blue-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FaClipboardList className="text-blue-600" size={14} />
                      <span className="text-xs font-bold text-blue-900">Technical Specification Compliance</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                        {tenderSpecs.length} Specs · {tenderSpecs.filter(s => s.isMandatory).length} Mandatory
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] font-semibold">
                      <span className="text-emerald-700">✓ {specVotes.filter(v => v.vote === 'yes').length} Comply</span>
                      <span className="text-red-600">✗ {specVotes.filter(v => v.vote === 'no').length} Non-Comply</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 max-h-72 overflow-y-auto bg-slate-50/40">
                    {tenderSpecs.map((spec, i) => {
                      const vote = specVotes.find(v => v.specNumber === spec.specNumber) || {};
                      return (
                        <div key={spec.specNumber || i} className={`border rounded-xl p-3 transition-colors ${
                          vote.vote === 'yes' ? 'border-emerald-200 bg-emerald-50/40'
                          : vote.vote === 'no' ? 'border-red-200 bg-red-50/40'
                          : 'border-slate-200 bg-white'
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                vote.vote === 'yes' ? 'bg-emerald-600 text-white'
                                : vote.vote === 'no' ? 'bg-red-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                              }`}>
                                {spec.specNumber || i + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-slate-800">{spec.title}</p>
                                  {spec.isMandatory && (
                                    <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">MANDATORY</span>
                                  )}
                                </div>
                                {spec.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{spec.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSpecVotes(prev => prev.map(v =>
                                    v.specNumber === spec.specNumber ? { ...v, vote: 'yes', reason: '' } : v
                                  ));
                                }}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  vote.vote === 'yes'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                <FaThumbsUp size={10} />
                                <span>Yes</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSpecVotes(prev => prev.map(v =>
                                    v.specNumber === spec.specNumber ? { ...v, vote: 'no' } : v
                                  ));
                                }}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  vote.vote === 'no'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                                }`}
                              >
                                <FaThumbsDown size={10} />
                                <span>No</span>
                              </button>
                            </div>
                          </div>

                          {vote.vote === 'no' && (
                            <div className="mt-2.5 ml-8">
                              <label className="block text-[10px] font-bold text-red-700 mb-1">Reason for Non-Compliance *</label>
                              <textarea
                                value={vote.reason || ''}
                                onChange={e => {
                                  setSpecVotes(prev => prev.map(v =>
                                    v.specNumber === spec.specNumber ? { ...v, reason: e.target.value } : v
                                  ));
                                }}
                                rows={2}
                                placeholder="Explain why you cannot meet this specification..."
                                className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-red-400 resize-none bg-white"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bid Documents */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Bid Documents &amp; Attachments *</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-emerald-500 transition-colors cursor-pointer relative bg-slate-50/50">
                  <input type="file" multiple accept=".pdf,.docx,.xlsx,.zip" onChange={e => setBidFiles(prev => [...prev, ...Array.from(e.target.files)])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FaUpload className="mx-auto text-slate-400 mb-1.5" size={20} />
                  <p className="text-xs text-slate-600 font-bold">Upload Technical &amp; Financial Proposals</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Drag &amp; drop files here or click to browse (PDF, DOCX, XLSX up to 50MB)</p>
                </div>
                {bidFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {bidFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-100 rounded-lg px-3 py-2">
                        <span className="flex items-center space-x-2 text-slate-700 font-medium">
                          <FaFileAlt className="text-slate-400" size={11} />
                          <span className="text-xs truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span>
                        </span>
                        <button onClick={() => setBidFiles(bidFiles.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 text-xs font-semibold ml-2">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bid Security */}
              {submitModal.bidSecurityRequired && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Bid Security Instrument * (LKR {(submitModal.bidSecurityAmount || 0).toLocaleString()})
                  </label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {['bank_guarantee', 'insurance_bond', 'certified_cheque', 'demand_draft'].map(type => (
                      <label key={type} className={`flex items-center space-x-1.5 text-xs cursor-pointer px-3 py-1.5 rounded-lg border transition-colors ${securityType === type ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200 text-slate-600'}`}>
                        <input type="radio" name="secType" value={type} checked={securityType === type} onChange={() => setSecurityType(type)} className="sr-only" />
                        <span>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-2 border-dashed border-amber-300 rounded-xl p-4 text-center hover:border-amber-400 transition-colors cursor-pointer relative bg-amber-50/40">
                    <input type="file" accept=".pdf" onChange={e => setSecurityFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {securityFile ? (
                      <div className="flex items-center justify-center space-x-2">
                        <FaCheckCircle className="text-emerald-600" size={14} />
                        <span className="text-xs font-bold text-slate-800">{securityFile.name}</span>
                        <button onClick={e => { e.stopPropagation(); setSecurityFile(null); }} className="text-red-500 text-xs font-semibold ml-2">Remove</button>
                      </div>
                    ) : (
                      <>
                        <FaShieldAlt className="mx-auto text-amber-600 mb-1" size={16} />
                        <p className="text-xs text-amber-900 font-bold">Upload Bank Guarantee / Security Instrument</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* NOTE TO BIDDERS (UWU Deputy Bursar Guidelines) */}
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-linear-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-center space-x-2">
                  <FaInfoCircle className="text-amber-600" size={14} />
                  <span className="text-xs font-bold text-amber-900">Official Note to Bidders — Uva Wellassa University</span>
                </div>
                <div className="p-4 bg-amber-50/30 space-y-2">
                  <ul className="space-y-1.5 text-[11px] text-amber-950 leading-relaxed">
                    <li className="flex items-start space-x-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">1</span>
                      <span>All financial columns and BOQ items must be filled accurately in accordance with instructions.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">2</span>
                      <span>Any alterations or custom terms should be clearly highlighted and signed/sealed.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">3</span>
                      <span>Indicate any applicable discounts and taxes (VAT) in addition to the base quoted prices.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">4</span>
                      <span>All product brochures, warranty terms, and delivery schedules must be uploaded with the bid document set.</span>
                    </li>
                  </ul>
                  <div className="pt-2 border-t border-amber-200 mt-2 text-[10px] text-amber-900">
                    <strong>Deputy Bursar (Supplies &amp; Stores)</strong> · Uva Wellassa University, Passara Road, Badulla.
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start space-x-3 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600 rounded" />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  I confirm that our bid is complete, accurate, and compliant with all bidding requirements.
                  The grand total offer of <strong>LKR {computedTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong> is our binding proposal.
                  I understand that our submission will be cryptographically sealed until the official bid opening ceremony.
                </span>
              </label>

              {/* Encryption Notice */}
              <div className="flex items-center space-x-2 bg-slate-900 text-white rounded-xl p-3">
                <FaLock className="text-emerald-400 shrink-0" size={14} />
                <p className="text-[10px] text-slate-300">
                  Your bid package will be sealed using AES-256 encryption with SHA-256 proof hash recorded to the audit ledger.
                </p>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl shrink-0">
              <div className="text-xs text-slate-600 font-semibold">
                {computedTotal > 0 && <span>Total Offer: <strong className="text-slate-900 text-sm font-black">LKR {computedTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></span>}
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={() => !submitting && setSubmitModal(null)} disabled={submitting} className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSubmitBid} disabled={submitting} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 disabled:opacity-70 flex items-center space-x-2 shadow-md transition-colors">
                  {submitting
                    ? <><FaSpinner className="animate-spin" size={12} /><span>Encrypting &amp; Sealing...</span></>
                    : <><FaUpload size={12} /><span>Submit &amp; Seal Bid</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      <ConfirmModal
        isOpen={!!withdrawModal}
        onClose={() => setWithdrawModal(null)}
        onConfirm={handleWithdraw}
        title="Withdraw Bid"
        message={`Are you sure you want to withdraw your submitted bid for "${withdrawModal?.title}"? This action can only be performed before the closing deadline and will be permanently recorded.`}
        confirmText="Withdraw Bid"
        variant="danger"
      />

      {/* Close Bidding Confirmation Modal */}
      <ConfirmModal
        isOpen={!!closeModal}
        onClose={() => setCloseModal(null)}
        onConfirm={handleCloseBidding}
        title="Close Bidding Period"
        message={`Officially close the bidding period for "${closeModal?.title}"? No further vendor submissions will be accepted and the bid box will be sealed.`}
        confirmText="Close &amp; Seal Bid Box"
        variant="danger"
      />
    </div>
  );
}
