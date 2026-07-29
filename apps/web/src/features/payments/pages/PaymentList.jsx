import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaSearch, FaCheckCircle, FaClock, FaExclamationTriangle, FaEye,
 FaTimes, FaSpinner, FaFilter, FaCalculator,
  FaChevronLeft, FaChevronRight, FaFileAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import paymentService from '../../../services/payment.service';
import contractService from '../../../services/contract.service';
import useAuth from '../../../hooks/useAuth';
import { ROLES } from '../../../constants/roles';

const statusColors = {
  paid: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  approved: 'bg-teal-100 text-teal-800 border border-teal-300',
  pending_approval: 'bg-blue-100 text-blue-800 border border-blue-300',
  pending_match: 'bg-amber-100 text-amber-800 border border-amber-300',
  processing: 'bg-purple-100 text-purple-800 border border-purple-300',
  rejected: 'bg-red-100 text-red-800 border border-red-300'
};

const statusLabels = {
  paid: 'Paid & Disbursed',
  approved: 'Approved',
  pending_approval: 'Pending Approval',
  pending_match: 'Awaiting 3-Way Match',
  processing: 'Processing',
  rejected: 'Rejected'
};

const CAN_INITIATE_ROLES = [
  ROLES.FINANCE_OFFICER,
  ROLES.PROCUREMENT_OFFICER,
  ROLES.SUPPLIER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
];

export default function PaymentList() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

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

  const canInitiate = CAN_INITIATE_ROLES.includes(user?.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentType: typeFilter !== 'all' ? typeFilter : undefined,
        search: search.trim() || undefined
      };
      const [pRes, cRes] = await Promise.all([
        paymentService.getAll(params),
        contractService.getAll({ limit: 100 })
      ]);
      setPayments(pRes.data || []);
      setTotalCount(pRes.total || (pRes.data ? pRes.data.length : 0));
      setContracts(cRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load payments data.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter, search]);

  useEffect(() => {
    Promise.resolve().then(() => loadData());
  }, [loadData]);

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
          poAmount: grossAmt
        },
        goodsReceivedNote: {
          grnNumber: form.grnNumber,
          grnDate: new Date(),
          items: [{ description: selectedContract.title || 'Contract Deliverable', orderedQty: 1, receivedQty: 1, acceptedQty: 1 }]
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
      setForm({
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
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create payment voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (!payments || payments.length === 0) {
      toast.info('No payment records to export.');
      return;
    }
    const headers = ['Voucher Number', 'Invoice Number', 'GRN Number', 'Contract ID', 'Amount (LKR)', 'Status', 'Payment Type', 'Date'];
    const rows = payments.map(p => [
      p.voucherNumber || p._id,
      p.invoiceNumber || '',
      p.grnNumber || '',
      p.contractId?._id || p.contractId || '',
      p.amount || 0,
      p.status || '',
      p.paymentType || '',
      new Date(p.createdAt).toLocaleDateString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payments_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payments exported to CSV');
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const stats = {
    paid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.netAmount || p.amount || 0), 0),
    pendingApproval: payments.filter(p => p.status === 'pending_approval').length,
    discrepancies: payments.filter(p => p.threeWayMatchStatus === 'discrepancy').length
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="relative overflow-hidden bg-[#0d1527] rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none text-emerald-500"> 
          <FaFileAlt size={160} /> 
        </div>

        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Payments & Financial Operations
          </h1>
        </div>

        <div className="relative z-10 flex items-center space-x-3 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/60 shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>Export CSV</span>
          </button>

          {canInitiate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <span>Initiate Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><FaCheckCircle size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              LKR {stats.paid >= 1000000 ? `${(stats.paid / 1000000).toFixed(2)}M` : stats.paid.toLocaleString()}
            </p>
            <p className="text-xs font-medium text-slate-500">Total Disbursed (Paid)</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FaClock size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.pendingApproval}</p>
            <p className="text-xs font-medium text-slate-500">Pending Financial Approvals</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><FaExclamationTriangle size={20} /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.discrepancies}</p>
            <p className="text-xs font-medium text-slate-500">3-Way Match Discrepancies</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-1/2">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
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
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-emerald-600 mr-2" size={20} />
            <span className="text-sm text-slate-500 font-medium">Loading payment vouchers...</span>
          </div>
        ) : (
          <>
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
                  {payments.map(p => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{p.paymentNumber}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 line-clamp-1">{p.contractId?.title || 'Contract Particulars'}</p>
                        <p className="text-xs font-mono text-slate-400">{p.contractId?.contractNumber}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {p.vendorId?.companyName || 'Vendor'}
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
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No payment vouchers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Showing page {page} of {totalPages} ({totalCount} items)</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                  >
                    <FaChevronLeft size={12} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100"
                  >
                    <FaChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </>
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

