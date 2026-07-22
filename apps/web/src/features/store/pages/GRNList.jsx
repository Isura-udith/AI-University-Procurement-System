import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FaTruck, FaPlus, FaSearch, FaClipboardCheck, FaTimes, FaCheckCircle,
  FaExclamationTriangle, FaTimesCircle, FaEye, FaShieldAlt
} from 'react-icons/fa';
import inventoryService from '../../../services/inventory.service';

const STATUS_COLORS = {
  pending_inspection: 'bg-amber-100 text-amber-700 border-amber-200',
  inspection_in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inventory_updated: 'bg-teal-100 text-teal-800 border-teal-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const fmtCurrency = (n) => n ? `LKR ${Number(n).toLocaleString()}` : '—';
const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

export default function GRNList() {
  const { user } = useSelector(s => s.auth);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [submittingInspection, setSubmittingInspection] = useState(false);

  // Inspection form state
  const [overallStatus, setOverallStatus] = useState('passed');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [itemInspections, setItemInspections] = useState({});

  const isStoreManager = ['store_manager', 'admin', 'super_admin'].includes(user?.role);

  const loadGRNsData = () => {
    return inventoryService.getGRNs({ limit: 50 })
      .then(res => {
        const d = res.data?.data || res.data || [];
        setGrns(d);
      })
      .catch(() => {
        toast.error('Failed to load Goods Receipt Notes');
        setGrns([]);
      })
      .finally(() => setLoading(false));
  };

  const fetchGRNs = (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    loadGRNsData();
  };

  useEffect(() => {
    loadGRNsData();
  }, []);

  const openInspectionModal = (grn) => {
    setSelectedGrn(grn);
    setOverallStatus(grn.overallInspectionStatus === 'pending_inspection' ? 'passed' : grn.overallInspectionStatus || 'passed');
    setInspectionNotes(grn.inspectionNotes || '');

    const initialItemMap = {};
    (grn.items || []).forEach(item => {
      initialItemMap[item._id] = {
        status: item.inspectionStatus || 'passed',
        rejectedQuantity: item.rejectedQuantity || 0,
        rejectionReason: item.rejectionReason || '',
      };
    });
    setItemInspections(initialItemMap);
    setInspectModalOpen(true);
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGrn) return;

    setSubmittingInspection(true);
    try {
      const payload = {
        overallStatus,
        inspectionNotes,
        itemInspections: Object.keys(itemInspections).map(itemId => ({
          itemId,
          status: itemInspections[itemId].status,
          rejectedQuantity: Number(itemInspections[itemId].rejectedQuantity || 0),
          rejectionReason: itemInspections[itemId].rejectionReason,
        })),
      };

      await inventoryService.inspectGRN(selectedGrn._id, payload);
      toast.success('Inspection recorded successfully! Inventory updated.');
      setInspectModalOpen(false);
      fetchGRNs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record inspection');
    } finally {
      setSubmittingInspection(false);
    }
  };

  const filteredGRNs = grns.filter(g => {
    const matchSearch = !search ||
      g.grnNumber?.toLowerCase().includes(search.toLowerCase()) ||
      g.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      g.supplierInvoiceNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || g.status === statusFilter || g.overallInspectionStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = grns.filter(g => ['pending_inspection', 'draft'].includes(g.status)).length;
  const acceptedCount = grns.filter(g => ['accepted', 'inventory_updated'].includes(g.status)).length;
  const rejectedCount = grns.filter(g => g.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/store" className="text-xs font-semibold text-teal-600 hover:underline">← Store & Inventory</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Goods Receipt Notes (GRN)</h1>
          <p className="text-sm text-slate-500">Phase 7 · Supplier Deliveries, Technical Inspection & Stock Intake</p>
        </div>
        {isStoreManager && (
          <Link to="/store/grn/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 transition-all shadow-sm">
            <FaPlus size={12} /> Create New GRN
          </Link>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <FaTruck size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Total GRNs</p>
            <p className="text-2xl font-bold text-slate-900">{grns.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FaExclamationTriangle size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase">Pending Inspection</p>
            <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FaCheckCircle size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase">Stocked / Accepted</p>
            <p className="text-2xl font-bold text-emerald-700">{acceptedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <FaTimesCircle size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase">Rejected</p>
            <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search GRN #, Supplier, Invoice…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending_inspection">Pending Inspection</option>
              <option value="accepted">Accepted</option>
              <option value="inventory_updated">Inventory Updated</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading GRN records…</div>
        ) : filteredGRNs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No Goods Receipt Notes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-xs font-semibold">
                  <th className="text-left px-6 py-3.5">GRN Number</th>
                  <th className="text-left px-4 py-3.5">Supplier Details</th>
                  <th className="text-left px-4 py-3.5">Delivery Date</th>
                  <th className="text-center px-4 py-3.5">Items Count</th>
                  <th className="text-right px-4 py-3.5">Total Value</th>
                  <th className="text-center px-4 py-3.5">Inspection Status</th>
                  <th className="text-right px-6 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGRNs.map(grn => (
                  <tr key={grn._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-teal-700">
                      {grn.grnNumber}
                      {grn.procurementId?.referenceNumber && (
                        <p className="text-xs text-slate-400 font-sans font-normal">{grn.procurementId.referenceNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">{grn.supplierName}</p>
                      {grn.supplierInvoiceNumber && (
                        <p className="text-xs text-slate-400">Inv: {grn.supplierInvoiceNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-600 text-xs">
                      {grn.deliveryDate ? new Date(grn.deliveryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-700">
                      {grn.items?.length || 0}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-slate-800">
                      {fmtCurrency(grn.totalReceivedValue)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[grn.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {fmtStatus(grn.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openInspectionModal(grn)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        {isStoreManager && ['pending_inspection', 'draft'].includes(grn.status) ? (
                          <>
                            <FaShieldAlt size={11} /> Inspect & Update
                          </>
                        ) : (
                          <>
                            <FaEye size={11} /> View Details
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quality Inspection Modal */}
      {inspectModalOpen && selectedGrn && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-100 shadow-2xl overflow-hidden animate-scale-in my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <FaShieldAlt size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base">GRN Quality Inspection & Acceptance</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedGrn.grnNumber}</p>
                </div>
              </div>
              <button onClick={() => setInspectModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleInspectionSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Summary metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Supplier Name</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedGrn.supplierName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Invoice Number</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedGrn.supplierInvoiceNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Total Value</span>
                  <span className="font-bold text-teal-700 text-sm">{fmtCurrency(selectedGrn.totalReceivedValue)}</span>
                </div>
              </div>

              {/* Line Items Inspection */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
                  Received Line Items Quality Checks
                </h4>

                {(selectedGrn.items || []).map((item, index) => {
                  const currentInsp = itemInspections[item._id] || { status: 'passed', rejectedQuantity: 0, rejectionReason: '' };
                  return (
                    <div key={item._id || index} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.description}</p>
                          <p className="text-xs text-slate-400">
                            Ordered: <span className="font-semibold text-slate-700">{item.orderedQuantity || item.receivedQuantity} {item.unit}</span> | Received: <span className="font-semibold text-teal-700">{item.receivedQuantity} {item.unit}</span>
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Unit Cost: {fmtCurrency(item.unitCost)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Inspection Result</label>
                          <select
                            value={currentInsp.status}
                            onChange={e => {
                              const val = e.target.value;
                              setItemInspections(prev => ({
                                ...prev,
                                [item._id]: { ...prev[item._id], status: val }
                              }));
                            }}
                            className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="passed">Passed ✅</option>
                            <option value="partially_passed">Partially Passed ⚠️</option>
                            <option value="failed">Failed ❌</option>
                          </select>
                        </div>

                        {currentInsp.status !== 'passed' && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Rejected Quantity</label>
                              <input
                                type="number"
                                min={0}
                                max={item.receivedQuantity}
                                value={currentInsp.rejectedQuantity}
                                onChange={e => {
                                  const val = e.target.value;
                                  setItemInspections(prev => ({
                                    ...prev,
                                    [item._id]: { ...prev[item._id], rejectedQuantity: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Rejection Reason</label>
                              <input
                                type="text"
                                placeholder="Defect or discrepancy..."
                                value={currentInsp.rejectionReason}
                                onChange={e => {
                                  const val = e.target.value;
                                  setItemInspections(prev => ({
                                    ...prev,
                                    [item._id]: { ...prev[item._id], rejectionReason: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall inspection notes */}
              <div className="space-y-3 bg-teal-50/50 rounded-2xl p-4 border border-teal-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Overall Inspection Decision</label>
                    <select
                      value={overallStatus}
                      onChange={e => setOverallStatus(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="passed">Overall Passed — Accept & Stock Inventory</option>
                      <option value="partially_passed">Partially Passed — Accept Passed Items</option>
                      <option value="failed">Failed — Reject Goods</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Notes & Observations</label>
                    <input
                      type="text"
                      placeholder="Verified physical condition, packaging, and specs..."
                      value={inspectionNotes}
                      onChange={e => setInspectionNotes(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInspectModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                {isStoreManager && (
                  <button
                    type="submit"
                    disabled={submittingInspection}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-500 disabled:opacity-60 shadow-md"
                  >
                    <FaClipboardCheck size={13} /> {submittingInspection ? 'Recording…' : 'Confirm Inspection & Update Stock'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
