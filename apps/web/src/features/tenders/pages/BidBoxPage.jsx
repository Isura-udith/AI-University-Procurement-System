import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaBoxOpen, FaLock, FaClock, FaUpload, FaFileAlt, FaTimes, FaCheckCircle,
  FaShieldAlt, FaSpinner, FaPlus, FaTrash, FaBan, FaChevronDown, FaChevronUp,
  FaHistory, FaTrophy, FaExclamationTriangle, FaSearch, FaChevronRight,
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
  if (timeLeft.expired) return <span className="text-xs font-bold text-red-600 animate-pulse">CLOSED</span>;
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
          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded min-w-[28px] text-center ${urgent ? 'bg-red-700 text-white animate-pulse' : 'bg-slate-800 text-white'}`}>
            {String(u.val || 0).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-slate-400 ml-0.5 mr-1">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const map = {
    published:  { cls: 'bg-emerald-100 text-emerald-700',  label: '🔓 Accepting Bids' },
    bidding:    { cls: 'bg-blue-100 text-blue-700',         label: '🔵 Active Bidding' },
    bid_closed: { cls: 'bg-orange-100 text-orange-700',     label: '🔒 Bidding Closed' },
    opening:    { cls: 'bg-purple-100 text-purple-700',     label: '📂 Opening Phase' },
    evaluation: { cls: 'bg-indigo-100 text-indigo-700',     label: '📊 Under Evaluation' },
    awarded:    { cls: 'bg-amber-100 text-amber-700',       label: '🏆 Awarded' },
  };
  const { cls, label } = map[status] || { cls: 'bg-slate-100 text-slate-600', label: status };
  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${cls}`}>{label}</span>;
}

/* ─── Bid Status Chip ─── */
function BidStatusChip({ status }) {
  const map = {
    submitted:             { cls: 'bg-blue-100 text-blue-700 border-blue-200',        icon: '🔒', label: 'Sealed & Submitted' },
    opened:                { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '🔓', label: 'Opened' },
    preliminary_exam:      { cls: 'bg-sky-100 text-sky-700 border-sky-200',           icon: '🔍', label: 'Preliminary Exam' },
    technically_evaluated: { cls: 'bg-violet-100 text-violet-700 border-violet-200',  icon: '📊', label: 'Tech Evaluated' },
    financially_evaluated: { cls: 'bg-indigo-100 text-indigo-700 border-indigo-200',  icon: '💰', label: 'Fin. Evaluated' },
    substantially_responsive: { cls: 'bg-teal-100 text-teal-700 border-teal-200',    icon: '✅', label: 'Responsive' },
    non_responsive:        { cls: 'bg-orange-100 text-orange-700 border-orange-200',  icon: '⚠️', label: 'Non-Responsive' },
    awarded:               { cls: 'bg-amber-100 text-amber-700 border-amber-200',     icon: '🏆', label: 'Awarded' },
    rejected:              { cls: 'bg-red-100 text-red-700 border-red-200',           icon: '❌', label: 'Rejected' },
    withdrawn:             { cls: 'bg-slate-100 text-slate-500 border-slate-200',     icon: '↩️', label: 'Withdrawn' },
  };
  const { cls, icon, label } = map[status] || { cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: '●', label: status };
  return (
    <span className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      <span>{icon}</span><span>{label}</span>
    </span>
  );
}

/* ─── My Bids Section ─── */
function MyBidsSection({ refreshKey }) {
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawConfirm, setWithdrawConfirm] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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
    const initLoad = async () => {
      await load();
    };
    initLoad();
  }, [load, refreshKey]);

  const handleWithdraw = async () => {
    if (!withdrawConfirm) return;
    setWithdrawing(true);
    try {
      await tenderService.withdrawBid(withdrawConfirm.tenderId?._id, withdrawConfirm._id);
      toast.warning('Bid withdrawn successfully.');
      setWithdrawConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to withdraw bid.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <FaSpinner className="animate-spin text-emerald-600 mr-2" size={16} />
        <span className="text-sm text-slate-500">Loading your bids...</span>
      </div>
    );
  }

  if (myBids.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FaHistory className="text-slate-400" size={24} />
        </div>
        <p className="text-sm font-semibold text-slate-600">No bids submitted yet</p>
        <p className="text-xs text-slate-400 mt-1">Your submitted bids will appear here. Switch to Active Tenders tab to participate.</p>
      </div>
    );
  }

  const statsData = [
    { label: 'Total Bids', value: myBids.length, color: 'bg-slate-50 border-slate-200 text-slate-700' },
    {
      label: 'Active',
      value: myBids.filter(b => ['submitted','opened','preliminary_exam','technically_evaluated','financially_evaluated','substantially_responsive'].includes(b.status)).length,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    { label: 'Awarded', value: myBids.filter(b => b.status === 'awarded').length, color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Withdrawn', value: myBids.filter(b => b.status === 'withdrawn').length, color: 'bg-slate-50 border-slate-200 text-slate-500' },
  ];

  return (
    <>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statsData.map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium opacity-75 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bid cards */}
      <div className="space-y-3">
        {myBids.map(bid => {
          const tender = bid.tenderId;
          const isWithdrawn = bid.status === 'withdrawn';
          const canWithdraw = ['submitted'].includes(bid.status) &&
            tender?.status && ['published', 'bidding'].includes(tender.status);

          return (
            <div key={bid._id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${isWithdrawn ? 'opacity-60 border-slate-200' : 'border-slate-200'}`}>
              <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start space-x-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    bid.status === 'awarded' ? 'bg-amber-100 text-amber-600' :
                    bid.status === 'rejected' ? 'bg-red-100 text-red-500' :
                    bid.status === 'withdrawn' ? 'bg-slate-100 text-slate-400' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {bid.status === 'awarded' ? <FaTrophy size={16} /> :
                     bid.status === 'rejected' ? <FaExclamationTriangle size={16} /> :
                     bid.status === 'withdrawn' ? <FaBan size={16} /> :
                     <FaLock size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono text-slate-400">
                      {tender?.tenderNumber || '—'} · <span className="font-semibold text-slate-500">{bid.bidNumber || '—'}</span>
                    </p>
                    <h4 className="text-sm font-bold text-slate-800 truncate mt-0.5">{tender?.title || 'Unknown Tender'}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <BidStatusChip status={bid.status} />
                      {tender?.category && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{tender.category}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Bid Amount</p>
                    <p className="text-base font-bold text-slate-800">
                      LKR {(bid.totalBidAmount || 0).toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {bid.submittedAt ? new Date(bid.submittedAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  {canWithdraw && (
                    <button
                      onClick={() => setWithdrawConfirm(bid)}
                      className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold transition-colors border border-red-200 flex items-center space-x-1.5 whitespace-nowrap"
                    >
                      <FaBan size={10} /><span>Withdraw</span>
                    </button>
                  )}
                  {tender?.status && ['evaluation', 'awarded', 'loa_issued'].includes(tender.status) && (
                    <div className="flex items-center space-x-1 text-[10px] text-indigo-600 font-semibold bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg">
                      <FaChevronRight size={8} /><span>In Evaluation</span>
                    </div>
                  )}
                </div>
              </div>

              {bid.bidSecurityDocument && (
                <div className="px-5 py-2 bg-amber-50 border-t border-amber-100 flex items-center space-x-2 text-[10px] text-amber-700">
                  <FaShieldAlt size={9} />
                  <span>
                    Bid Security Attached — {bid.bidSecurityType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Document'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
  const isProcurement = ['procurement_officer', 'admin', 'super_admin'].includes(role);
  const isSupplier = role === 'supplier';

  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tenders');
  const [submitModal, setSubmitModal] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [myBidsRefreshKey, setMyBidsRefreshKey] = useState(0);

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

  const resetForm = () => {
    setBidAmount(''); setLineItems([{ itemDescription: '', quantity: 1, unit: 'units', unitPrice: '' }]);
    setVatAmount(''); setDiscount(''); setMethodology(''); setTimeline(''); setExperience('');
    setBidFiles([]); setSecurityFile(null); setSecurityType('bank_guarantee');
    setTermsAccepted(false); setShowTechnical(false); setUseLineItems(false);
  };

  const lineItemsTotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  }, 0);
  const computedTotal = useLineItems
    ? lineItemsTotal + (parseFloat(vatAmount) || 0) - (parseFloat(discount) || 0)
    : parseFloat(bidAmount) || 0;

  const urlParamHandled = useRef(false);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenderService.getAll({ status: 'published,bidding' });
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
            setSubmitModal(target);
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
  }, [searchParams, setSearchParams]);

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
      };

      await tenderService.submitBid(submitModal._id, bidData);
      toast.success(`Bid submitted for "${submitModal.title}". Now encrypted and sealed.`);
      setSubmitModal(null);
      resetForm();
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

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <div className="bg-linear-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center space-x-3 mb-2">
            <FaBoxOpen size={24} />
            <h1 className="text-xl font-bold">Secure Digital Bid Box</h1>
          </div>
          <p className="text-emerald-100 text-sm max-w-3xl">
            All bid submissions are encrypted and sealed until the pre-disclosed opening date.
            Sealed bids cannot be viewed, modified, or accessed by anyone — including system administrators.
          </p>
          <div className="flex items-center space-x-4 mt-3 text-xs text-emerald-200">
            <span className="flex items-center space-x-1"><FaShieldAlt size={10} /><span>AES-256 Encryption</span></span>
            <span className="flex items-center space-x-1"><FaLock size={10} /><span>Tamper-Proof Sealing</span></span>
            <span className="flex items-center space-x-1"><FaCheckCircle size={10} /><span>Audit Trail Logged</span></span>
          </div>
        </div>
      </div>

      {/* ── Tabs — supplier only ── */}
      {isSupplier && (
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { id: 'tenders', label: 'Active Tenders', icon: <FaSearch size={12} /> },
            { id: 'my-bids', label: 'My Submitted Bids', icon: <FaHistory size={12} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Active Tenders ── */}
      {(!isSupplier || activeTab === 'tenders') && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-emerald-600 mr-2" size={16} />
              <span className="text-sm text-slate-500">Loading active tenders...</span>
            </div>
          ) : tenders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <FaBoxOpen className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-sm font-medium text-slate-500">No active tenders available for bidding right now.</p>
              <p className="text-xs text-slate-400 mt-1">Published tenders accepting bids will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tenders.map(t => {
                const deadline = new Date(t.deadline);
                const isOpen = deadline > new Date();
                return (
                  <div key={t._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-xl shrink-0 ${isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {isOpen ? <FaBoxOpen size={20} /> : <FaLock size={20} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-mono text-slate-500">{t.tenderNumber}</p>
                          <h3 className="text-base font-bold text-slate-800 truncate">{t.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            <span className="flex items-center space-x-1 text-xs text-slate-500">
                              <FaClock size={10} /><span>{isOpen ? 'Closes:' : 'Closed'}</span>
                            </span>
                            {isOpen && <CountdownTimer deadline={t.deadline} />}
                            {!isOpen && <span className="text-xs font-bold text-red-500">DEADLINE PASSED</span>}
                            <span className="flex items-center space-x-1 text-xs text-slate-500">
                              <FaFileAlt size={10} /><span>{t.bidsReceived || 0} bids received</span>
                            </span>
                            {t.bidSecurityRequired && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Security Required</span>
                            )}
                            {t.estimatedValue && (
                              <span className="text-xs text-slate-400">TCE: LKR {t.estimatedValue.toLocaleString()}</span>
                            )}
                            {t.category && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t.category}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <StatusBadge status={t.status} />
                        {isOpen && !isProcurement && (
                          <button
                            onClick={() => { setSubmitModal(t); resetForm(); }}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 flex items-center space-x-2 transition-colors shadow-sm"
                          >
                            <FaUpload size={12} /><span>Submit Bid</span>
                          </button>
                        )}
                        {isOpen && !isProcurement && (
                          <button
                            onClick={() => setWithdrawModal(t)}
                            className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200"
                          >
                            Withdraw
                          </button>
                        )}
                        {isProcurement && (
                          <button
                            onClick={() => setCloseModal(t)}
                            className="px-3 py-2 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg font-medium transition-colors border border-orange-200 flex items-center space-x-1"
                          >
                            <FaBan size={10} /><span>Close Bidding</span>
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

      {/* ── Submit Bid Modal ── */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && setSubmitModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Submit Bid</h3>
                <p className="text-xs text-slate-500">{submitModal.tenderNumber} — {submitModal.title}</p>
              </div>
              <button onClick={() => !submitting && setSubmitModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <FaTimes size={14} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tender Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-xs text-slate-600">
                <div><span className="font-semibold text-slate-700">Category:</span> {submitModal.category || '—'}</div>
                <div><span className="font-semibold text-slate-700">Method:</span> {submitModal.procurementMethod || '—'}</div>
                <div><span className="font-semibold text-slate-700">Est. Value:</span> LKR {(submitModal.estimatedValue || 0).toLocaleString()}</div>
                <div><span className="font-semibold text-slate-700">Security Req:</span> {submitModal.bidSecurityRequired ? `LKR ${(submitModal.bidSecurityAmount || 0).toLocaleString()}` : 'No'}</div>
              </div>

              {/* Toggle */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div onClick={() => setUseLineItems(v => !v)} className={`relative w-11 h-6 rounded-full transition-colors ${useLineItems ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${useLineItems ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Use Line Items (Bill of Quantities)</span>
                </label>
              </div>

              {/* Amount Section */}
              {!useLineItems ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Bid Amount (LKR) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">LKR</span>
                    <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder="0.00" min="0" step="0.01"
                      className="w-full pl-12 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Line Items (Bill of Quantities)</label>
                    <button onClick={addLineItem} className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
                      <FaPlus size={10} /><span>Add Item</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200">
                          <th className="py-2 pr-2 font-semibold">Description *</th>
                          <th className="py-2 pr-2 font-semibold w-16">Qty *</th>
                          <th className="py-2 pr-2 font-semibold w-16">Unit</th>
                          <th className="py-2 pr-2 font-semibold w-24">Unit Price *</th>
                          <th className="py-2 font-semibold w-24 text-right">Total</th>
                          <th className="py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="space-y-1">
                        {lineItems.map((item, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-1.5 pr-2">
                              <input value={item.itemDescription} onChange={e => updateLineItem(i, 'itemDescription', e.target.value)} placeholder="Item description"
                                className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 ${!item.itemDescription.trim() ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`} />
                            </td>
                            <td className="py-1.5 pr-2">
                              <input type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} min="1"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            </td>
                            <td className="py-1.5 pr-2">
                              <select value={item.unit} onChange={e => updateLineItem(i, 'unit', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
                                {['units', 'nos', 'kg', 'L', 'm', 'm²', 'm³', 'set', 'lot', 'pcs', 'rolls'].map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </td>
                            <td className="py-1.5 pr-2">
                              <input type="number" value={item.unitPrice} onChange={e => updateLineItem(i, 'unitPrice', e.target.value)} placeholder="0.00" min="0" step="0.01"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            </td>
                            <td className="py-1.5 text-right font-semibold text-slate-700">
                              {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString()}
                            </td>
                            <td className="py-1.5 pl-2">
                              {lineItems.length > 1 && (
                                <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600"><FaTrash size={10} /></button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">VAT / Other Taxes (LKR)</label>
                      <input type="number" value={vatAmount} onChange={e => setVatAmount(e.target.value)} placeholder="0.00" min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Discount Offered (LKR)</label>
                      <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0.00" min="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-800">Grand Total</span>
                    <span className="text-lg font-bold text-emerald-700">LKR {computedTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Technical Proposal */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => setShowTechnical(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                  <span>Technical Proposal (Optional)</span>
                  {showTechnical ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                </button>
                {showTechnical && (
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Implementation Methodology</label>
                      <textarea value={methodology} onChange={e => setMethodology(e.target.value)} rows={3} placeholder="Describe your approach and methodology..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Project Timeline</label>
                      <input value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g., 3 months from contract signing"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Relevant Experience</label>
                      <textarea value={experience} onChange={e => setExperience(e.target.value)} rows={2} placeholder="Describe similar projects completed in the last 5 years..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Bid Documents */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bid Documents *</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer relative">
                  <input type="file" multiple accept=".pdf,.docx,.xlsx,.zip" onChange={e => setBidFiles(prev => [...prev, ...Array.from(e.target.files)])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FaUpload className="mx-auto text-slate-400 mb-2" size={20} />
                  <p className="text-xs text-slate-500 font-medium">Technical &amp; Financial Proposals</p>
                  <p className="text-[10px] text-slate-400">PDF, DOCX, XLSX, ZIP (max 50MB each)</p>
                </div>
                {bidFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {bidFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="flex items-center space-x-2 text-slate-700">
                          <FaFileAlt className="text-slate-400" size={11} />
                          <span className="text-xs truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span>
                        </span>
                        <button onClick={() => setBidFiles(bidFiles.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs ml-2">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bid Security */}
              {submitModal.bidSecurityRequired && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Bid Security Document * (LKR {(submitModal.bidSecurityAmount || 0).toLocaleString()})
                  </label>
                  <div className="flex gap-3 mb-2 flex-wrap">
                    {['bank_guarantee', 'insurance_bond', 'certified_cheque', 'demand_draft'].map(type => (
                      <label key={type} className={`flex items-center space-x-1.5 text-xs cursor-pointer px-3 py-2 rounded-lg border transition-colors ${securityType === type ? 'border-amber-400 bg-amber-50 text-amber-700 font-semibold' : 'border-slate-200 text-slate-600'}`}>
                        <input type="radio" name="secType" value={type} checked={securityType === type} onChange={() => setSecurityType(type)} className="sr-only" />
                        <span>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-2 border-dashed border-amber-300 rounded-xl p-4 text-center hover:border-amber-400 transition-colors cursor-pointer relative bg-amber-50/50">
                    <input type="file" accept=".pdf" onChange={e => setSecurityFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {securityFile ? (
                      <div className="flex items-center justify-center space-x-2">
                        <FaCheckCircle className="text-emerald-500" size={14} />
                        <span className="text-sm text-slate-700">{securityFile.name}</span>
                        <button onClick={e => { e.stopPropagation(); setSecurityFile(null); }} className="text-red-400 text-xs ml-2">Remove</button>
                      </div>
                    ) : (
                      <>
                        <FaShieldAlt className="mx-auto text-amber-500 mb-1" size={16} />
                        <p className="text-xs text-amber-700">Upload Bank Guarantee / Insurance Bond / Cheque</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Terms */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-1 w-4 h-4 accent-emerald-600 rounded" />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I confirm this bid is complete, accurate, and compliant with the terms of the bidding documents.
                  The bid amount of <strong>LKR {computedTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong> is our final offer.
                  I understand my bid will be encrypted and sealed until the official opening ceremony.
                </span>
              </label>

              {/* Encryption Notice */}
              <div className="flex items-center space-x-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <FaLock className="text-slate-400 shrink-0" size={12} />
                <p className="text-[10px] text-slate-500">
                  Your bid will be encrypted with AES-256. It cannot be accessed until the scheduled bid opening ceremony at the disclosed time and place.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
              <div className="text-xs text-slate-500">
                {computedTotal > 0 && <span>Bid: <strong className="text-slate-800">LKR {computedTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></span>}
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={() => !submitting && setSubmitModal(null)} disabled={submitting} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSubmitBid} disabled={submitting} className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 disabled:opacity-70 flex items-center space-x-2 shadow-sm transition-colors">
                  {submitting
                    ? <><FaSpinner className="animate-spin" size={12} /><span>Encrypting &amp; Sealing...</span></>
                    : <><FaUpload size={12} /><span>Submit &amp; Seal Bid</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      <ConfirmModal
        isOpen={!!withdrawModal}
        onClose={() => setWithdrawModal(null)}
        onConfirm={handleWithdraw}
        title="Withdraw Bid"
        message={`Are you sure you want to withdraw your bid for "${withdrawModal?.title}"? This action can only be done before the closing deadline and will be logged.`}
        confirmText="Withdraw Bid"
        variant="danger"
      />

      {/* Close Bidding Modal */}
      <ConfirmModal
        isOpen={!!closeModal}
        onClose={() => setCloseModal(null)}
        onConfirm={handleCloseBidding}
        title="Close Bidding"
        message={`Officially close the bidding period for "${closeModal?.title}"? No more bids will be accepted. The bid box will be sealed and locked.`}
        confirmText="Close &amp; Seal Bid Box"
        variant="danger"
      />
    </div>
  );
}
