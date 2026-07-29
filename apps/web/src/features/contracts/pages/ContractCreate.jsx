import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSave, FaFileSignature, FaPlus, FaTrash, FaCalendarAlt, FaSpinner, FaShieldAlt, FaChevronLeft, FaSearch, FaCheckCircle } from 'react-icons/fa';
import contractService from '../../../services/contract.service';
import tenderService from '../../../services/tender.service';
import ConfirmModal from '../../../components/ConfirmModal';
import usePermissions from '../../../hooks/usePermissions';

export default function ContractCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = usePermissions();
  const initialData = useMemo(() => location.state?.award || {}, [location.state?.award]);

  const [saving, setSaving] = useState(false);
  const [signModal, setSignModal] = useState(false);
  const [signingAnim, setSigningAnim] = useState(false);
  const [errors, setErrors] = useState({});

  const [selectedTender, setSelectedTender] = useState(null);
  const [clearedTenders, setClearedTenders] = useState([]);
  const [loadingTenders, setLoadingTenders] = useState(false);
  const [tenderSearch, setTenderSearch] = useState('');

  const [form, setForm] = useState({
    title: initialData.title ? `Contract for ${initialData.title}` : '',
    contractNumber: '',
    vendorName: initialData.winner?.name || '',
    tenderRef: initialData.tenderNumber || '',
    loaRef: initialData.loaRef || '',
    type: initialData.category?.toLowerCase() || 'goods',
    value: initialData.winner?.bidAmount || '',
    startDate: '',
    endDate: '',
    warrantyExpiry: '',
    performanceSecurityRef: '',
    insuranceCertRef: '',
    penaltyRate: '0.05',
    description: initialData.description || '',
    milestones: [{ title: 'Delivery & Commissioning', dueDate: '', amount: initialData.winner?.bidAmount || '', deliverables: 'Full supply and installation' }],
  });

  useEffect(() => {
    if (!initialData.title) {
      Promise.resolve().then(() => {
        setLoadingTenders(true);
        return Promise.all([
          tenderService.getAll({ limit: 100 }),
          contractService.getAll({ limit: 100 })
        ]);
      }).then(([tendersRes]) => {
        const items = tendersRes.data || tendersRes || [];

        // Strictly filter ONLY tenders that have been selected/awarded to a supplier
        const selectedOnly = items.filter(t => {
          const hasActiveAppeals = t.appeals && t.appeals.some(ap => ap.status === 'pending' || ap.status === 'under-review');
          if (hasActiveAppeals) return false;

          const isSelected = ['awarded', 'loa_issued', 'standstill', 'cleared'].includes(t.status) || Boolean(t.awardedVendorId) || Boolean(t.winner);
          return isSelected;
        });

        setClearedTenders(selectedOnly.length > 0 ? selectedOnly : items.filter(t => Boolean(t.awardedVendorId) || ['awarded', 'loa_issued', 'standstill', 'cleared'].includes(t.status)));
      }).catch(err => {
        console.error('Failed to load selected tenders:', err);
      }).finally(() => {
        setLoadingTenders(false);
      });
    }
  }, [initialData.title]);

  const searchedTenders = useMemo(() => {
    if (!tenderSearch.trim()) return clearedTenders;
    const query = tenderSearch.toLowerCase();
    return clearedTenders.filter(t => {
      const vName = (t.winner?.name || t.awardedVendorId?.companyName || t.awardedVendorId?.tradingName || '').toLowerCase();
      const num = (t.tenderNumber || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      return num.includes(query) || title.includes(query) || vName.includes(query);
    });
  }, [clearedTenders, tenderSearch]);

  const handleChange = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const handleMilestone = (i, key, val) => {
    const updated = [...form.milestones];
    updated[i] = { ...updated[i], [key]: val };
    setForm(f => ({ ...f, milestones: updated }));
  };

  const addMilestone = () => setForm(f => ({ ...f, milestones: [...f.milestones, { title: '', dueDate: '', amount: '', deliverables: '' }] }));
  const removeMilestone = (i) => setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.vendorName.trim()) e.vendorName = 'Required';
    if (!form.value) e.value = 'Required';
    if (!form.startDate) e.startDate = 'Required';
    if (!form.endDate) e.endDate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!form.title.trim()) { toast.error('Please enter a contract title.'); return; }
    setSaving(true);
    try {
      const activeTender = selectedTender || initialData;
      const payload = {
        title: form.title,
        contractNumber: form.contractNumber || undefined,
        contractType: form.type,
        contractValue: parseFloat(form.value) || 0,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        description: form.description,
        penaltyRate: parseFloat(form.penaltyRate) || 0.05,
        procurementId: activeTender?.procurementId?._id || activeTender?.procurementId,
        tenderId: activeTender?._id || undefined,
        bidId: activeTender?.awardedBidId || undefined,
        vendorId: activeTender?.awardedVendorId || undefined,
        paymentSchedule: form.milestones.map(ms => ({
          milestone: ms.title,
          amount: parseFloat(ms.amount) || 0,
          dueDate: ms.dueDate || undefined,
          status: 'pending'
        })),
        deliverables: form.milestones.map(ms => ({
          description: ms.deliverables || ms.title,
          expectedDate: ms.dueDate || undefined,
          status: 'pending'
        })),
        status: 'draft',
      };
      await contractService.create(payload);
      toast.success('📄 Contract draft saved successfully.');
      navigate('/contracts');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save contract draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignAndFinalize = async () => {
    setSigningAnim(true);
    try {
      const activeTender = selectedTender || initialData;
      const payload = {
        title: form.title,
        contractNumber: form.contractNumber || undefined,
        contractType: form.type,
        contractValue: parseFloat(form.value) || 0,
        startDate: form.startDate,
        endDate: form.endDate,
        warrantyExpiry: form.warrantyExpiry || undefined,
        description: form.description,
        penaltyRate: parseFloat(form.penaltyRate) || 0.05,
        procurementId: activeTender?.procurementId?._id || activeTender?.procurementId,
        tenderId: activeTender?._id || undefined,
        bidId: activeTender?.awardedBidId || undefined,
        vendorId: activeTender?.awardedVendorId || undefined,
        paymentSchedule: form.milestones.map(ms => ({
          milestone: ms.title,
          amount: parseFloat(ms.amount) || 0,
          dueDate: ms.dueDate,
          status: 'pending'
        })),
        deliverables: form.milestones.map(ms => ({
          description: ms.deliverables || ms.title,
          expectedDate: ms.dueDate,
          status: 'pending'
        })),
        performanceSecurity: {
          type: 'bank_guarantee',
          amount: (parseFloat(form.value) || 0) * 0.1,
          document: form.performanceSecurityRef || 'REF-TBD',
          expiryDate: form.endDate || new Date(),
          verified: true
        },
        letterOfAcceptance: form.loaRef || undefined,
        status: 'pending_signature',
      };

      const res = await contractService.create(payload);
      const createdContract = res.data || res;
      if (createdContract?._id) {
        await contractService.sign(createdContract._id, {
          role: user?.role || 'procurement_officer',
          signatureHash: 'SIG-HASH-' + Math.random().toString(36).substring(2, 15).toUpperCase(),
        });
      }
      toast.success(`✅ Contract "${form.title}" drafted & signed by University. Awaiting second party signature.`);
      navigate('/contracts');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create and sign contract.');
    } finally {
      setSigningAnim(false);
      setSignModal(false);
    }
  };

  const inputClass = (key) => `w-full px-4 py-2.5 border rounded-xl text-sm transition-all outline-none ${
    errors[key] ? 'border-red-400 bg-red-50/50 focus:ring-red-500/20' : 'border-slate-200 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
  }`;

  const milestoneTotal = form.milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/contracts')} className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 mb-2">
            <FaChevronLeft size={9} /><span>Back to Contracts</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Create New Contract</h1>
          <p className="text-sm text-slate-500 mt-1">Stage 11: Draft contract agreement with terms, milestones, and performance criteria</p>
        </div>
      </div>

      {/* Select Tender Dropdown (if loaded directly without initial state) */}
      {!initialData.title && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FaCheckCircle className="text-emerald-600" />
                Select Awarded / Selected Tender
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose from tenders awarded to selected suppliers to generate contract agreement
              </p>
            </div>

            {clearedTenders.length > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {clearedTenders.length} Selected Tender(s)
              </span>
            )}
          </div>

          {/* Search input for Selected Tenders */}
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              value={tenderSearch}
              onChange={(e) => setTenderSearch(e.target.value)}
              placeholder="Search selected tenders by tender #, title, or supplier name..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {loadingTenders ? (
            <div className="flex items-center space-x-2 text-xs text-slate-500 py-4">
              <FaSpinner className="animate-spin text-emerald-600" />
              <span>Loading selected tenders...</span>
            </div>
          ) : searchedTenders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {searchedTenders.map((t) => {
                const isSelected = selectedTender?._id === t._id;
                const vName = t.winner?.name || t.awardedVendorId?.companyName || t.awardedVendorId?.tradingName || 'Awarded Supplier';
                const amount = t.winner?.bidAmount || t.awardAmount || t.estimatedValue || 0;

                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await tenderService.getById(t._id);
                        const tender = res.data || res;
                        const vendorDisplayName = tender.winner?.name || tender.awardedVendorId?.companyName || tender.awardedVendorId?.tradingName || tender.awardedVendorId?.name || vName;
                        const winValue = tender.winner?.bidAmount || tender.awardAmount || tender.estimatedValue || amount;
                        setSelectedTender(tender);
                        setForm(f => ({
                          ...f,
                          title: `Contract for ${tender.title}`,
                          vendorName: vendorDisplayName,
                          tenderRef: tender.tenderNumber || '',
                          loaRef: tender.loaRef || `LOA/UWU/2026/${tender._id.toString().slice(-3).toUpperCase()}`,
                          type: tender.category?.toLowerCase() || 'goods',
                          value: winValue,
                          description: tender.description || '',
                          milestones: [{ title: 'Delivery & Commissioning', dueDate: '', amount: winValue, deliverables: 'Full supply and installation' }],
                        }));
                        toast.success(`Selected tender ${tender.tenderNumber} (${vendorDisplayName})`);
                      } catch (err) {
                        console.error('Failed to load tender details:', err);
                        toast.error('Failed to load tender details.');
                      }
                    }}
                    className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                          {t.tenderNumber}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {t.status || 'Awarded'}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900 mt-2 line-clamp-1">{t.title}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600 truncate max-w-37.5">
                        👤 {vName}
                      </span>
                      <span className="font-extrabold text-slate-900">
                        LKR {Number(amount).toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-3">
              {tenderSearch ? `No selected tenders match "${tenderSearch}".` : 'No awarded tenders available for contract creation.'}
            </p>
          )}
        </div>
      )}

      {/* Contract Type Selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Contract Type</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'goods', label: 'Goods', desc: 'Supply of equipment, materials, products' },
            { value: 'works', label: 'Works', desc: 'Construction, renovation, infrastructure' },
            { value: 'services', label: 'Services', desc: 'Consulting, IT, maintenance services' },
          ].map(t => (
            <button key={t.value} type="button" onClick={() => handleChange('type', t.value)}
              className={`p-4 rounded-xl border text-left transition-all ${form.type === t.value ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
              <p className="text-sm font-bold text-slate-800">{t.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Contract Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700">Contract Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => handleChange('title', e.target.value)} className={inputClass('title')} placeholder="e.g. Supply of Lab Equipment" />
            {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract Number</label>
            <input value={form.contractNumber} onChange={e => handleChange('contractNumber', e.target.value)} className={inputClass()} placeholder="Auto-generated if blank" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor / Contractor <span className="text-red-500">*</span></label>
            <input value={form.vendorName} onChange={e => handleChange('vendorName', e.target.value)} className={inputClass('vendorName')} placeholder="e.g. MedTech Solutions (Pvt) Ltd" />
            {errors.vendorName && <p className="text-[11px] text-red-500 mt-1">{errors.vendorName}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract Value (LKR) <span className="text-red-500">*</span></label>
            <input type="number" value={form.value} onChange={e => handleChange('value', e.target.value)} className={inputClass('value')} placeholder="Enter value..." />
            {errors.value && <p className="text-[11px] text-red-500 mt-1">{errors.value}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tender Reference</label>
            <input value={form.tenderRef} onChange={e => handleChange('tenderRef', e.target.value)} className={inputClass()} placeholder="e.g. TND-2026-0001" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">LOA Reference</label>
            <input value={form.loaRef} onChange={e => handleChange('loaRef', e.target.value)} className={inputClass()} placeholder="e.g. LOA/UWU/2026/001" />
          </div>
        </div>
      </div>

      {/* Dates & Security */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700">Duration, Security & Insurance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1"><FaCalendarAlt size={9} /><span>Start Date *</span></label>
            <input type="date" value={form.startDate} onChange={e => handleChange('startDate', e.target.value)} className={inputClass('startDate')} />
            {errors.startDate && <p className="text-[11px] text-red-500 mt-1">{errors.startDate}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1"><FaCalendarAlt size={9} /><span>End Date *</span></label>
            <input type="date" value={form.endDate} onChange={e => handleChange('endDate', e.target.value)} className={inputClass('endDate')} />
            {errors.endDate && <p className="text-[11px] text-red-500 mt-1">{errors.endDate}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warranty Expiry</label>
            <input type="date" value={form.warrantyExpiry} onChange={e => handleChange('warrantyExpiry', e.target.value)} className={inputClass()} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Performance Security Ref</label>
            <input value={form.performanceSecurityRef} onChange={e => handleChange('performanceSecurityRef', e.target.value)} className={inputClass()} placeholder="Bank guarantee ref." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Insurance Certificate Ref</label>
            <input value={form.insuranceCertRef} onChange={e => handleChange('insuranceCertRef', e.target.value)} className={inputClass()} placeholder="Insurance ref." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">LD Penalty Rate (%/day)</label>
            <input type="number" step="0.01" value={form.penaltyRate} onChange={e => handleChange('penaltyRate', e.target.value)} className={inputClass()} />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-700">Scope of Work</h3>
        <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={4} className={inputClass()} placeholder="Describe the scope of work, deliverables, and key terms..." />
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Payment Milestones</h3>
            <p className="text-xs text-slate-500 mt-0.5">Define payment schedule tied to deliverables</p>
          </div>
          <button type="button" onClick={addMilestone} className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
            <FaPlus size={9} /><span>Add Milestone</span>
          </button>
        </div>

        {form.milestones.map((ms, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Milestone {i + 1}</span>
              {form.milestones.length > 1 && (
                <button type="button" onClick={() => removeMilestone(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FaTrash size={10} /></button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={ms.title} onChange={e => handleMilestone(i, 'title', e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Milestone title" />
              <input type="date" value={ms.dueDate} onChange={e => handleMilestone(i, 'dueDate', e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              <input type="number" value={ms.amount} onChange={e => handleMilestone(i, 'amount', e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Amount (LKR)" />
            </div>
            <input value={ms.deliverables} onChange={e => handleMilestone(i, 'deliverables', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Deliverables (comma-separated)" />
          </div>
        ))}

        {form.milestones.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="text-sm font-semibold text-emerald-800">Milestone Total</span>
            <div className="text-right">
              <span className="text-sm font-bold text-emerald-700">LKR {milestoneTotal.toLocaleString()}</span>
              {form.value && milestoneTotal !== parseFloat(form.value) && (
                <p className="text-[10px] text-amber-600 mt-0.5">⚠ Doesn't match contract value (LKR {parseFloat(form.value).toLocaleString()})</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
        <button onClick={() => navigate('/contracts')} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
        <div className="flex items-center space-x-3">
          <button onClick={handleSaveDraft} disabled={saving} className="flex items-center space-x-2 px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            {saving ? <FaSpinner className="animate-spin" size={12} /> : <FaSave size={12} />}
            <span>Save Draft</span>
          </button>
          <button onClick={() => { if (validate()) setSignModal(true); }} className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">
            <FaFileSignature size={13} /><span>Sign & Finalize</span>
          </button>
        </div>
      </div>

      {/* Sign Modal */}
      <ConfirmModal isOpen={signModal} onClose={() => setSignModal(false)} onConfirm={handleSignAndFinalize} title="Sign & Finalize Contract" confirmText="Apply Signatures" variant="success">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Finalize contract <span className="font-bold">"{form.title}"</span> with <span className="font-bold">{form.vendorName}</span>.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-slate-600">Contract Value</span><span className="font-bold">LKR {parseFloat(form.value || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Duration</span><span className="font-medium">{form.startDate} → {form.endDate}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Milestones</span><span className="font-medium">{form.milestones.length}</span></div>
          </div>
          {signingAnim && (
            <div className="flex items-center justify-center space-x-3 py-4 bg-emerald-50 rounded-xl border border-emerald-200 animate-pulse">
              <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Applying Dual-Party Digital Signatures...</p>
                <p className="text-xs text-emerald-600">University Registrar + Vendor Representative</p>
              </div>
            </div>
          )}
          <div className="flex items-start space-x-2 text-xs text-slate-400">
            <FaShieldAlt size={10} className="shrink-0 mt-0.5" />
            <span>Both parties' digital signatures will be applied and the contract becomes legally binding. All signatories will receive certified copies via email.</span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
