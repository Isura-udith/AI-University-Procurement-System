import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaArrowLeft, FaCheckCircle, FaFileInvoice, FaTruck, FaShoppingCart,
  FaSpinner, FaExclamationTriangle, FaCheck, FaCoins, FaReceipt, FaHistory,
  FaWrench } from 'react-icons/fa';
import { toast } from 'react-toastify';
import paymentService from '../../../services/payment.service';
import ConfirmModal from '../../../components/ConfirmModal';
import PaymentStatus from '../components/PaymentStatus';
import InvoiceView from '../components/InvoiceView';
import useAuth from '../../../hooks/useAuth';
import { ROLES } from '../../../constants/roles';

const CAN_MATCH_ROLES = [ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
const CAN_RESOLVE_ROLES = [ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
const CAN_APPROVE_ROLES = [ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
const CAN_PAY_ROLES = [ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN];

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
  const { user } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'voucher'

  // Modals
  const [approveModal, setApproveModal] = useState(false);
  const [comments, setComments] = useState('');
  const [payModal, setPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [resolveModal, setResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const canMatch = CAN_MATCH_ROLES.includes(user?.role);
  const canResolve = CAN_RESOLVE_ROLES.includes(user?.role);
  const canApprove = CAN_APPROVE_ROLES.includes(user?.role);
  const canPay = CAN_PAY_ROLES.includes(user?.role);

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
        toast.success('3-Way Match Successful! All document values and quantities align.');
      } else {
        toast.warning('3-Way Match Discrepancy detected! Please review the variances.');
      }
    } catch (err) {
      toast.error(err.message || 'Error executing three-way matching.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDiscrepancy = async () => {
    setActionLoading(true);
    try {
      const res = await paymentService.resolveDiscrepancy(id, { comments: resolutionNotes });
      setPayment(res.data);
      toast.success('Discrepancy resolved. Voucher moved to approval queue.');
      setResolveModal(false);
      setResolutionNotes('');
    } catch (err) {
      toast.error(err.message || 'Failed to resolve discrepancy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await paymentService.approve(id, { comments });
      setPayment(res.data);
      toast.success('Payment voucher approved for disbursement.');
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
      const res = await paymentService.markPaid(id, { transactionRef, paymentMethod });
      setPayment(res.data);
      toast.success('Payment disbursed and marked as PAID.');
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
        <span className="text-slate-500 font-medium">Loading payment voucher details...</span>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-24 text-slate-400">
        Payment voucher not found.
      </div>
    );
  }

  const borderColors = {
    pending: 'border-slate-200 bg-slate-50/20',
    matched: 'border-emerald-200 bg-emerald-50/10',
    resolved: 'border-emerald-200 bg-emerald-50/10',
    discrepancy: 'border-red-200 bg-red-50/10',
  };

  const currentMatchColor = borderColors[payment.threeWayMatchStatus] || borderColors.pending;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link to="/payments" className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <FaArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900">{payment.paymentNumber}</h1>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                payment.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {payment.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Contract: <span className="font-semibold text-slate-700">{payment.contractId?.title || 'Contract'}</span> ({payment.contractId?.contractNumber}) • Vendor: <span className="font-semibold text-slate-700">{payment.vendorId?.companyName}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab switch */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'details' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Voucher Details
            </button>
            <button
              onClick={() => setActiveTab('voucher')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 ${
                activeTab === 'voucher' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FaReceipt size={12} />
              <span>Official Voucher</span>
            </button>
          </div>

          {payment.status === 'pending_match' && canMatch && (
            <button
              onClick={handleThreeWayMatch}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              {actionLoading ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
              <span>Verify & Run 3-Way Match</span>
            </button>
          )}

          {payment.threeWayMatchStatus === 'discrepancy' && canResolve && (
            <button
              onClick={() => setResolveModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <FaWrench />
              <span>Resolve Discrepancy</span>
            </button>
          )}

          {payment.status === 'pending_approval' && canApprove && (
            <button
              onClick={() => setApproveModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <FaCheck />
              <span>Approve Voucher</span>
            </button>
          )}

          {(payment.status === 'approved' || payment.status === 'processing') && canPay && (
            <button
              onClick={() => setPayModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <FaCoins />
              <span>Disburse Funds (Pay)</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'voucher' ? (
        <InvoiceView payment={payment} />
      ) : (
        <>
          {/* Payment Lifecycle Progress */}
          <PaymentStatus payment={payment} />

          {/* 3-Way Match Verification Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
              <FaCheckCircle className="text-emerald-600" />
              <span>3-Way Matching Verification (PO ↔ GRN ↔ Invoice)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MatchCard
                icon={FaShoppingCart}
                title="Purchase Order"
                number={payment.purchaseOrder?.poNumber}
                date={payment.purchaseOrder?.poDate}
                amount={payment.purchaseOrder?.poAmount}
                color={currentMatchColor}
              />
              <MatchCard
                icon={FaTruck}
                title="Goods Received Note"
                number={payment.goodsReceivedNote?.grnNumber}
                date={payment.goodsReceivedNote?.grnDate}
                color={currentMatchColor}
              />
              <MatchCard
                icon={FaFileInvoice}
                title="Vendor Invoice"
                number={payment.invoice?.invoiceNumber}
                date={payment.invoice?.invoiceDate}
                amount={payment.invoice?.invoiceAmount}
                color={currentMatchColor}
              />
            </div>

            {/* Dynamic Verification Note */}
            {['matched', 'resolved'].includes(payment.threeWayMatchStatus) && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2">
                <FaCheckCircle className="text-emerald-600" size={14} />
                <span className="text-sm font-semibold text-emerald-800">
                  All three documents match & reconciled - Voucher ready for Bursar authorization.
                </span>
              </div>
            )}
            {payment.threeWayMatchStatus === 'discrepancy' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaExclamationTriangle className="text-red-600" size={16} />
                    <span className="text-sm font-bold text-red-900">3-Way Match Discrepancies Detected</span>
                  </div>
                  <button
                    onClick={() => setResolveModal(true)}
                    className="text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg transition-colors"
                  >
                    Resolve Discrepancy
                  </button>
                </div>
                <ul className="list-disc pl-5 text-xs text-red-700 space-y-1 font-medium">
                  {payment.matchDiscrepancies?.map((d, i) => (
                    <li key={i}>
                      Field <span className="font-bold">{d.field}</span>: Expected <span className="font-bold">{d.poValue}</span> vs Actual <span className="font-bold">{d.grnValue || d.invoiceValue}</span>. ({d.resolution})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {payment.threeWayMatchStatus === 'pending' && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2">
                <FaExclamationTriangle className="text-amber-600 animate-pulse" size={14} />
                <span className="text-sm font-medium text-amber-800">
                  Documents loaded. Click "Verify & Run 3-Way Match" above to execute reconciliation.
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-3">Financial Claim Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Gross Amount</span>
                  <span className="font-semibold text-slate-800">LKR {(payment.amount || 0).toLocaleString()}</span>
                </div>

                {(payment.deductions || []).map((d, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-red-500 font-medium">- {d.description}</span>
                    <span className="text-red-600 font-semibold">LKR {(d.amount || 0).toLocaleString()}</span>
                  </div>
                ))}

                <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
                  <span className="font-bold text-slate-900">Net Payable Amount</span>
                  <span className="font-bold text-emerald-700 text-lg">LKR {((payment.netAmount || payment.amount) || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-3">Voucher Metadata</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Type</span>
                  <span className="capitalize font-semibold text-slate-800">{payment.paymentType} Payment</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Budget Vote / Code</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">{payment.budgetCode || 'VOTE-UWU-2026-CAPEX'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="capitalize font-medium text-slate-800">{payment.paymentMethod ? payment.paymentMethod.replace('_', ' ') : 'Bank Transfer'}</span>
                </div>
                {payment.transactionRef && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction Reference</span>
                    <span className="font-mono text-xs text-purple-700 font-bold">{payment.transactionRef}</span>
                  </div>
                )}
                {payment.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paid On</span>
                    <span className="font-medium text-slate-800">{new Date(payment.paidAt).toLocaleString()}</span>
                  </div>
                )}
                {payment.remarks && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-bold uppercase block">Remarks</span>
                    <p className="text-xs text-slate-600 mt-1">{payment.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Approvals History */}
          {payment.approvals && payment.approvals.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
                <FaHistory className="text-blue-600" />
                <span>Approval Log & Sign-offs</span>
              </h3>
              <div className="space-y-3">
                {payment.approvals.map((a, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {a.approver?.firstName ? `${a.approver.firstName} ${a.approver.lastName}` : 'Approver'} ({a.role})
                      </p>
                      {a.comments && <p className="text-xs text-slate-500 italic mt-0.5">"{a.comments}"</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                        {a.status}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(a.actionDate).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Resolve Discrepancy Modal */}
      <ConfirmModal
        isOpen={resolveModal}
        onClose={() => setResolveModal(false)}
        onConfirm={handleResolveDiscrepancy}
        title="Resolve 3-Way Match Discrepancy"
        confirmText="Override & Authorize"
        variant="warning"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Confirm discrepancy resolution for voucher <span className="font-bold text-slate-900">{payment.paymentNumber}</span>. This will override document variances and allow Bursar approval.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Justification Notes *</label>
            <textarea
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Quantity discrepancy approved via Debit Note #DN-042..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
              required
            />
          </div>
        </div>
      </ConfirmModal>

      {/* Approve Modal */}
      <ConfirmModal
        isOpen={approveModal}
        onClose={() => setApproveModal(false)}
        onConfirm={handleApprove}
        title="Approve Payment Voucher"
        confirmText="Approve Payment"
        variant="info"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Are you sure you want to approve payment voucher <span className="font-bold">{payment.paymentNumber}</span> for disbursement?
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Comments</label>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={2}
              placeholder="Add Bursar approval comments/notes..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
            />
          </div>
        </div>
      </ConfirmModal>

      {/* Pay / Disburse Modal */}
      <ConfirmModal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        onConfirm={handleMarkPaid}
        title="Disburse Funds (Pay)"
        confirmText="Mark Paid & Disbursed"
        variant="success"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Process payment disbursement of <span className="font-bold text-emerald-700">LKR {((payment.netAmount || payment.amount) || 0).toLocaleString()}</span> to <span className="font-bold text-slate-800">{payment.vendorId?.companyName}</span>?
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none mb-3"
            >
              <option value="bank_transfer">Direct Bank Transfer (SLIPS/RTGS)</option>
              <option value="cheque">Account Payee Cheque</option>
              <option value="lpo">Letter of Payment Order</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Transaction Reference / Cheque No. *</label>
            <input
              type="text"
              value={transactionRef}
              onChange={e => setTransactionRef(e.target.value)}
              placeholder="e.g. SLIPS-TXN-98327498237"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono"
              required
            />
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
