import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import {
  FaLockOpen,
  FaLock,
  FaUsers,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaShieldAlt,
  FaVideo,
  FaFileAlt,
  FaChevronRight,
  FaBan,
  FaCheck,
  FaEnvelopeOpenText,
  FaPenFancy,
  FaBoxOpen,
  FaClipboardList,
  FaThumbsUp,
  FaThumbsDown,
  FaChevronDown,
  FaChevronUp,
  FaSearch,
  FaPrint,
  FaUserPlus,
  FaExternalLinkAlt,
  FaMoneyBillWave,
  FaTimes,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import tenderService from "../../../services/tender.service";
import ConfirmModal from "../../../components/ConfirmModal";
import { useSelector } from "react-redux";

const getDownloadUrl = (filePath) => {
  if (!filePath) return '#';
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) return filePath;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
  let cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  if (!cleanPath.startsWith('uploads/') && !cleanPath.startsWith('documents/')) {
    cleanPath = `uploads/${cleanPath}`;
  }
  return `${base}/${cleanPath}`;
};

const DEFAULT_COMMITTEE = [
  { name: "Prof. M. Weerasinghe", role: "Chairperson", present: true },
  { name: "Eng. R. Fernando", role: "Technical Expert", present: true },
  { name: "Mr. S. Gunawardena", role: "PMD Representative", present: true },
  { name: "Dr. K. Jayasuriya", role: "End-User Rep", present: false },
  { name: "Ms. N. Perera", role: "Independent Observer", present: true },
];

/* ─── Bid Status Chip ─── */
function BidStatusChip({ status }) {
  const map = {
    submitted: { cls: "bg-blue-50 text-blue-700 border-blue-200/60", icon: "🔒", label: "Sealed" },
    opened: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60", icon: "🔓", label: "Opened" },
    withdrawn: { cls: "bg-slate-100 text-slate-500 border-slate-200/60", icon: "↩️", label: "Withdrawn" },
    rejected: { cls: "bg-red-50 text-red-700 border-red-200/60", icon: "❌", label: "Rejected" },
  };
  const { cls, icon, label } = map[status] || {
    cls: "bg-slate-50 text-slate-600 border-slate-200/60",
    icon: "●",
    label: status,
  };
  return (
    <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

/* ─── Ceremony Progress Timeline ─── */
function CeremonyTimeline({ currentStep }) {
  const steps = [
    { id: 1, label: "Close Bidding", icon: FaLock },
    { id: 2, label: "Open Bid Box", icon: FaBoxOpen },
    { id: 3, label: "Unseal Bids", icon: FaLockOpen },
    { id: 4, label: "Financial Envelopes", icon: FaEnvelopeOpenText },
    { id: 5, label: "Sign Minutes", icon: FaPenFancy },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between relative gap-4 md:gap-2">
        {/* Desktop Connecting line */}
        <div className="hidden md:block absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0 rounded-full" />
        <div
          className="hidden md:block absolute left-[10%] top-1/2 -translate-y-1/2 h-1 bg-linear-to-r from-emerald-500 to-teal-500 z-0 rounded-full transition-all duration-500"
          style={{ width: `${(Math.min(5, Math.max(1, currentStep)) - 1) * 20}%` }}
        />

        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isPast = currentStep > step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-row md:flex-col items-center w-full md:w-1/5 gap-3 md:gap-0"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm shrink-0 ${
                  isPast
                    ? "bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200"
                    : isActive
                      ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 animate-pulse"
                      : "bg-slate-50 text-slate-400 border border-slate-200"
                }`}
              >
                {isPast ? <FaCheck size={12} /> : <Icon size={14} />}
              </div>
              <div className="flex flex-col md:items-center">
                <p
                  className={`text-[11px] font-bold mt-0 md:mt-2.5 ${
                    isActive
                      ? "text-emerald-700"
                      : isPast
                        ? "text-slate-800"
                        : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[9px] text-slate-400 font-medium md:text-center mt-0.5">
                  {isPast ? "Completed" : isActive ? "In Progress" : "Pending"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BidOpeningPage() {
  const queryParams = new URLSearchParams(useLocation().search);
  const tenderIdParam = queryParams.get("tenderId");
  const { user } = useSelector((s) => s.auth);
  const isProcurement = [
    "procurement_officer",
    "admin",
    "super_admin",
  ].includes(user?.role);

  const [selectedTenderId, setSelectedTenderId] = useState(tenderIdParam || "");
  const [allTenders, setAllTenders] = useState([]);
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [committee, setCommittee] = useState(DEFAULT_COMMITTEE);
  const [loading, setLoading] = useState(true);
  const [openedBids, setOpenedBids] = useState([]);
  const [showPrices, setShowPrices] = useState(false);
  const [ceremonyStarted, setCeremonyStarted] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenderSearchTerm, setTenderSearchTerm] = useState("");
  const [isTenderDropdownOpen, setIsTenderDropdownOpen] = useState(false);
  const tenderDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        tenderDropdownRef.current &&
        !tenderDropdownRef.current.contains(event.target)
      ) {
        setIsTenderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modals
  const [startModal, setStartModal] = useState(false);
  const [unsealModal, setUnsealModal] = useState(null);
  const [completeModal, setCompleteModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [minutesModal, setMinutesModal] = useState(false);

  // New BOC Member state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Independent Observer");

  const [expandedBids, setExpandedBids] = useState({});

  /* ── Load all tenders eligible for bid opening ── */
  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tenderService.getAll();
        const items = res.data || res || [];
        const filtered = (Array.isArray(items) ? items : []).filter((t) =>
          [
            "published",
            "bidding",
            "bid_closed",
            "closed",
            "opening",
            "evaluation",
            "awarded",
            "loa_issued",
          ].includes(t.status)
        );
        setAllTenders(filtered);
        if (!selectedTenderId && filtered.length > 0) {
          setSelectedTenderId(filtered[0]._id);
        }
      } catch (err) {
        toast.error(err?.message || "Failed to load tenders");
      }
    };
    fetchTenders();
  }, [selectedTenderId]);

  /* ── Load tender + bids detail ── */
  const loadDetails = useCallback(async () => {
    if (!selectedTenderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tenderRes, bidsRes] = await Promise.all([
        tenderService.getById(selectedTenderId),
        tenderService.getBids(selectedTenderId),
      ]);
      const t = tenderRes.data || tenderRes;
      const bidsData = Array.isArray(bidsRes.data || bidsRes)
        ? bidsRes.data || bidsRes
        : [];

      setTender({
        ...t,
        closingDate: t.bidSubmissionDeadline,
        openingDate: t.bidOpeningDate,
      });

      // Map committee
      if (t.bocMembers && t.bocMembers.length > 0) {
        setCommittee(
          t.bocMembers.map((m, idx) => ({
            name: m.name || (m.userId ? `${m.userId.firstName} ${m.userId.lastName}` : (DEFAULT_COMMITTEE[idx]?.name || `Committee Member ${idx + 1}`)),
            role: m.role || (DEFAULT_COMMITTEE[idx]?.role || "BOC Representative"),
            present: m.present !== false,
          }))
        );
      } else {
        setCommittee(DEFAULT_COMMITTEE);
      }

      setBids(
        bidsData.map((b) => ({
          _id: b._id,
          vendor: b.vendorId?.companyName || "Unknown Vendor",
          bidNumber: b.bidNumber || "N/A",
          submitted: b.submittedAt
            ? new Date(b.submittedAt).toLocaleDateString("en-LK")
            : "—",
          submittedAtFull: b.submittedAt ? new Date(b.submittedAt).toLocaleString("en-LK") : "—",
          bidAmount: b.totalBidAmount || 0,
          bidSecurity: !!b.bidSecurityDocument || !!b.bidSecurityAmount,
          bidSecurityType: b.bidSecurityType?.replace(/_/g, " ").toUpperCase() || "Bank Guarantee",
          bidSecurityAmount: b.bidSecurityAmount || (b.totalBidAmount ? Math.round(b.totalBidAmount * 0.02) : 0),
          docs: (b.documents || []).map((doc) => doc.name || "Attachment"),
          rawDocs: b.documents || [],
          status: b.status || "submitted",
          deviations: b.status === "rejected" ? ["MAJOR: Disqualified"] : [],
          isSealed: b.isSealed !== false,
          specificationVotes: b.specificationVotes || [],
        }))
      );

      const opened = bidsData
        .filter((b) => b.status !== "submitted" && b.isSealed === false)
        .map((b) => b._id.toString());
      setOpenedBids(opened);

      if (["evaluation", "awarded", "loa_issued"].includes(t.status)) {
        setShowPrices(true);
        setCeremonyStarted(true);
      } else if (t.status === "opening") {
        setCeremonyStarted(true);
      }
    } catch (err) {
      console.error("Failed to load tender details:", err);
      toast.error("Failed to load tender details.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenderId]);

  useEffect(() => {
    Promise.resolve().then(() => loadDetails());
  }, [loadDetails]);

  /* ── Save BOC committee attendance to DB ── */
  const saveCommitteeAttendance = async (updatedCommittee) => {
    try {
      await tenderService.assignCommittee(tender._id, {
        bocMembers: updatedCommittee.map((c) => ({
          name: c.name,
          role: c.role,
          present: c.present,
        })),
      });
      toast.success("BOC Committee attendance updated");
    } catch (err) {
      console.error("Failed to save committee attendance:", err);
    }
  };

  const toggleAttendance = (i) => {
    const updated = [...committee];
    updated[i] = { ...updated[i], present: !updated[i].present };
    setCommittee(updated);
    if (tender?._id) {
      saveCommitteeAttendance(updated);
    }
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      toast.error("Please enter committee member name");
      return;
    }
    const updated = [
      ...committee,
      { name: newMemberName.trim(), role: newMemberRole, present: true },
    ];
    setCommittee(updated);
    setNewMemberName("");
    setAddMemberModal(false);
    toast.success(`Added ${newMemberName} to Committee`);
    if (tender?._id) {
      saveCommitteeAttendance(updated);
    }
  };

  /* ── Actions ── */
  const handleCloseBidding = async () => {
    try {
      await tenderService.closeBidding(tender._id);
      toast.success("Bidding officially closed. Bid box is sealed.");
      setCloseModal(false);
      loadDetails();
    } catch (err) {
      toast.error(err.message || "Failed to close bidding.");
    }
  };

  const handleStartCeremony = async () => {
    try {
      await tenderService.openBidBox(tender._id);
      setCeremonyStarted(true);
      setStartModal(false);
      toast.success("Bid Opening Ceremony started! All bids are ready to be unsealed.");
      loadDetails();
    } catch (err) {
      toast.error(err.message || "Failed to start ceremony.");
    }
  };

  const handleUnsealBid = async (bidId) => {
    try {
      const bid = bids.find((b) => b._id === bidId);
      if (bid) {
        await tenderService.unsealBid(tender._id, bid._id);
        toast.success(`Bid from "${bid.vendor}" unsealed successfully.`);
        loadDetails();
      } else {
        toast.error("Bid not found.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to unseal bid.");
    } finally {
      setUnsealModal(null);
    }
  };

  const handleUnsealAll = async () => {
    try {
      const sealedBids = bids.filter(
        (b) => !openedBids.includes(b._id.toString()) && b.status === "submitted"
      );
      await Promise.all(
        sealedBids.map((b) => tenderService.unsealBid(tender._id, b._id))
      );
      setShowPrices(true);
      toast.success(`All ${bids.length} bids unsealed. Financial envelopes opened.`);
      loadDetails();
    } catch (err) {
      toast.error(err.message || "Failed to unseal all bids.");
    }
  };

  const handleCompleteCeremony = async () => {
    try {
      await tenderService.completeBidOpening(tender._id, {
        committee: committee.map((c) => ({
          name: c.name,
          role: c.role,
          present: c.present,
        })),
      });
      toast.success("Bid Opening Ceremony completed! Official minutes saved to database.");
      setCompleteModal(false);
      loadDetails();
    } catch (err) {
      toast.error(err.message || "Failed to complete bid opening.");
    }
  };

  const quorum = committee.filter((c) => c.present).length;
  const hasQuorum = quorum >= 3;

  const activeBids = bids.filter((b) => b.status !== "withdrawn");
  const allOpened =
    activeBids.length > 0 &&
    activeBids.every((b) => openedBids.includes(b._id.toString()));

  const isDeadlinePassed = tender?.bidSubmissionDeadline
    ? new Date() > new Date(tender.bidSubmissionDeadline)
    : false;
  const canCloseBidding =
    isProcurement &&
    tender &&
    ["published", "bidding"].includes(tender.status) &&
    isDeadlinePassed;
  const canOpen = isProcurement && tender && ["published", "bidding", "bid_closed", "closed"].includes(tender.status);

  // Current step for timeline
  let currentStep = 1;
  if (
    tender?.status === "bid_closed" ||
    tender?.status === "opening" ||
    ["evaluation", "awarded", "loa_issued"].includes(tender?.status)
  ) {
    currentStep = 2;
  }
  if (ceremonyStarted) {
    currentStep = 3;
  }
  if (allOpened) {
    currentStep = 4;
  }
  if (showPrices) {
    currentStep = 5;
  }
  if (["evaluation", "awarded", "loa_issued"].includes(tender?.status)) {
    currentStep = 6;
  }

  // Filtered Bids
  const filteredBids = useMemo(() => {
    return bids.filter((b) => {
      const matchesSearch =
        b.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.bidNumber.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === "opened") return openedBids.includes(b._id.toString());
      if (statusFilter === "sealed") return !openedBids.includes(b._id.toString()) && b.status !== "withdrawn";
      if (statusFilter === "withdrawn") return b.status === "withdrawn";
      return true;
    });
  }, [bids, searchTerm, statusFilter, openedBids]);

  // Summary Stats
  const withdrawnBidsCount = bids.filter((b) => b.status === "withdrawn").length;
  const activeBidsCount = bids.length - withdrawnBidsCount;
  const sealedBidsCount = activeBidsCount - openedBids.length;

  const filteredTenders = useMemo(() => {
    if (!tenderSearchTerm.trim()) return allTenders;
    const q = tenderSearchTerm.toLowerCase();
    return allTenders.filter(
      (t) =>
        (t.tenderNumber || "").toLowerCase().includes(q) ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.status || "").toLowerCase().includes(q)
    );
  }, [allTenders, tenderSearchTerm]);

  const selectedTenderObj = useMemo(
    () => allTenders.find((t) => t._id === selectedTenderId),
    [allTenders, selectedTenderId]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-lg relative">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bid Opening
            </h1>
          </div>
        </div>

        {allTenders.length > 0 && (
          <div ref={tenderDropdownRef} className="relative min-w-72 sm:min-w-88">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                Tender Ref:
              </label>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {filteredTenders.length} {filteredTenders.length === 1 ? "tender" : "tenders"}
              </span>
            </div>

            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setIsTenderDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border border-slate-700 hover:border-emerald-500 rounded-xl text-left text-xs font-semibold text-white transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <div className="truncate pr-2">
                {selectedTenderObj ? (
                  <span className="truncate">
                    <strong className="text-emerald-400 font-bold mr-1.5 font-mono">
                      {selectedTenderObj.tenderNumber}
                    </strong>
                    <span>
                      {selectedTenderObj.title.length > 28
                        ? selectedTenderObj.title.substring(0, 28) + "..."
                        : selectedTenderObj.title}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400">Select tender ref...</span>
                )}
              </div>
              <FaChevronDown
                className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                  isTenderDropdownOpen ? "rotate-180 text-emerald-400" : ""
                }`}
                size={11}
              />
            </button>

            {/* Searchable Dropdown Popup Menu */}
            {isTenderDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-full sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in duration-150">
                {/* Live Search Input */}
                <div className="relative">
                  <FaSearch
                    className="absolute left-3 top-2.5 text-slate-400"
                    size={12}
                  />
                  <input
                    type="text"
                    placeholder="Search by tender #, title or status..."
                    value={tenderSearchTerm}
                    onChange={(e) => setTenderSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-7 py-2 border border-slate-700 rounded-lg text-xs bg-slate-950 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {tenderSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setTenderSearchTerm("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                      title="Clear search"
                    >
                      <FaTimes size={11} />
                    </button>
                  )}
                </div>

                {/* Filtered Tenders List */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredTenders.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No tenders match "{tenderSearchTerm}"
                    </div>
                  ) : (
                    filteredTenders.map((t) => {
                      const isSelected = t._id === selectedTenderId;
                      return (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => {
                            setSelectedTenderId(t._id);
                            setIsTenderDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start justify-between gap-2 border cursor-pointer ${
                            isSelected
                              ? "bg-emerald-950/60 border-emerald-500/50 text-white font-semibold"
                              : "hover:bg-slate-800/80 border-transparent text-slate-300 hover:text-white"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-emerald-400 font-bold text-[11px]">
                                {t.tenderNumber}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 uppercase font-semibold">
                                {t.status}
                              </span>
                            </div>
                            <p className="truncate text-slate-300 text-[11px] mt-0.5">
                              {t.title}
                            </p>
                          </div>
                          {isSelected && (
                            <FaCheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={13} />
                          )}
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <FaSpinner className="animate-spin text-emerald-600 mb-3" size={28} />
          <span className="text-sm font-semibold text-slate-600">Loading tender data & bids...</span>
        </div>
      ) : !tender ? (
        <div className="text-center py-28 text-slate-400 bg-white border border-slate-200 rounded-2xl shadow-sm">
          No tender selected or available for bid opening.
        </div>
      ) : (
        <>
          {/* ── Progress Timeline ── */}
          <CeremonyTimeline currentStep={currentStep} />

          {/* ── Summary Statistics ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total Received",
                value: bids.length,
                icon: FaFileAlt,
                color: "bg-white border-slate-200/80 text-slate-800 shadow-sm",
                iconBg: "bg-slate-100 text-slate-600",
              },
              {
                label: "Unsealed Bids",
                value: openedBids.length,
                icon: FaLockOpen,
                color: "bg-white border-slate-200/80 text-slate-800 shadow-sm",
                iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
              },
              {
                label: "Sealed Bids",
                value: Math.max(0, sealedBidsCount),
                icon: FaLock,
                color: "bg-white border-slate-200/80 text-slate-800 shadow-sm",
                iconBg: "bg-blue-50 text-blue-600 border border-blue-100",
              },
              {
                label: "Withdrawn / Disqualified",
                value: withdrawnBidsCount,
                icon: FaTimesCircle,
                color: "bg-white border-slate-200/80 text-slate-800 shadow-sm",
                iconBg: "bg-red-50 text-red-600 border border-red-100",
              },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 flex items-center justify-between hover:translate-y-0.5 transition-all duration-200 ${s.color}`}
                >
                  <div>
                    <p className="text-2xl font-bold font-mono tracking-tight">{s.value}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      {s.label}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Tender Details Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold font-mono bg-slate-100 border border-slate-200 text-slate-700">
                    {tender?.tenderNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60 uppercase">
                    {tender?.category || "Goods"}
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-snug">
                  {tender?.title}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                    <FaCalendarAlt size={11} className="text-slate-400" />
                    <span>
                      <strong>Submission Deadline:</strong>{" "}
                      {tender?.closingDate ? new Date(tender.closingDate).toLocaleString("en-LK") : "—"}
                    </span>
                  </span>

                  {tender?.estimatedValue > 0 && (
                    <span className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                      <FaMoneyBillWave size={11} className="text-emerald-600" />
                      <span>
                        <strong>Est. Budget:</strong> LKR {tender.estimatedValue.toLocaleString("en-LK")}
                      </span>
                    </span>
                  )}

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      tender.status === "opening"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : tender.status === "bid_closed"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : ["evaluation", "awarded", "loa_issued"].includes(tender.status)
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {tender.status?.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Ceremony Control Toolbar */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {canCloseBidding && (
                  <button
                    onClick={() => setCloseModal(true)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-500 transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    <FaBan size={12} />
                    <span>Close Bidding</span>
                  </button>
                )}

                {!ceremonyStarted && canOpen && isProcurement && (
                  <button
                    onClick={() => setStartModal(true)}
                    disabled={!hasQuorum}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-linear-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:from-emerald-500 hover:to-teal-500 shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaVideo size={12} className="animate-pulse" />
                    <span>Start Opening Ceremony</span>
                  </button>
                )}

                {ceremonyStarted && (
                  <div className="flex items-center space-x-2 text-xs bg-red-50 border border-red-200 px-4 py-2 rounded-xl shadow-sm">
                    <span className="flex items-center space-x-1.5 text-red-600 font-bold">
                      <span className="tracking-wide text-[11px]">IN PROGRESS</span>
                    </span>
                  </div>
                )}

                {(ceremonyStarted || tender.bidOpeningMinutes) && (
                  <button
                    onClick={() => setMinutesModal(true)}
                    className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
                  >
                    <span>View Opening Minutes</span> 
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── BOC Committee Section ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <FaUsers className="text-emerald-600" size={16} />
                  <span>Bid Opening Committee</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Check present members to verify attendance. Minimum 3 members required for a valid quorum.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border shrink-0 transition-colors ${
                    hasQuorum
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-red-50 text-red-700 border-red-200/60 animate-pulse"
                  }`}
                >
                  {hasQuorum
                    ? `✓ Quorum Met (${quorum}/${committee.length} present)`
                    : `✗ Quorum Deficit (${quorum}/${committee.length} present)`}
                </span>

                <button
                  onClick={() => setAddMemberModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all cursor-pointer border border-slate-200"
                >
                  <FaUserPlus size={11} />
                  <span>Add Member</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {committee.map((m, i) => {
                const initials = m.name
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();
                return (
                  <button
                    key={i}
                    onClick={() => toggleAttendance(i)}
                    className={`flex flex-col items-center justify-between p-4 rounded-xl border transition-all duration-300 text-center relative overflow-hidden group cursor-pointer ${
                      m.present
                        ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                          m.present
                            ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : "bg-slate-200 border-slate-300 text-slate-500"
                        }`}
                      >
                        {m.present ? <FaCheck size={12} /> : initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">
                          {m.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {m.role}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                          m.present
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {m.present ? "Present" : "Absent"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Bids Workspace ── */}
          {ceremonyStarted ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
              {/* Toolbar & Filters */}
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Received Submissions ({bids.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unseal bids and verify financial envelopes and technical specification compliance.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search bar */}
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input
                      type="text"
                      placeholder="Search vendor or bid no..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-44 md:w-56"
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-medium cursor-pointer"
                  >
                    <option value="all">All Bids ({bids.length})</option>
                    <option value="sealed">Sealed ({sealedBidsCount})</option>
                    <option value="opened">Unsealed ({openedBids.length})</option>
                    <option value="withdrawn">Withdrawn ({withdrawnBidsCount})</option>
                  </select>

                  {!allOpened && activeBidsCount > 0 && (
                    <button
                      onClick={handleUnsealAll}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
                    >
                      <FaLockOpen size={10} />
                      <span>Unseal All Bids</span>
                    </button>
                  )}

                  {allOpened && !showPrices && activeBidsCount > 0 && (
                    <button
                      onClick={() => {
                        setShowPrices(true);
                        toast.info("Financial envelopes opened. Bid prices are now displayed.");
                      }}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-sm cursor-pointer"
                    >
                      <FaEnvelopeOpenText size={11} />
                      <span>Open Financial Envelopes</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bids List */}
              <div className="divide-y divide-slate-100">
                {filteredBids.length === 0 ? (
                  <div className="py-16 px-6 text-center space-y-2">
                    <FaLockOpen size={24} className="mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No Bids Match Criteria</p>
                    <p className="text-xs text-slate-400">
                      Try resetting your search query or filter selection.
                    </p>
                  </div>
                ) : (
                  filteredBids.map((bid, i) => {
                    const isOpened = openedBids.includes(bid._id.toString());
                    const isWithdrawn = bid.status === "withdrawn";

                    return (
                      <div
                        key={bid._id}
                        className={`px-6 py-4 flex flex-col gap-3 transition-all duration-300 ${
                          isOpened
                            ? "bg-emerald-50/20 border-l-4 border-emerald-500"
                            : isWithdrawn
                              ? "opacity-60 bg-slate-50 border-l-4 border-slate-300"
                              : "border-l-4 border-transparent hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Main Bid Summary Row */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                          <div className="flex items-start space-x-4 flex-1 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border transition-all ${
                                isOpened
                                  ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10"
                                  : isWithdrawn
                                    ? "bg-slate-200 border-slate-300 text-slate-500"
                                    : "bg-slate-100 border-slate-200 text-slate-600 shadow-inner"
                              }`}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-bold text-slate-800 truncate">
                                  {bid.vendor}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono font-medium">
                                <span className="whitespace-nowrap">Ref: <strong className="text-slate-600 font-semibold">{bid.bidNumber}</strong></span>
                                <span>•</span>
                                <span className="whitespace-nowrap">Submitted: {bid.submittedAtFull}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <BidStatusChip status={bid.status || (isOpened ? "opened" : "submitted")} />

                                {bid.bidSecurity && !isWithdrawn && (
                                  <span className="inline-flex items-center space-x-1 text-[9px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                                    <FaShieldAlt size={8} />
                                    <span>
                                      {bid.bidSecurityType} (LKR {bid.bidSecurityAmount.toLocaleString("en-LK")})
                                    </span>
                                  </span>
                                )}

                                {bid.rawDocs && bid.rawDocs.length > 0 && (
                                  <div className="flex items-center space-x-1 text-[9px] text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                                    <FaFileAlt size={8} className="text-slate-400" />
                                    <span>{bid.rawDocs.length} Doc{bid.rawDocs.length > 1 ? "s" : ""} Attached</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 shrink-0">
                            {showPrices && !isWithdrawn && (
                              <div className="text-left md:text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Quoted Financial Bid
                                </p>
                                <p className="text-base font-extrabold text-slate-850 font-mono">
                                  LKR {bid.bidAmount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center space-x-2">
                              {!isOpened && !isWithdrawn && ceremonyStarted && isProcurement && (
                                <button
                                  onClick={() => setUnsealModal(bid._id)}
                                  className="flex items-center space-x-1 px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition-all cursor-pointer shadow-sm"
                                >
                                  <FaLockOpen size={10} />
                                  <span>Unseal Bid</span>
                                </button>
                              )}

                              {isOpened && !isWithdrawn && (
                                <button
                                  onClick={() =>
                                    setExpandedBids((prev) => ({
                                      ...prev,
                                      [bid._id]: !prev[bid._id],
                                    }))
                                  }
                                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    expandedBids[bid._id]
                                      ? "bg-slate-900 border-slate-800 text-white"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  <FaClipboardList size={11} />
                                  <span>Specs Response</span>
                                  {expandedBids[bid._id] ? (
                                    <FaChevronUp size={9} />
                                  ) : (
                                    <FaChevronDown size={9} />
                                  )}
                                </button>
                              )}

                              {isOpened && !isWithdrawn && (
                                <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-xl text-xs font-bold">
                                  <FaCheckCircle size={12} />
                                  <span>Unsealed</span>
                                </div>
                              )}

                              {isWithdrawn && (
                                <span className="text-xs font-semibold text-slate-400 italic">
                                  Withdrawn by supplier
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Specs Response Collapsible Panel */}
                        {isOpened && expandedBids[bid._id] && (
                          <div className="mt-2 border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-3 w-full animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <FaClipboardList size={12} className="text-slate-500" />
                                Technical Specification Compliance Verification
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                {bid.specificationVotes?.length || 0} specifications evaluated
                              </span>
                            </div>

                            {!bid.specificationVotes || bid.specificationVotes.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-1">
                                No technical specification votes recorded for this bid submission.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 gap-2">
                                {bid.specificationVotes.map((v, idx) => (
                                  <div
                                    key={v._id || idx}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs"
                                  >
                                    <div className="flex items-start space-x-2">
                                      <span className="w-5 h-5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center shrink-0 mt-0.5 font-mono">
                                        {v.specNumber || idx + 1}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800">
                                        {v.specTitle}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                      {v.vote === "yes" ? (
                                        <span className="inline-flex items-center space-x-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold">
                                          <FaThumbsUp size={8} />
                                          <span>COMPLIANT</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center space-x-1 text-[9px] text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-full font-bold">
                                          <FaThumbsDown size={8} />
                                          <span>NON-COMPLIANT</span>
                                        </span>
                                      )}
                                      {v.vote === "no" && v.reason && (
                                        <p className="text-[10px] text-red-600 font-semibold mt-1 max-w-[320px] break-all">
                                          Reason: {v.reason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Documents list */}
                            {bid.rawDocs && bid.rawDocs.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/60">
                                <p className="text-[11px] font-bold text-slate-700 mb-1.5">
                                  Attached Documents ({bid.rawDocs.length}):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {bid.rawDocs.map((doc, docIdx) => (
                                    <a
                                      key={docIdx}
                                      href={getDownloadUrl(doc.url || doc.path || doc.name)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center space-x-1.5 text-xs bg-white text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50 font-medium transition-all"
                                    >
                                      <FaFileAlt size={10} />
                                      <span>{doc.name || `Document ${docIdx + 1}`}</span>
                                      <FaExternalLinkAlt size={8} className="text-slate-400" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <FaLock size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Bid Opening Ceremony Pending
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  The digital bid box is locked. Mark committee attendance and click "Start Opening Ceremony" to unseal vendor submissions.
                </p>
              </div>

              {!hasQuorum && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[11px] text-red-700 font-medium">
                  Attendance deficit: Minimum 3 committee members must be present.
                </div>
              )}
            </div>
          )}

          {/* ── Complete Ceremony Banner ── */}
          {ceremonyStarted &&
            (allOpened || activeBidsCount === 0) &&
            (showPrices || activeBidsCount === 0) &&
            !["evaluation", "awarded", "loa_issued"].includes(tender.status) && (
              <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold flex items-center space-x-2">
                    <FaCheckCircle />
                    <span>Ceremony Ready to Finalize</span>
                  </h4>
                  <p className="text-xs text-emerald-100">
                    All bids have been unsealed and prices revealed. Generate and save the official ceremony minutes to proceed to technical evaluation.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => setCompleteModal(true)}
                    className="px-5 py-3 bg-white text-emerald-800 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                  >
                    <FaCheckCircle size={12} />
                    <span>Complete Ceremony & Save Minutes</span>
                  </button>
                  <Link
                    to={`/evaluation?tenderId=${tender._id}`}
                    className="flex items-center space-x-1 text-xs text-white hover:text-emerald-100 font-bold transition-all"
                  >
                    <span>Proceed to Evaluation</span>
                    <FaChevronRight size={10} />
                  </Link>
                </div>
              </div>
            )}

          {/* Completed State Banner */}
          {["evaluation", "awarded", "loa_issued"].includes(tender.status) && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
              <div className="space-y-1">
                <h4 className="text-lg font-bold flex items-center space-x-2">
                  <FaCheckCircle className="text-emerald-400" />
                  <span>Bid Opening Ceremony Completed</span>
                </h4>
                <p className="text-xs text-indigo-200">
                  All unsealed records, committee attendance, and signed minutes are saved in the database.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setMinutesModal(true)}
                  className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <span>View Minutes Document</span>
                </button>

                <Link
                  to={`/evaluation?tenderId=${tender._id}`}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Go to Evaluation Workspace</span>
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add BOC Member Modal ── */}
      <ConfirmModal
        isOpen={addMemberModal}
        onClose={() => setAddMemberModal(false)}
        onConfirm={handleAddMember}
        title="Add Committee Member / Observer"
        confirmText="Add Member"
        variant="success"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Member Full Name & Title
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. A. B. Perera"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Committee Role / Designation
            </label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-medium"
            >
              <option value="Chairperson">Chairperson</option>
              <option value="Technical Expert">Technical Expert</option>
              <option value="BOC Representative">BOC Representative</option>
              <option value="PMD Representative">PMD Representative</option>
              <option value="End-User Rep">End-User Rep</option>
              <option value="Independent Observer">Independent Observer</option>
            </select>
          </div>
        </div>
      </ConfirmModal>

      {/* ── Official Bid Opening Minutes Modal ── */}
      {minutesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Government of Sri Lanka — Uva Wellassa University
                </p>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  OFFICIAL BID OPENING MINUTES
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Ref: {tender?.tenderNumber} | Venue: PMD Digital Bid Center
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                >
                  <FaPrint size={11} />
                  <span>Print Minutes</span>
                </button>
                <button
                  onClick={() => setMinutesModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-6 text-xs text-slate-700 font-sans leading-relaxed">
              {/* Tender Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Tender Title</p>
                  <p className="font-bold text-slate-800 line-clamp-1">{tender?.title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Submission Deadline</p>
                  <p className="font-bold text-slate-800">
                    {tender?.closingDate ? new Date(tender.closingDate).toLocaleDateString("en-LK") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ceremony Opened At</p>
                  <p className="font-bold text-slate-800">
                    {tender?.bidBoxOpenedAt ? new Date(tender.bidBoxOpenedAt).toLocaleString("en-LK") : "Just now"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Submissions</p>
                  <p className="font-bold text-emerald-700">{bids.length} Bids</p>
                </div>
              </div>

              {/* Committee Attendance Table */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  1. Committee Attendance & Quorum
                </h4>
                <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 font-bold">
                    <tr>
                      <th className="p-2 border-b">Member Name</th>
                      <th className="p-2 border-b">Designation / Role</th>
                      <th className="p-2 border-b">Attendance</th>
                      <th className="p-2 border-b text-right">Digital Sign Off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {committee.map((m, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-bold text-slate-800">{m.name}</td>
                        <td className="p-2 text-slate-600">{m.role}</td>
                        <td className="p-2">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              m.present ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {m.present ? "PRESENT" : "ABSENT"}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono text-[10px] text-emerald-700 font-bold">
                          {m.present ? "✓ SIGNED" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bids Log Table */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  2. Received Bids & Financial Envelopes Opened
                </h4>
                <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 font-bold">
                    <tr>
                      <th className="p-2 border-b">No</th>
                      <th className="p-2 border-b">Bid Ref</th>
                      <th className="p-2 border-b">Vendor Company Name</th>
                      <th className="p-2 border-b">Bid Security Status</th>
                      <th className="p-2 border-b text-right">Quoted Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {bids.map((b, idx) => (
                      <tr key={b._id}>
                        <td className="p-2 font-bold text-slate-600">{idx + 1}</td>
                        <td className="p-2 text-slate-700">{b.bidNumber}</td>
                        <td className="p-2 font-sans font-bold text-slate-800">{b.vendor}</td>
                        <td className="p-2 font-sans">
                          {b.bidSecurity ? (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              ✓ Verified ({b.bidSecurityType})
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">None</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {b.status === "withdrawn"
                            ? "WITHDRAWN"
                            : `LKR ${b.bidAmount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures Block */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6">
                {committee
                  .filter((c) => c.present)
                  .map((m, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="h-10 border-b border-dashed border-slate-300 flex items-end">
                        <span className="text-[10px] font-mono text-emerald-700 italic">
                          Signed digitally by {m.name}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-800">{m.name}</p>
                      <p className="text-[9px] text-slate-400">{m.role}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modals ── */}
      <ConfirmModal
        isOpen={closeModal}
        onClose={() => setCloseModal(false)}
        onConfirm={handleCloseBidding}
        title="Close Bidding"
        confirmText="Close & Seal"
        variant="danger"
      >
        <p className="text-sm text-slate-600">
          Officially close the bidding period for{" "}
          <span className="font-bold text-slate-800">"{tender?.title}"</span>? No further bids will be accepted.
        </p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={startModal}
        onClose={() => setStartModal(false)}
        onConfirm={handleStartCeremony}
        title="Start Bid Opening Ceremony"
        confirmText="Start Ceremony"
        variant="success"
      >
        <p className="text-sm text-slate-600">
          Begin the official bid opening ceremony for{" "}
          <span className="font-bold text-slate-800">"{tender?.title}"</span>?
        </p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={!!unsealModal}
        onClose={() => setUnsealModal(null)}
        onConfirm={() => handleUnsealBid(unsealModal)}
        title="Unseal Bid"
        confirmText="Unseal"
        variant="default"
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to unseal the bid from{" "}
          <span className="font-bold text-slate-850">
            "{bids.find((b) => b._id === unsealModal)?.vendor || "—"}"
          </span>
          ?
        </p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={completeModal}
        onClose={() => setCompleteModal(false)}
        onConfirm={handleCompleteCeremony}
        title="Complete Ceremony & Sign Minutes"
        confirmText="Save & Complete"
        variant="success"
      >
        <p className="text-sm text-slate-600">
          Finalize the bid opening ceremony and save official signed minutes to the database.
        </p>
      </ConfirmModal>
    </div>
  );
}
