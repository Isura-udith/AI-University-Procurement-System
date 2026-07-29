import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaTrophy,
  FaGavel,
  FaClock,
  FaChevronRight,
  FaChevronDown,
  FaExclamationTriangle,
  FaCheckCircle,
  FaPaperPlane,
  FaUserShield,
  FaSpinner,
  FaBalanceScale,
  FaBullhorn,
  FaCalendarAlt,
  FaTimes,
  FaSearch,
  FaFilter,
  FaFileAlt,
  FaListOl,
  FaCheck
} from 'react-icons/fa';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import usePermissions from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';

const STANDSTILL_DURATION_DAYS = 10;

const calcRemainingTime = (endDate) => {
  if (!endDate) return { expired: true, percent: 100, days: 0, hours: 0, minutes: 0 };
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  const diff = end - now;

  if (diff <= 0) return { expired: true, percent: 100, days: 0, hours: 0, minutes: 0 };

  const totalMs = STANDSTILL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const elapsed = totalMs - diff;
  const percent = Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100)));

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { expired: false, percent, days, hours, minutes };
};

function StandstillCountdown({ endDate, compact = false }) {
  const [left, setLeft] = useState(() => calcRemainingTime(endDate));
  const [prevEndDate, setPrevEndDate] = useState(endDate);

  if (endDate !== prevEndDate) {
    setPrevEndDate(endDate);
    setLeft(calcRemainingTime(endDate));
  }

  useEffect(() => {
    if (!endDate) return;
    const t = setInterval(() => setLeft(calcRemainingTime(endDate)), 30000);
    return () => clearInterval(t);
  }, [endDate]);

  if (!endDate) return null;

  if (left.expired) {
    return (
      <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
        <FaCheckCircle size={10} />
        <span>Standstill Complete</span>
      </span>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-1.5 text-xs bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
        <FaClock className="text-amber-500 animate-pulse" size={11} />
        <span className="font-bold text-amber-800">
          {left.days}d {left.hours}h remaining
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl">
      <div className="flex items-center justify-between text-xs font-bold text-amber-900">
        <span className="flex items-center space-x-1.5">
          <FaClock className="text-amber-500 animate-spin-slow" size={12} />
          <span>Active Standstill Period</span>
        </span>
        <span>
          {left.days}d {left.hours}h {left.minutes}m remaining
        </span>
      </div>
      <div className="w-full bg-amber-200/70 h-2 rounded-full overflow-hidden">
        <div
          className="bg-linear-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-500"
          style={{ width: `${left.percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-amber-700 font-medium pt-0.5">
        <span>{left.percent}% Elapsed</span>
        <span>End Date: {new Date(endDate).toLocaleDateString()}</span>
      </div>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, pending, standstill, cleared, appealed, debriefing

  const [cardTabs, setCardTabs] = useState({});

  // Header tender filter searchable combobox state
  const tenderDropdownRef = useRef(null);
  const [isTenderDropdownOpen, setIsTenderDropdownOpen] = useState(false);
  const [headerTenderFilterSearch, setHeaderTenderFilterSearch] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tenderDropdownRef.current && !tenderDropdownRef.current.contains(event.target)) {
        setIsTenderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals state
  const [loaTarget, setLoaTarget] = useState(null);
  const [loaRefInput, setLoaRefInput] = useState('');
  const [awardModal, setAwardModal] = useState(null);
  const [awardBidId, setAwardBidId] = useState('');
  const [awardVendorId, setAwardVendorId] = useState('');
  const [awardBids, setAwardBids] = useState([]);
  const [appealModal, setAppealModal] = useState(null);
  const [debriefModal, setDebriefModal] = useState(null);
  const [resolveAppealModal, setResolveAppealModal] = useState(null);
  const [scheduleDebriefModal, setScheduleDebriefModal] = useState(null);
  const [appealText, setAppealText] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  const getCardTab = (awardId) => cardTabs[awardId] || 'overview';
  const setCardTab = (awardId, tab) => {
    setCardTabs((prev) => ({ ...prev, [awardId]: tab }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenderService.getAll({
        status: 'evaluation,awarded,loa_issued,standstill,cleared,appealed',
      });
      const items = res.data || res || [];
      const fetchedTenders = Array.isArray(items) ? items : [];
      setAllTenders(fetchedTenders);

      let finalTenders = [...fetchedTenders];

      if (selectedTenderId) {
        const exists = fetchedTenders.some((t) => t._id === selectedTenderId);
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
          finalTenders = fetchedTenders.filter((t) => t._id === selectedTenderId);
        }
      }

      const mappedAwards = finalTenders.map((award) => {
        let status = award.status;
        if (status === 'awarded') {
          status = 'pending';
        } else if (status === 'loa_issued' || status === 'standstill') {
          const isStandstillExpired =
            award.standstillEndDate && new Date(award.standstillEndDate) < new Date();
          const hasActiveAppeals =
            award.appeals &&
            award.appeals.some((ap) => ap.status === 'pending' || ap.status === 'under-review');

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
          appeals: award.appeals || [],
          debriefRequests: award.debriefRequests || [],
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
      const payload = {
        document: `https://egp.gov.lk/documents/loa-${loaTarget._id}.pdf`,
        loaRef: loaRefInput || `LOA-${loaTarget.tenderNumber || loaTarget._id.slice(-6).toUpperCase()}`,
      };
      await tenderService.issueLOA(loaTarget._id, payload);
      toast.success(
        `📄 LOA issued to ${loaTarget.winner?.name || 'N/A'}. 10-day standstill period begins now.`
      );
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to issue LOA.');
    }
    setLoaTarget(null);
    setLoaRefInput('');
  };

  const handleSubmitAppeal = async () => {
    if (!appealText.trim()) {
      toast.error('Please describe the grounds for appeal.');
      return;
    }
    try {
      await tenderService.submitAppeal(appealModal._id, { reason: appealText });
      toast.info('Appeal submitted. Review panel will be convened within 5 working days.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to submit appeal.');
    }
    setAppealModal(null);
    setAppealText('');
  };

  const handleRequestDebriefing = async () => {
    try {
      await tenderService.requestDebriefing(debriefModal._id, {
        reason: 'General debriefing request on evaluation scores',
      });
      toast.success(
        'Debriefing request submitted. Procurement Division will schedule a session within 5 working days.'
      );
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to request debriefing.');
    }
    setDebriefModal(null);
  };

  const handleOpenAwardModal = async (award) => {
    try {
      const bidsRes = await tenderService.getBids(award._id);
      const bids = Array.isArray(bidsRes.data || bidsRes) ? bidsRes.data || bidsRes : [];
      const evaluatedBids = bids.filter((b) => !['withdrawn', 'rejected'].includes(b.status));
      setAwardBids(evaluatedBids);
      if (evaluatedBids.length > 0) {
        setAwardBidId(evaluatedBids[0]._id);
        setAwardVendorId(evaluatedBids[0].vendorId?._id || evaluatedBids[0].vendorId);
      }
      setAwardModal(award);
    } catch (err) {
      toast.error(err?.message || 'Failed to load bids for awarding.');
    }
  };

  const handleAwardTender = async () => {
    if (!awardBidId) {
      toast.error('Please select a bid to award.');
      return;
    }
    try {
      const selectedBid = awardBids.find((b) => b._id === awardBidId);
      await tenderService.awardTender(awardModal._id, {
        bidId: awardBidId,
        vendorId: awardVendorId || selectedBid?.vendorId?._id || selectedBid?.vendorId,
        amount: selectedBid?.totalBidAmount || 0,
      });
      toast.success(
        `Tender awarded to ${
          selectedBid?.vendorId?.companyName || 'selected vendor'
        }! Standstill period starts after LOA issuance.`
      );
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to award tender.');
    }
    setAwardModal(null);
    setAwardBidId('');
    setAwardBids([]);
  };

  const handleResolveAppeal = async () => {
    if (!resolveAppealModal) return;
    try {
      const idx = resolveAppealModal.appealIndex;
      await tenderService.resolveAppeal(resolveAppealModal.tenderId, idx, {
        resolution: resolveStatus,
        notes: resolveNotes,
      });
      toast.success('Appeal resolved successfully.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve appeal.');
    }
    setResolveAppealModal(null);
    setResolveNotes('');
    setResolveStatus('resolved');
  };

  const handleScheduleDebriefing = async () => {
    if (!scheduleDebriefModal || !scheduleDate) {
      toast.error('Please select a session date.');
      return;
    }
    try {
      await tenderService.resolveDebriefing(
        scheduleDebriefModal.tenderId,
        scheduleDebriefModal.debriefIndex,
        {
          status: 'scheduled',
          scheduledDate: scheduleDate,
          notes: scheduleNotes,
        }
      );
      toast.success('Debriefing session scheduled successfully.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule debriefing.');
    }
    setScheduleDebriefModal(null);
    setScheduleDate('');
    setScheduleNotes('');
  };

  // Filtered awards based on search & filter tabs
  const filteredAwards = awards.filter((award) => {
    const matchesSearch =
      searchTerm === '' ||
      award.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      award.tenderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      award.winner?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'pending') return award.status === 'pending';
    if (activeFilter === 'standstill') return award.status === 'standstill';
    if (activeFilter === 'cleared') return award.status === 'cleared';
    if (activeFilter === 'appealed') return award.status === 'appealed' || award.appeals?.length > 0;
    if (activeFilter === 'debriefing') return award.debriefRequests?.length > 0;

    return true;
  });

  const selectedTenderObj = allTenders.find((t) => t._id === selectedTenderId);

  const searchedTendersList = allTenders.filter((t) => {
    if (!headerTenderFilterSearch) return true;
    const q = headerTenderFilterSearch.toLowerCase();
    return (
      t.tenderNumber?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl relative z-20">
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 flex items-center space-x-3">
              <span>Award & Standstill Management</span>
            </h1>
          </div>

          {/* Direct Searchable Tender Selector */}
          {allTenders.length > 0 && !tenderIdParam && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-inner min-w-75 max-w-sm relative" ref={tenderDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider"> 
                  Filter by Tender:
                </label>
                {selectedTenderId && (
                  <button
                    onClick={() => {
                      setSelectedTenderId('');
                      setHeaderTenderFilterSearch('');
                    }}
                    className="text-[10px] text-emerald-300 hover:text-emerald-200 hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <FaTimes size={8} />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>

              {/* Direct Search Input Box */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" size={11} />
                <input
                  type="text"
                  value={
                    isTenderDropdownOpen
                      ? headerTenderFilterSearch
                      : selectedTenderObj
                      ? `${selectedTenderObj.tenderNumber} - ${selectedTenderObj.title}`
                      : headerTenderFilterSearch
                  }
                  onFocus={() => {
                    setIsTenderDropdownOpen(true);
                    if (selectedTenderObj && !headerTenderFilterSearch) {
                      setHeaderTenderFilterSearch('');
                    }
                  }}
                  onChange={(e) => {
                    setHeaderTenderFilterSearch(e.target.value);
                    if (!isTenderDropdownOpen) setIsTenderDropdownOpen(true);
                  }}
                  placeholder={`Search from ${allTenders.length} tenders...`}
                  className="w-full pl-8 pr-16 py-2 bg-slate-900/90 text-white placeholder-slate-400 text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  {(headerTenderFilterSearch || selectedTenderId) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTenderId('');
                        setHeaderTenderFilterSearch('');
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Clear search"
                    >
                      <FaTimes size={10} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTenderDropdownOpen(!isTenderDropdownOpen)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <FaChevronDown
                      className={`transition-transform duration-200 ${
                        isTenderDropdownOpen ? 'rotate-180' : ''
                      }`}
                      size={10}
                    />
                  </button>
                </div>
              </div>

              {/* Dropdown Popup with Status Badges */}
              {isTenderDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-84 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                  <div className="p-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Select Tender</span>
                    <span>{searchedTendersList.length} Found</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTenderId('');
                        setHeaderTenderFilterSearch('');
                        setIsTenderDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                        selectedTenderId === '' ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <FaFilter size={10} className="text-emerald-400" />
                        <span>All Active Tenders ({allTenders.length})</span>
                      </div>
                      {selectedTenderId === '' && <FaCheck className="text-emerald-400" size={10} />}
                    </button>

                    {searchedTendersList.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-[11px] space-y-1">
                        <p>No tenders match "{headerTenderFilterSearch}"</p>
                        <button
                          type="button"
                          onClick={() => setHeaderTenderFilterSearch('')}
                          className="text-emerald-400 hover:underline font-bold text-[10px]"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      searchedTendersList.map((t) => {
                        const isSelected = selectedTenderId === t._id;
                        return (
                          <button
                            key={t._id}
                            type="button"
                            onClick={() => {
                              setSelectedTenderId(t._id);
                              setHeaderTenderFilterSearch('');
                              setIsTenderDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-800/80 transition-colors flex items-start justify-between space-x-2 ${
                              isSelected ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'text-slate-300'
                            }`}
                          >
                            <div className="truncate flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                                  {t.tenderNumber}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400 capitalize">
                                  {t.status}
                                </span>
                              </div>
                              <span className="text-xs truncate block mt-0.5">{t.title}</span>
                            </div>
                            {isSelected && <FaCheck className="text-emerald-400 shrink-0 mt-1" size={10} />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Header & Interactive Filter Toggles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            key: 'all',
            label: 'All Awards',
            count: awards.length,
            icon: FaTrophy,
            color: 'text-slate-700',
            bg: 'bg-slate-100',
            activeBorder: 'border-slate-500',
          },
          {
            key: 'pending',
            label: 'Pending LOA',
            count: awards.filter((a) => a.status === 'pending').length,
            icon: FaPaperPlane,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            activeBorder: 'border-amber-500',
          },
          {
            key: 'standstill',
            label: 'In Standstill',
            count: awards.filter((a) => a.status === 'standstill').length,
            icon: FaClock,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            activeBorder: 'border-blue-500',
          },
          {
            key: 'cleared',
            label: 'Cleared',
            count: awards.filter((a) => a.status === 'cleared').length,
            icon: FaCheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            activeBorder: 'border-emerald-500',
          },
          {
            key: 'appealed',
            label: 'Appeals',
            count: awards.filter((a) => a.status === 'appealed' || a.appeals?.length > 0).length,
            icon: FaBalanceScale,
            color: 'text-red-600',
            bg: 'bg-red-50',
            activeBorder: 'border-red-500',
          },
          {
            key: 'debriefing',
            label: 'Debriefings',
            count: awards.filter((a) => a.debriefRequests?.length > 0).length,
            icon: FaUserShield,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            activeBorder: 'border-purple-500',
          },
        ].map((s) => {
          const isActive = activeFilter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveFilter(s.key)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 shadow-sm flex items-center justify-between ${
                isActive
                  ? `bg-white ${s.activeBorder} ring-2 ring-emerald-500/20 shadow-md`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <p className="text-xl font-black text-slate-900">{s.count}</p>
                <p className="text-xs font-semibold text-slate-500">{s.label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>
                <s.icon size={16} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tender no, title or winner..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FaTimes size={10} />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
          <span>Showing <strong className="text-slate-800">{filteredAwards.length}</strong> of {awards.length} awards</span>
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="text-emerald-600 hover:underline font-semibold ml-2"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 flex flex-col items-center justify-center space-y-3">
          <FaSpinner className="animate-spin text-emerald-600" size={28} />
          <span className="text-sm font-medium text-slate-600">Loading award & standstill records...</span>
        </div>
      ) : filteredAwards.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <FaTrophy size={20} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Award Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No awards matching "${searchTerm}" found.`
              : 'There are currently no tenders in evaluation, awarded, or standstill stage.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAwards.map((award) => {
            const currentTab = getCardTab(award._id);
            const activeAppealsCount = award.appeals?.length || 0;
            const activeDebriefCount = award.debriefRequests?.length || 0;
            const runnerCount = award.runners?.length || 0;

            return (
              <div
                key={award._id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${
                  award.status === 'appealed'
                    ? 'border-red-200 ring-1 ring-red-300/40'
                    : award.status === 'cleared'
                    ? 'border-emerald-200 ring-1 ring-emerald-300/40'
                    : award.status === 'standstill'
                    ? 'border-blue-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Award Card Top Bar Header */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {award.tenderNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-medium">{award.category || 'Goods & Services'}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{award.title}</h2>
                  </div>

                  <div className="flex items-center space-x-3">
                    {award.status === 'standstill' && (
                      <StandstillCountdown endDate={award.standstillEndDate} compact={true} />
                    )}
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        award.status === 'pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : award.status === 'standstill'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : award.status === 'cleared'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : award.status === 'appealed'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {award.status === 'pending' && 'Pending LOA'}
                      {award.status === 'standstill' && 'Active Standstill'}
                      {award.status === 'cleared' && 'Standstill Cleared'}
                      {award.status === 'appealed' && 'Under Appeal'}
                      {award.status === 'evaluation' && 'In Evaluation'}
                    </span>
                  </div>
                </div>

                {/* Card Navigation Tabs */}
                <div className="border-b border-slate-200 bg-white px-6 flex items-center space-x-1 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'overview', label: 'Overview & Awardee', icon: FaTrophy },
                    { id: 'standstill', label: 'Standstill Tracker', icon: FaClock },
                    {
                      id: 'appeals',
                      label: `Appeals (${activeAppealsCount})`,
                      icon: FaBalanceScale,
                      badgeColor: activeAppealsCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500',
                    },
                    {
                      id: 'debriefing',
                      label: `Debriefings (${activeDebriefCount})`,
                      icon: FaUserShield,
                      badgeColor: activeDebriefCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500',
                    },
                    { id: 'bidders', label: `All Bidders (${runnerCount + 1})`, icon: FaListOl },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCardTab(award._id, tab.id)}
                      className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all whitespace-nowrap ${
                        currentTab === tab.id
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <tab.icon size={12} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content Body */}
                <div className="p-6">
                  {/* TAB 1: OVERVIEW & AWARDEE */}
                  {currentTab === 'overview' && (
                    <div className="space-y-4">
                      {/* Winner Recommendation Banner */}
                      <div className="p-5 rounded-2xl border bg-linear-to-br from-amber-50/90 via-white to-amber-50/40 border-amber-200 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start space-x-3.5">
                            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md">
                              <FaTrophy size={20} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
                                  Recommended Awardee (#1 Rank)
                                </span>
                                {award.winner?.combined && (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Combined Score: {award.winner.combined} / 100
                                  </span>
                                )}
                              </div>
                              <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                                {award.winner?.name || 'Evaluation in progress'}
                              </h3>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Award Value:{' '}
                                <strong className="text-slate-900 text-sm font-black">
                                  LKR {(award.winner?.bidAmount || 0).toLocaleString()}
                                </strong>
                              </p>
                            </div>
                          </div>

                          {/* LOA Ref Pill if issued */}
                          {award.loaRef ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-right">
                              <p className="text-xs font-bold text-emerald-800 flex items-center justify-end space-x-1">
                                <FaCheckCircle className="text-emerald-600" size={10} />
                                <span>LOA Formally Issued</span>
                              </p>
                              <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                                Ref: {award.loaRef}
                              </p>
                              {award.loaDate && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Date: {new Date(award.loaDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="bg-amber-100/50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                              <p className="font-bold flex items-center space-x-1">
                                <span>Pending LOA Issuance</span>
                              </p>
                              <p className="text-[11px] text-amber-700 mt-0.5">
                                Issue LOA to formally notify awardee and trigger standstill.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Procurement Clearance Checklist Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">TEC Recommendation</p>
                          <p className="text-xs font-bold text-slate-800 mt-1 flex items-center space-x-1.5">
                            <span>Passed Technical & Financial</span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">Standstill Status</p>
                          <p className="text-xs font-bold text-slate-800 mt-1">
                            {award.status === 'cleared' ? 'Cleared for Contract' : award.status === 'standstill' ? '⏳ 10-Day Period Active' : 'Pending LOA'}
                          </p>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">Contract Handover</p>
                          <p className="text-xs font-bold text-slate-800 mt-1">
                            {award.status === 'cleared' ? 'Ready for Drafting' : 'Locked until Standstill End'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: STANDSTILL TRACKER */}
                  {currentTab === 'standstill' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                              <FaClock className="text-amber-500" />
                              <span>Statutory Standstill Period Compliance</span>
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Enforced under Section 8.11 of Sri Lanka Public Procurement Guidelines.
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                            10 Working Days Mandatory
                          </span>
                        </div>

                        {award.standstillEndDate ? (
                          <StandstillCountdown endDate={award.standstillEndDate} compact={false} />
                        ) : (
                          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                            Standstill countdown will commence immediately once the Letter of Award is issued.
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-slate-400 font-medium">Standstill Start Date:</span>
                            <p className="font-bold text-slate-800 mt-0.5">
                              {award.loaDate ? new Date(award.loaDate).toLocaleDateString() : 'N/A (Pending LOA)'}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-slate-400 font-medium">Appeal Cutoff Deadline:</span>
                            <p className="font-bold text-slate-800 mt-0.5">
                              {award.standstillEndDate
                                ? new Date(award.standstillEndDate).toLocaleString()
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: APPEALS PANEL */}
                  {currentTab === 'appeals' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <FaBalanceScale className="text-red-500" />
                          <span>Submitted Bidder Appeals</span>
                        </h4>
                        {hasPermission(PERMISSIONS.SUBMIT_APPEAL) &&
                          (award.status === 'standstill' || award.status === 'pending') && (
                            <button
                              onClick={() => setAppealModal(award)}
                              className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center space-x-1.5"
                            >
                              <FaExclamationTriangle size={10} />
                              <span>File New Appeal</span>
                            </button>
                          )}
                      </div>

                      {award.appeals?.length === 0 ? (
                        <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <FaCheckCircle className="text-emerald-500 mx-auto mb-2" size={20} />
                          <p className="text-xs font-bold text-slate-700">No Appeals Filed</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            No unsuccessful bidders have lodged an appeal against this tender award.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {award.appeals.map((ap, i) => (
                            <div
                              key={i}
                              className="p-4 bg-red-50/50 border border-red-200 rounded-xl space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">
                                  Appellant: <span className="text-red-700">{ap.bidder || 'Bidding Vendor'}</span>
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                      ap.status === 'resolved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : ap.status === 'dismissed'
                                        ? 'bg-slate-200 text-slate-700'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {ap.status || 'Pending'}
                                  </span>
                                  {(ap.status === 'pending' || ap.status === 'under-review') &&
                                    hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                                      <button
                                        onClick={() =>
                                          setResolveAppealModal({
                                            tenderId: award._id,
                                            appealIndex: i,
                                            bidder: ap.bidder,
                                          })
                                        }
                                        className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-sm"
                                      >
                                        Review & Resolve
                                      </button>
                                    )}
                                </div>
                              </div>
                              <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-red-100">
                                <strong>Grounds:</strong> {ap.reason || ap.grounds || 'No grounds specified.'}
                              </p>
                              {ap.resolutionNotes && (
                                <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                                  <strong>Resolution Notes:</strong> {ap.resolutionNotes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: DEBRIEFING REQUESTS */}
                  {currentTab === 'debriefing' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <FaUserShield className="text-purple-600" />
                          <span>Debriefing Sessions Management</span>
                        </h4>
                        {hasPermission(PERMISSIONS.REQUEST_DEBRIEFING) &&
                          (award.status === 'standstill' || award.status === 'pending') && (
                            <button
                              onClick={() => setDebriefModal(award)}
                              className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors flex items-center space-x-1.5"
                            >
                              <FaUserShield size={10} />
                              <span>Request Debriefing</span>
                            </button>
                          )}
                      </div>

                      {award.debriefRequests?.length === 0 ? (
                        <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <FaUserShield className="text-purple-400 mx-auto mb-2" size={20} />
                          <p className="text-xs font-bold text-slate-700">No Debriefing Requests</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Unsuccessful bidders can request confidential debriefing sessions within 5 days.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {award.debriefRequests.map((dr, i) => (
                            <div
                              key={i}
                              className="p-4 bg-purple-50/40 border border-purple-200 rounded-xl space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">
                                  Bidder: <span className="text-purple-800">{dr.bidder || 'Vendor'}</span>
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      dr.status === 'scheduled'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {dr.status === 'scheduled'
                                      ? `Scheduled: ${new Date(dr.scheduledDate).toLocaleDateString()}`
                                      : 'Pending Schedule'}
                                  </span>
                                  {dr.status === 'pending' &&
                                    hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                                      <button
                                        onClick={() =>
                                          setScheduleDebriefModal({
                                            tenderId: award._id,
                                            debriefIndex: i,
                                            bidder: dr.bidder,
                                          })
                                        }
                                        className="px-2.5 py-1 text-[10px] font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-500 shadow-sm flex items-center space-x-1"
                                      >
                                        <FaCalendarAlt size={8} />
                                        <span>Schedule Session</span>
                                      </button>
                                    )}
                                </div>
                              </div>
                              {dr.notes && (
                                <p className="text-xs text-slate-600 bg-white p-2 rounded border border-purple-100">
                                  Notes: {dr.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: ALL BIDDERS & RANKINGS */}
                  {currentTab === 'bidders' && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">
                        Evaluated Bidders Ranking Summary
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                            <tr>
                              <th className="p-3">Rank</th>
                              <th className="p-3">Vendor / Company</th>
                              <th className="p-3">Total Bid Amount (LKR)</th>
                              <th className="p-3 text-right">Combined Score</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {/* Winner */}
                            <tr className="bg-amber-50/50 font-semibold">
                              <td className="p-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
                                  1
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-900">
                                {award.winner?.name || 'N/A'}
                              </td>
                              <td className="p-3 font-bold text-slate-900">
                                LKR {(award.winner?.bidAmount || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-black text-amber-700">
                                {award.winner?.combined || '—'}
                              </td>
                              <td className="p-3 text-center">
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">
                                  Recommended Winner
                                </span>
                              </td>
                            </tr>

                            {/* Runners */}
                            {award.runners?.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-3 text-slate-400">#{i + 2}</td>
                                <td className="p-3 text-slate-700">{r.name}</td>
                                <td className="p-3 text-slate-700">
                                  LKR {(r.bidAmount || 0).toLocaleString()}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-700">
                                  {r.combined || '—'}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    Unsuccessful
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    {award.loaRef && (
                      <a
                        href={award.loaDocument || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 underline"
                      >
                        <FaFileAlt size={10} />
                        <span>View LOA Document</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {award.status === 'evaluation' && hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                      <button
                        onClick={() => handleOpenAwardModal(award)}
                        className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
                      >
                        <FaTrophy size={11} />
                        <span>Award Tender</span>
                      </button>
                    )}

                    {award.status === 'pending' && hasPermission(PERMISSIONS.SIGN_LOA) && (
                      <button
                        onClick={() => {
                          setLoaTarget(award);
                          setLoaRefInput(
                            `LOA-${award.tenderNumber || award._id.slice(-6).toUpperCase()}`
                          );
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition-colors shadow-md"
                      >
                        <FaPaperPlane size={11} />
                        <span>Issue Letter of Award & Start Standstill</span>
                      </button>
                    )}

                    {award.status === 'cleared' && hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                      <Link
                        to="/contracts/new"
                        state={{ award }}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-extrabold rounded-xl hover:bg-emerald-500 transition-colors shadow-md animate-pulse-subtle"
                      >
                        <FaGavel size={12} />
                        <span>Proceed to Contract Drafting</span>
                        <FaChevronRight size={10} />
                      </Link>
                    )}

                    {hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
                      <button
                        onClick={() => toast.info('LOA notification resent to all bidders.')}
                        className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
                      >
                        <FaBullhorn size={10} />
                        <span>Resend Notifications</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Issue LOA Modal */}
      <ConfirmModal
        isOpen={!!loaTarget}
        onClose={() => {
          setLoaTarget(null);
          setLoaRefInput('');
        }}
        onConfirm={handleIssueLOA}
        title="Issue Letter of Award (LOA)"
        confirmText="Issue LOA & Start 10-Day Standstill"
        variant="success"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Formally issue Letter of Acceptance to recommended vendor{' '}
            <strong className="text-emerald-700 font-bold">{loaTarget?.winner?.name || 'N/A'}</strong>.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1">
            <p className="text-xs font-bold text-slate-900">{loaTarget?.title}</p>
            <p className="text-xs text-slate-600">
              Contract Amount:{' '}
              <strong className="text-emerald-800 font-black">
                LKR {(loaTarget?.winner?.bidAmount || 0).toLocaleString()}
              </strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              LOA Reference Number *
            </label>
            <input
              type="text"
              value={loaRefInput}
              onChange={(e) => setLoaRefInput(e.target.value)}
              placeholder="e.g. LOA-TND-2026-001"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center space-x-1">
              <FaClock size={11} />
              <span>10-Working-Day Statutory Standstill Period</span>
            </p>
            <p className="text-[11px] text-amber-700">
              Issuing LOA automatically triggers the mandatory 10-day standstill period during which unsuccessful bidders may request debriefings or lodge appeals.
            </p>
          </div>
        </div>
      </ConfirmModal>

      {/* MODAL 2: Award Tender Modal */}
      {awardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setAwardModal(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FaTrophy className="text-amber-500" />
                  <span>Award Tender Decision</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {awardModal.tenderNumber} — {awardModal.title}
                </p>
              </div>
              <button
                onClick={() => setAwardModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-semibold text-slate-600">
                Select the winning bid recommended by Technical Evaluation Committee:
              </p>

              {awardBids.length === 0 ? (
                <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-200">
                  No evaluated bids found. Please evaluate submitted bids first.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {awardBids.map((bid) => (
                    <label
                      key={bid._id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                        awardBidId === bid._id
                          ? 'border-amber-400 bg-amber-50/80 shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="awardBid"
                          value={bid._id}
                          checked={awardBidId === bid._id}
                          onChange={() => {
                            setAwardBidId(bid._id);
                            setAwardVendorId(bid.vendorId?._id || bid.vendorId);
                          }}
                          className="accent-amber-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {bid.vendorId?.companyName || 'Unknown Vendor'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Rank #{bid.rank || '1'} • Score: {bid.combinedScore || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-slate-900">
                          LKR {(bid.totalBidAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setAwardModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAwardTender}
                disabled={awardBids.length === 0}
                className="px-5 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 shadow-sm"
              >
                Confirm Award
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: File Appeal Modal */}
      <ConfirmModal
        isOpen={!!appealModal}
        onClose={() => {
          setAppealModal(null);
          setAppealText('');
        }}
        onConfirm={handleSubmitAppeal}
        title="File Bid Appeal Notice"
        confirmText="Submit Official Appeal"
        variant="danger"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Submit formal appeal against the award decision for{' '}
            <strong className="text-slate-900">{appealModal?.tenderNumber}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Grounds for Appeal *
            </label>
            <textarea
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              rows={3}
              placeholder="Detail specific non-compliance or procedural grounds..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500/30 focus:outline-none resize-none"
            />
          </div>
        </div>
      </ConfirmModal>

      {/* MODAL 4: Debriefing Modal */}
      <ConfirmModal
        isOpen={!!debriefModal}
        onClose={() => setDebriefModal(null)}
        onConfirm={handleRequestDebriefing}
        title="Request Debriefing Session"
        confirmText="Submit Debrief Request"
        variant="default"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Request a debriefing session for{' '}
            <strong className="text-slate-900">{debriefModal?.tenderNumber}</strong> under Procurement Section 8.12.
          </p>
        </div>
      </ConfirmModal>

      {/* MODAL 5: Resolve Appeal Modal */}
      <ConfirmModal
        isOpen={!!resolveAppealModal}
        onClose={() => {
          setResolveAppealModal(null);
          setResolveNotes('');
        }}
        onConfirm={handleResolveAppeal}
        title="Resolve Appeal Determination"
        confirmText="Save Resolution"
        variant="success"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Review determination for appellant <strong className="text-slate-900">{resolveAppealModal?.bidder}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Resolution *</label>
            <select
              value={resolveStatus}
              onChange={(e) => setResolveStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none bg-white"
            >
              <option value="resolved">Resolved - Appeal addressed & cleared</option>
              <option value="dismissed">Dismissed - Appeal lacks merit</option>
              <option value="under-review">Under Review - Requires further investigation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Findings / Notes</label>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              rows={2}
              placeholder="Document Procurement Appeals Board determination..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none resize-none"
            />
          </div>
        </div>
      </ConfirmModal>

      {/* MODAL 6: Schedule Debriefing Modal */}
      <ConfirmModal
        isOpen={!!scheduleDebriefModal}
        onClose={() => {
          setScheduleDebriefModal(null);
          setScheduleDate('');
          setScheduleNotes('');
        }}
        onConfirm={handleScheduleDebriefing}
        title="Schedule Debriefing Session"
        confirmText="Schedule Session"
        variant="default"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Schedule session for <strong className="text-slate-900">{scheduleDebriefModal?.bidder}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Session Date & Time *</label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/30 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Session Notes / Link</label>
            <textarea
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
              rows={2}
              placeholder="Location or virtual meeting link..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/30 focus:outline-none resize-none"
            />
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
