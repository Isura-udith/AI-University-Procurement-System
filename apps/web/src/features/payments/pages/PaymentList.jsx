import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaCheckCircle, FaClock, FaExclamationTriangle, FaEye, FaPlusCircle, FaTimes, FaSpinner, FaFilter, FaCalculator } from 'react-icons/fa';
import { toast } from 'react-toastify';
import paymentService from '../../../services/payment.service';
import contractService from '../../../services/contract.service';

const statusColors = {
  paid: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  approved: 'bg-teal-100 text-teal-700 border border-teal-300',
  pending_approval: 'bg-blue-100 text-blue-700 border border-blue-300',
  pending_match: 'bg-amber-100 text-amber-700 border border-amber-300',
  processing: 'bg-purple-100 text-purple-700 border border-purple-300',
  rejected: 'bg-red-100 text-red-700 border border-red-300'
};

const statusLabels = {
  paid: 'Paid & Disbursed',
  approved: 'Approved',
  pending_approval: 'Pending Approval',
  pending_match: 'Awaiting 3-Way Match',
  processing: 'Processing',
  rejected: 'Rejected'
};

export default function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Form State
  const [form, setForm] = useState({
    contractId: '',
    paymentType: 'progress',
    amount: '',
    invoiceNumber: '',
    invoiceAmount: '',
    grnNumber: '',
    budgetCode: 'VOTE-UWU-2026-CAPEX',
    retentionPercent: 10,
    whtTaxPercent: 0,
    remarks: ''
  });

  const refreshData = async () => {
    setLoading(true);
    try {
      const pRes = await paymentService.getAll({ status: statusFilter !== 'all' ? statusFilter : undefined, paymentType: typeFilter !== 'all' ? typeFilter : undefined });
      setPayments(pRes.data || []);
      const cRes = await contractService.getAll();
      setContracts(cRes.data || []);
    } catch {
      toast.error('Failed to load payments data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      paymentService.getAll(),
      contractService.getAll()
    ]).then(([pRes, cRes]) => {
      if (active) {
        setPayments(pRes.data || []);
        setContracts(cRes.data || []);
      }
    }).catch(() => {
      if (active) toast.error('Failed to load payments data.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleContractChange = (cId) => {
    const selectedContract = contracts.find(c => c._id === cId);
    if (selectedContract) {
      const val = selectedContract.contractValue || 0;
      setForm(prev => ({
        ...prev,
        contractId: cId,
        amount: val,
        invoiceAmount: val,
        grnNumber: `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
      }));
    } else {
      setForm(prev => ({ ...prev, contractId: cId }));
    }
  };

  const calculatedRetention = (parseFloat(form.amount || 0) * (parseFloat(form.retentionPercent || 0) / 100));
  const calculatedTax = (parseFloat(form.amount || 0) * (parseFloat(form.whtTaxPercent || 0) / 100));
  const calculatedNetPayable = Math.max(0, parseFloat(form.amount || 0) - calculatedRetention - calculatedTax);

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!form.contractId || !form.amount || !form.invoiceNumber || !form.grnNumber) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedContract = contracts.find(c => c._id === form.contractId);
      const grossAmt = parseFloat(form.amount);

      const deductions = [];
      if (form.retentionPercent > 0) {
        deductions.push({ description: `Retention (${form.retentionPercent}%)`, amount: calculatedRetention, type: 'retention' });
      }
      if (form.whtTaxPercent > 0) {
        deductions.push({ description: `WHT Tax (${form.whtTaxPercent}%)`, amount: calculatedTax, type: 'tax' });
      }

      const payload = {
        contractId: form.contractId,
        procurementId: selectedContract.procurementId?._id || selectedContract.procurementId,
        vendorId: selectedContract.vendorId?._id || selectedContract.vendorId,
        amount: grossAmt,
        paymentType: form.paymentType,
        budgetCode: form.budgetCode,
        remarks: form.remarks,
        purchaseOrder: {
          poNumber: selectedContract.contractNumber ? selectedContract.contractNumber.replace('CNT-', 'PO-') : `PO-${selectedContract._id.toString().slice(-4)}`,
          poDate: selectedContract.startDate || new Date(),
          poAmount: selectedContract.contractValue || grossAmt
        },
        goodsReceivedNote: {
          grnNumber: form.grnNumber,
          grnDate: new Date(),
          items: [{ description: selectedContract.title, orderedQty: 1, receivedQty: 1, acceptedQty: 1 }]
        },
        invoice: {
          invoiceNumber: form.invoiceNumber,
          invoiceDate: new Date(),
          invoiceAmount: parseFloat(form.invoiceAmount || form.amount)
        },
        deductions,
        status: 'pending_match',
        threeWayMatchStatus: 'pending'
      };

      await paymentService.create(payload);
      toast.success('✅ Payment voucher initiated successfully.');
      setIsModalOpen(false);
      setForm({ contractId: '', paymentType: 'progress', amount: '', invoiceNumber: '', invoiceAmount: '', grnNumber: '', budgetCode: 'VOTE-UWU-2026-CAPEX', retentionPercent: 10, whtTaxPercent: 0, remarks: '' });
      await refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to create payment voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (typeFilter !== 'all' && p.paymentType !== typeFilter) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.paymentNumber?.toLowerCase().includes(q) ||
      p.contractId?.title?.toLowerCase().includes(q) ||
      p.contractId?.contractNumber?.toLowerCase().includes(q) ||
      p.vendorId?.companyName?.toLowerCase().includes(q) ||
      p.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
      p.goodsReceivedNote?.grnNumber?.toLowerCase().includes(q)
    );
  });

  const stats = {
    paid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.netAmount || p.amount || 0), 0),
    pendingApproval: payments.filter(p => p.status === 'pending_approval').length,
    discrepancies: payments.filter(p => p.threeWayMatchStatus === 'discrepancy').length
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments & Finance</h1>
          <p className="text-sm text-slate-500 mt-1">Stage 14: 3-Way Matching, invoice verification, and disbursement approval</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <FaPlusCircle size={15} />
          <span>Initiate Payment Voucher</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><FaCheckCircle size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">LKR {(stats.paid / 1000000).toFixed(2)}M</p>
            <p className="text-xs font-medium text-slate-500">Total Disbursed (Paid)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FaClock size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.pendingApproval}</p>
            <p className="text-xs font-medium text-slate-500">Pending Financial Approvals</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><FaExclamationTriangle size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.discrepancies}</p>
            <p className="text-xs font-medium text-slate-500">3-Way Match Discrepancies</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-1/2">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search payments by voucher #, contract title, vendor, invoice..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
            <FaFilter size={12} />
            <span>Filters:</span>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending_match">Awaiting 3-Way Match</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid & Disbursed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="advance">Advance Payment</option>
            <option value="progress">Progress Payment</option>
            <option value="final">Final Payment</option>
            <option value="retention_release">Retention Release</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
            <span className="text-sm text-slate-500">Loading payment vouchers...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Voucher #</th>
                  <th className="px-6 py-3.5">Contract Particulars</th>
                  <th className="px-6 py-3.5">Vendor</th>
                  <th className="px-6 py-3.5">Gross / Net Amount</th>
                  <th className="px-6 py-3.5">3-Way Match</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{p.paymentNumber}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 line-clamp-1">{p.contractId?.title || 'Unknown Contract'}</p>
                      <p className="text-xs font-mono text-slate-400">{p.contractId?.contractNumber}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {p.vendorId?.companyName || 'Unknown Vendor'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">LKR {((p.netAmount || p.amount) || 0).toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400">Gross: LKR {(p.amount || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        ['matched', 'resolved'].includes(p.threeWayMatchStatus) ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        p.threeWayMatchStatus === 'discrepancy' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {['matched', 'resolved'].includes(p.threeWayMatchStatus) ? '✓ Matched' :
                         p.threeWayMatchStatus === 'discrepancy' ? '⚠ Discrepancy' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors[p.status] || 'bg-slate-100 text-slate-700'}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/payments/${p._id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <FaEye size={12} />
                        <span>View Details</span>
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No payment vouchers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Initiate Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Initiate Payment Voucher</h3>
                <p className="text-xs text-slate-500">Create new Treasury AP Payment Voucher for active contract milestone</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><FaTimes size={16} /></button>
            </div>
            <form onSubmit={handleCreatePayment}>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Active Contract *</label>
                  <select
                    value={form.contractId}
                    onChange={e => handleContractChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    <option value="">-- Choose Contract --</option>
                    {contracts.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.contractNumber} — {c.title} ({c.vendorId?.companyName || 'Vendor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Type *</label>
                    <select
                      value={form.paymentType}
                      onChange={e => setForm(f => ({ ...f, paymentType: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
                    >
                      <option value="advance">Advance Payment</option>
                      <option value="progress">Progress Payment</option>
                      <option value="final">Final Payment</option>
                      <option value="retention_release">Retention Release</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Budget Vote / Code *</label>
                    <input
                      type="text"
                      value={form.budgetCode}
                      onChange={e => setForm(f => ({ ...f, budgetCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gross Claim Amount (LKR) *</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value, invoiceAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor Invoice Number *</label>
                    <input
                      type="text"
                      value={form.invoiceNumber}
                      onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                      placeholder="e.g. INV-MT-2026-901"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">GRN Ref Number *</label>
                    <input
                      type="text"
                      value={form.grnNumber}
                      onChange={e => setForm(f => ({ ...f, grnNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Retention Rate (%)</label>
                    <input
                      type="number"
                      value={form.retentionPercent}
                      onChange={e => setForm(f => ({ ...f, retentionPercent: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Net Calculation Summary Box */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-900">
                  <div className="flex justify-between font-medium">
                    <span>Gross Amount:</span>
                    <span>LKR {(parseFloat(form.amount || 0)).toLocaleString()}</span>
                  </div>
                  {calculatedRetention > 0 && (
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Retention Deduction ({form.retentionPercent}%):</span>
                      <span>- LKR {calculatedRetention.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-emerald-300">
                    <span className="flex items-center space-x-1"><FaCalculator /><span>Calculated Net Payable:</span></span>
                    <span className="font-mono text-emerald-700">LKR {calculatedNetPayable.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Remarks / AP Notes</label>
                  <textarea
                    value={form.remarks}
                    onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none resize-none"
                    placeholder="Add voucher notes for Bursar approval..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center space-x-1.5 shadow-md disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Initiating Voucher...' : 'Initiate Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
