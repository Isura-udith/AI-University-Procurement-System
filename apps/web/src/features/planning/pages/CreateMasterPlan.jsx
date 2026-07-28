import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaSave, FaPaperPlane, FaLayerGroup, FaCloudDownloadAlt, FaSpinner } from 'react-icons/fa';
import planningService from '../../../services/planning.service';
import { DEPARTMENTS_AND_FACULTIES, DEPARTMENTS_BY_FACULTY, ALL_DEPARTMENTS } from '../../../constants/departments';

const CATEGORIES = ['Goods', 'Services', 'Works', 'Consulting'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const YEARS = [1, 2, 3];

export default function CreateMasterPlan() {
  const { id } = useParams();
  const { user } = useSelector(s => s.auth);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [fetching, setFetching] = useState(!!id);

  const currentYear = new Date().getFullYear();
  const defaultFaculty = user?.faculty || DEPARTMENTS_AND_FACULTIES[0];
  const defaultDept = user?.department || DEPARTMENTS_BY_FACULTY[defaultFaculty]?.[0] || DEPARTMENTS_AND_FACULTIES[0];

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      cycleStart: currentYear + 1,
      cycleEnd: currentYear + 4,
      requirements: [
        { department: defaultDept, faculty: defaultFaculty, description: '', category: 'Goods', estimatedQuantity: 1, unit: 'Units', estimatedUnitCost: '', estimatedTotalCost: '', plannedYear: 1, priority: 'medium', justification: '' }
      ],
    }
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'requirements' });

  useEffect(() => {
    if (id) {
      planningService.getMasterPlan(id)
        .then(res => {
          const plan = res.data?.data || res.data;
          if (plan) {
            reset({
              title: plan.title || '',
              description: plan.description || '',
              cycleStart: plan.cycleStart || currentYear + 1,
              cycleEnd: plan.cycleEnd || currentYear + 4,
              requirements: plan.requirements && plan.requirements.length > 0 ? plan.requirements.map(r => ({
                ...r,
                department: r.department || defaultDept,
                faculty: r.faculty || defaultFaculty,
                category: r.category || 'Goods',
                estimatedQuantity: r.estimatedQuantity || 1,
                unit: r.unit || 'Units',
                estimatedUnitCost: r.estimatedUnitCost || 0,
                plannedYear: r.plannedYear || 1,
                priority: r.priority || 'medium',
              })) : [{ department: defaultDept, faculty: defaultFaculty, description: '', category: 'Goods', estimatedQuantity: 1, unit: 'Units', estimatedUnitCost: '', estimatedTotalCost: '', plannedYear: 1, priority: 'medium', justification: '' }]
            });
          }
        })
        .catch(err => {
          console.error(err);
          toast.error('Failed to load Master Plan for editing');
        })
        .finally(() => setFetching(false));
    }
  }, [id, reset, defaultDept, defaultFaculty, currentYear]);

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
      const payload = { ...data, cycleStart: Number(data.cycleStart), cycleEnd: Number(data.cycleStart) + 3, requirements, status: 'draft' };
      
      let targetId = id;
      if (id) {
        await planningService.updateMasterPlan(id, payload);
        toast.success('Master Plan updated!');
      } else {
        const res = await planningService.createMasterPlan(payload);
        targetId = res.data?.data?._id || res.data?._id;
        toast.success('Master Plan saved as draft!');
      }

      if (submitAfter && targetId) {
        await planningService.submitMasterPlan(targetId);
        toast.success('Submitted for Chief Bursar review!');
      }
      navigate(targetId ? `/planning/master-plans/${targetId}` : '/planning/master-plans');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Import approved draft items from DraftProcurementItem database table
  const handleImportApprovedDraftItems = async () => {
    setLoadingImport(true);
    try {
      const res = await planningService.getApprovedDraftItems();
      const items = res.data?.data || res.data || [];

      if (!Array.isArray(items) || items.length === 0) {
        toast.info('No approved draft procurement items found for your department.');
        return;
      }

      const formattedRequirements = items.map(item => ({
        dappNumber: item.itemCode || '',
        description: item.description || '',
        faculty: item.faculty || defaultFaculty,
        department: item.department || defaultDept,
        category: CATEGORIES.includes(item.category) ? item.category : 'Goods',
        estimatedQuantity: Number(item.estimatedQuantity) || 1,
        unit: item.unit || 'Units',
        estimatedUnitCost: Number(item.estimatedUnitCost) || 0,
        estimatedTotalCost: Number(item.estimatedTotalCost) || 0,
        plannedYear: Number(item.plannedYear) || 1,
        priority: (item.priority || 'medium').toLowerCase(),
        justification: item.justification || item.notes || 'Imported from Dean-approved draft items pool',
      }));

      replace(formattedRequirements);
      toast.success(`Imported ${formattedRequirements.length} Dean-approved draft item(s) into Master Plan!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to import approved draft items.');
    } finally {
      setLoadingImport(false);
    }
  };

  const cycleStart = useWatch({ control, name: 'cycleStart' });
  const watchRequirements = useWatch({ control, name: 'requirements' });

  const addRequirement = () => append({
    department: defaultDept, faculty: defaultFaculty, description: '', category: 'Goods',
    estimatedQuantity: 1, unit: 'Units', estimatedUnitCost: '', estimatedTotalCost: '',
    plannedYear: 1, priority: 'medium', justification: '', dappNumber: '',
  });

  if (fetching) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20 text-slate-500 gap-3">
        <FaSpinner className="animate-spin text-2xl text-violet-600" />
        <span className="text-sm font-medium">Loading Master Plan...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
            <FaLayerGroup className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create 3-Year Master Procurement Plan</h1>
            <p className="text-sm text-slate-500">Phase 1 · Chief Bursar → Finance Committee → VC → Council</p>
          </div>
        </div>

        {/* Action to import approved draft items */}
        <button
          type="button"
          onClick={handleImportApprovedDraftItems}
          disabled={loadingImport}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <FaCloudDownloadAlt className="text-sm" />
          <span>{loadingImport ? 'Importing...' : 'Import Approved Draft Items'}</span>
        </button>
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
            <div className="flex items-center gap-2">
              <button type="button" onClick={addRequirement}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-colors">
                <FaPlus size={10} /> Add Item
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedFaculty = watchRequirements?.[index]?.faculty || field.faculty;
              const deptOptions = DEPARTMENTS_BY_FACULTY[selectedFaculty] || ALL_DEPARTMENTS;

              return (
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
                      <label className="block text-xs font-semibold text-slate-500 mb-1">DAPP Number</label>
                      <input {...register(`requirements.${index}.dappNumber`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="e.g. UWU/DAPP/2026/001" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Faculty / Division</label>
                      <select {...register(`requirements.${index}.faculty`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                        <option value="">Select Faculty / Division</option>
                        {DEPARTMENTS_AND_FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
                      <select {...register(`requirements.${index}.department`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                        <option value="">Select Department</option>
                        {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
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
                      {YEARS.map(y => (
                        <option key={y} value={y}>Year {y} ({Number(cycleStart || 2028) + y - 1})</option>
                      ))}
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
            );
          })}
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
            <FaPaperPlane size={13} /> {saving ? 'Submitting…' : 'Save & Submit for Chief Bursar Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
