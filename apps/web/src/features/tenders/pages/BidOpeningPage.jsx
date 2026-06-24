import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaLockOpen, FaLock, FaUsers, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaSpinner, FaShieldAlt, FaVideo, FaFileAlt, FaChevronRight } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import BidTable from '../components/BidTable';

const DEFAULT_COMMITTEE = [
  { name: 'Prof. M. Weerasinghe', role: 'Chairperson', present: true },
  { name: 'Eng. R. Fernando', role: 'Technical Expert', present: true },
  { name: 'Mr. S. Gunawardena', role: 'PMD Representative', present: true },
  { name: 'Dr. K. Jayasuriya', role: 'End-User Rep', present: false },
  { name: 'Ms. N. Perera', role: 'Independent Observer', present: true },
];

export default function BidOpeningPage() {
  const queryParams = new URLSearchParams(useLocation().search);
  const tenderIdParam = queryParams.get('tenderId');
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

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tenderService.getAll();
        const items = res.data || res || [];
        const filtered = (Array.isArray(items) ? items : []).filter(t => 
          ['published', 'bid_closed', 'closed', 'opening', 'evaluation'].includes(t.status)
        );
        setAllTenders(filtered);
        if (!selectedTenderId && filtered.length > 0) {
          setSelectedTenderId(filtered[0]._id);
        }
      } catch (err) {
        console.error('Failed to load tenders:', err);
        toast.error('Failed to load tenders');
      }
    };
    fetchTenders();
  }, [selectedTenderId]);

  const loadDetails = useCallback(async () => {
    if (!selectedTenderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tenderRes, bidsRes] = await Promise.all([
        tenderService.getById(selectedTenderId),
        tenderService.getBids(selectedTenderId)
      ]);
      const t = tenderRes.data || tenderRes;
      const bidsData = bidsRes.data || bidsRes || [];
      
      setTender({
        ...t,
        closingDate: t.bidSubmissionDeadline,
        openingDate: t.bidOpeningDate,
      });

      // Map committee members if defined, else fallback to default committee
      if (t.bocMembers && t.bocMembers.length > 0) {
        setCommittee(t.bocMembers.map(m => ({
          name: m.userId ? `${m.userId.firstName} ${m.userId.lastName}` : 'Committee Member',
          role: m.role || 'BOC Representative',
          present: true
        })));
      } else {
        setCommittee(DEFAULT_COMMITTEE);
      }

      setBids(bidsData.map(b => ({
        _id: b._id,
        vendor: b.vendorId?.companyName || 'Unknown Vendor',
        bidNumber: b.bidNumber || 'N/A',
        submitted: b.submittedAt ? new Date(b.submittedAt).toLocaleDateString() : '—',
        bidAmount: b.totalBidAmount || 0,
        bidSecurity: !!b.bidSecurityDocument,
        docs: (b.documents || []).map(doc => doc.name),
        deviations: b.status === 'rejected' ? ['MAJOR: Disqualified'] : []
      })));

      // If bid box is already opened, set opened bids status
      const opened = bidsData.filter(b => b.status !== 'submitted').map(b => b.vendorId?.companyName || 'Unknown Vendor');
      setOpenedBids(opened);
      if (t.status === 'evaluation') {
        setShowPrices(true);
        setCeremonyStarted(true);
      } else if (t.status === 'opening') {
        setCeremonyStarted(true);
      }
    } catch (err) {
      console.error('Failed to load tender details for bid opening:', err);
      toast.error('Failed to load tender details for bid opening.');
    } finally {
      setLoading(false);
    }
  }, [selectedTenderId]);

  useEffect(() => {
    Promise.resolve().then(() => loadDetails());
  }, [loadDetails]);

  const handleStartCeremony = async () => {
    try {
      await tenderService.openBidBox(tender._id);
      setCeremonyStarted(true);
      setStartModal(false);
      toast.success('🎬 Bid Opening Ceremony started. Video recording initiated.');
      loadDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to start ceremony.');
    }
  };

  const handleUnsealBid = async (vendorName) => {
    try {
      const bid = bids.find(b => b.vendor === vendorName);
      if (bid) {
        await tenderService.unsealBid(tender._id, bid._id);
        toast.success(`🔓 Bid from "${vendorName}" unsealed successfully.`);
        loadDetails();
      } else {
        toast.error('Bid not found');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to unseal bid.');
    } finally {
      setUnsealModal(null);
    }
  };

  const handleUnsealAll = async () => {
    try {
      for (const bid of bids) {
        if (!openedBids.includes(bid.vendor)) {
          await tenderService.unsealBid(tender._id, bid._id);
        }
      }
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
      toast.error(err.message || 'Failed to complete bid opening ceremony.');
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
  const allOpened = openedBids.length === bids.length && bids.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bid Opening Ceremony</h1>
          <p className="text-sm text-slate-500 mt-1">Stage 8: Public bid opening with TEC committee, video recording, and digital unsealing</p>
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
                <option key={t._id} value={t._id}>{t.tenderNumber} - {t.title}</option>
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
          {/* Tender Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-slate-400">{tender?.tenderNumber}</p>
              <h2 className="text-base font-bold text-slate-800">{tender?.title}</h2>
              <div className="flex items-center space-x-4 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center space-x-1"><FaCalendarAlt size={10} /><span>Closed: {tender?.closingDate?.split('T')[0]}</span></span>
                <span className="flex items-center space-x-1"><FaCalendarAlt size={10} /><span>Opening: {tender?.openingDate?.split('T')[0]}</span></span>
                <span className="font-bold text-blue-600">{bids.length} bids received</span>
              </div>
            </div>
            {!ceremonyStarted ? (
              <button onClick={() => setStartModal(true)} disabled={!hasQuorum} className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <FaVideo size={12} /><span>Start Ceremony</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-xs">
                <span className="inline-flex items-center space-x-1 text-red-600 font-bold animate-pulse"><span className="w-2 h-2 bg-red-500 rounded-full" /><span>LIVE RECORDING</span></span>
              </div>
            )}
          </div>

          {/* TEC Committee */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-2"><FaUsers className="text-blue-600" size={13} /><span>Technical Evaluation Committee (TEC)</span></h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${hasQuorum ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {hasQuorum ? `✓ Quorum Met (${quorum}/${committee.length})` : `✗ No Quorum (${quorum}/${committee.length})`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {committee.map((m, i) => (
                <button key={i} onClick={() => toggleAttendance(i)} className={`flex items-center space-x-3 p-3 rounded-lg border transition-all text-left ${m.present ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.present ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                    {m.present ? <FaCheckCircle size={12} /> : <FaTimesCircle size={12} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                    <p className="text-[10px] text-slate-500">{m.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bid Table */}
          {ceremonyStarted ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Received Bids ({bids.length})</h3>
                <div className="flex items-center space-x-3">
                  {!allOpened && (
                    <button onClick={handleUnsealAll} className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors">
                      <FaLockOpen size={10} /><span>Unseal All</span>
                    </button>
                  )}
                  {allOpened && !showPrices && (
                    <button onClick={() => { setShowPrices(true); toast.info('Financial envelopes opened. Prices are now visible.'); }} className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors">
                      <FaFileAlt size={10} /><span>Open Financial Envelopes</span>
                    </button>
                  )}
                </div>
              </div>
              <BidTable
                bids={bids}
                openedBids={openedBids}
                showPrices={showPrices}
                onUnseal={(vendor) => setUnsealModal(vendor)}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <FaLock className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-sm text-slate-500 font-medium">Start the ceremony to view and unseal bids</p>
              {!hasQuorum && <p className="text-xs text-red-500 mt-2">⚠ Quorum not met. At least 3 committee members must be present.</p>}
            </div>
          )}

          {/* Complete */}
          {ceremonyStarted && allOpened && showPrices && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center justify-between animate-slide-up">
              <div>
                <p className="text-sm font-bold text-emerald-800">Bid Opening Complete</p>
                <p className="text-xs text-emerald-600">All {bids.length} bids unsealed and read. Minutes ready for signature.</p>
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={() => setCompleteModal(true)} className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">
                  <FaCheckCircle size={12} /><span>Complete & Sign Minutes</span>
                </button>
                <Link to={`/evaluation?tenderId=${tender._id}`} className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
                  <span>Proceed to Evaluation</span><FaChevronRight size={9} />
                </Link>
              </div>
            </div>
          )}

          {/* Start Modal */}
          <ConfirmModal isOpen={startModal} onClose={() => setStartModal(false)} onConfirm={handleStartCeremony} title="Start Bid Opening Ceremony" confirmText="Start & Record" variant="success">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Begin the official bid opening ceremony for <span className="font-bold">{tender?.title}</span>?</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700"><strong>Committee Present:</strong> {committee.filter(c => c.present).map(c => c.name).join(', ')}</p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400"><FaVideo size={10} /><span>Video recording will be initiated automatically for the public record.</span></div>
            </div>
          </ConfirmModal>

          {/* Unseal Modal */}
          <ConfirmModal isOpen={!!unsealModal} onClose={() => setUnsealModal(null)} onConfirm={() => handleUnsealBid(unsealModal)} title="Unseal Bid" confirmText="Unseal" variant="default">
            <p className="text-sm text-slate-600">Unseal bid from <span className="font-bold">{unsealModal}</span>? This action is recorded and irreversible.</p>
          </ConfirmModal>

          {/* Complete Modal */}
          <ConfirmModal isOpen={completeModal} onClose={() => setCompleteModal(false)} onConfirm={handleCompleteCeremony} title="Complete Ceremony & Sign Minutes" confirmText="Sign & Complete" variant="success">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Finalize the bid opening ceremony and sign the minutes.</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Bids Opened</span><span className="font-bold">{bids.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Rejected</span><span className="font-bold text-red-600">{bids.filter(b => (b.deviations || []).some(d => d.includes('MAJOR'))).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Committee</span><span className="font-bold">{quorum} members</span></div>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400"><FaShieldAlt size={10} /><span>All committee members' digital signatures will be applied to the opening minutes.</span></div>
            </div>
          </ConfirmModal>
        </>
      )}
    </div>
  );
}
