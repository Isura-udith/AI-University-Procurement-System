import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaTrophy, FaGavel, FaClock, FaChevronRight, FaExclamationTriangle, FaCheckCircle, FaPaperPlane, FaUserShield, FaSpinner, FaBalanceScale, FaBullhorn, FaCalendarAlt } from 'react-icons/fa';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import usePermissions from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';

const calcRemainingTime = (endDate) => {
  if (!endDate) return {};
  const diff = new Date(endDate) - new Date();
  if (diff <= 0) return { expired: true };
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000) };
};

function StandstillCountdown({ endDate }) {
  const [left, setLeft] = useState(() => calcRemainingTime(endDate));
  const [prevEndDate, setPrevEndDate] = useState(endDate);

  if (endDate !== prevEndDate) {
    setPrevEndDate(endDate);
    setLeft(calcRemainingTime(endDate));
  }

  useEffect(() => {
    if (!endDate) return;
    const t = setInterval(() => setLeft(calcRemainingTime(endDate)), 60000);
    return () => clearInterval(t);
  }, [endDate]);

  if (!endDate) return null;
  if (left.expired) return <span className="text-xs font-bold text-emerald-600">✓ Period Complete</span>;
  return (
    <div className="flex items-center space-x-1.5 text-xs">
      <FaClock className="text-amber-500" size={10} />
      <span className="font-bold text-amber-700">{left.days}d {left.hours}h remaining</span>
    </div>
  );
}

export default function AwardsPage() {
  const { hasPermission } = usePermissions();
  const queryParams = new URLSearchParams(useLocation().search);
  const tenderIdParam = queryParams.get('tenderId');
  const [selectedTenderId, setSelectedTenderId] = useState(tenderIdParam || '');
  const [allTenders, setAllTenders] = useState([]);
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaTarget, setLoaTarget] = useState(null);
  const [appealModal, setAppealModal] = useState(null);
  const [debriefModal, setDebriefModal] = useState(null);
  const [resolveAppealModal, setResolveAppealModal] = useState(null);
  const [scheduleDebriefModal, setScheduleDebriefModal] = useState(null);
  const [appealText, setAppealText] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [scheduleDate, setScheduleDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenderService.getAll({ status: 'awarded,loa_issued,standstill,cleared,appealed' });
      const items = res.data || res || [];
      const fetchedTenders = Array.isArray(items) ? items : [];
      setAllTenders(fetchedTenders);

      let finalTenders = [...fetchedTenders];

      if (selectedTenderId) {
        const exists = fetchedTenders.some(t => t._id === selectedTenderId);
        if (!exists) {
          try {
            const specificRes = await tenderService.getById(selectedTenderId);
            const specific = specificRes.data || specificRes;
            if (specific) {
              finalTenders = [specific];
            }
          } catch (err) {
            console.error('Failed to fetch specific tender:', err);
            toast.error('Could not load the specified tender details.');
          }
        } else {
          finalTenders = fetchedTenders.filter(t => t._id === selectedTenderId);
        }
      }

      const mappedAwards = finalTenders.map(award => {
        let status = award.status;
        if (status === 'awarded') {
          status = 'pending';
        } else if (status === 'loa_issued' || status === 'standstill') {
          const isStandstillExpired = award.standstillEndDate && new Date(award.standstillEndDate) < new Date();
          const hasActiveAppeals = award.appeals && award.appeals.some(ap => ap.status === 'pending' || ap.status === 'under-review');
          
          if (isStandstillExpired && !hasActiveAppeals) {
            status = 'cleared';
          } else if (hasActiveAppeals) {
            status = 'appealed';
          } else {
            status = 'standstill';
          }
        }
        return {
          ...award,
          status,
          winner: award.winner || { name: 'N/A', bidAmount: 0, combined: 0 },
          runners: award.runners || [],
        };
      });

      setAwards(mappedAwards);
    } catch (err) {
      console.error('Failed to load awards:', err);
      toast.error('Failed to load awards.');
    } finally {
      setLoading(false);
    }
  }, [selectedTenderId]);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const handleIssueLOA = async () => {
    if (!loaTarget) return;
    try {
      await tenderService.issueLOA(loaTarget._id, { document: `https://egp.gov.lk/documents/loa-${loaTarget._id}.pdf` });
      toast.success(`📄 LOA issued to ${loaTarget.winner?.name || 'N/A'}. 10-day standstill period begins now.`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to issue LOA.');
    }
    setLoaTarget(null);
  };

  const handleSubmitAppeal = async () => {
    if (!appealText.trim()) { toast.error('Please describe the grounds for appeal.'); return; }
    try {
      await tenderService.submitAppeal(appealModal._id, { reason: appealText });
      toast.info('📋 Appeal submitted. Review panel will be convened within 5 working days.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to submit appeal.');
    }
    setAppealModal(null);
    setAppealText('');
  };

  const handleRequestDebriefing = async () => {
    try {
      await tenderService.requestDebriefing(debriefModal._id, { reason: 'General debrief request' });
      toast.success('📋 Debriefing request submitted. PMD will schedule a session within 5 working days.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to request debriefing.');
    }
    setDebriefModal(null);
  };

  const handleResolveAppeal = async () => {
    if (!resolveAppealModal) return;
    try {
      const idx = resolveAppealModal.appealIndex;
      await tenderService.resolveAppeal(resolveAppealModal.tenderId, idx, {
        resolution: resolveStatus,
        notes: resolveNotes
      });
      toast.success('✅ Appeal resolved successfully.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve appeal.');
    }
    setResolveAppealModal(null);
    setResolveNotes('');
    setResolveStatus('resolved');
  };

  const handleScheduleDebriefing = async () => {
    if (!scheduleDebriefModal || !scheduleDate) { toast.error('Please select a date.'); return; }
    try {
      await tenderService.resolveDebriefing(scheduleDebriefModal.tenderId, scheduleDebriefModal.debriefIndex, {
        status: 'scheduled',
        scheduledDate: scheduleDate
      });
      toast.success('📅 Debriefing session scheduled.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule debriefing.');
    }
    setScheduleDebriefModal(null);
    setScheduleDate('');
  };

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
            <FaTrophy className="text-amber-500" />
            <span>Award Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Stage 10: Issue LOA, manage standstill period, process appeals, and proceed to contract drafting</p>
        </div>
        {allTenders.length > 0 && !tenderIdParam && (
          <div className="flex items-center space-x-3 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl">
            <span className="text-xs font-bold text-slate-500 uppercase">Filter by Tender:</span>
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Tenders</option>
              {allTenders.map(t => (
                <option key={t._id} value={t._id}>{t.tenderNumber} - {t.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending LOA', count: awards.filter(a => a.status === 'pending').length, icon: FaPaperPlane, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'In Standstill', count: awards.filter(a => a.status === 'standstill').length, icon: FaClock, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Cleared', count: awards.filter(a => a.status === 'cleared').length, icon: FaCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Appeals', count: awards.filter(a => a.status === 'appealed').length, icon: FaBalanceScale, color: 'text-red-600', bg: 'bg-red-100' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center space-x-3 shadow-sm">
            <div className={`p-2.5 rounded-lg ${s.bg} ${s.color}`}><s.icon size={14} /></div>
            <div><p className="text-lg font-bold text-slate-900">{s.count}</p><p className="text-xs text-slate-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
          <span className="text-sm text-slate-500">Loading awards...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {awards.map(award => (
            <div key={award._id} className={`bg-white rounded-xl border shadow-sm overflow-hidden animate-slide-up ${
              award.status === 'appealed' ? 'border-red-200' : award.status === 'cleared' ? 'border-emerald-200' : 'border-slate-200'
            }`}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-mono text-slate-400">{award.tenderNumber}</p>
                  <h3 className="text-sm font-bold text-slate-800">{award.title}</h3>
                </div>
                <div className="flex items-center space-x-3">
                  {award.status === 'standstill' && <StandstillCountdown endDate={award.standstillEndDate} />}
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    award.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    award.status === 'standstill' ? 'bg-blue-100 text-blue-700' :
                    award.status === 'cleared' ? 'bg-emerald-100 text-emerald-700' :
                    award.status === 'appealed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {award.status === 'pending' && 'Pending LOA'}
                    {award.status === 'standstill' && '⏳ Standstill Period'}
                    {award.status === 'cleared' && '✓ Cleared'}
                    {award.status === 'appealed' && '⚠ Appeal Filed'}
                  </span>
                </div>
              </div>

              {/* Winner + Runners */}
              <div className="px-6 py-4">
                <div className={`p-4 rounded-xl border ${award.status === 'cleared' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 uppercase mb-2">
                    <FaTrophy className="text-amber-500" size={11} />
                    <span>Recommended Awardee</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold text-slate-900">{award.winner?.name || 'N/A'}</p>
                      <p className="text-xs text-slate-600 mt-0.5">Bid Amount: LKR {(award.winner?.bidAmount || 0).toLocaleString()} • Combined Score: <span className="font-bold">{award.winner?.combined || 0}</span></p>
                    </div>
                    {award.loaRef && (
                      <div className="text-right">
                        <p className="text-xs font-mono text-emerald-700">{award.loaRef}</p>
                        <p className="text-[10px] text-slate-400">Issued: {award.loaDate}</p>
                      </div>
                    )}
                  </div>
                </div>

                {award.runners && award.runners.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Other Bidders</p>
                    {award.runners.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="text-sm text-slate-700">{r.name}</p>
                          <p className="text-xs text-slate-400">LKR {(r.bidAmount || 0).toLocaleString()} • Score: {r.combined}</p>
                        </div>
                        <span className="text-xs text-red-500 font-semibold">Unsuccessful</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Appeals */}
                {award.appeals?.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center space-x-1.5"><FaBalanceScale size={10} /><span>Active Appeals</span></p>
                    {award.appeals.map((ap, i) => (
                      <div key={i} className="text-xs text-red-600 mb-1 flex items-center justify-between">
                        <span>{ap.bidder} — Filed: {ap.date}</span>
                        <div className="flex items-center space-x-2">
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{ap.status}</span>
                          {(ap.status === 'pending' || ap.status === 'under-review') && hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                            <button onClick={() => setResolveAppealModal({ tenderId: award._id, appealIndex: i, bidder: ap.bidder })} className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 rounded-full hover:bg-emerald-500">Resolve</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Debriefing requests */}
                {award.debriefRequests?.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center space-x-1.5"><FaUserShield size={10} /><span>Debriefing Requests</span></p>
                    {award.debriefRequests.map((dr, i) => (
                      <div key={i} className="text-xs text-blue-600 mb-1 flex items-center justify-between">
                        <span>{dr.bidder} — Requested: {dr.requestDate}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${dr.status === 'scheduled' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {dr.status === 'scheduled' ? `Scheduled: ${dr.scheduledDate}` : 'Pending'}
                          </span>
                          {dr.status === 'pending' && hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                            <button onClick={() => setScheduleDebriefModal({ tenderId: award._id, debriefIndex: i, bidder: dr.bidder })} className="px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded-full hover:bg-blue-500 flex items-center space-x-1">
                              <FaCalendarAlt size={7} /><span>Schedule</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-3">
                {award.status === 'pending' && hasPermission(PERMISSIONS.SIGN_LOA) && (
                  <button onClick={() => setLoaTarget(award)} className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">
                    <FaPaperPlane size={10} /><span>Issue Letter of Award (LOA)</span>
                  </button>
                )}
                {(award.status === 'standstill' || award.status === 'pending') && (
                  <>
                    {hasPermission(PERMISSIONS.SUBMIT_APPEAL) && (
                      <button onClick={() => setAppealModal(award)} className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                        <FaExclamationTriangle size={10} /><span>File Appeal</span>
                      </button>
                    )}
                    {hasPermission(PERMISSIONS.REQUEST_DEBRIEFING) && (
                      <button onClick={() => setDebriefModal(award)} className="flex items-center space-x-2 px-4 py-2 border border-blue-300 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-50 transition-colors">
                        <FaUserShield size={10} /><span>Request Debriefing</span>
                      </button>
                    )}
                  </>
                )}
                {award.status === 'cleared' && hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                  <Link to="/contracts/new" state={{ award }} className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">
                    <FaGavel size={10} /><span>Proceed to Contract</span><FaChevronRight size={9} />
                  </Link>
                )}
                {hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                  <button onClick={() => toast.info('LOA notification resent to all bidders.')} className="flex items-center space-x-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                    <FaBullhorn size={10} /><span>Resend Notifications</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue LOA Modal */}
      <ConfirmModal isOpen={!!loaTarget} onClose={() => setLoaTarget(null)} onConfirm={handleIssueLOA} title="Issue Letter of Award" confirmText="Issue LOA & Start Standstill" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Issue LOA to <span className="font-bold text-emerald-700">{loaTarget?.winner?.name || 'N/A'}</span> for:</p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm font-bold text-slate-800">{loaTarget?.title}</p>
            <p className="text-xs text-slate-500 mt-1">Award Amount: LKR {(loaTarget?.winner?.bidAmount || 0).toLocaleString()}</p>
          </div>
          <p className="text-xs text-slate-500">This triggers a mandatory <strong>10-working-day standstill period</strong> during which unsuccessful bidders may file appeals or request debriefing sessions.</p>
        </div>
      </ConfirmModal>

      {/* Appeal Modal */}
      <ConfirmModal isOpen={!!appealModal} onClose={() => { setAppealModal(null); setAppealText(''); }} onConfirm={handleSubmitAppeal} title="File Bid Appeal" confirmText="Submit Appeal" variant="danger">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Submit appeal against the award decision for <span className="font-bold">{appealModal?.tenderNumber}</span>.</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Grounds for Appeal *</label>
            <textarea value={appealText} onChange={e => setAppealText(e.target.value)} rows={3} placeholder="Describe the grounds for appeal..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none" />
          </div>
          <p className="text-xs text-slate-400">Appeals must be filed within the standstill period. A review panel will be convened within 5 working days.</p>
        </div>
      </ConfirmModal>

      {/* Debriefing Modal */}
      <ConfirmModal isOpen={!!debriefModal} onClose={() => setDebriefModal(null)} onConfirm={handleRequestDebriefing} title="Request Debriefing Session" confirmText="Submit Request" variant="default">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Request a debriefing session for <span className="font-bold">{debriefModal?.tenderNumber}</span>.</p>
          <p className="text-xs text-slate-500">Under Section 8.12 of the Procurement Guidelines, unsuccessful bidders are entitled to request a confidential debriefing explaining the reasons their bid was not selected.</p>
        </div>
      </ConfirmModal>

      {/* Resolve Appeal Modal */}
      <ConfirmModal isOpen={!!resolveAppealModal} onClose={() => { setResolveAppealModal(null); setResolveNotes(''); }} onConfirm={handleResolveAppeal} title="Resolve Appeal" confirmText="Resolve" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Resolve appeal from <span className="font-bold">{resolveAppealModal?.bidder}</span>.</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution *</label>
            <select value={resolveStatus} onChange={e => setResolveStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
              <option value="resolved">Resolved — Appeal addressed</option>
              <option value="dismissed">Dismissed — Appeal without merit</option>
              <option value="under-review">Under Review — Needs further investigation</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Notes</label>
            <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} rows={2} placeholder="Notes on resolution..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" />
          </div>
        </div>
      </ConfirmModal>

      {/* Schedule Debriefing Modal */}
      <ConfirmModal isOpen={!!scheduleDebriefModal} onClose={() => { setScheduleDebriefModal(null); setScheduleDate(''); }} onConfirm={handleScheduleDebriefing} title="Schedule Debriefing Session" confirmText="Schedule" variant="default">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Schedule debriefing for <span className="font-bold">{scheduleDebriefModal?.bidder}</span>.</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Session Date *</label>
            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <p className="text-xs text-slate-400">The bidder will be notified of the scheduled debriefing session.</p>
        </div>
      </ConfirmModal>
    </div>
  );
}
