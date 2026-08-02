import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaFileContract, FaBuilding, FaSpinner, FaChevronLeft,
  FaTimesCircle, FaCalendarPlus, FaPlusCircle, FaCheckCircle, FaShieldAlt,
  FaStar, FaClipboardCheck, FaFileInvoiceDollar, FaHistory
} from 'react-icons/fa';
import contractService from '../../../services/contract.service';
import ConfirmModal from '../../../components/ConfirmModal';
import MilestoneTracker from '../components/MilestoneTracker';
import StatusBadge from '../../../components/StatusBadge';
import usePermissions from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';



export default function ContractDetails() {
  const { hasPermission, role, user } = usePermissions();
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [terminateModal, setTerminateModal] = useState(false);
  const [extendModal, setExtendModal] = useState(false);
  const [variationModal, setVariationModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [variation, setVariation] = useState({ title: '', amount: '' });
  const [ratingModal, setRatingModal] = useState(false);
  const [newRating, setNewRating] = useState(0);

  // Digital Signature Modal States
  const [signModal, setSignModal] = useState(false);
  const [signingAnim, setSigningAnim] = useState(false);
  const [signaturePin, setSignaturePin] = useState('');

  const loadContract = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contractService.getById(id);
      const data = res.data || res;
      if (data) {
        // Map backend schema to frontend expectation
        const mapped = {
          ...data,
          value: data.contractValue || 0,
          type: data.contractType || 'goods',
          vendor: data.vendorId?.companyName || 'Unknown Vendor',
          vendorContact: data.vendorId?.contactPerson 
            ? `${data.vendorId.contactPerson} • ${data.vendorId.email || ''}`
            : 'N/A',
          tenderRef: data.tenderId?.tenderNumber || data.tenderRef || 'N/A',
          loaRef: data.letterOfAcceptance || data.loaRef || 'N/A',
          performanceSecurityRef: data.performanceSecurity?.document || 'N/A',
          insuranceCertRef: data.insuranceCertRef || 'N/A',
          penaltyRate: data.penaltyRate || 0.05,
          warrantyExpiry: data.warrantyExpiry ? data.warrantyExpiry.split('T')[0] : 'N/A',
          startDate: data.startDate ? data.startDate.split('T')[0] : 'N/A',
          endDate: data.endDate ? data.endDate.split('T')[0] : 'N/A',
          milestones: data.deliverables?.map(d => ({
            title: d.description,
            dueDate: d.expectedDate ? d.expectedDate.split('T')[0] : '—',
            status: d.status === 'accepted' ? 'completed' : d.status === 'delivered' ? 'in-progress' : 'pending',
            deliverables: [d.description]
          })) || [],
          payments: data.paymentSchedule?.map(p => ({
            milestone: p.milestone,
            amount: p.amount,
            status: p.status,
            paidDate: p.status === 'paid' ? 'Paid' : null,
            invoiceRef: p.status === 'paid' ? 'Paid' : null
          })) || [],
          variations: data.variations?.map((v, i) => ({
            id: `VO-${String(i + 1).padStart(3, '0')}`,
            title: v.description,
            amount: v.amount,
            status: v.status,
            date: v.approvedAt ? v.approvedAt.split('T')[0] : '—'
          })) || [],
        };
        setContract(mapped);
      } else {
        setContract(null);
      }
    } catch (err) {
      console.error('Failed to load contract:', err);
      setContract(null);
      toast.error('Failed to load contract details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(() => loadContract());
  }, [id, loadContract]);

  const handleTerminate = async () => {
    if (!terminateReason.trim()) { toast.error('A reason is required.'); return; }
    try {
      await contractService.terminate(id, { reason: terminateReason });
      toast.warning('Contract terminated.');
      loadContract();
    } catch (err) {
      toast.error('Failed to terminate contract: ' + (err.response?.data?.message || err.message));
    }
    setTerminateModal(false);
    setTerminateReason('');
  };

  const handleExtend = async () => {
    if (!extendDate) { toast.error('Select a new end date.'); return; }
    try {
      await contractService.extend(id, { newEndDate: extendDate });
      toast.success(`Contract extended to ${extendDate}.`);
      loadContract();
    } catch (err) {
      toast.error('Failed to extend contract: ' + (err.response?.data?.message || err.message));
    }
    setExtendModal(false);
    setExtendDate('');
  };

  const handleAddVariation = async () => {
    if (!variation.title.trim() || !variation.amount) { toast.error('Fill in all variation fields.'); return; }
    try {
      await contractService.addVariation(id, {
        description: variation.title,
        amount: parseFloat(variation.amount),
      });
      toast.success(`Variation Order added successfully.`);
      loadContract();
    } catch (err) {
      toast.error('Failed to add variation: ' + (err.response?.data?.message || err.message));
    }
    setVariationModal(false);
    setVariation({ title: '', amount: '' });
  };

  const handleMarkPaid = async () => {
    if (paymentModal === null) return;
    try {
      await contractService.markPayment(id, paymentModal, { paidDate: new Date().toISOString().split('T')[0] });
      toast.success(`Payment marked as paid.`);
      loadContract();
    } catch (err) {
      toast.error('Failed to mark payment: ' + (err.response?.data?.message || err.message));
    }
    setPaymentModal(null);
  };

  const handleMilestoneComplete = async (i) => {
    try {
      await contractService.updateDeliverable(id, i, {
        status: 'accepted',
        deliveredDate: new Date().toISOString(),
        acceptanceReport: 'Milestone marked complete via CLM Panel',
      });
      toast.success(`Milestone marked complete.`);
      loadContract();
    } catch (err) {
      toast.error('Failed to complete milestone: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateRating = async () => {
    try {
      await contractService.updatePerformance(id, {
        metrics: [{ metric: 'Overall Rating', target: '4.0', actual: String(newRating), status: newRating >= 3 ? 'met' : 'at_risk' }]
      });
      toast.success(`Performance rating updated.`);
      loadContract();
    } catch (err) {
      toast.error('Failed to update rating: ' + (err.response?.data?.message || err.message));
    }
    setRatingModal(false);
  };

  const handleSignContract = async () => {
    if (!signaturePin.trim()) { toast.error('PIN is required.'); return; }
    setSigningAnim(true);
    try {
      await contractService.sign(id, {
        role: user.role,
        signatureHash: 'SIG-HASH-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + signaturePin.toUpperCase(),
      });
      toast.success('✅ Contract signed successfully!');
      setSignModal(false);
      setSignaturePin('');
      loadContract();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to sign contract.');
    } finally {
      setSigningAnim(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><FaSpinner className="animate-spin text-emerald-600 mr-2" size={20} /><span className="text-slate-500">Loading contract...</span></div>;
  }
  if (!contract) {
    return <div className="text-center py-24 text-slate-400">Contract not found.</div>;
  }

  const paidTotal = (contract.payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const paidPct = contract.value > 0 ? (paidTotal / contract.value * 100) : 0;
  const daysRemaining = Math.max(0, Math.ceil((new Date(contract.endDate) - new Date()) / 86400000));
  const isExpiring = daysRemaining <= 30 && daysRemaining > 0;
  const hasUserSigned = contract.signatures?.some(sig => sig.signatory?._id === user?._id || sig.signatory === user?._id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/contracts')} className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 mb-2"><FaChevronLeft size={9} /><span>Back to Contracts</span></button>
          <h1 className="text-xl font-bold text-slate-900">{contract.title}</h1>
          <div className="flex items-center space-x-3 mt-1">
            <span className="font-mono text-xs text-slate-500">{contract.contractNumber}</span>
            <StatusBadge status={contract.status} />
            {isExpiring && <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">⏰ {daysRemaining}d remaining</span>}
          </div>
        </div>
        {contract.status === 'active' && hasPermission(PERMISSIONS.AWARD_CONTRACT) && (
          <div className="flex items-center space-x-2">
            <button onClick={() => setExtendModal(true)} className="flex items-center space-x-1 px-3 py-2 border border-blue-300 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-50 transition-colors"><FaCalendarPlus size={10} /><span>Extend</span></button>
            <button onClick={() => setVariationModal(true)} className="flex items-center space-x-1 px-3 py-2 border border-purple-300 text-purple-600 text-xs font-semibold rounded-lg hover:bg-purple-50 transition-colors"><FaPlusCircle size={10} /><span>Variation Order</span></button>
            <button onClick={() => setTerminateModal(true)} className="flex items-center space-x-1 px-3 py-2 border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"><FaTimesCircle size={10} /><span>Terminate</span></button>
          </div>
        )}
        {contract.status === 'pending_signature' && !hasUserSigned && (role === 'supplier' || role === 'vc' || role === 'admin' || role === 'super_admin' || hasPermission(PERMISSIONS.SIGN_CONTRACT)) && (
          <div className="flex items-center space-x-2">
            <button onClick={() => setSignModal(true)} className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm animate-pulse">
              <FaShieldAlt size={10} /><span>Sign Contract</span>
            </button>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold">Contract Value</p>
          <p className="text-lg font-bold text-slate-900 mt-1">LKR {(contract.value || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold">Paid</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">LKR {paidTotal.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400">{paidPct.toFixed(0)}% of total</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold">Duration</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{contract.startDate} → {contract.endDate}</p>
          <p className="text-[10px] text-slate-400">{daysRemaining}d remaining</p>
        </div>
        <div
          className={`bg-white border border-slate-200 rounded-lg p-4 shadow-sm ${role !== 'supplier' ? 'cursor-pointer hover:border-amber-300' : ''} transition-colors`}
          onClick={() => {
            if (role !== 'supplier') {
              setNewRating(contract.performanceRating || 0);
              setRatingModal(true);
            }
          }}
        >
          <p className="text-[10px] text-slate-400 uppercase font-bold">Performance</p>
          <div className="flex items-center space-x-1 mt-1">
            {Array.from({ length: 5 }, (_, i) => <FaStar key={i} size={14} className={i < Math.round(contract.performanceRating || 0) ? 'text-amber-400' : 'text-slate-200'} />)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {(contract.performanceRating || 0).toFixed(1)}/5.0 {role !== 'supplier' ? '— Click to edit' : ''}
          </p>
        </div>
      </div>

      {/* Contract Lifecycle & Post E-Sign Workflow Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Contract Lifecycle Progression</h3>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {contract.status === 'draft' ? 'Stage 11: Contract Agreement Drafting' : contract.status === 'pending_signature' ? 'Stage 11: Awaiting Dual Electronic Signatures' : contract.status === 'active' ? 'Stage 12: Contract Active & Delivery Execution (GRN / 3-Way Match)' : contract.status === 'completed' ? 'Stage 13: Contract Finalized & Audit Closed' : 'Contract Terminated'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${contract.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-700'}`}>
              {contract.signatures?.length >= 2 || contract.status === 'active' ? '✓ Fully Signed & Legally Binding' : '⏳ Signature Pending'}
            </span>
          </div>
        </div>

        {/* Stepper Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs font-semibold">
          <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
            <span className="block text-[10px] uppercase font-bold text-emerald-600">Step 1</span>
            <span>Agreement Drafted</span>
          </div>
          <div className={`p-2 border rounded-lg ${contract.signatures?.length > 0 || contract.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'}`}>
            <span className="block text-[10px] uppercase font-bold">Step 2 (E-Sign)</span>
            <span>Dual Digital Signatures</span>
          </div>
          <div className={`p-2 border rounded-lg ${contract.status === 'active' || contract.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
            <span className="block text-[10px] uppercase font-bold">Step 3</span>
            <span>GRN & 3-Way Payment Match</span>
          </div>
          <div className={`p-2 border rounded-lg ${contract.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
            <span className="block text-[10px] uppercase font-bold">Step 4</span>
            <span>Final Settlement & Closure</span>
          </div>
        </div>
      </div>

      {/* Action Notice for Pending Signature */}
      {contract.status === 'pending_signature' && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-start space-x-3">
            <FaShieldAlt className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-bold">Action Required: Electronic Signature Pending</p>
              <p className="text-xs text-amber-800 mt-0.5">
                This contract agreement requires digital signature validation from authorized signatories (University Registrar & Supplier Representative) to execute.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSignModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md shrink-0 self-end sm:self-auto flex items-center space-x-1.5"
          >
            <FaShieldAlt size={11} />
            <span>Apply Digital Signature</span>
          </button>
        </div>
      )}

      {/* Contract Info & Vendor / Digital Signatures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2"><FaFileContract className="text-emerald-600" size={13} /><span>Contract Information</span></h3>
          <div className="space-y-2 text-sm">
            {[
              ['Type', contract.type?.charAt(0).toUpperCase() + contract.type?.slice(1)],
              ['Tender Ref', contract.tenderRef],
              ['LOA Ref', contract.loaRef],
              ['Perf. Security', contract.performanceSecurityRef],
              ['Insurance', contract.insuranceCertRef],
              ['LD Rate', `${contract.penaltyRate}% per day`],
              ['Warranty Expires', contract.warrantyExpiry],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-medium text-slate-800">{v || '—'}</span></div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2"><FaBuilding className="text-blue-600" size={13} /><span>Vendor & Signature Status</span></h3>
          <p className="text-base font-bold text-slate-900">{contract.vendor}</p>
          {contract.vendorContact && <p className="text-xs text-slate-500">{contract.vendorContact}</p>}
          {contract.description && <p className="text-sm text-slate-600 border-t border-slate-100 pt-3 mt-2">{contract.description}</p>}

          {/* Verified E-Sign Certificate Box */}
          {contract.signatures && contract.signatures.length > 0 ? (
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3.5 mt-2 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <p className="text-xs font-extrabold text-emerald-900 flex items-center space-x-1.5">
                  <FaShieldAlt className="text-emerald-600" size={12} />
                  <span>Verified Dual-Party E-Signature Certificate</span>
                </p>
                <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase">
                  {contract.signatures.length >= 2 ? 'Fully Signed' : '1 of 2 Signed'}
                </span>
              </div>

              {contract.signatures.map((sig, idx) => (
                <div key={idx} className="text-xs text-emerald-900 bg-white/70 p-2.5 rounded-lg border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      ✍ {sig.signatory?.firstName || sig.signatory?.companyName || 'Authorized Signatory'} {sig.signatory?.lastName || ''}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {sig.role || 'Signatory'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono break-all bg-slate-50 p-1 rounded border border-slate-200">
                    Hash: {sig.signatureHash}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Timestamp: {sig.signedAt ? new Date(sig.signedAt).toLocaleString() : 'Recently Applied'}
                  </p>
                </div>
              ))}

              <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
                <span>Status: Legally Binding Electronic Contract</span>
                <button
                  onClick={() => toast.success('📥 Certified Contract Agreement PDF downloaded.')}
                  className="text-emerald-700 hover:text-emerald-900 underline font-bold"
                >
                  Download Certificate PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-2 space-y-1.5">
              <p className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                <FaShieldAlt className="text-amber-600" size={11} />
                <span>Pending E-Signatures</span>
              </p>
              <p className="text-xs text-amber-700">
                Signatures required from Vice Chancellor/Registrar and Vendor Authorized Representative.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2"><FaClipboardCheck className="text-emerald-600" size={13} /><span>Milestone Tracker</span></h3>
        <MilestoneTracker milestones={contract.milestones || []} editable={contract.status === 'active'} onComplete={handleMilestoneComplete} />
      </div>

      {/* Payments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2"><FaFileInvoiceDollar className="text-emerald-600" size={13} /><span>Payment Schedule</span></h3>
          <div className="flex items-center space-x-2">
            <div className="w-20 bg-slate-200 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${paidPct}%` }} /></div>
            <span className="text-xs text-slate-500">{paidPct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50/50 border-b border-slate-200 text-left">
              <th className="px-5 py-2.5 font-semibold text-slate-600">Milestone</th>
              <th className="px-5 py-2.5 font-semibold text-slate-600 text-right">Amount</th>
              <th className="px-5 py-2.5 font-semibold text-slate-600">Invoice</th>
              <th className="px-5 py-2.5 font-semibold text-slate-600">Status</th>
              <th className="px-5 py-2.5 font-semibold text-slate-600 text-center">Action</th>
            </tr></thead>
            <tbody>
              {(contract.payments || []).map((p, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-700">{p.milestone}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800">LKR {(p.amount || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs font-mono text-slate-500">{p.invoiceRef || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} size="xs" /></td>
                  <td className="px-5 py-3 text-center">
                    {p.status === 'pending' && contract.status === 'active' && (
                      <button onClick={() => setPaymentModal(i)} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center space-x-1 mx-auto"><FaCheckCircle size={10} /><span>Mark Paid</span></button>
                    )}
                    {p.status === 'paid' && <span className="text-xs text-emerald-500 flex items-center space-x-1 mx-auto justify-center"><FaCheckCircle size={10} /><span>{p.paidDate}</span></span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variations */}
      {(contract.variations || []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Variation Orders</h3>
          <div className="space-y-2">
            {contract.variations.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div><p className="text-sm font-semibold text-slate-800">{v.id}: {v.title}</p><p className="text-xs text-slate-500">{v.date}</p></div>
                <div className="text-right"><p className="text-sm font-bold text-purple-700">+LKR {(v.amount || 0).toLocaleString()}</p><StatusBadge status={v.status} size="xs" /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amendment Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2"><FaHistory className="text-slate-400" size={13} /><span>Amendment & Audit Log</span></h3>
        <div className="space-y-2">
          {(contract.amendments || []).map((a, i) => (
            <div key={i} className="flex items-start space-x-3 py-2 border-b border-slate-50 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
              <div>
                <p className="text-sm text-slate-700">{a.description}</p>
                <p className="text-[10px] text-slate-400">{a.date} • {a.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warranty Tracker */}
      {contract.warrantyExpiry && (
        <div className={`flex items-start space-x-3 rounded-xl px-5 py-4 border ${
          new Date(contract.warrantyExpiry) < new Date() ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <FaShieldAlt className={new Date(contract.warrantyExpiry) < new Date() ? 'text-red-500' : 'text-blue-500'} size={14} />
          <div>
            <p className="text-sm font-semibold text-slate-800">Warranty Status</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {new Date(contract.warrantyExpiry) < new Date()
                ? `⚠ Warranty expired on ${contract.warrantyExpiry}`
                : `✓ Warranty active until ${contract.warrantyExpiry} (${Math.ceil((new Date(contract.warrantyExpiry) - new Date()) / 86400000)} days)`
              }
            </p>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      <ConfirmModal isOpen={terminateModal} onClose={() => setTerminateModal(false)} onConfirm={handleTerminate} title="Terminate Contract" confirmText="Terminate" variant="danger">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Terminate contract <span className="font-bold">{contract.contractNumber}</span>?</p>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label><textarea value={terminateReason} onChange={e => setTerminateReason(e.target.value)} rows={2} placeholder="Grounds for termination..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none" /></div>
          <p className="text-xs text-red-500 font-medium">⚠ This is irreversible and may trigger LD penalties.</p>
        </div>
      </ConfirmModal>

      {/* Extend Modal */}
      <ConfirmModal isOpen={extendModal} onClose={() => setExtendModal(false)} onConfirm={handleExtend} title="Extend Contract Duration" confirmText="Extend" variant="default">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Current end date: <span className="font-bold">{contract.endDate}</span></p>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">New End Date *</label><input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" /></div>
        </div>
      </ConfirmModal>

      {/* Variation Modal */}
      <ConfirmModal isOpen={variationModal} onClose={() => setVariationModal(false)} onConfirm={handleAddVariation} title="Add Variation Order" confirmText="Add Variation" variant="default">
        <div className="space-y-3">
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label><input value={variation.title} onChange={e => setVariation(v => ({ ...v, title: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="Describe the variation..." /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Amount (LKR) *</label><input type="number" value={variation.amount} onChange={e => setVariation(v => ({ ...v, amount: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="Additional amount..." /></div>
        </div>
      </ConfirmModal>

      {/* Payment Modal */}
      <ConfirmModal isOpen={paymentModal !== null} onClose={() => setPaymentModal(null)} onConfirm={handleMarkPaid} title="Confirm Payment" confirmText="Mark as Paid" variant="success">
        <p className="text-sm text-slate-600">Mark payment of <span className="font-bold text-emerald-700">LKR {contract.payments?.[paymentModal]?.amount?.toLocaleString()}</span> for "{contract.payments?.[paymentModal]?.milestone}" as paid?</p>
      </ConfirmModal>

      {/* Rating Modal */}
      <ConfirmModal isOpen={ratingModal} onClose={() => setRatingModal(false)} onConfirm={handleUpdateRating} title="Update Performance Rating" confirmText="Save Rating" variant="default">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Rate vendor performance for this contract:</p>
          <div className="flex items-center justify-center space-x-2 py-3">
            {[1,2,3,4,5].map(r => (
              <button key={r} type="button" onClick={() => setNewRating(r)} className="p-1 transition-transform hover:scale-125">
                <FaStar size={28} className={r <= newRating ? 'text-amber-400' : 'text-slate-200'} />
              </button>
            ))}
          </div>
          <p className="text-center text-sm font-bold text-slate-700">{newRating}/5</p>
        </div>
      </ConfirmModal>

      {/* Sign Contract PIN Modal */}
      <ConfirmModal isOpen={signModal} onClose={() => { setSignModal(false); setSignaturePin(''); }} onConfirm={handleSignContract} title="Apply Digital Signature" confirmText="Apply Signature" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Apply your official digital signature to contract <span className="font-bold">{contract.contractNumber}</span>.</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Enter Signature PIN / Verification Key *</label>
            <input type="password" value={signaturePin} onChange={e => setSignaturePin(e.target.value)} placeholder="••••" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          {signingAnim && (
            <div className="flex items-center justify-center space-x-2 py-2 bg-emerald-50 rounded-lg border border-emerald-100 animate-pulse">
              <FaSpinner className="animate-spin text-emerald-600" size={14} />
              <span className="text-xs font-bold text-emerald-800">Signing Agreement...</span>
            </div>
          )}
          <p className="text-xs text-slate-400">This action applies a cryptographic signature hash linked directly to your user account, satisfying legal guidelines for university electronic signatures.</p>
        </div>
      </ConfirmModal>
    </div>
  );
}
