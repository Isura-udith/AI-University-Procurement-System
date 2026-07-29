import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaBoxOpen, FaExclamationTriangle, FaSpinner, FaClipboardCheck, FaFileInvoiceDollar, FaTimes, FaSearch, FaClipboardList, FaTruck } from 'react-icons/fa';
import ConfirmModal from '../../../components/ConfirmModal';
import StatusBadge from '../../../components/StatusBadge';
import contractService from '../../../services/contract.service';
import usePermissions from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';

export default function DeliveryPage() {
  const { hasPermission, role } = usePermissions();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [grnModal, setGrnModal] = useState(null);
  const [inspectModal, setInspectModal] = useState(null);
  const [threeWayModal, setThreeWayModal] = useState(null);
  const [grnForm, setGrnForm] = useState({ receivedQty: '', acceptedQty: '', condition: 'good', remarks: '' });
  const refreshDeliveries = async () => {
    setLoading(true);
    try {
      const res = await contractService.getDeliveries();
      setDeliveries(res.data || []);
    } catch {
      setDeliveries([]);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    contractService.getDeliveries()
      .then(res => {
        if (active) setDeliveries(res.data || []);
      })
      .catch(() => {
        if (active) {
          setDeliveries([]);
          toast.error('Failed to load deliveries');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleExportCSV = () => {
    if (!deliveries || deliveries.length === 0) {
      toast.info('No delivery records to export.');
      return;
    }
    const headers = ['PO Number', 'Contract', 'Vendor', 'Items', 'Ordered Qty', 'Received Qty', 'GRN Ref', 'Match Status'];
    const rows = deliveries.map(d => [
      d.po || '',
      `"${(d.contract || '').replace(/"/g, '""')}"`,
      `"${(d.vendor || '').replace(/"/g, '""')}"`,
      `"${(d.items || '').replace(/"/g, '""')}"`,
      d.orderedQty || 0,
      d.receivedQty || 0,
      d.grn || '',
      d.matchStatus || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deliveries_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Deliveries exported to CSV');
  };

  const openGrnModal = (d) => {
    setGrnModal(d);
    setGrnForm({
      receivedQty: String(d.orderedQty || ''),
      acceptedQty: String(d.orderedQty || ''),
      condition: 'good',
      remarks: ''
    });
  };

  const handleRecordGRN = async () => {
    if (!grnForm.receivedQty) { toast.error('Enter received quantity.'); return; }
    const grnRef = `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    try {
      await contractService.recordGRN(grnModal._id, {
        grnRef,
        receivedQty: parseInt(grnForm.receivedQty, 10),
        acceptedQty: parseInt(grnForm.acceptedQty || grnForm.receivedQty, 10),
        condition: grnForm.condition,
        remarks: grnForm.remarks,
        orderedQty: grnModal.orderedQty
      });
      toast.success(`✅ GRN ${grnRef} recorded. Corresponding payment voucher initiated.`);
      setGrnModal(null);
      setGrnForm({ receivedQty: '', acceptedQty: '', condition: 'good', remarks: '' });
      await refreshDeliveries();
    } catch (err) {
      toast.error(err.message || 'Failed to record GRN.');
    }
  };

  const handleResolveDiscrepancy = async () => {
    try {
      await contractService.resolveDiscrepancy(inspectModal._id);
      toast.success('✅ Discrepancy resolved. Item accepted with noted variance.');
      setInspectModal(null);
      await refreshDeliveries();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve discrepancy.');
    }
  };

  const filtered = deliveries.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.po?.toLowerCase().includes(q) || d.vendor?.toLowerCase().includes(q) || d.items?.toLowerCase().includes(q);
  });

  const stats = {
    matched: deliveries.filter(d => d.matchStatus === 'matched').length,
    pending: deliveries.filter(d => d.status === 'pending' || d.matchStatus === 'pending').length,
    discrepancy: deliveries.filter(d => d.matchStatus === 'discrepancy').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="relative overflow-hidden bg-[#0d1527] rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none text-emerald-500"> 
          <FaTruck size={160} /> 
        </div>

        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Delivery & 3-Way Matching
          </h1>
        </div>

        <div className="relative z-10 flex items-center space-x-3 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/60 shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4 hover:shadow-md transition-all">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><FaCheckCircle size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.matched}</p>
            <p className="text-xs font-semibold text-slate-500">Fully Matched</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4 hover:shadow-md transition-all">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><FaBoxOpen size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.pending}</p>
            <p className="text-xs font-semibold text-slate-500">Awaiting Delivery / GRN</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4 hover:shadow-md transition-all">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl"><FaExclamationTriangle size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.discrepancy}</p>
            <p className="text-xs font-semibold text-slate-500">Discrepancies</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FaSearch className="absolute left-3.5 top-3.5 text-slate-400" size={13} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by PO, vendor, or item..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 shadow-xs" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} /><span className="text-sm text-slate-500">Loading deliveries...</span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">PO #</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Items</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Vendor</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-center">Qty (Ord/Rcvd)</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">GRN</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">3-Way Match</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d._id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${d.matchStatus === 'discrepancy' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">{d.po}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate-800">{d.items}</p>
                      <p className="text-xs text-slate-400">{d.contract}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{d.vendor}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-sm">{d.orderedQty}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className={`text-sm font-bold ${d.receivedQty === d.orderedQty && d.receivedQty > 0 ? 'text-emerald-600' : d.receivedQty > 0 ? 'text-red-600' : 'text-slate-400'}`}>{d.receivedQty}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{d.grn || '—'}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={d.matchStatus}
                        label={
                          d.matchStatus === 'matched' ? '✓ Matched' :
                          d.matchStatus === 'discrepancy' ? '⚠ Discrepancy' : 'Pending'
                        }
                      />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {d.status === 'pending' && (hasPermission(PERMISSIONS.RECORD_GRN) || ['store_manager', 'contract_manager', 'procurement_officer', 'admin', 'super_admin'].includes(role)) && (
                          <button onClick={() => openGrnModal(d)} className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-colors">
                            <FaClipboardCheck size={10} /><span>Record GRN</span>
                          </button>
                        )}
                        {d.matchStatus === 'discrepancy' && (hasPermission(PERMISSIONS.RECORD_GRN) || ['store_manager', 'contract_manager', 'procurement_officer', 'admin', 'super_admin'].includes(role)) && (
                          <button onClick={() => setInspectModal(d)} className="flex items-center space-x-1 px-3 py-1.5 border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                            <FaExclamationTriangle size={10} /><span>Resolve</span>
                          </button>
                        )}
                        {d.matchStatus === 'matched' && (
                          <button onClick={() => setThreeWayModal(d)} className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                            <FaFileInvoiceDollar size={10} /><span>View Match</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No deliveries found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GRN Modal */}
      {grnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setGrnModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Goods Received Note</h3>
                <p className="text-xs text-slate-500">{grnModal.po} — {grnModal.items}</p>
              </div>
              <button onClick={() => setGrnModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><FaTimes size={12} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ordered Qty</label>
                  <input value={grnModal.orderedQty} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Received Qty *</label>
                  <input type="number" value={grnForm.receivedQty} onChange={e => setGrnForm(f => ({ ...f, receivedQty: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Accepted Qty</label>
                <input type="number" value={grnForm.acceptedQty} onChange={e => setGrnForm(f => ({ ...f, acceptedQty: e.target.value }))} placeholder={grnForm.receivedQty || 'Same as received'} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Condition</label>
                <select value={grnForm.condition} onChange={e => setGrnForm(f => ({ ...f, condition: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="good">Good — No damage</option>
                  <option value="minor">Minor damage — Acceptable</option>
                  <option value="major">Major damage — Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Remarks</label>
                <textarea value={grnForm.remarks} onChange={e => setGrnForm(f => ({ ...f, remarks: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none" placeholder="Inspection notes..." />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 rounded-b-2xl">
              <button onClick={() => setGrnModal(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Cancel</button>
              <button onClick={handleRecordGRN} className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 shadow-sm flex items-center space-x-1.5">
                <FaClipboardCheck size={11} /><span>Record GRN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Discrepancy Modal */}
      <ConfirmModal isOpen={!!inspectModal} onClose={() => setInspectModal(null)} onConfirm={handleResolveDiscrepancy} title="Resolve Discrepancy" confirmText="Accept with Variance" variant="warning">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Quantity discrepancy for <span className="font-bold">{inspectModal?.items}</span>:</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Ordered</span><span className="font-bold">{inspectModal?.orderedQty}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Received</span><span className="font-bold text-red-700">{inspectModal?.receivedQty}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Shortfall</span><span className="font-bold text-red-700">{(inspectModal?.orderedQty || 0) - (inspectModal?.receivedQty || 0)} units</span></div>
          </div>
          <p className="text-xs text-slate-400">Accepting will create a debit note for the shortfall and update the contract records.</p>
        </div>
      </ConfirmModal>

      {/* 3-Way Match View Modal */}
      {threeWayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setThreeWayModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">3-Way Match Verification</h3>
              <button onClick={() => setThreeWayModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><FaTimes size={12} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 uppercase font-bold">{threeWayModal.po} — {threeWayModal.vendor}</p>
              {[
                { label: 'Purchase Order', ref: threeWayModal.po, amount: threeWayModal.poAmount, qty: threeWayModal.orderedQty, icon: FaClipboardList },
                { label: 'Goods Received Note', ref: threeWayModal.grn, amount: null, qty: threeWayModal.receivedQty, icon: FaBoxOpen },
                { label: 'Vendor Invoice', ref: threeWayModal.invoiceRef, amount: threeWayModal.invoiceAmount, qty: null, icon: FaFileInvoiceDollar },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <item.icon className="text-emerald-600" size={14} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.ref || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.amount && <p className="text-sm font-bold text-slate-800">LKR {item.amount.toLocaleString()}</p>}
                    {item.qty !== null && <p className="text-xs text-slate-500">{item.qty} units</p>}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center space-x-2 py-2">
                <FaCheckCircle className="text-emerald-500" size={16} />
                <span className="text-sm font-bold text-emerald-700">All Three Documents Match ✓</span>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right rounded-b-2xl">
              <button onClick={() => setThreeWayModal(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
