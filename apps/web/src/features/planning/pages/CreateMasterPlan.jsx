import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaSave, FaPaperPlane, FaLayerGroup } from 'react-icons/fa';
import planningService from '../../../services/planning.service';

const CATEGORIES = ['Goods', 'Services', 'Works', 'Consulting'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const YEARS = [1, 2, 3];
const FACULTIES = [
  'Faculty of Applied Sciences', 'Faculty of Medicine', 'Faculty of Management Studies',
  'Faculty of Technology', 'Faculty of Graduate Studies', 'ICT Centre', 'Library',
  'Works Division', 'Supplies Division', 'Finance Division', 'Administration',
];

export default function CreateMasterPlan() {
  const { user } = useSelector(s => s.auth);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      cycleStart: currentYear + 1,
      cycleEnd: currentYear + 4,
      requirements: [
        { department: '', faculty: user?.faculty || '', description: '', category: 'Goods', estimatedQuantity: 1, unit: 'Units', estimatedUnitCost: '', estimatedTotalCost: '', plannedYear: 1, priority: 'medium', justification: '' }
      ],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'requirements' });

  const onSave = async (data, submitAfter = false) => {
    setSaving(true);
    try {
      // Compute totals
      const requirements = data.requirements.map(r => ({
        ...r,
        estimatedTotalCost: Number(r.estimatedQuantity || 1) * Number(r.estimatedUnitCost || 0),
        estimatedQuantity: Number(r.estimatedQuantity),
        estimatedUnitCost: Number(r.estimatedUnitCost),
      }));
      const payload = { ...data, cycleStart: Number(data.cycleStart), cycleEnd: Number(data.cycleEnd), requirements };
      const res = await planningService.createMasterPlan(payload);
      const newId = res.data?.data?._id || res.data?._id;
      toast.success('Master Plan saved!');
      if (submitAfter && newId) {
        await planningService.submitMasterPlan(newId);
        toast.success('Submitted for Dean review!');
      }
      navigate(newId ? `/planning/master-plans/${newId}` : '/planning/master-plans');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const cycleStart = useWatch({ control, name: 'cycleStart' });

  const addRequirement = () => append({
    department: '', faculty: user?.faculty || '', description: '', category: 'Goods',
    estimatedQuantity: 1, unit: 'Units', estimatedUnitCost: '', estimatedTotalCost: '',
    plannedYear: 1, priority: 'medium', justification: '',
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
          <FaLayerGroup className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create 3-Year Master Procurement Plan</h1>
          <p className="text-sm text-slate-500">Phase 1 · HOD → Dean → Bursar → Finance Committee → VC → Council</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => onSave(d, false))} className="space-y-6">
        {/* Plan Details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Plan Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Plan Title *</label>
              <input {...register('title', { required: 'Title is required' })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g. University Master Procurement Plan 2026–2029" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cycle Start Year *</label>
              <input type="number" {...register('cycleStart', { required: true, min: 2024 })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cycle End Year (3 years after start) *</label>
              <input type="number" value={Number(cycleStart) + 3} readOnly
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500" />
              <input type="hidden" {...register('cycleEnd')} value={Number(cycleStart) + 3} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description / Scope</label>
              <textarea {...register('description')} rows={3}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="Describe the overall scope and objectives of this procurement plan…" />
            </div>
          </div>
        </div>

        {/* Requirements Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-semibold text-slate-800">Procurement Requirements</h2>
            <button type="button" onClick={addRequirement}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-colors">
              <FaPlus size={10} /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-slate-200 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">Item {index + 1}</span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 transition-colors">
                      <FaTrash size={13} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Description *</label>
                    <input {...register(`requirements.${index}.description`, { required: true })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="Item description" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Faculty</label>
                    <select {...register(`requirements.${index}.faculty`)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400">
                      {FACULTIES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
                    <input {...register(`requirements.${index}.department`)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="Dept. / Division" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Category *</label>
                    <select {...register(`requirements.${index}.category`)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Planned Year</label>
                    <select {...register(`requirements.${index}.plannedYear`, { valueAsNumber: true })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400">
                      {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Qty</label>
                    <input type="number" {...register(`requirements.${index}.estimatedQuantity`, { valueAsNumber: true, min: 1 })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Unit</label>
                    <input {...register(`requirements.${index}.unit`)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="Units / Sets / m²" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Est. Unit Cost (LKR)</label>
                    <input type="number" {...register(`requirements.${index}.estimatedUnitCost`, { valueAsNumber: true })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                    <select {...register(`requirements.${index}.priority`)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400">
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Justification</label>
                    <input {...register(`requirements.${index}.justification`)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="Why is this needed?" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-600 transition-all disabled:opacity-60">
            <FaSave size={13} /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" disabled={saving}
            onClick={handleSubmit(d => onSave(d, true))}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-all disabled:opacity-60">
            <FaPaperPlane size={13} /> {saving ? 'Submitting…' : 'Save & Submit for Dean Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
