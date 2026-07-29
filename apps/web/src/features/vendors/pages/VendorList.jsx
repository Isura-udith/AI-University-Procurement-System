import { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FaSearch,
  FaEye,
  FaCheckCircle,
  FaBan,
  FaStar,
  FaBuilding,
  FaClock,
  FaSyncAlt,
  FaTimes,
  FaFileAlt,
} from "react-icons/fa";
import vendorService from "../../../services/vendor.service";

const statusColors = {
  verified: "bg-emerald-100 text-emerald-800 border-emerald-200",
  preferred: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  blacklisted: "bg-red-100 text-red-800 border-red-200",
  suspended: "bg-slate-100 text-slate-700 border-slate-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  inactive: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function VendorList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tab, setTab] = useState("all"); // 'all', 'pending', 'verified', 'blacklisted'
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state for quick inline actions
  const [blacklistModalVendor, setBlacklistModalVendor] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [perfModalVendor, setPerfModalVendor] = useState(null);
  const [perfMetrics, setPerfMetrics] = useState({
    deliveryTimeliness: 80,
    qualityRating: 4,
    priceCompetitiveness: 75,
    complianceScore: 90,
  });

  const { user } = useSelector((state) => state.auth);
  const canManage = [
    "supplies_division",
    "procurement_officer",
    "admin",
    "super_admin",
  ].includes(user?.role);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await vendorService.getAll();
      setVendors(res.data || []);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "supplier") return;
    let ignore = false;
    const load = async () => {
      if (!ignore) {
        await fetchVendors();
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [user?.role, fetchVendors]);

  if (user?.role === "supplier") {
    return <Navigate to="/vendors/me" replace />;
  }

  // Extract all unique categories across vendors
  const allCategories = Array.from(
    new Set(vendors.flatMap((v) => v.supplierCategories || []))
  );

  // Filter vendors based on search, tab, status filter, category filter
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      !search ||
      v.companyName.toLowerCase().includes(search.toLowerCase()) ||
      v.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
      v.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || v.status === statusFilter;

    const matchesCategory =
      !categoryFilter || v.supplierCategories?.includes(categoryFilter);

    let matchesTab = true;
    if (tab === "pending") matchesTab = v.status === "pending";
    else if (tab === "verified") matchesTab = v.status === "verified" || v.status === "preferred";
    else if (tab === "blacklisted") matchesTab = v.status === "blacklisted" || v.status === "rejected";

    return matchesSearch && matchesStatus && matchesCategory && matchesTab;
  });

  // Calculate statistics
  const totalCount = vendors.length;
  const verifiedCount = vendors.filter((v) => v.status === "verified" || v.status === "preferred").length;
  const pendingCount = vendors.filter((v) => v.status === "pending").length;
  const blacklistedCount = vendors.filter((v) => v.status === "blacklisted" || v.status === "rejected").length;
  const avgScore = totalCount > 0
    ? Math.round(vendors.reduce((acc, v) => acc + (v.performanceScore || 0), 0) / totalCount)
    : 0;

  // Handlers for quick inline actions
  const handleQuickVerify = async (vendorId) => {
    try {
      await vendorService.verify(vendorId);
      fetchVendors();
    } catch (err) {
      console.error("Failed to verify vendor:", err);
    }
  };

  const handleBlacklistSubmit = async () => {
    if (!blacklistModalVendor) return;
    try {
      await vendorService.blacklist(blacklistModalVendor._id, blacklistReason || "Blacklisted by Supplies Division");
      setBlacklistModalVendor(null);
      setBlacklistReason("");
      fetchVendors();
    } catch (err) {
      console.error("Failed to blacklist vendor:", err);
    }
  };

  const handlePerfSubmit = async () => {
    if (!perfModalVendor) return;
    try {
      await vendorService.updatePerformance(perfModalVendor._id, perfMetrics);
      setPerfModalVendor(null);
      fetchVendors();
    } catch (err) {
      console.error("Failed to update performance:", err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">  
                    <FaFileAlt size={160} /> 
                  </div>
           <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 flex items-center space-x-3">
            <span>Supplier & Vendor Management</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchVendors}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            title="Refresh Vendors"
          >
            <FaSyncAlt className={loading ? "animate-spin text-emerald-600" : ""} size={14} />
          </button>
          <Link
            to="/vendor-register"
            className="px-4 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-550 transition-colors shadow-sm flex items-center space-x-2"
          >
            <span>Register Vendor</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FaBuilding size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Vendors</p>
            <p className="text-xl font-bold text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FaCheckCircle size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Active</p>
            <p className="text-xl font-bold text-slate-900">{verifiedCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FaClock size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-xl font-bold text-slate-900">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <FaBan size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blacklisted</p>
            <p className="text-xl font-bold text-slate-900">{blacklistedCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <FaStar size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Performance</p>
            <p className="text-xl font-bold text-slate-900">{avgScore} / 100</p>
          </div>
        </div>
      </div>

      {/* Main Vendor Management Table Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-6 pt-4 flex space-x-8">
          {[
            { id: "all", label: "All Suppliers", count: totalCount },
            { id: "pending", label: "Pending Approvals", count: pendingCount },
            { id: "verified", label: "Verified & Active", count: verifiedCount },
            { id: "blacklisted", label: "Blacklisted / Debarred", count: blacklistedCount },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                tab === t.id
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  tab === t.id ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Filters Header */}
        <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor name, email, or contact person..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex items-center space-x-3">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">All Supply Categories</option>
              {allCategories.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="preferred">Preferred</option>
              <option value="rejected">Rejected</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Company & Contact</th>
                <th className="px-6 py-3.5">Reg. No / Grade</th>
                <th className="px-6 py-3.5">Categories</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Performance Score</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FaSyncAlt className="animate-spin text-emerald-600" size={24} />
                      <span>Loading vendors list...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-1">
                      <p className="font-bold text-slate-700">No vendors found</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search keywords or filter criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{v.companyName}</div>
                      <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span>{v.contactPerson || "No contact"}</span>
                        <span>•</span>
                        <span>{v.email}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs font-mono font-semibold text-slate-800">
                        {v.registrationNumber || "N/A"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        CIDA: <span className="font-medium text-slate-700">{v.cidaGrade || "Ungraded"}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {v.supplierCategories?.length > 0 ? (
                          v.supplierCategories.slice(0, 3).map((c, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium border border-slate-200"
                            >
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">General</span>
                        )}
                        {v.supplierCategories?.length > 3 && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">
                            +{v.supplierCategories.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize border ${
                          statusColors[v.status] || statusColors.pending
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (v.performanceScore || 0) >= 80
                                ? "bg-emerald-500"
                                : (v.performanceScore || 0) >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${v.performanceScore || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {v.performanceScore || 0}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1">
                      {canManage && v.status === "pending" && (
                        <button
                          onClick={() => handleQuickVerify(v._id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-block"
                          title="Quick Verify Vendor"
                        >
                          <FaCheckCircle size={15} />
                        </button>
                      )}

                      {canManage && (v.status === "verified" || v.status === "preferred") && (
                        <>
                          <button
                            onClick={() => {
                              setPerfModalVendor(v);
                              setPerfMetrics({
                                deliveryTimeliness: v.metrics?.deliveryTimeliness || 80,
                                qualityRating: v.metrics?.qualityRating || 4,
                                priceCompetitiveness: v.metrics?.priceCompetitiveness || 75,
                                complianceScore: v.metrics?.complianceScore || 90,
                              });
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                            title="Rate Performance"
                          >
                            <FaStar size={15} />
                          </button>

                          <button
                            onClick={() => setBlacklistModalVendor(v)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-block"
                            title="Blacklist Vendor"
                          >
                            <FaBan size={15} />
                          </button>
                        </>
                      )}

                      <Link
                        to={`/vendors/${v._id}`}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors inline-block"
                        title="View Vendor Profile"
                      >
                        <FaEye size={15} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blacklist Modal */}
      {blacklistModalVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-900 text-white flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <FaBan />
                <span>Debar / Blacklist Vendor</span>
              </h3>
              <button
                onClick={() => setBlacklistModalVendor(null)}
                className="text-rose-200 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                You are about to blacklist <strong>{blacklistModalVendor.companyName}</strong>. This vendor will be debarred from submitting bids or receiving awards.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Debarment Reason
                </label>
                <textarea
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  rows="3"
                  placeholder="Provide explicit reason for blacklisting..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setBlacklistModalVendor(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlacklistSubmit}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-500"
                >
                  Confirm Blacklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Score Modal */}
      {perfModalVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <FaStar className="text-amber-400" />
                <span>Evaluate Performance — {perfModalVendor.companyName}</span>
              </h3>
              <button
                onClick={() => setPerfModalVendor(null)}
                className="text-slate-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Adjust rating metrics below to automatically recalculate overall supplier score.
              </p>

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
                  onClick={() => setPerfModalVendor(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePerfSubmit}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-500"
                >
                  Save & Recalculate Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
