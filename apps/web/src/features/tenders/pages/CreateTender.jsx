import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaUpload, FaFileAlt, FaPaperPlane, FaSave, FaSpinner, FaPlus, FaTrash, FaUsers } from 'react-icons/fa';
import FormSection from '../../procurement/components/FormSection';
import FormField, { TextInput, SelectInput, TextArea } from '../../procurement/components/FormField';
import tenderService from '../../../services/tender.service';
import procurementService from '../../../services/procurement.service';
import userService from '../../../services/user.service';
import ConfirmModal from '../../../components/ConfirmModal';

const METHODS = [
  { value: 'ncb', label: 'NCB - National Competitive Bidding' },
  { value: 'icb', label: 'ICB - International Competitive Bidding' },
  { value: 'shopping', label: 'Shopping (Limited Bidding)' },
  { value: 'direct', label: 'Direct Contracting' },
  { value: 'rfq', label: 'RFQ - Request for Quotation' },
];
const CATEGORIES = [
  { value: 'Goods', label: 'Goods' },
  { value: 'Works', label: 'Works' },
  { value: 'Services', label: 'Non-Consulting Services' },
  { value: 'Consulting', label: 'Consulting Services' },
];
const BID_TYPES = [
  { value: 'single-envelope', label: 'Single Envelope' },
  { value: 'two-envelope', label: 'Single Stage Two Envelope' },
  { value: 'two-stage', label: 'Two Stage' },
];

export default function CreateTender() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    requisitionRef: '', title: '', method: 'ncb', category: 'Goods',
    bidType: 'single-envelope', technicalWeight: '70', financialWeight: '30',
    publishDate: '', closingDate: '', openingDate: '',
    bidDocFee: '', bidSecurity: '', bidValidity: '120',
    evaluation: 'lowest_price', publishPortal: true, publishWebsite: true,
    description: '', estimatedValue: '',
  });

  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingTender, setLoadingTender] = useState(isEdit);
  const [publishModal, setPublishModal] = useState(false);

  const [criteria, setCriteria] = useState([
    { name: 'Relevant Experience', maxScore: 25 },
    { name: 'Technical Methodology', maxScore: 20 },
    { name: 'Key Staff Qualifications', maxScore: 15 },
    { name: 'Compliance & Standards', maxScore: 10 },
  ]);

  const [becMembers, setBecMembers] = useState([]);
  const [bocMembers, setBocMembers] = useState([]);

  const [procurements, setProcurements] = useState([]);
  const [loadingProcurements, setLoadingProcurements] = useState(true);
  const [systemUsers, setSystemUsers] = useState([]);

  // Fetch Requisitions and System Users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [procRes, userRes] = await Promise.all([
          procurementService.getAll(),
          userService.getUsers()
        ]);
        const items = procRes.data || procRes || [];
        const approved = (Array.isArray(items) ? items : []).filter(p =>
          ['budget_locked', 'committee_assigned', 'tender_preparation', 'hod_approved', 'dean_approved', 'published'].includes(p.status)
        );
        setProcurements(approved);

        const usersData = userRes.data || userRes || [];
        setSystemUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error('Failed to load initial form metadata:', err);
      } finally {
        setLoadingProcurements(false);
      }
    };
    fetchData();
  }, []);

  // Fetch Tender details if in Edit Mode
  useEffect(() => {
    if (!isEdit) return;
    const fetchTender = async () => {
      setLoadingTender(true);
      try {
        const res = await tenderService.getById(id);
        const t = res.data || res;
        
        setForm({
          requisitionRef: t.procurementId?._id || t.procurementId || '',
          title: t.title || '',
          method: t.procurementMethod ? t.procurementMethod.toLowerCase() : 'ncb',
          category: t.category || 'Goods',
          bidType: 'single-envelope',
          technicalWeight: '70',
          financialWeight: '30',
          publishDate: t.publishedAt ? new Date(t.publishedAt).toISOString().split('T')[0] : '',
          closingDate: t.bidSubmissionDeadline ? new Date(t.bidSubmissionDeadline).toISOString().slice(0, 16) : '',
          openingDate: t.bidOpeningDate ? new Date(t.bidOpeningDate).toISOString().slice(0, 16) : '',
          bidDocFee: t.documentFee || '',
          bidSecurity: t.bidSecurityAmount || '',
          bidValidity: t.bidSecurityValidityDays || '120',
          evaluation: t.evaluationType || 'lowest_price',
          publishPortal: true,
          publishWebsite: true,
          description: t.description || '',
          estimatedValue: t.estimatedValue || '',
        });

        if (t.technicalCriteria && t.technicalCriteria.length > 0) {
          setCriteria(t.technicalCriteria.map(c => ({ name: c.criterion, maxScore: c.maxScore || 10 })));
        }

        if (t.becMembers && t.becMembers.length > 0) {
          setBecMembers(t.becMembers.map(m => ({ userId: m.userId?._id || m.userId, role: m.role || 'member' })));
        }

        if (t.bocMembers && t.bocMembers.length > 0) {
          setBocMembers(t.bocMembers.map(m => ({ userId: m.userId?._id || m.userId, role: m.role || 'member' })));
        }

        if (t.tenderDocuments && t.tenderDocuments.length > 0) {
          setFiles(t.tenderDocuments.map(d => ({ name: d.name, url: d.url, type: d.type })));
        }
      } catch (err) {
        toast.error(err.message || 'Failed to fetch tender details for editing');
      } finally {
        setLoadingTender(false);
      }
    };
    fetchTender();
  }, [id, isEdit]);

  const set = (field) => (e) => {
    const val = e.target?.type === 'checkbox' ? e.target.checked : (e.target?.value ?? e);
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.requisitionRef) e.requisitionRef = 'Required';
    if (!form.title.trim()) e.title = 'Required';
    if (!form.method) e.method = 'Required';
    if (!form.category) e.category = 'Required';
    if (!form.closingDate) e.closingDate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mapFormDataToApi = (formData) => {
    const methodMap = { ncb: 'NCB', icb: 'ICB', shopping: 'Shopping', direct: 'Direct', rfq: 'RFQ', limited: 'Limited' };
    const rawMethod = (formData.method || '').toLowerCase();
    return {
      procurementId: formData.requisitionRef,
      title: formData.title,
      description: formData.description,
      category: formData.category || 'Goods',
      procurementMethod: methodMap[rawMethod] || formData.method?.toUpperCase() || 'NCB',
      estimatedValue: Number(formData.estimatedValue) || 0,
      bidSubmissionDeadline: formData.closingDate,
      bidOpeningDate: formData.openingDate || (formData.closingDate ? new Date(new Date(formData.closingDate).getTime() + 30 * 60000).toISOString() : undefined),
      documentFee: Number(formData.bidDocFee) || 0,
      bidSecurityRequired: !!formData.bidSecurity,
      bidSecurityAmount: Number(formData.bidSecurity) || 0,
      bidSecurityPercentage: 2,
      bidSecurityValidityDays: Number(formData.bidValidity) || 120,
      evaluationType: formData.evaluation || 'lowest_price',
      technicalCriteria: criteria.filter(c => c.name.trim()).map(c => ({ criterion: c.name, maxScore: c.maxScore })),
      technicalPassMark: 70,
      becMembers: becMembers.filter(m => m.userId),
      bocMembers: bocMembers.filter(m => m.userId),
    };
  };

  const handleSaveDraft = async () => {
    if (!form.requisitionRef) { toast.error('Please select a linked requisition.'); return; }
    if (!form.title.trim()) { toast.error('Please enter a tender title.'); return; }
    if (!form.closingDate) { toast.error('Please enter a bid closing deadline.'); return; }
    setSaving(true);
    try {
      const apiData = mapFormDataToApi(form);
      if (isEdit) {
        await tenderService.update(id, { ...apiData, status: 'draft' });
        toast.success('📋 Tender draft updated successfully.');
      } else {
        await tenderService.create({ ...apiData, status: 'draft' });
        toast.success('📋 Tender draft created successfully.');
      }
      navigate('/tenders');
    } catch (err) {
      toast.error(err.message || 'Failed to save draft tender');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const apiData = mapFormDataToApi(form);
      let targetId = id;
      if (isEdit) {
        await tenderService.update(id, apiData);
      } else {
        const res = await tenderService.create({ ...apiData, status: 'draft' });
        targetId = res.data?._id || res._id;
      }

      if (targetId) {
        await tenderService.publish(targetId);
        toast.success('🚀 Tender published to e-GP portal and university website!');
      } else {
        throw new Error('Tender creation response invalid');
      }
      setPublishModal(false);
      navigate('/tenders');
    } catch (err) {
      toast.error(err.message || 'Failed to publish tender');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (!validate()) { toast.error('Please fill in all required fields.'); return; }
    setPublishModal(true);
  };

  const addCriterion = () => setCriteria(prev => [...prev, { name: '', maxScore: 10 }]);
  const removeCriterion = (i) => setCriteria(prev => prev.filter((_, idx) => idx !== i));
  const updateCriterion = (i, key, val) => { const updated = [...criteria]; updated[i] = { ...updated[i], [key]: val }; setCriteria(updated); };

  const addBecMember = () => setBecMembers(prev => [...prev, { userId: '', role: 'member' }]);
  const removeBecMember = (i) => setBecMembers(prev => prev.filter((_, idx) => idx !== i));
  const updateBecMember = (i, key, val) => { const updated = [...becMembers]; updated[i] = { ...updated[i], [key]: val }; setBecMembers(updated); };

  const addBocMember = () => setBocMembers(prev => [...prev, { userId: '', role: 'member' }]);
  const removeBocMember = (i) => setBocMembers(prev => prev.filter((_, idx) => idx !== i));
  const updateBocMember = (i, key, val) => { const updated = [...bocMembers]; updated[i] = { ...updated[i], [key]: val }; setBocMembers(updated); };

  const procurementOptions = procurements.map(p => ({
    value: p._id,
    label: `${p.referenceNumber} - ${p.title} (${p.category} - LKR ${p.totalEstimatedCost?.toLocaleString() || '0'})`
  }));

  const userOptions = systemUsers.map(u => ({
    value: u._id,
    label: `${u.firstName} ${u.lastName} (${u.role ? u.role.toUpperCase() : 'Staff'}) - ${u.department || 'UWU'}`
  }));

  if (loadingTender) {
    return (
      <div className="flex items-center justify-center py-24">
        <FaSpinner className="animate-spin text-emerald-600 mr-2" size={20} />
        <span className="text-slate-500 text-sm">Loading tender data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/tenders" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600 mb-2 transition-colors">
            <FaArrowLeft className="mr-1.5" size={11} /> Back to Tenders
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Tender Notice' : 'Create Tender Notice'}</h1>
          <p className="text-sm text-slate-500 mt-1">Prepare Specific Procurement Notice (SPN) and bidding documents</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={handleSaveDraft} disabled={saving} className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center space-x-2 disabled:opacity-50">
            {saving ? <FaSpinner className="animate-spin" size={11} /> : <FaSave size={11} />}<span>Save Draft</span>
          </button>
          <button onClick={handleSubmit} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 shadow-sm flex items-center space-x-2">
            <FaPaperPlane size={11} /><span>Publish Tender</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <FormSection title="Tender Information" step="1" subtitle="Link to approved requisition and define tender parameters">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Linked Requisition Reference" required hint="Select an approved and budget-locked requisition" error={errors.requisitionRef}>
              <SelectInput
                value={form.requisitionRef}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selected = procurements.find(p => p._id === selectedId);
                  setForm(prev => ({
                    ...prev,
                    requisitionRef: selectedId,
                    title: selected ? selected.title : prev.title,
                    category: selected ? selected.category : prev.category,
                    method: selected ? selected.procurementMethod?.toLowerCase() : prev.method,
                    description: selected ? selected.description : prev.description,
                    estimatedValue: selected ? String(selected.totalEstimatedCost || '') : prev.estimatedValue,
                  }));
                  if (errors.requisitionRef) setErrors(prev => ({ ...prev, requisitionRef: '' }));
                }}
                options={procurementOptions}
                placeholder={loadingProcurements ? 'Loading requisitions...' : 'Select approved requisition...'}
              />
            </FormField>
            <FormField label="Tender Title" required>
              <TextInput value={form.title} onChange={set('title')} placeholder='e.g. "Supply of Laboratory Equipment"' />
            </FormField>
            <FormField label="Procurement Method" required>
              <SelectInput value={form.method} onChange={set('method')} options={METHODS} placeholder="Select method..." />
            </FormField>
            <FormField label="Category" required>
              <SelectInput value={form.category} onChange={set('category')} options={CATEGORIES} placeholder="Select..." />
            </FormField>
          </div>
          <FormField label="Estimated Value (LKR)" hint="Auto-populated from linked requisition">
            <TextInput type="number" value={form.estimatedValue} onChange={set('estimatedValue')} placeholder="e.g. 5000000" />
          </FormField>
          <FormField label="Tender Description" required>
            <TextArea value={form.description} onChange={set('description')} rows={4} placeholder="Provide a summary of the procurement scope, key requirements, and delivery expectations..." />
          </FormField>
        </FormSection>

        <FormSection title="Bidding Parameters" step="2" subtitle="Bid type, evaluation weights, fees, and security requirements">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FormField label="Bidding Type" required>
              <SelectInput value={form.bidType} onChange={set('bidType')} options={BID_TYPES} />
            </FormField>
            <FormField label="Technical Weight (%)" hint="For two-envelope bids">
              <TextInput type="number" value={form.technicalWeight} onChange={set('technicalWeight')} />
            </FormField>
            <FormField label="Financial Weight (%)" hint="Auto-calculated complement">
              <TextInput type="number" value={String(100 - (parseInt(form.technicalWeight) || 0))} readOnly />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FormField label="Bid Document Fee (LKR)" hint="Non-refundable fee via Bank of Ceylon">
              <TextInput type="number" value={form.bidDocFee} onChange={set('bidDocFee')} placeholder="e.g. 5000" />
            </FormField>
            <FormField label="Bid Security Amount" hint="2% of TCE or fixed amount">
              <TextInput value={form.bidSecurity} onChange={set('bidSecurity')} placeholder="e.g. LKR 500,000" />
            </FormField>
            <FormField label="Bid Validity (Days)">
              <TextInput type="number" value={form.bidValidity} onChange={set('bidValidity')} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Schedule & Publication" step="3" subtitle="Timeline for tender lifecycle and publication channels">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FormField label="Publish Date">
              <TextInput type="date" value={form.publishDate} onChange={set('publishDate')} />
            </FormField>
            <FormField label="Bid Closing Deadline" required error={errors.closingDate}>
              <TextInput type="datetime-local" value={form.closingDate} onChange={set('closingDate')} />
            </FormField>
            <FormField label="Bid Opening Date">
              <TextInput type="datetime-local" value={form.openingDate} onChange={set('openingDate')} />
            </FormField>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Publication Channels</p>
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.publishPortal} onChange={set('publishPortal')} className="w-4 h-4 accent-emerald-600" />
                <span>National e-GP Portal (Mandatory)</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.publishWebsite} onChange={set('publishWebsite')} className="w-4 h-4 accent-emerald-600" />
                <span>UWU University Website</span>
              </label>
            </div>
          </div>
        </FormSection>

        <FormSection title="Bidding Documents" step="4" subtitle="Upload standard bidding documents, evaluation criteria, and technical specifications">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer relative">
            <input type="file" multiple accept=".pdf,.docx,.xlsx" onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files).map(f => ({ name: f.name, type: f.type }))])} className="absolute inset-0 opacity-0 cursor-pointer" />
            <FaUpload className="mx-auto text-slate-400 mb-2" size={24} />
            <p className="text-sm text-slate-500">Upload Standard Bidding Documents (SBD)</p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX only. Malware-scanned on upload.</p>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm">
                  <span className="flex items-center space-x-2 text-slate-700"><FaFileAlt className="text-slate-400" size={12} /><span className="truncate">{f.name}</span></span>
                  <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                </div>
              ))}
            </div>
          )}
        </FormSection>

        {/* Evaluation Criteria Builder */}
        <FormSection title="Evaluation Criteria" step="5" subtitle="Define technical evaluation scoring criteria (auto-calculated weights)">
          <div className="space-y-3">
            {criteria.map((c, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-400 w-6">{i + 1}</span>
                <input value={c.name} onChange={e => updateCriterion(i, 'name', e.target.value)} placeholder="Criterion name" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                <input type="number" value={c.maxScore} onChange={e => updateCriterion(i, 'maxScore', parseInt(e.target.value) || 0)} className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                <span className="text-xs text-slate-400">pts</span>
                {criteria.length > 1 && <button onClick={() => removeCriterion(i)} className="p-1 text-red-400 hover:text-red-600"><FaTrash size={10} /></button>}
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button onClick={addCriterion} className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"><FaPlus size={9} /><span>Add Criterion</span></button>
              <span className="text-xs font-bold text-slate-600">Total: {criteria.reduce((s, c) => s + (c.maxScore || 0), 0)} pts</span>
            </div>
          </div>
        </FormSection>

        {/* Committee Setup */}
        <FormSection title="Committees Assignment" step="6" subtitle="Assign Bid Evaluation Committee (BEC) and Bid Opening Committee (BOC) members">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BEC Members */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 flex items-center space-x-1.5">
                  <FaUsers className="text-emerald-600" size={13} />
                  <span>Bid Evaluation Committee (BEC)</span>
                </h4>
                <button onClick={addBecMember} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">+ Member</button>
              </div>
              {becMembers.map((m, i) => (
                <div key={i} className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <select value={m.userId} onChange={e => updateBecMember(i, 'userId', e.target.value)} className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none">
                    <option value="">Select Staff User...</option>
                    {userOptions.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                  <select value={m.role} onChange={e => updateBecMember(i, 'role', e.target.value)} className="w-28 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none">
                    <option value="chairperson">Chairperson</option>
                    <option value="member">Member</option>
                    <option value="secretary">Secretary</option>
                  </select>
                  <button onClick={() => removeBecMember(i)} className="p-1 text-red-400 hover:text-red-600"><FaTrash size={10} /></button>
                </div>
              ))}
              {becMembers.length === 0 && <p className="text-xs text-slate-400 italic">No BEC members assigned yet.</p>}
            </div>

            {/* BOC Members */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 flex items-center space-x-1.5">
                  <FaUsers className="text-blue-600" size={13} />
                  <span>Bid Opening Committee (BOC)</span>
                </h4>
                <button onClick={addBocMember} className="text-xs font-semibold text-blue-600 hover:text-blue-700">+ Member</button>
              </div>
              {bocMembers.map((m, i) => (
                <div key={i} className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <select value={m.userId} onChange={e => updateBocMember(i, 'userId', e.target.value)} className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none">
                    <option value="">Select Staff User...</option>
                    {userOptions.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                  <select value={m.role} onChange={e => updateBocMember(i, 'role', e.target.value)} className="w-28 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none">
                    <option value="chairperson">Chairperson</option>
                    <option value="member">Member</option>
                    <option value="witness">Witness</option>
                  </select>
                  <button onClick={() => removeBocMember(i)} className="p-1 text-red-400 hover:text-red-600"><FaTrash size={10} /></button>
                </div>
              ))}
              {bocMembers.length === 0 && <p className="text-xs text-slate-400 italic">No BOC members assigned yet.</p>}
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-between pt-4 pb-8 border-t border-slate-200">
          <Link to="/tenders" className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</Link>
          <div className="flex items-center space-x-3">
            <button onClick={handleSaveDraft} disabled={saving} className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center space-x-2 disabled:opacity-50">
              {saving ? <FaSpinner className="animate-spin" size={11} /> : <FaSave size={11} />}<span>Save Draft</span>
            </button>
            <button onClick={handleSubmit} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 shadow-sm flex items-center space-x-2">
              <FaPaperPlane size={11} /><span>Publish Tender</span>
            </button>
          </div>
        </div>

        {/* Publish Confirmation Modal */}
        <ConfirmModal isOpen={publishModal} onClose={() => setPublishModal(false)} onConfirm={handlePublish} title="Publish Tender Notice" confirmText="Publish to e-GP" variant="success">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Publish <span className="font-bold">"{form.title}"</span>?</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="font-medium">{form.method || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Closing</span><span className="font-medium">{form.closingDate || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">BEC Members</span><span className="font-medium">{becMembers.length} assigned</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Eval Criteria</span><span className="font-medium">{criteria.length} criteria</span></div>
            </div>
            <p className="text-xs text-slate-400">This will make the tender visible to all registered bidders on the e-GP portal and university website.</p>
          </div>
        </ConfirmModal>
      </div>
    </div>
  );
}
