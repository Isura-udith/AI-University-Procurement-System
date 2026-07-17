import { useState, useEffect, useCallback } from "react";
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
  FaExclamationTriangle,
  FaCheck,
  FaEnvelopeOpenText,
  FaPenFancy,
  FaBoxOpen,
  FaGavel,
  FaClipboardList,
  FaThumbsUp,
  FaThumbsDown,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import tenderService from "../../../services/tender.service";
import ConfirmModal from "../../../components/ConfirmModal";
import { useSelector } from "react-redux";

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
    withdrawn: { cls: "bg-slate-50 text-slate-500 border-slate-200/60", icon: "↩️", label: "Withdrawn" },
    rejected: { cls: "bg-red-50 text-red-700 border-red-200/60", icon: "❌", label: "Rejected" },
  };
  const { cls, icon, label } = map[status] || {
    cls: "bg-slate-50 text-slate-600 border-slate-200/60",
    icon: "●",
    label: status,
  };
  return (
    <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
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
                      ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 animate-pulse-ring"
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

  const [startModal, setStartModal] = useState(false);
  const [unsealModal, setUnsealModal] = useState(null);
  const [completeModal, setCompleteModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [expandedBids, setExpandedBids] = useState({});

  /* ── Load all tenders eligible for bid opening ── */
  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tenderService.getAll();
        const items = res.data || res || [];
        // Include published (deadline passed), bid_closed, closed, opening, evaluation
        const filtered = (Array.isArray(items) ? items : []).filter((t) =>
          [
            "published",
            "bidding",
            "bid_closed",
            "closed",
            "opening",
            "evaluation",
          ].includes(t.status),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          t.bocMembers.map((m) => ({
            name: m.userId
              ? `${m.userId.firstName} ${m.userId.lastName}`
              : "Committee Member",
            role: m.role || "BOC Representative",
            present: true,
          })),
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
          bidAmount: b.totalBidAmount || 0,
          bidSecurity: !!b.bidSecurityDocument,
          bidSecurityType: b.bidSecurityType || "—",
          docs: (b.documents || []).map((doc) => doc.name),
          status: b.status || "submitted",
          deviations: b.status === "rejected" ? ["MAJOR: Disqualified"] : [],
          isSealed: b.isSealed !== false,
          specificationVotes: b.specificationVotes || [],
        })),
      );

      // Track opened bids by _id (not vendor name — avoids breakage when names collide)
      const opened = bidsData
        .filter((b) => b.status !== "submitted")
        .map((b) => b._id.toString());
      setOpenedBids(opened);

      if (t.status === "evaluation") {
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

  /* ── Actions ── */
  const handleCloseBidding = async () => {
    try {
      await tenderService.closeBidding(tender._id);
      toast.success("🔒 Bidding officially closed. Bid box is sealed.");
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
      toast.success(
        "🎬 Bid Opening Ceremony started! All bids are being unsealed.",
      );
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
        toast.success(`🔓 Bid from "${bid.vendor}" unsealed.`);
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
        (b) =>
          !openedBids.includes(b._id.toString()) && b.status === "submitted",
      );
      await Promise.all(
        sealedBids.map((b) => tenderService.unsealBid(tender._id, b._id)),
      );
      setShowPrices(true);
      toast.success(
        `🔓 All ${bids.length} bids unsealed. Financial envelopes opened.`,
      );
      loadDetails();
    } catch (err) {
      toast.error(err.message || "Failed to unseal all bids.");
    }
  };

  const handleCompleteCeremony = async () => {
    try {
      await tenderService.completeBidOpening(tender._id);
      toast.success(
        "✅ Bid Opening Ceremony completed. Minutes generated and signed. Proceeding to evaluation.",
      );
      loadDetails();
    } catch (err) {
      toast.error(err.message || "Failed to complete bid opening.");
    } finally {
      setCompleteModal(false);
    }
  };

  const toggleAttendance = (i) => {
    const updated = [...committee];
    updated[i] = { ...updated[i], present: !updated[i].present };
    setCommittee(updated);
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
  const canOpen = isProcurement && tender && tender.status === "bid_closed";

  // Calculate current step for timeline
  let currentStep = 1;
  if (
    tender?.status === "bid_closed" ||
    tender?.status === "opening" ||
    tender?.status === "evaluation"
  ) {
    currentStep = 2; // Close Bidding is done
  }
  if (ceremonyStarted) {
    currentStep = 3; // Open Bid Box is done
  }
  if (allOpened) {
    currentStep = 4; // Unseal Bids is done
  }
  if (showPrices) {
    currentStep = 5; // Financials Opened
  }
  if (tender?.status === "evaluation") {
    currentStep = 6; // Ceremony completed (all done)
  }

  // Summary Stats
  const withdrawnBidsCount = bids.filter(
    (b) => b.status === "withdrawn",
  ).length;
  const activeBidsCount = bids.length - withdrawnBidsCount;
  const sealedBidsCount = activeBidsCount - openedBids.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-md">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <FaGavel size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight animate-slide-up">
              Bid Opening Ceremony
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Stage 8: Public bid opening with BOC committee, live video recording, and digital unsealing
            </p>
          </div>
        </div>
        {allTenders.length > 0 && !tenderIdParam && (
          <div className="flex items-center space-x-3 bg-slate-800/80 border border-slate-700/60 shadow-inner px-4 py-2 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Tender Reference:
            </span>
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="px-3 py-1.5 border border-slate-700 rounded-lg text-xs bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer font-medium"
            >
              {allTenders.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.tenderNumber} — {t.title.length > 30 ? t.title.substring(0, 30) + "..." : t.title} [{t.status}]
                </option>
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
          {/* ── Progress Timeline ── */}
          <CeremonyTimeline currentStep={currentStep} />

          {/* ── Summary Statistics ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total Bids",
                value: bids.length,
                icon: FaFileAlt,
                color: "bg-white border-slate-200/80 text-slate-800 shadow-sm",
                iconBg: "bg-slate-100 text-slate-500",
              },
              {
                label: "Opened Bids",
                value: openedBids.length,
                icon: FaLockOpen,
                color: "bg-white border-slate-200/80 text-slate-800 shadow-sm",
                iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
              },
              {
                label: "Sealed Bids",
                value: sealedBidsCount,
                icon: FaLock,
                color: "bg-white border-slate-200/80 text-slate-800 shadow-sm",
                iconBg: "bg-blue-50 text-blue-600 border border-blue-100",
              },
              {
                label: "Withdrawn Bids",
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
                  className={`rounded-2xl border p-4 flex items-center justify-between hover:translate-y-[-2px] transition-all duration-200 ${s.color}`}
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

          {/* ── Tender Info Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-slate-100 border border-slate-200 text-slate-600">
                    {tender?.tenderNumber}
                  </span>
                  <h2 className="text-lg font-bold text-slate-800 mt-1.5 leading-snug">
                    {tender?.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <FaCalendarAlt size={11} className="text-slate-400" />
                    <span>
                      <strong>Deadline:</strong> {tender?.closingDate?.split("T")[0] || "—"}
                    </span>
                  </span>
                  <span className="flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <FaCalendarAlt size={11} className="text-slate-400" />
                    <span>
                      <strong>Opening:</strong> {tender?.openingDate?.split("T")[0] || "TBD"}
                    </span>
                  </span>
                  <span className="flex items-center space-x-1 bg-blue-50/50 text-blue-700 px-2 py-1 rounded-md border border-blue-100/50 font-semibold">
                    <span>{bids.length} bids received</span>
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      tender.status === "opening"
                        ? "bg-purple-50 text-purple-700 border-purple-200/50"
                        : tender.status === "bid_closed"
                          ? "bg-orange-50 text-orange-700 border-orange-200/50"
                          : tender.status === "evaluation"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200/50"
                            : "bg-slate-50 text-slate-600 border-slate-200/50"
                    }`}
                  >
                    {tender.status?.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Close Bidding */}
                {canCloseBidding && (
                  <button
                    onClick={() => setCloseModal(true)}
                    className="flex items-center space-x-2 px-4.5 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-500 hover:shadow-md hover:shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm animate-fade-in"
                  >
                    <FaBan size={12} />
                    <span>Close Bidding</span>
                  </button>
                )}
                {/* Start Ceremony */}
                {!ceremonyStarted && canOpen && isProcurement && (
                  <button
                    onClick={() => setStartModal(true)}
                    disabled={!hasQuorum}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-linear-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:from-emerald-500 hover:to-teal-500 hover:shadow-md hover:shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                  >
                    <FaVideo size={12} className="animate-pulse" />
                    <span>Start Ceremony</span>
                  </button>
                )}
                {/* Live Recording indicator */}
                {ceremonyStarted && (
                  <div className="flex items-center space-x-2.5 text-xs bg-red-50 border border-red-200 px-4 py-2 rounded-xl shadow-sm">
                    <span className="flex items-center space-x-1.5 text-red-600 font-bold">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
                      <span className="relative inline-flex w-2.5 h-2.5 bg-red-600 rounded-full -ml-4 shrink-0" />
                      <span className="tracking-wide">LIVE RECORDING IN PROGRESS</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Deadline warning */}
            {!isDeadlinePassed && tender.status === "published" && (
              <div className="mt-4 flex items-center space-x-2 bg-amber-50 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-700">
                <FaExclamationTriangle size={14} className="shrink-0 text-amber-600" />
                <span>
                  Bid submission deadline has not been reached yet. Opening the bid box early is not permitted.
                </span>
              </div>
            )}
          </div>

          {/* ── BOC Committee ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <FaUsers className="text-emerald-600" size={16} />
                  <span>Bid Opening Committee (BOC)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Verify attendance. Minimum 3 members required to establish a valid quorum.
                </p>
              </div>
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
                        ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2.5">
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
                        <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-slate-900">
                          {m.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {m.role}
                        </p>
                      </div>
                    </div>

                    {/* Attend tag */}
                    <div className="mt-3">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
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
            {!hasQuorum && (
              <p className="text-[11px] text-red-500 flex items-center space-x-1.5 bg-red-50/50 border border-red-100/50 rounded-xl p-3">
                <FaExclamationTriangle size={12} className="text-red-600 shrink-0 animate-bounce" />
                <span>
                  <strong>Action Required:</strong> At least 3 committee members must be marked present to start the bid opening.
                </span>
              </p>
            )}
          </div>

          {/* ── Bids Table ── */}
          {ceremonyStarted ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Received Bids ({bids.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review and unseal bids. {openedBids.length} of {activeBidsCount} active bids unsealed.
                  </p>
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  {!allOpened && activeBidsCount > 0 && (
                    <button
                      onClick={handleUnsealAll}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all duration-200 hover:-translate-y-0.5 shadow-sm cursor-pointer"
                    >
                      <FaLockOpen size={10} />
                      <span>Unseal All Bids</span>
                    </button>
                  )}
                  {allOpened && !showPrices && activeBidsCount > 0 && (
                    <button
                      onClick={() => {
                        setShowPrices(true);
                        toast.info("Financial envelopes opened. Bid prices are now visible.");
                      }}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 hover:-translate-y-0.5 shadow-sm cursor-pointer"
                    >
                      <FaFileAlt size={10} />
                      <span>Open Financial Envelopes</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Enhanced Bid List */}
              <div className="divide-y divide-slate-100">
                {bids.length === 0 ? (
                  <div className="py-16 px-6 text-center space-y-3">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                      <FaLockOpen size={24} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">
                      No Bids Received
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      The bid box is currently empty. No suppliers submitted bids for this tender before the deadline.
                    </p>
                  </div>
                ) : (
                  bids.map((bid, i) => {
                    const isOpened = openedBids.includes(bid._id.toString());
                    const isWithdrawn = bid.status === "withdrawn";

                    return (
                      <div
                        key={bid._id}
                        className={`px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300 ${
                          isOpened
                            ? "bg-emerald-50/20 border-l-4 border-emerald-500"
                            : isWithdrawn
                              ? "opacity-60 bg-slate-50"
                              : "border-l-4 border-transparent hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-start space-x-4 flex-1 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border transition-all ${
                              isOpened
                                ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10"
                                : isWithdrawn
                                  ? "bg-slate-200 border-slate-300 text-slate-500"
                                  : "bg-slate-100 border-slate-200 text-slate-500 shadow-inner"
                            }`}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm font-bold text-slate-800 truncate">
                              {bid.vendor}
                            </p>

                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono font-medium">
                              <span>Ref: {bid.bidNumber}</span>
                              <span>•</span>
                              <span>Submitted: {bid.submitted}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <BidStatusChip status={bid.status || (isOpened ? "opened" : "submitted")} />

                              {bid.bidSecurity && !isWithdrawn && (
                                <span className="inline-flex items-center space-x-1 text-[9px] text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full font-bold">
                                  <FaShieldAlt size={8} />
                                  <span>Bid Security Verified</span>
                                </span>
                              )}

                              {bid.docs && bid.docs.length > 0 && (
                                <span className="inline-flex items-center text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                                  {bid.docs.length} Doc{bid.docs.length > 1 ? "s" : ""} Uploaded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 shrink-0">
                          {showPrices && !isWithdrawn && (
                            <div className="text-left md:text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Financial Bid Amount
                              </p>
                              <p className="text-base font-extrabold text-slate-800 font-mono">
                                LKR {bid.bidAmount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            {!isOpened && !isWithdrawn && ceremonyStarted && isProcurement && (
                              <button
                                onClick={() => setUnsealModal(bid._id)}
                                className="flex items-center space-x-1 px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-sm"
                              >
                                <FaLockOpen size={10} />
                                <span>Unseal Bid</span>
                              </button>
                            )}
                            {isOpened && !isWithdrawn && (
                              <button
                                onClick={() => setExpandedBids(prev => ({ ...prev, [bid._id]: !prev[bid._id] }))}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                                  expandedBids[bid._id]
                                    ? "bg-slate-900 border-slate-800 text-white shadow-sm"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                <FaClipboardList size={11} />
                                <span>Specs Response</span>
                                {expandedBids[bid._id] ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                              </button>
                            )}
                            {isOpened && !isWithdrawn && (
                              <div className="flex items-center space-x-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl text-xs font-bold animate-fade-in">
                                <FaCheckCircle size={12} />
                                <span>Unsealed</span>
                              </div>
                            )}
                            {isWithdrawn && (
                              <span className="text-xs font-semibold text-slate-400 italic">
                                No action required
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Specification Compliance Section */}
                        {isOpened && expandedBids[bid._id] && (
                          <div className="mt-2 ml-13 border border-slate-150 bg-slate-50/50 rounded-xl p-4 animate-fade-in space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <FaClipboardList size={12} className="text-slate-500" />
                                Technical Specification Compliance Verification
                              </span>
                              <span className="text-[10px] text-slate-405 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                                {bid.specificationVotes?.length || 0} specifications responded
                              </span>
                            </div>
                            {(!bid.specificationVotes || bid.specificationVotes.length === 0) ? (
                              <p className="text-xs text-slate-450 italic py-1">No specification responses found for this bid.</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-2">
                                {bid.specificationVotes.map((v, idx) => (
                                  <div key={v._id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200/60">
                                    <div className="flex items-start space-x-2">
                                      <span className="w-5 h-5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                                        {v.specNumber || idx + 1}
                                      </span>
                                      <span className="text-xs font-bold text-slate-700">{v.specTitle}</span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                      <div className="flex items-center space-x-1.5">
                                        {v.vote === 'yes' ? (
                                          <span className="inline-flex items-center space-x-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full font-bold">
                                            <FaThumbsUp size={8} />
                                            <span>COMPLIANT</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center space-x-1 text-[9px] text-red-700 bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-full font-bold">
                                            <FaThumbsDown size={8} />
                                            <span>NON-COMPLIANT</span>
                                          </span>
                                        )}
                                      </div>
                                      {v.vote === 'no' && v.reason && (
                                        <p className="text-[10px] text-red-650 font-semibold mt-1 max-w-[320px] break-all">
                                          Reason: {v.reason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
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
                  Ceremony Not Started
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  The digital bid box is locked. Establish the committee quorum and click "Start Ceremony" to begin unsealing and verifying supplier submissions.
                </p>
              </div>

              {!hasQuorum && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[11px] text-red-700 font-medium">
                  ⚠ Attendance deficit: Minimum 3 committee members must be present.
                </div>
              )}
              {!canOpen && tender && !["bid_closed"].includes(tender.status) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-700 font-medium">
                  ⚠ Tender status must be "Bid Closed" to start.
                  {canCloseBidding && ' Click "Close Bidding" above first.'}
                </div>
              )}
            </div>
          )}

          {/* ── Complete Ceremony Banner ── */}
          {ceremonyStarted &&
            (allOpened || activeBidsCount === 0) &&
            (showPrices || activeBidsCount === 0) &&
            tender.status !== "evaluation" && (
              <div className="bg-linear-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold">
                    🎉 Ceremony Ready to Finalize
                  </h4>
                  <p className="text-xs text-emerald-100">
                    All bids have been successfully unsealed and prices displayed. The official ceremony minutes are ready for signing.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => setCompleteModal(true)}
                    className="px-5 py-3 bg-white text-emerald-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all duration-200 hover:-translate-y-0.5 shadow-md cursor-pointer flex items-center space-x-1.5"
                  >
                    <FaCheckCircle size={12} />
                    <span>Complete & Sign Minutes</span>
                  </button>
                  <Link
                    to={`/evaluation?tenderId=${tender._id}`}
                    className="flex items-center space-x-1 text-xs text-white hover:text-emerald-100 font-bold transition-all"
                  >
                    <span>Or Proceed to Evaluation</span>
                    <FaChevronRight size={10} />
                  </Link>
                </div>
              </div>
            )}

          {/* Already at evaluation */}
          {tender.status === "evaluation" && (
            <div className="bg-linear-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-1">
                <h4 className="text-lg font-bold">
                  ✓ Bid Opening Ceremony Completed
                </h4>
                <p className="text-xs text-indigo-100">
                  All records, logs, and signed minutes have been securely archived. The tender is now in the evaluation phase.
                </p>
              </div>
              <Link
                to={`/evaluation?tenderId=${tender._id}`}
                className="px-5 py-3 bg-white text-indigo-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all duration-200 hover:-translate-y-0.5 shadow-md cursor-pointer flex items-center space-x-1.5 self-start md:self-auto shrink-0"
              >
                <span>Go to Evaluation Workspace</span>
                <FaChevronRight size={12} />
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
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Officially close the bidding period for{" "}
            <span className="font-bold text-slate-800">"{tender?.title}"</span>?
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-xs text-orange-700 leading-relaxed">
              No further bids will be accepted. The digital bid box will be sealed until the official opening ceremony. This action is irreversible and will be logged.
            </p>
          </div>
          <div className="text-xs text-slate-500 flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span>Total bids received:</span>
            <strong className="text-slate-800">{bids.length}</strong>
          </div>
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
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Begin the official bid opening ceremony for{" "}
            <span className="font-bold text-slate-800">"{tender?.title}"</span>?
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
              Committee Present:
            </p>
            <p className="text-xs text-emerald-700 font-medium">
              {committee
                .filter((c) => c.present)
                .map((c) => c.name)
                .join(", ")}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <FaVideo className="text-slate-400 shrink-0 animate-pulse" size={12} />
            <span>
              Video recording will be initiated automatically for the public audit record.
            </span>
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
        <div className="space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to unseal the bid from{" "}
            <span className="font-bold text-slate-850">
              "{bids.find((b) => b._id === unsealModal)?.vendor || "—"}"
            </span>
            ? This action is recorded and irreversible.
          </p>
        </div>
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
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Finalize the bid opening ceremony and sign the minutes.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs text-slate-700">
            <div className="flex justify-between pb-1.5 border-b border-emerald-100/50">
              <span className="text-slate-500 font-medium">Bids Successfully Opened</span>
              <span className="font-bold text-slate-800 font-mono">{openedBids.length}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-emerald-100/50">
              <span className="text-slate-500 font-medium">Withdrawn / Disqualified</span>
              <span className="font-bold text-red-600 font-mono">
                {
                  bids.filter(
                    (b) =>
                      b.status === "withdrawn" ||
                      (b.deviations || []).some((d) => d.includes("MAJOR")),
                  ).length
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Committee Signatures Applied</span>
              <span className="font-bold text-emerald-800">{quorum} signatures</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <FaShieldAlt className="text-slate-400 shrink-0" size={12} />
            <span>
              All committee members' digital signatures will be applied to the minutes for audit trails.
            </span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
