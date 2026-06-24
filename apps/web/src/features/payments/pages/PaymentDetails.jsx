import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaFileInvoice, FaTruck, FaShoppingCart, FaSpinner, FaExclamationTriangle, FaCheck, FaCoins } from 'react-icons/fa';
import { toast } from 'react-toastify';
import paymentService from '../../../services/payment.service';
import ConfirmModal from '../../../components/ConfirmModal';

const MatchCard = ({ icon: Icon, title, number, date, amount, color }) => (
  <div className={`bg-white rounded-xl border-2 ${color} p-5 text-center transition-all hover:shadow-md`}>
    <Icon className="mx-auto text-emerald-600 mb-2" size={24} />
    <p className="text-xs font-semibold text-slate-500 uppercase">{title}</p>
    <p className="text-sm font-bold text-slate-800 mt-1">{number || 'Pending/None'}</p>
    <p className="text-xs text-slate-500 mt-0.5">{date ? new Date(date).toLocaleDateString() : 'Awaiting receipt'}</p>
    {amount !== undefined && amount !== null && (
      <p className="text-sm font-semibold text-emerald-600 mt-2">LKR {amount.toLocaleString()}</p>
    )}
  </div>
);

export default function PaymentDetails() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [approveModal, setApproveModal] = useState(false);
  const [comments, setComments] = useState('');
  const [payModal, setPayModal] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  useEffect(() => {
    let active = true;
    paymentService.getById(id)
      .then(res => {
        if (active) setPayment(res.data);
      })
      .catch(() => {
        if (active) toast.error('Failed to load payment voucher details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleThreeWayMatch = async () => {
    setActionLoading(true);
    try {
      const res = await paymentService.threeWayMatch(id);
      setPayment(res.data);
      if (res.data.threeWayMatchStatus === 'matched') {
        toast.success('🎉 3-Way Match Successful! All document values and quantities align.');
      } else {
        toast.warning('⚠ 3-Way Match Discrepancy detected! Please review the variances.');
      }
    } catch (err) {
      toast.error(err.message || 'Error executing three-way matching.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await paymentService.approve(id, { comments });
      setPayment(res.data);
      toast.success('✅ Payment voucher approved for disbursement.');
      setApproveModal(false);
      setComments('');
    } catch (err) {
      toast.error(err.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!transactionRef.trim()) {
      toast.error('Please enter a bank transaction reference.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await paymentService.markPaid(id, { transactionRef });
      setPayment(res.data);
      toast.success('💸 Payment disbursed and marked as PAID.');
      setPayModal(false);
      setTransactionRef('');
    } catch (err) {
      toast.error(err.message || 'Disbursing payment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <FaSpinner className="animate-spin text-emerald-600 mr-2" size={20} />
        <span className="text-slate-500">Loading payment voucher details...</span>
      </div>
    );
  }

  if (!payment) {
    return <div className="text-center py-24 text-slate-400">Payment voucher not found.</div>;
  }

  const borderColors = {
    pending: 'border-slate-200 bg-slate-50/20',
    matched: 'border-emerald-200 bg-emerald-50/10',
    discrepancy: 'border-red-200 bg-red-50/10',
  };

  const currentMatchColor = borderColors[payment.threeWayMatchStatus] || borderColors.pending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/payments" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <FaArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{payment.paymentNumber}</h1>
            <p className="text-sm text-slate-500">
              For {payment.contractId?.title || 'Contract'} • {payment.vendorId?.companyName || 'Vendor'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {payment.status === 'pending_match' && (
            <button onClick={handleThreeWayMatch} disabled={actionLoading} className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
              {actionLoading ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
              <span>Verify & Run 3-Way Match</span>
            </button>
          )}
          {payment.status === 'pending_approval' && (
            <button onClick={() => setApproveModal(true)} className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
              <FaCheck /><span>Approve Voucher</span>
            </button>
          )}
          {(payment.status === 'approved' || payment.status === 'processing') && (
            <button onClick={() => setPayModal(true)} className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
              <FaCoins /><span>Disburse Funds (Pay)</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Way Match Verification Card */}
      <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6`}>
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
          <FaCheckCircle className="text-emerald-600" />
          <span>3-Way Matching Verification</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MatchCard icon={FaShoppingCart} title="Purchase Order" number={payment.purchaseOrder?.poNumber} date={payment.purchaseOrder?.poDate} amount={payment.purchaseOrder?.poAmount} color={currentMatchColor} />
          <MatchCard icon={FaTruck} title="Goods Received Note" number={payment.goodsReceivedNote?.grnNumber} date={payment.goodsReceivedNote?.grnDate} color={currentMatchColor} />
          <MatchCard icon={FaFileInvoice} title="Vendor Invoice" number={payment.invoice?.invoiceNumber} date={payment.invoice?.invoiceDate} amount={payment.invoice?.invoiceAmount} color={currentMatchColor} />
        </div>

        {/* Dynamic Verification Note */}
        {payment.threeWayMatchStatus === 'matched' && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2">
            <FaCheckCircle className="text-emerald-600" size={14} />
            <span className="text-sm font-medium text-emerald-700">All three documents match — Payment authorized for approval queue.</span>
          </div>
        )}
        {payment.threeWayMatchStatus === 'discrepancy' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
            <div className="flex items-center space-x-2">
              <FaExclamationTriangle className="text-red-600" size={15} />
              <span className="text-sm font-bold text-red-800">3-Way Match Discrepancies Detected</span>
            </div>
            <ul className="list-disc pl-5 text-xs text-red-700 space-y-1">
              {payment.matchDiscrepancies?.map((d, i) => (
                <li key={i}>
                  Field <span className="font-semibold">{d.field}</span>: PO expected <span className="font-semibold">{d.poValue}</span> but GRN/Invoice got <span className="font-semibold">{d.grnValue || d.invoiceValue}</span>.
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500">Go to the Delivery section to review goods receipt inspect details or resolve discrepancy.</p>
          </div>
        )}
        {payment.threeWayMatchStatus === 'pending' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2">
            <FaExclamationTriangle className="text-amber-600 animate-pulse" size={14} />
            <span className="text-sm font-medium text-amber-700">Documents loaded. Click "Verify & Run 3-Way Match" above to execute matching validation.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gross Amount</span>
              <span className="font-semibold">LKR {(payment.amount || 0).toLocaleString()}</span>
            </div>
            {payment.deductions?.map((d, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-red-500">- {d.description}</span>
                <span className="text-red-600 font-medium">LKR {d.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
              <span className="font-bold text-slate-800">Net Payable</span>
              <span className="font-bold text-emerald-600 text-lg">LKR {((payment.netAmount || payment.amount) || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Payment Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Type</span>
              <span className="capitalize font-medium">{payment.paymentType} Payment</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>{payment.status.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Contract</span>
              <span className="font-mono text-xs text-slate-700">{payment.contractId?.contractNumber}</span>
            </div>
            {payment.transactionRef && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Transaction Reference</span>
                <span className="font-mono text-xs text-purple-700 font-bold">{payment.transactionRef}</span>
              </div>
            )}
            {payment.paidAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paid On</span>
                <span className="font-medium text-slate-800">{new Date(payment.paidAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      <ConfirmModal isOpen={approveModal} onClose={() => setApproveModal(false)} onConfirm={handleApprove} title="Approve Payment Voucher" confirmText="Approve Payment" variant="info">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Are you sure you want to approve payment voucher <span className="font-bold">{payment.paymentNumber}</span> for disbursement?</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Comments</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={2} placeholder="Add comments/notes..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" />
          </div>
        </div>
      </ConfirmModal>

      {/* Pay Modal */}
      <ConfirmModal isOpen={payModal} onClose={() => setPayModal(false)} onConfirm={handleMarkPaid} title="Disburse Funds" confirmText="Mark Paid & Disbursed" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Process payment disbursement for <span className="font-bold text-emerald-700">LKR {((payment.netAmount || payment.amount) || 0).toLocaleString()}</span>?</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Transaction Reference / Cheque No. *</label>
            <input type="text" value={transactionRef} onChange={e => setTransactionRef(e.target.value)} placeholder="e.g. TXN98327498237" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" required />
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}

