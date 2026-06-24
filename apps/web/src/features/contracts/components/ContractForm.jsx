import { useState } from 'react';
import { FaPlus, FaTrash, FaCalendarAlt } from 'react-icons/fa';

/**
 * Reusable contract form with all fields, milestones, and validation.
 * @param {object} initialData - Pre-filled data
 * @param {function} onSubmit - Called with form data
 * @param {boolean} isEdit - Whether this is an edit operation
 */
export default function ContractForm({ initialData = {}, onSubmit }) {
  const [form, setForm] = useState({
    title: initialData.title || '',
    contractNumber: initialData.contractNumber || '',
    vendorName: initialData.vendorName || '',
    tenderRef: initialData.tenderRef || '',
    loaRef: initialData.loaRef || '',
    type: initialData.type || 'goods',
    value: initialData.value || '',
    startDate: initialData.startDate || '',
    endDate: initialData.endDate || '',
    warrantyExpiry: initialData.warrantyExpiry || '',
    performanceSecurityRef: initialData.performanceSecurityRef || '',
    insuranceCertRef: initialData.insuranceCertRef || '',
    penaltyRate: initialData.penaltyRate || '0.05',
    description: initialData.description || '',
    milestones: initialData.milestones || [{ title: '', dueDate: '', amount: '', deliverables: '' }],
  });
  const [errors, setErrors] = useState({});

  const handleChange = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const handleMilestone = (index, key, val) => {
    const updated = [...form.milestones];
    updated[index] = { ...updated[index], [key]: val };
    setForm(f => ({ ...f, milestones: updated }));
  };

  const addMilestone = () => setForm(f => ({ ...f, milestones: [...f.milestones, { title: '', dueDate: '', amount: '', deliverables: '' }] }));
  const removeMilestone = (i) => setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Contract title is required.';
    if (!form.vendorName.trim()) e.vendorName = 'Vendor name is required.';
    if (!form.value) e.value = 'Contract value is required.';
    if (!form.startDate) e.startDate = 'Start date is required.';
    if (!form.endDate) e.endDate = 'End date is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.(form);
  };

  const inputClass = (key) => `w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${errors[key] ? 'border-red-400 bg-red-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contract Type */}
      <div className="grid grid-cols-3 gap-2">
        {['goods', 'works', 'services'].map(t => (
          <button key={t} type="button" onClick={() => handleChange('type', t)}
            className={`p-3 rounded-xl border text-sm font-semibold transition-all ${form.type === t ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract Title *</label>
          <input value={form.title} onChange={e => handleChange('title', e.target.value)} className={inputClass('title')} placeholder="e.g. Supply of Lab Equipment" />
          {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract Number</label>
          <input value={form.contractNumber} onChange={e => handleChange('contractNumber', e.target.value)} className={inputClass()} placeholder="Auto-generated if blank" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor Name *</label>
          <input value={form.vendorName} onChange={e => handleChange('vendorName', e.target.value)} className={inputClass('vendorName')} placeholder="e.g. MedTech Solutions (Pvt) Ltd" />
          {errors.vendorName && <p className="text-[11px] text-red-500 mt-1">{errors.vendorName}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract Value (LKR) *</label>
          <input type="number" value={form.value} onChange={e => handleChange('value', e.target.value)} className={inputClass('value')} placeholder="Enter value..." />
          {errors.value && <p className="text-[11px] text-red-500 mt-1">{errors.value}</p>}
        </div>
      </div>

      {/* References */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Tender Reference</label><input value={form.tenderRef} onChange={e => handleChange('tenderRef', e.target.value)} className={inputClass()} placeholder="e.g. TND-2026-0001" /></div>
        <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">LOA Reference</label><input value={form.loaRef} onChange={e => handleChange('loaRef', e.target.value)} className={inputClass()} placeholder="e.g. LOA/UWU/2026/001" /></div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1"><FaCalendarAlt size={10} /><span>Start Date *</span></label>
          <input type="date" value={form.startDate} onChange={e => handleChange('startDate', e.target.value)} className={inputClass('startDate')} />
          {errors.startDate && <p className="text-[11px] text-red-500 mt-1">{errors.startDate}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1"><FaCalendarAlt size={10} /><span>End Date *</span></label>
          <input type="date" value={form.endDate} onChange={e => handleChange('endDate', e.target.value)} className={inputClass('endDate')} />
          {errors.endDate && <p className="text-[11px] text-red-500 mt-1">{errors.endDate}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warranty Expiry</label>
          <input type="date" value={form.warrantyExpiry} onChange={e => handleChange('warrantyExpiry', e.target.value)} className={inputClass()} />
        </div>
      </div>

      {/* Security & Insurance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Performance Security Ref</label><input value={form.performanceSecurityRef} onChange={e => handleChange('performanceSecurityRef', e.target.value)} className={inputClass()} placeholder="Bank guarantee ref." /></div>
        <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Insurance Certificate Ref</label><input value={form.insuranceCertRef} onChange={e => handleChange('insuranceCertRef', e.target.value)} className={inputClass()} placeholder="Insurance ref." /></div>
        <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">LD Penalty Rate (%/day)</label><input type="number" step="0.01" value={form.penaltyRate} onChange={e => handleChange('penaltyRate', e.target.value)} className={inputClass()} /></div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
        <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={3} className={inputClass()} placeholder="Scope of work..." />
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-800">Payment Milestones</label>
          <button type="button" onClick={addMilestone} className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            <FaPlus size={9} /><span>Add Milestone</span>
          </button>
        </div>
        {form.milestones.map((ms, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative">
            {form.milestones.length > 1 && (
              <button type="button" onClick={() => removeMilestone(i)} className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 transition-colors"><FaTrash size={10} /></button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={ms.title} onChange={e => handleMilestone(i, 'title', e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" placeholder="Milestone title" />
              <input type="date" value={ms.dueDate} onChange={e => handleMilestone(i, 'dueDate', e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
              <input type="number" value={ms.amount} onChange={e => handleMilestone(i, 'amount', e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" placeholder="Amount (LKR)" />
            </div>
            <input value={ms.deliverables} onChange={e => handleMilestone(i, 'deliverables', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" placeholder="Deliverables (comma-separated)" />
          </div>
        ))}
        {form.milestones.length > 0 && (
          <div className="text-right text-xs text-slate-500">
            Total: LKR {form.milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0).toLocaleString()}
            {form.value && <span className="ml-2 text-slate-400">/ {parseFloat(form.value).toLocaleString()}</span>}
          </div>
        )}
      </div>
    </form>
  );
}
