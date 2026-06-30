import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FaLockOpen, FaLock, FaUsers, FaCalendarAlt, FaCheckCircle,
  FaTimesCircle, FaSpinner, FaShieldAlt, FaVideo, FaFileAlt,
  FaChevronRight, FaBan, FaExclamationTriangle,
} from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import { useSelector } from 'react-redux';

const DEFAULT_COMMITTEE = [
  { name: 'Prof. M. Weerasinghe', role: 'Chairperson', present: true },
  { name: 'Eng. R. Fernando', role: 'Technical Expert', present: true },
  { name: 'Mr. S. Gunawardena', role: 'PMD Representative', present: true },
  { name: 'Dr. K. Jayasuriya', role: 'End-User Rep', present: false },
  { name: 'Ms. N. Perera', role: 'Independent Observer', present: true },
];

/* ─── Bid Status Chip ─── */
function BidStatusChip({ status }) {
  const map = {
    submitted:  { cls: 'bg-blue-100 text-blue-700',    label: 'Sealed' },
    opened:     { cls: 'bg-emerald-100 text-emerald-700', label: 'Opened' },
    withdrawn:  { cls: 'bg-red-100 text-red-600',       label: 'Withdrawn' },
    rejected:   { cls: 'bg-red-100 text-red-700',       label: 'Rejected' },
  };
  const { cls, label } = map[status] || { cls: 'bg-slate-100 text-slate-600', label: status };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export default function BidOpeningPage() {
  const queryParams = new URLSearchParams(useLocation().search);
  const tenderIdParam = queryParams.get('tenderId');
  const { user } = useSelector(s => s.auth);
  const isProcurement = ['procurement_officer', 'admin', 'super_admin'].includes(user?.role);

  const [selectedTenderId, setSelectedTenderId] = useState(tenderIdParam || '');
  const [allTenders, setAllTenders] = useState([]);
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [committee, setCommittee] = useState(DEFAULT_COMMITTEE);
  const [loading, setLoading] = useState(true);
  const [openedBids, setOpenedBids] = useState([]);
  const [showPrices, setShowPrices] = useState(false);
  const [ceremonyStarted, setCeremonyStarted] = useState(false);

  const [startModal, setStartModal] = useState(false);
  const [unsealModal, setUnsealModal] = useState(null);
  const [completeModal, setCompleteModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  /* ── Load all tenders eligible for bid opening ── */
  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tenderService.getAll();
        const items = res.data || res || [];
        // Include published (deadline passed), bid_closed, closed, opening, evaluation
        const filtered = (Array.isArray(items) ? items : []).filter(t =>
          ['published', 'bidding', 'bid_closed', 'closed', 'opening', 'evaluation'].includes(t.status)
        );
        setAllTenders(filtered);
        if (!selectedTenderId && filtered.length > 0) {
          setSelectedTenderId(filtered[0]._id);
        }
      } catch (err) {
        toast.error(err?.message || 'Failed to load tenders');
      }
    };
    fetchTenders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load tender + bids detail ── */
  const loadDetails = useCallback(async () => {
    if (!selectedTenderId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [tenderRes, bidsRes] = await Promise.all([
        tenderService.getById(selectedTenderId),
        tenderService.getBids(selectedTenderId),
      ]);
      const t = tenderRes.data || tenderRes;
      const bidsData = Array.isArray(bidsRes.data || bidsRes) ? (bidsRes.data || bidsRes) : [];

      setTender({ ...t, closingDate: t.bidSubmissionDeadline, openingDate: t.bidOpeningDate });

      // Map committee
      if (t.bocMembers && t.bocMembers.length > 0) {
        setCommittee(t.bocMembers.map(m => ({
          name: m.userId ? `${m.userId.firstName} ${m.userId.lastName}` : 'Committee Member',
          role: m.role || 'BOC Representative',
          present: true,
        })));
      } else {
        setCommittee(DEFAULT_COMMITTEE);
      }

      setBids(bidsData.map(b => ({
        _id: b._id,
        vendor: b.vendorId?.companyName || 'Unknown Vendor',
        bidNumber: b.bidNumber || 'N/A',
        submitted: b.submittedAt ? new Date(b.submittedAt).toLocaleDateString('en-LK') : '—',
        bidAmount: b.totalBidAmount || 0,
        bidSecurity: !!b.bidSecurityDocument,
        bidSecurityType: b.bidSecurityType || '—',
        docs: (b.documents || []).map(doc => doc.name),
        status: b.status || 'submitted',
        deviations: b.status === 'rejected' ? ['MAJOR: Disqualified'] : [],
        isSealed: b.isSealed !== false,
      })));

      // Track opened bids by _id (not vendor name — avoids breakage when names collide)
      const opened = bidsData
        .filter(b => b.status !== 'submitted')
        .map(b => b._id.toString());
      setOpenedBids(opened);

      if (t.status === 'evaluation') {
        setShowPrices(true);
        setCeremonyStarted(true);
      } else if (t.status === 'opening') {
        setCeremonyStarted(true);
      }
    } catch (err) {
      console.error('Failed to load tender details:', err);
      toast.error('Failed to load tender details.');
    } finally {
      setLoading(false);
    }
  }, [selectedTenderId]);

  useEffect(() => { Promise.resolve().then(() => loadDetails()); }, [loadDetails]);

  /* ── Actions ── */
  const handleCloseBidding = async () => {
    try {
      await tenderService.closeBidding(tender._id);
      toast.success('🔒 Bidding officially closed. Bid box is sealed.');
      setCloseModal(false);
      loadDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to close bidding.');
    }
  };

  const handleStartCeremony = async () => {
    try {
      await tenderService.openBidBox(tender._id);
      setCeremonyStarted(true);
      setStartModal(false);
      toast.success('🎬 Bid Opening Ceremony started! All bids are being unsealed.');
      loadDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to start ceremony.');
    }
  };

  const handleUnsealBid = async (bidId) => {
    try {
      const bid = bids.find(b => b._id === bidId);
      if (bid) {
        await tenderService.unsealBid(tender._id, bid._id);
        toast.success(`🔓 Bid from "${bid.vendor}" unsealed.`);
        loadDetails();
      } else {
        toast.error('Bid not found.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to unseal bid.');
    } finally {
      setUnsealModal(null);
    }
  };

  const handleUnsealAll = async () => {
    try {
      const sealedBids = bids.filter(
        b => !openedBids.includes(b._id.toString()) && b.status === 'submitted'
      );
      await Promise.all(sealedBids.map(b => tenderService.unsealBid(tender._id, b._id)));
      setShowPrices(true);
      toast.success(`🔓 All ${bids.length} bids unsealed. Financial envelopes opened.`);
      loadDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to unseal all bids.');
    }
  };

  const handleCompleteCeremony = async () => {
    try {
      await tenderService.completeBidOpening(tender._id);
      toast.success('✅ Bid Opening Ceremony completed. Minutes generated and signed. Proceeding to evaluation.');
      loadDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to complete bid opening.');
    } finally {
      setCompleteModal(false);
    }
  };

  const toggleAttendance = (i) => {
    const updated = [...committee];
    updated[i] = { ...updated[i], present: !updated[i].present };
    setCommittee(updated);
  };

  const quorum = committee.filter(c => c.present).length;
  const hasQuorum = quorum >= 3;
  // allOpened: every non-withdrawn bid has been unsealed (tracked by _id)
  const activeBids = bids.filter(b => b.status !== 'withdrawn');
  const allOpened = activeBids.length > 0 && activeBids.every(b => openedBids.includes(b._id.toString()));
  const isDeadlinePassed = tender?.bidSubmissionDeadline ? new Date() > new Date(tender.bidSubmissionDeadline) : false;
  const canCloseBidding = isProcurement && tender &&
    ['published', 'bidding'].includes(tender.status) && isDeadlinePassed;
  const canOpen = isProcurement && tender && tender.status === 'bid_closed';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bid Opening Ceremony</h1>
          <p className="text-sm text-slate-500 mt-1">Stage 8: Public bid opening with BOC committee, video recording, and digital unsealing</p>
        </div>
        {allTenders.length > 0 && !tenderIdParam && (
          <div className="flex items-center space-x-3 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl">
            <span className="text-xs font-bold text-slate-500 uppercase">Tender:</span>
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {allTenders.map(t => (
                <option key={t._id} value={t._id}>{t.tenderNumber} — {t.title} [{t.status}]</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <FaSpinner className="animate-spin text-emerald-600 mr-2" size={20} />
          <span className="text-sm text-slate-500">Loading tender data...</span>
        </div>
      ) : !tender ? (
        <div className="text-center py-24 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
          No tender selected or available for bid opening.
        </div>
      ) : (
        <>
          {/* ── Tender Info Card ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-slate-400">{tender?.tenderNumber}</p>
                <h2 className="text-base font-bold text-slate-800">{tender?.title}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <FaCalendarAlt size={10} />
                    <span>Deadline: {tender?.closingDate?.split('T')[0] || '—'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <FaCalendarAlt size={10} />
                    <span>Opening: {tender?.openingDate?.split('T')[0] || 'TBD'}</span>
                  </span>
                  <span className="font-bold text-blue-600">{bids.length} bids received</span>
                  <span className={`px-2.5 py-1 rounded-full font-bold ${
                    tender.status === 'opening' ? 'bg-purple-100 text-purple-700' :
                    tender.status === 'bid_closed' ? 'bg-orange-100 text-orange-700' :
                    tender.status === 'evaluation' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {tender.status?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {/* Close Bidding */}
                {canCloseBidding && (
                  <button
                    onClick={() => setCloseModal(true)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
                  >
                    <FaBan size={12} /><span>Close Bidding</span>
                  </button>
                )}
                {/* Start Ceremony */}
                {!ceremonyStarted && canOpen && isProcurement && (
                  <button
                    onClick={() => setStartModal(true)}
                    disabled={!hasQuorum}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaVideo size={12} /><span>Start Ceremony</span>
                  </button>
                )}
                {/* Live Recording indicator */}
                {ceremonyStarted && (
                  <div className="flex items-center space-x-2 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                    <span className="flex items-center space-x-1 text-red-600 font-bold animate-pulse">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      <span>LIVE RECORDING</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Deadline warning */}
            {!isDeadlinePassed && tender.status === 'published' && (
              <div className="mt-3 flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <FaExclamationTriangle size={12} />
                <span>Bid submission deadline has not been reached yet. Opening the bid box early is not permitted.</span>
              </div>
            )}
          </div>

          {/* ── BOC Committee ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                <FaUsers className="text-blue-600" size={13} />
                <span>Bid Opening Committee (BOC)</span>
              </h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${hasQuorum ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {hasQuorum ? `✓ Quorum Met (${quorum}/${committee.length})` : `✗ No Quorum (${quorum}/${committee.length})`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {committee.map((m, i) => (
                <button
                  key={i}
                  onClick={() => toggleAttendance(i)}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-all text-left ${m.present ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.present ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                    {m.present ? <FaCheckCircle size={12} /> : <FaTimesCircle size={12} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-500">{m.role}</p>
                  </div>
                </button>
              ))}
            </div>
            {!hasQuorum && (
              <p className="text-xs text-red-500 mt-3 flex items-center space-x-1">
                <FaExclamationTriangle size={10} />
                <span>Minimum 3 committee members required to start the opening ceremony.</span>
              </p>
            )}
          </div>

          {/* ── Bids Table ── */}
          {ceremonyStarted ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">
                  Received Bids ({bids.length}) — {openedBids.length} opened
                </h3>
                <div className="flex items-center space-x-3">
                  {!allOpened && (
                    <button
                      onClick={handleUnsealAll}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <FaLockOpen size={10} /><span>Unseal All</span>
                    </button>
                  )}
                  {allOpened && !showPrices && (
                    <button
                      onClick={() => { setShowPrices(true); toast.info('Financial envelopes opened. Bid prices are now visible.'); }}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors"
                    >
                      <FaFileAlt size={10} /><span>Open Financial Envelopes</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Enhanced Bid List */}
              <div className="divide-y divide-slate-100">
                {bids.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">No bids received for this tender.</div>
                ) : (
                  bids.map((bid, i) => {
                    const isOpened = openedBids.includes(bid._id.toString());
                    return (
                      <div key={bid._id} className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${isOpened ? 'bg-emerald-50/30' : ''}`}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isOpened ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{bid.vendor}</p>
                            <p className="text-xs text-slate-400 font-mono">{bid.bidNumber}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <BidStatusChip status={bid.status || (isOpened ? 'opened' : 'submitted')} />
                              {bid.bidSecurity && (
                                <span className="flex items-center space-x-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                                  <FaShieldAlt size={8} />
                                  <span>Security ✓</span>
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">Submitted: {bid.submitted}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {showPrices && (
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Bid Amount</p>
                              <p className="text-base font-bold text-slate-800">LKR {bid.bidAmount.toLocaleString()}</p>
                            </div>
                          )}
                          {!isOpened && ceremonyStarted && isProcurement && (
                            <button
                              onClick={() => setUnsealModal(bid._id)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors"
                            >
                              <FaLockOpen size={10} /><span>Unseal</span>
                            </button>
                          )}
                          {isOpened && (
                            <div className="flex items-center space-x-1 text-emerald-600 text-xs font-semibold">
                              <FaCheckCircle size={12} />
                              <span>Unsealed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <FaLock className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-sm text-slate-500 font-medium">Start the ceremony to view and unseal bids</p>
              {!hasQuorum && <p className="text-xs text-red-500 mt-2">⚠ Quorum not met. At least 3 committee members must be present.</p>}
              {!canOpen && tender && !['bid_closed'].includes(tender.status) && (
                <p className="text-xs text-amber-500 mt-2">
                  ⚠ Tender must be in "bid_closed" status to open the bid box.
                  {canCloseBidding && ' Use "Close Bidding" button above first.'}
                </p>
              )}
            </div>
          )}

          {/* ── Complete Ceremony Banner ── */}
          {ceremonyStarted && allOpened && showPrices && tender.status !== 'evaluation' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-800">🎉 All Bids Opened — Ready to Complete</p>
                <p className="text-xs text-emerald-600">
                  All {bids.length} bids read aloud and recorded. Minutes ready for digital signature.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCompleteModal(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
                >
                  <FaCheckCircle size={12} /><span>Complete & Sign Minutes</span>
                </button>
                <Link
                  to={`/evaluation?tenderId=${tender._id}`}
                  className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  <span>Proceed to Evaluation</span><FaChevronRight size={9} />
                </Link>
              </div>
            </div>
          )}

          {/* Already at evaluation */}
          {tender.status === 'evaluation' && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-indigo-800">✓ Bid Opening Completed</p>
                <p className="text-xs text-indigo-600">Tenders are now in evaluation phase.</p>
              </div>
              <Link
                to={`/evaluation?tenderId=${tender._id}`}
                className="flex items-center space-x-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
              >
                <span>Go to Evaluation</span><FaChevronRight size={10} />
              </Link>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {/* Close Bidding */}
      <ConfirmModal
        isOpen={closeModal}
        onClose={() => setCloseModal(false)}
        onConfirm={handleCloseBidding}
        title="Close Bidding"
        confirmText="Close & Seal"
        variant="danger"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Officially close the bidding period for <span className="font-bold">{tender?.title}</span>?
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-700">
              No further bids will be accepted. The bid box will be sealed until the official opening ceremony.
              This action is irreversible and will be logged.
            </p>
          </div>
          <div className="text-xs text-slate-500">Bids received: <strong>{bids.length}</strong></div>
        </div>
      </ConfirmModal>

      {/* Start Ceremony */}
      <ConfirmModal
        isOpen={startModal}
        onClose={() => setStartModal(false)}
        onConfirm={handleStartCeremony}
        title="Start Bid Opening Ceremony"
        confirmText="Start & Record"
        variant="success"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Begin the official bid opening ceremony for <span className="font-bold">{tender?.title}</span>?
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <strong>Committee Present:</strong> {committee.filter(c => c.present).map(c => c.name).join(', ')}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <FaVideo size={10} />
            <span>Video recording will be initiated automatically for the public record.</span>
          </div>
        </div>
      </ConfirmModal>

      {/* Unseal Single */}
      <ConfirmModal
        isOpen={!!unsealModal}
        onClose={() => setUnsealModal(null)}
        onConfirm={() => handleUnsealBid(unsealModal)}
        title="Unseal Bid"
        confirmText="Unseal"
        variant="default"
      >
        <p className="text-sm text-slate-600">
          Unseal bid from <span className="font-bold">{bids.find(b => b._id === unsealModal)?.vendor || '—'}</span>?
          This action is recorded and irreversible.
        </p>
      </ConfirmModal>

      {/* Complete */}
      <ConfirmModal
        isOpen={completeModal}
        onClose={() => setCompleteModal(false)}
        onConfirm={handleCompleteCeremony}
        title="Complete Ceremony & Sign Minutes"
        confirmText="Sign & Complete"
        variant="success"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Finalize the bid opening ceremony and sign the minutes.</p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Bids Opened</span>
              <span className="font-bold">{bids.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rejected</span>
              <span className="font-bold text-red-600">
                {bids.filter(b => (b.deviations || []).some(d => d.includes('MAJOR'))).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Committee Members</span>
              <span className="font-bold">{quorum}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <FaShieldAlt size={10} />
            <span>All committee members' digital signatures will be applied to the opening minutes.</span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
