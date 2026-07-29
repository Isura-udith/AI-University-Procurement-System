import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaDownload, FaBoxOpen, FaCheckCircle, FaFileAlt, FaLock, FaRobot, FaGavel, FaCalendarPlus, FaTimesCircle, FaCommentDots, FaSpinner, FaClock, FaUsers, FaTimes, FaPaperPlane, FaPlus, FaEdit } from 'react-icons/fa';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import StatusBadge from '../../../components/StatusBadge';

export default function TenderDetails() {
  const { id } = useParams();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closeModal, setCloseModal] = useState(false);
  const [openBidBoxModal, setOpenBidBoxModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [extendModal, setExtendModal] = useState(false);
  const [clarificationModal, setClarificationModal] = useState(false);
  const [addendumModal, setAddendumModal] = useState(false);
  const [publishModal, setPublishModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [clarification, setClarification] = useState({ question: '', answer: '' });
  const [addendum, setAddendum] = useState({ description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tenderRes = await tenderService.getById(id);
      // The interceptor unwraps response.data, so tenderRes IS the API response object {success, data}
      const t = tenderRes.data || tenderRes;

      let bidsData = [];
      try {
        const bidsRes = await tenderService.getBids(id);
        bidsData = bidsRes.data || bidsRes || [];
      } catch {
        bidsData = [];
      }
      
      setTender({
        ...t,
        tce: t.estimatedValue || 0,
        bidSecurity: t.bidSecurityRequired ? (t.bidSecurityAmount ? `LKR ${t.bidSecurityAmount.toLocaleString()}` : 'Required') : 'N/A',
        bidValidity: t.bidSecurityValidityDays || 120,
        technicalWeight: 70,
        financialWeight: 30,
        closingDate: t.bidSubmissionDeadline,
        openingDate: t.bidOpeningDate,
        publishDate: t.publishedAt ? new Date(t.publishedAt).toLocaleDateString() : 'Draft',
        bids: (Array.isArray(bidsData) ? bidsData : []).map(b => ({
          _id: b._id,
          vendor: b.vendorId?.companyName || 'Unknown Vendor',
          submitted: b.submittedAt,
          status: b.status,
          sealed: b.isSealed
        })),
        documents: (t.tenderDocuments || []).map(d => ({ name: d.name, size: d.type || 'Document' })),
        clarifications: (t.clarifications || []).map((c, idx) => ({
          id: idx,
          question: c.question,
          answer: c.answer,
          date: c.answeredAt ? new Date(c.answeredAt).toLocaleDateString() : 'Pending'
        })),
        addenda: (t.addenda || []).map(a => ({
          number: a.number,
          description: a.description,
          issuedAt: a.issuedAt ? new Date(a.issuedAt).toLocaleDateString() : '',
        })),
        becMembers: t.becMembers || [],
        bocMembers: t.bocMembers || [],
      });
    } catch (err) {
      console.error('Failed to load tender details:', err);
      toast.error('Failed to load tender details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const handlePublish = async () => {
    try {
      await tenderService.publish(tender._id || id);
      toast.success('Tender published to e-GP portal and university website!');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to publish tender.');
    } finally {
      setPublishModal(false);
    }
  };

  const handleCloseBidding = async () => {
    try {
      await tenderService.closeBidding(tender._id || id);
      toast.success('Bidding closed. Bid box is sealed. Proceed to bid opening ceremony.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to close bidding.');
    } finally {
      setCloseModal(false);
    }
  };

  const handleOpenBidBox = async () => {
    try {
      await tenderService.openBidBox(tender._id || id);
      toast.success('Bid box opened. Proceed to bid opening ceremony to unseal bids.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to open bid box.');
    } finally {
      setOpenBidBoxModal(false);
    }
  };

  const handleCancelTender = async () => {
    if (!cancelReason.trim()) { toast.error('Reason is required.'); return; }
    try {
      await tenderService.cancel(tender._id || id, { reason: cancelReason });
      toast.warning('Tender cancelled.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel tender.');
    } finally {
      setCancelModal(false);
      setCancelReason('');
    }
  };

  const handleExtendDeadline = async () => {
    if (!extendDate) { toast.error('Select a new deadline.'); return; }
    try {
      await tenderService.extendDeadline(tender._id || id, { newDeadline: extendDate });
      toast.success(`Deadline extended. Addendum will be published.`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to extend deadline.');
    } finally {
      setExtendModal(false);
      setExtendDate('');
    }
  };

  const handleAddClarification = async () => {
    if (!clarification.question.trim()) { toast.error('Question is required.'); return; }
    try {
      const res = await tenderService.addClarification(tender._id || id, { question: clarification.question });
      if (clarification.answer.trim()) {
        const tenderObj = res.data || res;
        const index = (tenderObj.clarifications || []).length - 1;
        await tenderService.answerClarification(tender._id || id, index, { answer: clarification.answer });
      }
      toast.success('Clarification published as addendum.');
      setClarificationModal(false);
      setClarification({ question: '', answer: '' });
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add clarification.');
    }
  };

  const handleAddAddendum = async () => {
    if (!addendum.description.trim()) { toast.error('Description is required.'); return; }
    try {
      await tenderService.addAddendum(tender._id || id, { description: addendum.description });
      toast.success('Addendum issued successfully.');
      setAddendumModal(false);
      setAddendum({ description: '' });
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to issue addendum.');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><FaSpinner className="animate-spin text-emerald-600 mr-2" size={20} /><span className="text-slate-500">Loading...</span></div>;
  if (!tender) return <div className="text-center py-24 text-slate-400">Tender not found.</div>;

  const isOpen = tender.closingDate && new Date(tender.closingDate) > new Date();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/tenders" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600 mb-2 transition-colors"><FaArrowLeft className="mr-1.5" size={11} /> Back to Tenders</Link>
          <h1 className="text-2xl font-bold text-slate-900">{tender.title}</h1>
          <div className="flex items-center flex-wrap gap-3 mt-2">
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{tender.tenderNumber || tender.id}</span>
            <StatusBadge status={tender.status} />
            <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold">{tender.procurementMethod || tender.method}</span>
            <span className="text-xs text-slate-500">{tender.category}</span>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {tender.status === 'draft' && (
            <>
              <Link to={`/tenders/${tender._id || id}/edit`} className="flex items-center space-x-1 px-3.5 py-2 border border-amber-300 text-amber-700 bg-amber-50 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors">
                <FaEdit size={11} /><span>Edit Draft</span>
              </Link>
              <button onClick={() => setPublishModal(true)} className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"><FaPaperPlane size={10} /><span>Publish Tender</span></button>
            </>
          )}
          {['published', 'bidding'].includes(tender.status) && (
            <>
              <button onClick={() => setExtendModal(true)} className="flex items-center space-x-1 px-3 py-2 border border-blue-300 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-50 transition-colors"><FaCalendarPlus size={10} /><span>Extend Deadline</span></button>
              <button onClick={() => setClarificationModal(true)} className="flex items-center space-x-1 px-3 py-2 border border-purple-300 text-purple-600 text-xs font-semibold rounded-lg hover:bg-purple-50 transition-colors"><FaCommentDots size={10} /><span>Add Clarification</span></button>
              <button onClick={() => setAddendumModal(true)} className="flex items-center space-x-1 px-3 py-2 border border-indigo-300 text-indigo-600 text-xs font-semibold rounded-lg hover:bg-indigo-50 transition-colors"><FaPlus size={10} /><span>Issue Addendum</span></button>
              <button onClick={() => setCloseModal(true)} className="flex items-center space-x-1 px-3 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-sm"><FaLock size={10} /><span>Close Bidding</span></button>
              <button onClick={() => setCancelModal(true)} className="flex items-center space-x-1 px-3 py-2 border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"><FaTimesCircle size={10} /><span>Cancel</span></button>
            </>
          )}
          {tender.status === 'bid_closed' && (
            <>
              <Link to={`/bid-opening?tenderId=${tender._id}`} className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">
                <FaBoxOpen size={10} /><span>Go to Bid Opening</span>
              </Link>
              <button onClick={() => setOpenBidBoxModal(true)} className="flex items-center space-x-1 px-3 py-2 border border-blue-300 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-50 transition-colors">
                <FaBoxOpen size={10} /><span>Open Bid Box</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'TCE', value: `LKR ${(tender.tce || 0).toLocaleString()}`, icon: FaGavel },
          { label: 'Bid Doc Fee', value: `LKR ${(tender.documentFee || tender.bidDocFee || 0).toLocaleString()}`, icon: FaFileAlt },
          { label: 'Bid Security', value: tender.bidSecurity || 'N/A', icon: FaLock },
          { label: 'Validity', value: `${tender.bidValidity || 0} days`, icon: FaClock },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1"><item.icon size={9} /><span>{item.label}</span></p>
            <p className="text-sm font-bold text-slate-800 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Timeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Published', date: tender.publishDate, done: tender.status !== 'draft' },
            { label: 'Closing Date', date: tender.closingDate?.split('T')[0], done: !isOpen },
            { label: 'Opening Date', date: tender.openingDate?.split('T')[0], done: ['opening', 'evaluation', 'awarded', 'loa_issued'].includes(tender.status) },
          ].map((t, i) => (
            <div key={i} className={`p-3 rounded-lg border ${t.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center space-x-2 mb-1">
                {t.done ? <FaCheckCircle className="text-emerald-500" size={12} /> : <FaClock className="text-slate-400" size={12} />}
                <span className="text-xs font-semibold text-slate-700">{t.label}</span>
              </div>
              <p className="text-sm font-medium text-slate-800 ml-5">{t.date || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation Split */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Evaluation Weighting</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1"><span className="text-slate-500">Technical</span><span className="font-bold text-emerald-700">{tender.technicalWeight}%</span></div>
            <div className="w-full bg-slate-100 rounded-full h-3"><div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${tender.technicalWeight}%` }} /></div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1"><span className="text-slate-500">Financial</span><span className="font-bold text-blue-700">{tender.financialWeight}%</span></div>
            <div className="w-full bg-slate-100 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{ width: `${tender.financialWeight}%` }} /></div>
          </div>
        </div>
      </div>

      {/* Technical Criteria */}
      {(tender.technicalCriteria || []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Technical Evaluation Criteria</h3>
          <div className="space-y-2">
            {tender.technicalCriteria.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm text-slate-700">{c.criterion}</span>
                <span className="text-xs font-bold text-slate-600">{c.maxScore} pts</span>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <span className="text-xs font-bold text-emerald-700">Total: {tender.technicalCriteria.reduce((s, c) => s + (c.maxScore || 0), 0)} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Committees */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-2">
            <FaUsers className="text-emerald-600" size={14} />
            <span>Assigned Procurement Committees</span>
          </h3>
          {tender.status === 'draft' && (
            <Link to={`/tenders/${tender._id || id}/edit`} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Manage Committees
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BEC Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bid Evaluation Committee (BEC)</p>
            {(tender.becMembers || []).length > 0 ? (
              <div className="space-y-1.5">
                {tender.becMembers.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-100">
                    <span className="font-medium text-slate-800">
                      {m.userId?.firstName ? `${m.userId.firstName} ${m.userId.lastName}` : 'Assigned Member'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase">
                      {m.role || 'Member'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No BEC members assigned yet.</p>
            )}
          </div>

          {/* BOC Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bid Opening Committee (BOC)</p>
            {(tender.bocMembers || []).length > 0 ? (
              <div className="space-y-1.5">
                {tender.bocMembers.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-100">
                    <span className="font-medium text-slate-800">
                      {m.userId?.firstName ? `${m.userId.firstName} ${m.userId.lastName}` : (m.name || 'Assigned Member')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                      {m.role || 'Member'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No BOC members assigned yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bids Received */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-2"><FaBoxOpen className="text-emerald-600" size={13} /><span>Bids Received ({(tender.bids || []).length})</span></h3>
          <span className="text-xs text-slate-400">All bids encrypted & sealed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50/50 border-b border-slate-200 text-left">
              <th className="px-5 py-2.5 font-semibold text-slate-600 w-8">#</th>
              <th className="px-5 py-2.5 font-semibold text-slate-600">Vendor</th>
              <th className="px-5 py-2.5 font-semibold text-slate-600">Submitted</th>
              <th className="px-5 py-2.5 font-semibold text-slate-600">Status</th>
              <th className="px-5 py-2.5 font-semibold text-slate-600 text-center">Seal</th>
            </tr></thead>
            <tbody>
              {(tender.bids || []).map((b, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{b.vendor}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{b.submitted ? new Date(b.submitted).toLocaleString() : '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={b.status} size="xs" /></td>
                  <td className="px-5 py-3 text-center">
                    {b.sealed ? <span className="text-emerald-500 flex items-center justify-center space-x-1"><FaLock size={10} /><span className="text-xs">Sealed</span></span> : <span className="text-amber-500 text-xs">Opened</span>}
                  </td>
                </tr>
              ))}
              {(tender.bids || []).length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No bids received yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Addenda */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-2"><FaFileAlt className="text-indigo-500" size={13} /><span>Addenda ({(tender.addenda || []).length})</span></h3>
          {tender.status === 'published' && <button onClick={() => setAddendumModal(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">+ Issue Addendum</button>}
        </div>
        {(tender.addenda || []).length > 0 ? (
          <div className="space-y-2">
            {tender.addenda.map((a, i) => (
              <div key={i} className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Addendum #{a.number}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{a.description}</p>
                </div>
                <span className="text-[10px] text-slate-400">{a.issuedAt}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">No addenda issued yet.</p>}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">Tender Documents</h3>
          <button onClick={() => toast.info('All documents downloaded as ZIP.')} className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"><FaDownload size={10} /><span>Download All</span></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(tender.documents || []).map((d, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
              <div className="flex items-center space-x-2"><FaFileAlt className="text-slate-400" size={12} /><span className="text-sm text-slate-700">{d.name}</span></div>
              <span className="text-xs text-slate-400">{d.size}</span>
            </div>
          ))}
          {(tender.documents || []).length === 0 && <p className="text-sm text-slate-400 col-span-2">No documents uploaded yet.</p>}
        </div>
      </div>

      {/* Clarifications */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-2"><FaCommentDots className="text-purple-500" size={13} /><span>Clarifications & Addenda ({(tender.clarifications || []).length})</span></h3>
          {tender.status === 'published' && <button onClick={() => setClarificationModal(true)} className="text-xs font-semibold text-purple-600 hover:text-purple-700">+ Add</button>}
        </div>
        {(tender.clarifications || []).length > 0 ? (
          <div className="space-y-3">
            {tender.clarifications.map((c, i) => (
              <div key={i} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-semibold text-slate-800">Q: {c.question}</p>
                {c.answer && <p className="text-sm text-slate-600 mt-1.5">A: {c.answer}</p>}
                <p className="text-[10px] text-slate-400 mt-1">{c.date}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">No clarifications issued yet.</p>}
      </div>

      {/* Quick Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase">Quick Actions</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/bid-box?tenderId=${tender._id}`} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"><FaBoxOpen size={10} /><span>Bid Box</span></Link>
          <Link to={`/bid-opening?tenderId=${tender._id}`} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"><FaUsers size={10} /><span>Bid Opening</span></Link>
          <Link to={`/evaluation?tenderId=${tender._id}`} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"><FaRobot size={10} /><span>Evaluation</span></Link>
          <Link to={`/awards?tenderId=${tender._id}`} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"><FaGavel size={10} /><span>Awards</span></Link>
        </div>
        {/* AI Actions */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">🤖 AI Intelligence</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/ai/bid-verification/${tender._id || id}`} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
              <FaRobot size={10} /><span>Verify Bid Prices</span>
            </Link>
            <Link to={`/ai/recommendations/${tender._id || id}`} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
              <FaRobot size={10} /><span>Smart Recommendations</span>
            </Link>
            <Link to={`/ai/comparative-analysis/${tender._id || id}`} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
              <FaRobot size={10} /><span>Comparative Analysis</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <ConfirmModal isOpen={publishModal} onClose={() => setPublishModal(false)} onConfirm={handlePublish} title="Publish Tender" confirmText="Publish to e-GP" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Publish <span className="font-bold">"{tender.title}"</span> to the e-GP portal?</p>
          <p className="text-xs text-slate-500">This will make the tender visible to all registered bidders. Ensure all documents and criteria are finalized.</p>
        </div>
      </ConfirmModal>

      {/* Close Bidding Modal */}
      <ConfirmModal isOpen={closeModal} onClose={() => setCloseModal(false)} onConfirm={handleCloseBidding} title="Close Bidding" confirmText="Close & Seal Bid Box" variant="danger">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Officially close bidding for <span className="font-bold">{tender.title}</span>?</p>
          <p className="text-xs text-slate-500">{(tender.bids || []).length} bids received. No further submissions will be accepted. This action is irreversible.</p>
        </div>
      </ConfirmModal>

      {/* Open Bid Box Modal */}
      <ConfirmModal isOpen={openBidBoxModal} onClose={() => setOpenBidBoxModal(false)} onConfirm={handleOpenBidBox} title="Open Bid Box" confirmText="Open Bid Box" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Open the sealed bid box for <span className="font-bold">{tender.title}</span>?</p>
          <p className="text-xs text-slate-500">This will begin the bid opening phase. All bids will be unsealed. Ensure the BOC committee is present before proceeding.</p>
          <p className="text-xs font-semibold text-blue-600">You will be redirected to the Bid Opening page to conduct the ceremony.</p>
        </div>
      </ConfirmModal>

      {/* Cancel Modal */}
      <ConfirmModal isOpen={cancelModal} onClose={() => { setCancelModal(false); setCancelReason(''); }} onConfirm={handleCancelTender} title="Cancel Tender" confirmText="Cancel Tender" variant="danger">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Cancel tender <span className="font-bold">{tender.tenderNumber || tender.id}</span>?</p>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label><textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2} placeholder="Reason..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none" /></div>
        </div>
      </ConfirmModal>

      {/* Extend Modal */}
      <ConfirmModal isOpen={extendModal} onClose={() => setExtendModal(false)} onConfirm={handleExtendDeadline} title="Extend Bid Deadline" confirmText="Extend" variant="default">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Current deadline: <span className="font-bold">{tender.closingDate?.split('T')[0]}</span></p>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">New Deadline *</label><input type="datetime-local" value={extendDate} onChange={e => setExtendDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" /></div>
          <p className="text-xs text-slate-400">An addendum will be automatically published to all bidders.</p>
        </div>
      </ConfirmModal>

      {/* Clarification Modal */}
      {clarificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setClarificationModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Clarification</h3>
              <button onClick={() => setClarificationModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><FaTimes size={12} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">Question / Query *</label><textarea value={clarification.question} onChange={e => setClarification(c => ({ ...c, question: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" placeholder="Bidder's question..." /></div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">Response / Answer</label><textarea value={clarification.answer} onChange={e => setClarification(c => ({ ...c, answer: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" placeholder="Official response..." /></div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3 rounded-b-2xl">
              <button onClick={() => setClarificationModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Cancel</button>
              <button onClick={handleAddClarification} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-500 shadow-sm">Publish Clarification</button>
            </div>
          </div>
        </div>
      )}

      {/* Addendum Modal */}
      {addendumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAddendumModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Issue Addendum</h3>
              <button onClick={() => setAddendumModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><FaTimes size={12} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Addendum Description *</label>
                <textarea value={addendum.description} onChange={e => setAddendum(a => ({ ...a, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" placeholder="Describe the changes or additional information..." />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3 rounded-b-2xl">
              <button onClick={() => setAddendumModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">Cancel</button>
              <button onClick={handleAddAddendum} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-sm">Issue Addendum</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
