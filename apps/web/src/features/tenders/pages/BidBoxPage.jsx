import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaBoxOpen, FaLock, FaClock, FaUpload, FaFileAlt, FaTimes, FaCheckCircle, FaShieldAlt, FaSpinner } from 'react-icons/fa';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';


const calcTimeLeft = (deadline) => {
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return { expired: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
};

function CountdownTimer({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(deadline));
  const [prevDeadline, setPrevDeadline] = useState(deadline);

  if (deadline !== prevDeadline) {
    setPrevDeadline(deadline);
    setTimeLeft(calcTimeLeft(deadline));
  }

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calcTimeLeft(deadline)), 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (timeLeft.expired) return <span className="text-xs font-bold text-red-600">CLOSED</span>;

  return (
    <div className="flex items-center space-x-1">
      {[
        { val: timeLeft.days, label: 'd' },
        { val: timeLeft.hours, label: 'h' },
        { val: timeLeft.minutes, label: 'm' },
        { val: timeLeft.seconds, label: 's' },
      ].map((u, i) => (
        <div key={i} className="flex items-center">
          <span className="bg-slate-800 text-white text-xs font-mono font-bold px-1.5 py-0.5 rounded min-w-[28px] text-center">
            {String(u.val || 0).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-slate-400 ml-0.5 mr-1">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function BidBoxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(null);
  const [bidFiles, setBidFiles] = useState([]);
  const [securityFile, setSecurityFile] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenderService.getAll({ status: 'published,bidding' });
      const items = res.data || res || [];
      // Map enums and deadlines
      const mapped = (Array.isArray(items) ? items : []).map(t => ({
        ...t,
        deadline: t.bidSubmissionDeadline || t.deadline,
        tce: t.estimatedValue || t.tce,
      }));
      setTenders(mapped);

      // Consume tender search param (supports both 'tender' and 'tenderId')
      const targetId = searchParams.get('tenderId') || searchParams.get('tender');
      if (targetId) {
        const targetTender = mapped.find(t => t._id === targetId);
        if (targetTender && new Date(targetTender.deadline) > new Date()) {
          setSubmitModal(targetTender);
          searchParams.delete('tenderId');
          searchParams.delete('tender');
          setSearchParams(searchParams, { replace: true });
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load active tenders.');
      setTenders([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    Promise.resolve().then(() => loadTenders());
  }, [loadTenders]);

  const handleSubmitBid = async () => {
    if (!termsAccepted) { toast.error('Please accept the terms and conditions.'); return; }
    if (bidFiles.length === 0) { toast.error('Please upload your bid documents.'); return; }
    if (submitModal?.bidSecurityRequired && !securityFile) { toast.error('Bid security document is required.'); return; }

    setSubmitting(true);
    try {
      const bidData = {
        totalBidAmount: parseFloat(bidAmount),
        documents: bidFiles.map(f => ({ name: f.name, url: 'uploads/' + f.name, type: f.name.split('.').pop() })),
        bidSecurityDocument: securityFile ? securityFile.name : undefined,
        bidSecurityAmount: submitModal.bidSecurityAmount || 0,
        bidSecurityType: 'bank_guarantee'
      };
      await tenderService.submitBid(submitModal._id, bidData);
      toast.success(`✅ Bid submitted successfully for "${submitModal.title}". Your bid has been encrypted and sealed.`);
      setSubmitModal(null);
      setBidFiles([]);
      setSecurityFile(null);
      setBidAmount('');
      setTermsAccepted(false);
      loadTenders();
    } catch (err) {
      toast.error(err.message || 'Failed to submit bid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      const bidsRes = await tenderService.getBids(withdrawModal._id);
      const bids = bidsRes.data || bidsRes || [];
      const bidsArr = Array.isArray(bids) ? bids : [];
      if (bidsArr.length > 0) {
        await tenderService.withdrawBid(withdrawModal._id, bidsArr[0]._id);
        toast.warning(`Bid withdrawal processed for "${withdrawModal.title}".`);
        loadTenders();
      } else {
        toast.error('No submitted bid found for withdrawal.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to withdraw bid.');
    } finally {
      setWithdrawModal(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-linear-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center space-x-3 mb-2">
            <FaBoxOpen size={24} />
            <h1 className="text-xl font-bold">Secure Digital Bid Box</h1>
          </div>
          <p className="text-emerald-100 text-sm max-w-3xl">All bid submissions are encrypted and sealed until the pre-disclosed deadline. Sealed bids cannot be viewed, modified, or accessed by anyone including system administrators.</p>
        </div>
      </div>

      {/* Tender Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-emerald-600 mr-2" size={16} />
          <span className="text-sm text-slate-500">Loading active tenders...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {tenders.map(t => {
            const deadline = new Date(t.deadline);
            const isOpen = deadline > new Date();
            return (
              <div key={t._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all animate-slide-up">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {isOpen ? <FaBoxOpen size={20} /> : <FaLock size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-mono text-slate-500">{t.tenderNumber}</p>
                      <h3 className="text-base font-bold text-slate-800">{t.title}</h3>
                      <div className="flex items-center flex-wrap gap-4 mt-2">
                        <span className="flex items-center space-x-1 text-xs text-slate-500">
                          <FaClock size={10} />
                          <span>{isOpen ? 'Closes:' : 'Closed'}</span>
                        </span>
                        {isOpen && <CountdownTimer deadline={t.deadline} />}
                        <span className="flex items-center space-x-1 text-xs text-slate-500">
                          <FaFileAlt size={10} /><span>{t.bidsReceived} bids received</span>
                        </span>
                        {t.bidSecurityRequired && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Security Required</span>}
                        {t.tce && <span className="text-xs text-slate-400">TCE: LKR {t.tce.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isOpen ? '🔓 Accepting Bids' : '🔒 Sealed'}
                    </span>
                    {isOpen && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSubmitModal(t)}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 flex items-center space-x-2 transition-colors shadow-sm"
                        >
                          <FaUpload size={12} /><span>Submit Bid</span>
                        </button>
                        <button
                          onClick={() => setWithdrawModal(t)}
                          className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors"
                        >
                          Withdraw
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Bid Modal */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && setSubmitModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Submit Bid</h3>
                <p className="text-xs text-slate-500">{submitModal.tenderNumber} — {submitModal.title}</p>
              </div>
              <button onClick={() => !submitting && setSubmitModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <FaTimes size={12} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Bid Amount */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bid Amount (LKR) *</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  placeholder="Enter total bid amount..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
              </div>

              {/* Bid Documents Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bid Documents *</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer relative">
                  <input type="file" multiple accept=".pdf,.docx,.xlsx" onChange={e => setBidFiles(prev => [...prev, ...Array.from(e.target.files)])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FaUpload className="mx-auto text-slate-400 mb-1" size={20} />
                  <p className="text-xs text-slate-500">Technical & Financial Proposals</p>
                  <p className="text-[10px] text-slate-400">PDF, DOCX, XLSX (max 50MB each)</p>
                </div>
                {bidFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {bidFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                        <span className="flex items-center space-x-2 text-slate-700"><FaFileAlt className="text-slate-400" size={11} /><span className="truncate text-xs">{f.name}</span></span>
                        <button onClick={() => setBidFiles(bidFiles.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bid Security Upload */}
              {submitModal.bidSecurityRequired && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bid Security Document *</label>
                  <div className="border-2 border-dashed border-amber-300 rounded-xl p-4 text-center hover:border-amber-400 transition-colors cursor-pointer relative bg-amber-50/50">
                    <input type="file" accept=".pdf" onChange={e => setSecurityFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {securityFile ? (
                      <div className="flex items-center justify-center space-x-2">
                        <FaCheckCircle className="text-emerald-500" size={14} />
                        <span className="text-sm text-slate-700">{securityFile.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setSecurityFile(null); }} className="text-red-400 text-xs ml-2">Remove</button>
                      </div>
                    ) : (
                      <>
                        <FaShieldAlt className="mx-auto text-amber-500 mb-1" size={16} />
                        <p className="text-xs text-amber-700">Upload Bank Guarantee / Insurance Bond</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Terms */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-1 w-4 h-4 accent-emerald-600 rounded" />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I confirm that this bid is complete, accurate, and submitted in compliance with the terms of the bidding documents. I understand that my bid will be encrypted and sealed until the scheduled opening date.
                </span>
              </label>

              {/* Encryption Notice */}
              <div className="flex items-center space-x-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <FaLock className="text-slate-400 shrink-0" size={12} />
                <p className="text-[10px] text-slate-500">Your bid will be encrypted with AES-256 and cannot be accessed by anyone until the scheduled bid opening ceremony.</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 rounded-b-2xl">
              <button onClick={() => !submitting && setSubmitModal(null)} disabled={submitting} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button
                onClick={handleSubmitBid}
                disabled={submitting}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 disabled:opacity-70 flex items-center space-x-2 shadow-sm"
              >
                {submitting ? <><FaSpinner className="animate-spin" size={12} /><span>Encrypting & Sealing...</span></> : <><FaUpload size={12} /><span>Submit & Seal Bid</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      <ConfirmModal
        isOpen={!!withdrawModal}
        onClose={() => setWithdrawModal(null)}
        onConfirm={handleWithdraw}
        title="Withdraw Bid"
        message={`Are you sure you want to withdraw your bid for "${withdrawModal?.title}"? This action can only be done before the closing deadline.`}
        confirmText="Withdraw Bid"
        variant="danger"
      />
    </div>
  );
}
