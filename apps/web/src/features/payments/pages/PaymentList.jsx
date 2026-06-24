import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaCheckCircle, FaClock, FaExclamationTriangle, FaEye, FaPlusCircle, FaTimes, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import paymentService from '../../../services/payment.service';
import contractService from '../../../services/contract.service';

const statusColors = {
  paid: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-teal-100 text-teal-700',
  pending_approval: 'bg-blue-100 text-blue-700',
  pending_match: 'bg-amber-100 text-amber-700',
  processing: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700'
};

const statusLabels = {
  paid: 'Paid',
  approved: 'Approved',
  pending_approval: 'Pending Approval',
  pending_match: 'Awaiting Match',
  processing: 'Processing',
  rejected: 'Rejected'
};

export default function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    contractId: '',
    paymentType: 'progress',
    amount: '',
    invoiceNumber: '',
    invoiceAmount: '',
    grnNumber: '',
    remarks: ''
  });

  const refreshData = async () => {
    setLoading(true);
    try {
      const pRes = await paymentService.getAll();
      setPayments(pRes.data || []);
      const cRes = await contractService.getAll({ status: 'active' });
      setContracts(cRes.data || []);
    } catch {
      toast.error('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      paymentService.getAll(),
      contractService.getAll({ status: 'active' })
    ]).then(([pRes, cRes]) => {
      if (active) {
        setPayments(pRes.data || []);
        setContracts(cRes.data || []);
      }
    }).catch(() => {
      if (active) toast.error('Failed to load payments.');
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
      setForm(prev => ({
        ...prev,
        contractId: cId,
        amount: selectedContract.contractValue,
        invoiceAmount: selectedContract.contractValue,
        grnNumber: `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
      }));
    } else {
      setForm(prev => ({ ...prev, contractId: cId }));
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!form.contractId || !form.amount || !form.invoiceNumber || !form.grnNumber) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedContract = contracts.find(c => c._id === form.contractId);
      const payload = {
        contractId: form.contractId,
        procurementId: selectedContract.procurementId?._id || selectedContract.procurementId,
        vendorId: selectedContract.vendorId?._id || selectedContract.vendorId,
        amount: parseFloat(form.amount),
        paymentType: form.paymentType,
        purchaseOrder: {
          poNumber: selectedContract.contractNumber.replace('CNT-', 'PO-'),
          poDate: selectedContract.startDate || new Date(),
          poAmount: selectedContract.contractValue
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
        deductions: [{ description: 'Retention (10%)', amount: parseFloat(form.amount) * 0.1, type: 'retention' }],
        status: 'pending_match',
        threeWayMatchStatus: 'pending'
      };

      await paymentService.create(payload);
      toast.success('✅ Payment voucher initiated successfully.');
      setIsModalOpen(false);
      setForm({ contractId: '', paymentType: 'progress', amount: '', invoiceNumber: '', invoiceAmount: '', grnNumber: '', remarks: '' });
      await refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to create payment voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.paymentNumber?.toLowerCase().includes(q) ||
      p.contractId?.title?.toLowerCase().includes(q) ||
      p.vendorId?.companyName?.toLowerCase().includes(q)
    );
  });

  const stats = {
    paid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.netAmount || p.amount || 0), 0),
    pendingApproval: payments.filter(p => p.status === 'pending_approval').length,
    discrepancies: payments.filter(p => p.threeWayMatchStatus === 'discrepancy').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments & Finance</h1>
          <p className="text-sm text-slate-500 mt-1">Stage 14: 3-Way Matching, invoice verification, and disbursement approval</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-sm transition-colors self-start sm:self-auto">
          <FaPlusCircle size={14} /><span>Initiate Payment Voucher</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg"><FaCheckCircle size={16} /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">LKR {(stats.paid / 1000000).toFixed(2)}M</p>
              <p className="text-xs text-slate-500">Total Disbursed (Paid)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg"><FaClock size={16} /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pendingApproval}</p>
              <p className="text-xs text-slate-500">Pending Approvals</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-lg"><FaExclamationTriangle size={16} /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.discrepancies}</p>
              <p className="text-xs text-slate-500">Match Discrepancies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table & Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments by voucher #, contract title, or vendor..." className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-emerald-600 mr-2" size={18} />
            <span className="text-sm text-slate-500">Loading payments...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Payment #</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Contract</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Net Amount</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">3-Way Match</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-800">{p.paymentNumber}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{p.contractId?.title || 'Unknown Contract'}</p>
                      <p className="text-xs text-slate-400">{p.contractId?.contractNumber}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.vendorId?.companyName || 'Unknown Vendor'}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">LKR {((p.netAmount || p.amount) || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        p.threeWayMatchStatus === 'matched' ? 'bg-emerald-100 text-emerald-700' :
                        p.threeWayMatchStatus === 'discrepancy' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {p.threeWayMatchStatus === 'matched' ? '✓ Matched' :
                         p.threeWayMatchStatus === 'discrepancy' ? '⚠ Discrepancy' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[p.status]}`}>
                        {statusLabels[p.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/payments/${p._id}`} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors inline-block">
                        <FaEye size={14} />
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
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Initiate Payment Voucher</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><FaTimes size={14} /></button>
            </div>
            <form onSubmit={handleCreatePayment}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Active Contract *</label>
                  <select value={form.contractId} onChange={e => handleContractChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option value="">-- Choose Contract --</option>
                    {contracts.map(c => (
                      <option key={c._id} value={c._id}>{c.contractNumber} — {c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Type</label>
                    <select value={form.paymentType} onChange={e => setForm(f => ({ ...f, paymentType: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
                      <option value="advance">Advance Payment</option>
                      <option value="progress">Progress Payment</option>
                      <option value="final">Final Payment</option>
                      <option value="retention_release">Retention Release</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Amount (LKR) *</label>
                    <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value, invoiceAmount: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">GRN Ref Number *</label>
                    <input type="text" value={form.grnNumber} onChange={e => setForm(f => ({ ...f, grnNumber: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor Invoice Number *</label>
                    <input type="text" value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="e.g. INV-MT-2026-901" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Remarks / Details</label>
                  <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none" placeholder="Add any AP processing notes..." />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center space-x-1.5 shadow-sm disabled:opacity-50">
                  {submitting ? 'Initiating...' : 'Initiate Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

