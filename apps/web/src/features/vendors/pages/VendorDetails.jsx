import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import vendorService from "../../../services/vendor.service";
import VendorProfile from "../components/VendorProfile";
import VendorScore from "../components/VendorScore";
import {
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaBan,
  FaStar,
  FaEdit,
  FaBuilding,
  FaEnvelopeOpenText,
  FaCopy,
  FaExternalLinkAlt,
  FaHistory,
  FaFileContract,
  FaCheckCircle,
} from "react-icons/fa";

export default function VendorDetails() {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showPerfModal, setShowPerfModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [setupUrlModal, setSetupUrlModal] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form state for performance modal
  const [perfMetrics, setPerfMetrics] = useState({
    deliveryTimeliness: 80,
    qualityRating: 4,
    priceCompetitiveness: 75,
    complianceScore: 90,
  });

  // Form state for profile editing modal
  const [editForm, setEditForm] = useState({
    companyName: "",
    registrationNumber: "",
    cidaGrade: "",
    taxId: "",
    vatNumber: "",
    email: "",
    phone: "",
    contactPerson: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    website: "",
    street: "",
    city: "",
  });

  const fetchVendor = useCallback(async () => {
    try {
      let res;
      if (user?.role === "supplier" && (!id || id === "me")) {
        res = await vendorService.getMe();
      } else {
        res = await vendorService.getById(id);
      }
      const data = res.data?.data || res.data;
      setVendor(data);
      if (data) {
        setPerfMetrics({
          deliveryTimeliness: data.metrics?.deliveryTimeliness || 80,
          qualityRating: data.metrics?.qualityRating || 4,
          priceCompetitiveness: data.metrics?.priceCompetitiveness || 75,
          complianceScore: data.metrics?.complianceScore || 90,
        });
        setEditForm({
          companyName: data.companyName || "",
          registrationNumber: data.registrationNumber || "",
          cidaGrade: data.cidaGrade || "",
          taxId: data.taxId || "",
          vatNumber: data.vatNumber || "",
          email: data.email || "",
          phone: data.phone || "",
          contactPerson: data.contactPerson || "",
          bankName: data.bankName || "",
          bankAccountNumber: data.bankAccountNumber || "",
          bankAccountName: data.bankAccountName || "",
          website: data.website || "",
          street: data.address?.street || "",
          city: data.address?.city || "",
        });
      }
    } catch (err) {
      console.error("Error fetching vendor details:", err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    let ignore = false;
    const loadVendor = async () => {
      try {
        let res;
        if (user?.role === "supplier" && (!id || id === "me")) {
          res = await vendorService.getMe();
        } else {
          res = await vendorService.getById(id);
        }
        const data = res.data?.data || res.data;
        if (!ignore) {
          setVendor(data);
          if (data) {
            setPerfMetrics({
              deliveryTimeliness: data.metrics?.deliveryTimeliness || 80,
              qualityRating: data.metrics?.qualityRating || 4,
              priceCompetitiveness: data.metrics?.priceCompetitiveness || 75,
              complianceScore: data.metrics?.complianceScore || 90,
            });
            setEditForm({
              companyName: data.companyName || "",
              registrationNumber: data.registrationNumber || "",
              cidaGrade: data.cidaGrade || "",
              taxId: data.taxId || "",
              vatNumber: data.vatNumber || "",
              email: data.email || "",
              phone: data.phone || "",
              contactPerson: data.contactPerson || "",
              bankName: data.bankName || "",
              bankAccountNumber: data.bankAccountNumber || "",
              bankAccountName: data.bankAccountName || "",
              website: data.website || "",
              street: data.address?.street || "",
              city: data.address?.city || "",
            });
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching vendor details:", err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadVendor();

    return () => {
      ignore = true;
    };
  }, [id, user?.role]);

  const canManage = [
    "supplies_division",
    "procurement_officer",
    "admin",
    "super_admin",
  ].includes(user?.role);

  const isSelfSupplier = user?.role === "supplier";

  const handleApprove = async () => {
    try {
      const res = await vendorService.approveAndSendSetupLink(vendor._id);
      const data = res.data?.data || res.data;
      if (data.setupUrl) {
        setSetupUrlModal(data.setupUrl);
      }
      fetchVendor();
    } catch (err) {
      console.error("Approval failed:", err);
    }
  };

  const handleDirectVerify = async () => {
    try {
      await vendorService.verify(vendor._id);
      fetchVendor();
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };

  const handleReject = async () => {
    try {
      await vendorService.reject(
        vendor._id,
        rejectReason || "Rejected by Supplies Division"
      );
      setShowRejectModal(false);
      setRejectReason("");
      fetchVendor();
    } catch (err) {
      console.error("Rejection failed:", err);
    }
  };

  const handleBlacklist = async () => {
    try {
      await vendorService.blacklist(
        vendor._id,
        blacklistReason || "Blacklisted by Supplies Division"
      );
      setShowBlacklistModal(false);
      setBlacklistReason("");
      fetchVendor();
    } catch (err) {
      console.error("Blacklisting failed:", err);
    }
  };

  const handlePerfUpdate = async () => {
    try {
      await vendorService.updatePerformance(vendor._id, perfMetrics);
      setShowPerfModal(false);
      fetchVendor();
    } catch (err) {
      console.error("Performance update failed:", err);
    }
  };

  const handleEditProfileSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        companyName: editForm.companyName,
        registrationNumber: editForm.registrationNumber,
        cidaGrade: editForm.cidaGrade,
        taxId: editForm.taxId,
        vatNumber: editForm.vatNumber,
        email: editForm.email,
        phone: editForm.phone,
        contactPerson: editForm.contactPerson,
        bankName: editForm.bankName,
        bankAccountNumber: editForm.bankAccountNumber,
        bankAccountName: editForm.bankAccountName,
        website: editForm.website,
        address: {
          street: editForm.street,
          city: editForm.city,
        },
      };

      if (isSelfSupplier) {
        await vendorService.updateMe(payload);
      } else {
        await vendorService.updateMe(payload); // Or endpoint update
      }
      setShowEditModal(false);
      fetchVendor();
    } catch (err) {
      console.error("Failed to update vendor profile:", err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-3" />
        <p className="font-semibold text-sm">Loading supplier profile...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-12 text-center text-slate-500">
        <FaBuilding className="mx-auto text-slate-300 mb-3" size={40} />
        <h2 className="text-lg font-bold text-slate-800">Vendor Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested vendor record could not be loaded or does not exist.
        </p>
        <Link
          to="/vendors"
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500"
        >
          Return to Vendors List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          {!isSelfSupplier && (
            <Link
              to="/vendors"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white border border-slate-200 rounded-xl transition-colors shadow-sm"
            >
              <FaArrowLeft size={14} />
            </Link>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold text-slate-900">{vendor.companyName}</h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                  vendor.status === "verified"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : vendor.status === "pending"
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : vendor.status === "blacklisted"
                    ? "bg-red-100 text-red-800 border-red-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {vendor.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reg. No: <span className="font-semibold text-slate-700">{vendor.registrationNumber}</span> • VAT/Tax ID:{" "}
              <span className="font-semibold text-slate-700">{vendor.vatNumber || vendor.taxId || "N/A"}</span>
            </p>
          </div>
        </div>

        {/* Management Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Supplier Self-Edit */}
          {isSelfSupplier && (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5"
            >
              <FaEdit className="text-emerald-600" /> <span>Edit Profile</span>
            </button>
          )}

          {/* Admin / Procurement Officer Actions */}
          {canManage && (
            <>
              {vendor.status === "pending" && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-3.5 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <FaTimes /> <span>Reject</span>
                  </button>
                  <button
                    onClick={handleDirectVerify}
                    className="px-3.5 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <FaCheckCircle /> <span>Verify</span>
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
                  >
                    <FaCheck /> <span>Approve & Send Setup Link</span>
                  </button>
                </>
              )}

              {vendor.status !== "pending" && vendor.status !== "blacklisted" && (
                <>
                  <button
                    onClick={() => setShowPerfModal(true)}
                    className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5"
                  >
                    <FaStar className="text-amber-500" /> <span>Evaluate Score</span>
                  </button>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5"
                  >
                    <FaEdit className="text-blue-600" /> <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => setShowBlacklistModal(true)}
                    className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <FaBan /> <span>Blacklist</span>
                  </button>
                </>
              )}

              {vendor.status === "blacklisted" && (
                <button
                  onClick={handleDirectVerify}
                  className="px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5"
                >
                  <FaCheckCircle /> <span>Reinstate & Verify</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex space-x-8">
        {[
          { id: "overview", label: "Company Overview", icon: FaBuilding },
          { id: "scorecard", label: "Performance Scorecard", icon: FaStar },
          { id: "contracts", label: "Contract History", icon: FaFileContract },
          { id: "audit", label: "Audit & Internal Notes", icon: FaHistory },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && <VendorProfile vendor={vendor} />}

      {activeTab === "scorecard" && (
        <VendorScore score={vendor.performanceScore || 0} metrics={vendor.metrics || {}} />
      )}

      {activeTab === "contracts" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Contract Engagement Summary</h3>
              <p className="text-xs text-slate-500 mt-0.5">Overview of awarded procurement contracts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 font-medium block uppercase tracking-wider">Total Contracts</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {vendor.metrics?.totalContracts || 0}
              </span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-600 font-medium block uppercase tracking-wider">Completed</span>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                {vendor.metrics?.completedContracts || 0}
              </span>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <span className="text-xs text-blue-600 font-medium block uppercase tracking-wider">Total Contract Value</span>
              <span className="text-2xl font-bold text-blue-800 mt-1 block">
                LKR {((vendor.metrics?.totalContractValue || 0) / 1000000).toFixed(1)}M
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Audit Trail & Internal History</h3>
            <p className="text-xs text-slate-500 mt-0.5">Verification notes, debarment reasons, and internal logs</p>
          </div>

          {/* Debarment / Blacklist Information */}
          {vendor.isDebarred && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-rose-800 flex items-center space-x-1.5">
                <FaBan /> <span>Vendor Currently Debarred / Blacklisted</span>
              </p>
              <p className="text-rose-700">
                Reason: <strong>{vendor.debarmentDetails?.reason || "No details provided"}</strong>
              </p>
              <p className="text-rose-600 text-[11px]">
                Debarred On: {vendor.debarmentDetails?.debarredFrom ? new Date(vendor.debarmentDetails.debarredFrom).toLocaleDateString() : "N/A"}
              </p>
            </div>
          )}

          {/* Verification Record */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs">
            <p className="font-bold text-slate-800">Verification Status</p>
            <p className="text-slate-600">
              Current Status: <span className="font-semibold text-slate-900 capitalize">{vendor.status}</span>
            </p>
            {vendor.verifiedAt && (
              <p className="text-slate-500 text-[11px]">
                Verified Date: {new Date(vendor.verifiedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Internal Notes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Internal Remarks & Notes</h4>
            {vendor.internalNotes?.length > 0 ? (
              <div className="space-y-2">
                {vendor.internalNotes.map((n, i) => (
                  <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                    <p className="text-slate-800 font-medium">{n.note}</p>
                    <p className="text-[10px] text-slate-400">
                      Logged at: {n.createdAt ? new Date(n.createdAt).toLocaleString() : "System Entry"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No internal remarks logged.</p>
            )}
          </div>
        </div>
      )}

      {/* Setup URL Modal */}
      {setupUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-emerald-100">
            <div className="bg-emerald-900 text-white px-6 py-5">
              <div className="flex items-center space-x-3">
                <FaEnvelopeOpenText className="text-emerald-400 text-2xl" />
                <div>
                  <h3 className="text-lg font-bold">Approved & Setup Link Sent!</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Supplies Division Verification Complete
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                An email notification has been dispatched to <strong>{vendor.email}</strong>. The vendor can click the link in their email to create their login account.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Direct Account Setup Link (Dev / Testing)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={setupUrlModal}
                    className="flex-1 bg-white border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 select-all font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(setupUrlModal)}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 flex items-center space-x-1"
                  >
                    <FaCopy size={12} /> <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <a
                  href={setupUrlModal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 flex items-center space-x-1.5"
                >
                  <span>Open Setup Link</span> <FaExternalLinkAlt size={11} />
                </a>
                <button
                  onClick={() => setSetupUrlModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Reject Supplier Application</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Please enter the reason for rejecting <strong>{vendor.companyName}</strong>'s application.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  rows="3"
                  placeholder="Provide rejection details..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-500"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-900 text-white flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <FaBan /> <span>Blacklist Supplier</span>
              </h3>
              <button
                onClick={() => setShowBlacklistModal(false)}
                className="text-rose-200 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Are you sure you want to blacklist <strong>{vendor.companyName}</strong>? Debarred vendors cannot participate in future procurements.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Reason for Debarment
                </label>
                <textarea
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  rows="3"
                  placeholder="Provide explicit debarment reason..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setShowBlacklistModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlacklist}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-500"
                >
                  Confirm Blacklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluate Performance Modal */}
      {showPerfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <FaStar className="text-amber-400" />
                <span>Evaluate Supplier Performance</span>
              </h3>
              <button
                onClick={() => setShowPerfModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Delivery Timeliness (%)</span>
                    <span className="font-bold">{perfMetrics.deliveryTimeliness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={perfMetrics.deliveryTimeliness}
                    onChange={(e) =>
                      setPerfMetrics({ ...perfMetrics, deliveryTimeliness: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Quality Rating (1 - 5 stars)</span>
                    <span className="font-bold">{perfMetrics.qualityRating} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={perfMetrics.qualityRating}
                    onChange={(e) =>
                      setPerfMetrics({ ...perfMetrics, qualityRating: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Price Competitiveness (%)</span>
                    <span className="font-bold">{perfMetrics.priceCompetitiveness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={perfMetrics.priceCompetitiveness}
                    onChange={(e) =>
                      setPerfMetrics({ ...perfMetrics, priceCompetitiveness: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Compliance Score (%)</span>
                    <span className="font-bold">{perfMetrics.complianceScore}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={perfMetrics.complianceScore}
                    onChange={(e) =>
                      setPerfMetrics({ ...perfMetrics, complianceScore: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowPerfModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePerfUpdate}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-500"
                >
                  Save & Update Scorecard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <FaEdit className="text-emerald-400" />
                <span>Edit Supplier Profile</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleEditProfileSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    value={editForm.registrationNumber}
                    onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editForm.contactPerson}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CIDA Grade</label>
                  <input
                    type="text"
                    value={editForm.cidaGrade}
                    onChange={(e) => setEditForm({ ...editForm, cidaGrade: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. C1, C2, Ungraded"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT / Tax ID</label>
                  <input
                    type="text"
                    value={editForm.vatNumber}
                    onChange={(e) => setEditForm({ ...editForm, vatNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={editForm.bankAccountNumber}
                    onChange={(e) => setEditForm({ ...editForm, bankAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={editForm.street}
                    onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-500"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
