import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FaTrash, FaSave, FaPaperPlane, FaCalendarAlt, FaPlus, FaSpinner } from 'react-icons/fa';
import planningService from '../../../services/planning.service';
import { DEPARTMENTS_AND_FACULTIES, DEPARTMENTS_BY_FACULTY, ALL_DEPARTMENTS } from '../../../constants/departments';

const CATEGORIES = ['Goods', 'Services', 'Works', 'Consulting'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const QUARTERS = [1, 2, 3, 4];

export default function CreateAnnualPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prefillMPPId = location.state?.masterPlanId || '';

  const [masterPlans, setMasterPlans] = useState([]);
  const [finalMasterPlans, setFinalMasterPlans] = useState([]);
  const [allMasterPlans, setAllMasterPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(!!id);

  useEffect(() => {
    Promise.all([
      planningService.getMasterPlans({ limit: 50 }),
      planningService.getFinalMasterPlans({ limit: 50 }),
    ])
      .then(([mppRes, fmpRes]) => {
        const mpps = (mppRes.data?.data || mppRes.data || []).map(m => ({ ...m, planType: 'mpp' }));
        const fmps = (fmpRes.data?.data || fmpRes.data || []).map(f => ({ ...f, planType: 'fmp' }));
        setMasterPlans(mpps);
        setFinalMasterPlans(fmps);
        setAllMasterPlans([...mpps, ...fmps]);
      })
      .catch(() => {});
  }, []);

  const currentYear = new Date().getFullYear();
  const { register, control, handleSubmit, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      masterPlanId: prefillMPPId,
      planYear: currentYear + 1,
      cycleYearNumber: 1,
      title: '',
      description: '',
      items: [],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = useWatch({ control, name: 'items' }) || [];
  const watchMasterPlanId = useWatch({ control, name: 'masterPlanId' });
  const watchCycleYearNumber = useWatch({ control, name: 'cycleYearNumber' });

  // If editing an existing plan, fetch and populate
  useEffect(() => {
    if (id) {
      planningService.getAnnualPlan(id)
        .then(res => {
          const plan = res.data?.data || res.data;
          if (plan) {
            reset({
              masterPlanId: plan.masterPlanId?._id || plan.masterPlanId || '',
              planYear: plan.planYear || currentYear + 1,
              cycleYearNumber: plan.cycleYearNumber || 1,
              title: plan.title || '',
              description: plan.description || '',
              items: plan.items || [],
            });
          }
        })
        .catch(err => {
          console.error(err);
          toast.error('Failed to load Annual Plan for editing');
        })
        .finally(() => setFetching(false));
    }
  }, [id, reset, currentYear]);

  // Derive items from selected Master Plan or Final Master Plan if adding new
  useEffect(() => {
    if (!id && watchMasterPlanId && watchMasterPlanId !== 'demo-mpp-id') {
      const selectedPlan = allMasterPlans.find(p => p._id === watchMasterPlanId);
      if (selectedPlan?.planType === 'fmp') {
        planningService.getFinalMasterPlan(watchMasterPlanId)
          .then(res => {
            const fmp = res.data?.data || res.data;
            if (fmp && fmp.items && fmp.items.length > 0) {
              const cycleYr = Number(watchCycleYearNumber || 1);
              const startYr = Number(fmp.planYear || currentYear);

              const cycleReqs = fmp.items.filter(r => (Number(r.plannedYear) || 1) === cycleYr);
              const targetReqs = cycleReqs.length > 0 ? cycleReqs : fmp.items;

              const newItems = targetReqs.map(r => ({
                masterPlanRequirementId: r._id,
                dappNumber: r.dappNumber || '',
                department: r.department || '',
                faculty: r.faculty || '',
                description: r.description || '',
                category: r.category || 'Goods',
                estimatedQuantity: Number(r.estimatedQuantity) || 1,
                unit: r.unit || 'Units',
                estimatedUnitCost: Number(r.estimatedUnitCost) || 0,
                priority: r.priority || 'medium',
                quarter: 1
              }));
              setValue('items', newItems, { shouldValidate: true });
              const calculatedYr = startYr + (cycleYr - 1);
              setValue('planYear', calculatedYr);
              if (fmp.title) {
                setValue('title', `Annual Procurement Plan ${calculatedYr} (Year ${cycleYr} of 3) — ${fmp.title}`);
              }
            }
          })
          .catch(err => console.error('Failed to fetch FMP details', err));
      } else {
        planningService.getMasterPlan(watchMasterPlanId)
          .then(res => {
            const mpp = res.data?.data || res.data;
            if (mpp && mpp.requirements && mpp.requirements.length > 0) {
              const cycleYr = Number(watchCycleYearNumber || 1);
              const startYr = Number(mpp.cycleStart || 0);

              const getPlannedYr = (r) => {
                const py = Number(r.plannedYear || r.year);
                if (!py) return 1;
                if (py === 1 || py === startYr) return 1;
                if (py === 2 || py === (startYr + 1)) return 2;
                if (py === 3 || py === (startYr + 2)) return 3;
                return 1;
              };

              const cycleReqs = mpp.requirements.filter(r => getPlannedYr(r) === cycleYr);
              const targetReqs = cycleReqs.length > 0 ? cycleReqs : mpp.requirements;

              const newItems = targetReqs.map(r => ({
                masterPlanRequirementId: r._id,
                dappNumber: r.dappNumber || r.reqCode || '',
                department: r.department || '',
                faculty: r.faculty || '',
                description: r.description || '',
                category: r.category || 'Goods',
                estimatedQuantity: Number(r.estimatedQuantity) || 1,
                unit: r.unit || 'Units',
                estimatedUnitCost: Number(r.estimatedUnitCost) || 0,
                priority: r.priority || 'medium',
                quarter: 1
              }));
              setValue('items', newItems, { shouldValidate: true });
            }
          })
          .catch(err => console.error('Failed to fetch MPP details', err));
      }
    }
  }, [id, watchMasterPlanId, watchCycleYearNumber, setValue, allMasterPlans, currentYear]);

  const totalBudget = watchItems.reduce((sum, item) => {
    return sum + (Number(item?.estimatedQuantity || 0) * Number(item?.estimatedUnitCost || 0));
  }, 0);

  const selectedPlan = allMasterPlans.find(m => m._id === watchMasterPlanId);
  const isPlanApproved = selectedPlan && ['active', 'council_approved', 'vc_approved', 'bursar_approved'].includes(selectedPlan.status);

  const onSave = async (data, submitAfter = false) => {
    setSaving(true);
    try {
      const items = (data.items || []).map(i => ({
        ...i,
        estimatedTotalCost: Number(i.estimatedQuantity || 1) * Number(i.estimatedUnitCost || 0),
        estimatedQuantity: Number(i.estimatedQuantity || 1),
        estimatedUnitCost: Number(i.estimatedUnitCost || 0),
        quarter: Number(i.quarter || 1),
      }));
      const payload = {
        ...data,
        items,
        status: submitAfter ? (isPlanApproved ? 'active' : 'submitted') : 'draft',
      };

      if (id) {
        await planningService.updateAnnualPlan(id, payload);
        toast.success('Annual Procurement Plan updated');
      } else {
        const res = await planningService.createAnnualPlan(payload);
        const newPlan = res.data?.data || res.data;
        toast.success(isPlanApproved ? 'Annual Procurement Plan created (Active)' : 'Annual Procurement Plan created');
        if (submitAfter && !isPlanApproved && newPlan?._id) {
          await planningService.submitAnnualPlan(newPlan._id);
        }
      }
      navigate('/planning/annual-plans');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to save Annual Plan');
    } finally {
      setSaving(false);
    }
  };

  const fmtCurrency = (n) => `LKR ${Number(n).toLocaleString()}`;

  if (fetching) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <FaSpinner className="animate-spin text-2xl text-blue-600" />
        <p className="text-sm">Loading annual plan…</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <FaCalendarAlt className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Annual Procurement Plan</h1>
          <p className="text-sm text-slate-500">Phase 2 · Derived from approved 3-Year Master Plan or Final Master Plan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => onSave(d, false))} className="space-y-6">
        {/* Plan Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Plan Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Parent Master Plan *</label>
              <select {...register('masterPlanId', { required: 'Select a master plan' })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Select Master Plan —</option>
                {masterPlans.length > 0 && (
                  <optgroup label="3-Year Master Procurement Plans (MPP)">
                    {masterPlans.map(m => (
                      <option key={m._id} value={m._id}>{m.referenceNumber} — {m.title} ({m.status === 'active' ? 'Active' : m.status})</option>
                    ))}
                  </optgroup>
                )}
                {finalMasterPlans.length > 0 && (
                  <optgroup label="Final Master Plans (Compiled Drafts)">
                    {finalMasterPlans.map(f => (
                      <option key={f._id} value={f._id}>{f.referenceNumber} — {f.title} ({f.status === 'active' ? 'Active' : f.status})</option>
                    ))}
                  </optgroup>
                )}
                {allMasterPlans.length === 0 && (
                  <option value="" disabled>No Master Plans found. Please create a Master Plan first.</option>
                )}
              </select>
              {errors.masterPlanId && <p className="text-red-500 text-xs mt-1">{errors.masterPlanId.message}</p>}
              {isPlanApproved && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Selected {selectedPlan.planType === 'fmp' ? 'Final Master Plan' : '3-Year Master Plan'} is Approved ({selectedPlan.referenceNumber}). Derived Annual Plans are automatically Active and do not require re-approval.
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
              <input {...register('title', { required: 'Title required' })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Annual Procurement Plan 2027 — Faculty of Applied Sciences" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Plan Year *</label>
              <input type="number" {...register('planYear', { required: true, valueAsNumber: true })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cycle Year Number</label>
              <select {...register('cycleYearNumber', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
              <textarea {...register('description')} rows={2}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Annual plan scope and objectives…" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-semibold text-slate-800">Procurement Items (from Master Plan)</h2>
              <p className="text-xs text-slate-400 mt-0.5">Total: <strong className="text-blue-700">{fmtCurrency(totalBudget)}</strong></p>
            </div>
            <button type="button" onClick={() => append({
              description: '', faculty: '', category: 'Goods', estimatedQuantity: 1,
              unit: 'Units', estimatedUnitCost: 0, quarter: 1, priority: 'medium', department: '',
              dappNumber: '',
            })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors">
              <FaPlus size={10} /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const qty = Number(watchItems[index]?.estimatedQuantity || 0);
              const unitCost = Number(watchItems[index]?.estimatedUnitCost || 0);
              const lineTotal = qty * unitCost;
              const selectedFaculty = watchItems[index]?.faculty || field.faculty;
              const deptOptions = DEPARTMENTS_BY_FACULTY[selectedFaculty] || ALL_DEPARTMENTS;

              return (
                <div key={field.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Item {index + 1}</span>
                    <div className="flex items-center gap-3">
                      {lineTotal > 0 && <span className="text-xs font-bold text-slate-700">= {fmtCurrency(lineTotal)}</span>}
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 transition-colors">
                          <FaTrash size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Description *</label>
                      <input {...register(`items.${index}.description`, { required: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Item description" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">DAPP Number</label>
                      <input {...register(`items.${index}.dappNumber`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="e.g. UWU/DAPP/2026/001" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Faculty / Division</label>
                      <select {...register(`items.${index}.faculty`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                        <option value="">Select Faculty / Division</option>
                        {DEPARTMENTS_AND_FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
                      <select {...register(`items.${index}.department`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                        <option value="">Select Department</option>
                        {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                      <select {...register(`items.${index}.category`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Qty</label>
                      <input type="number" {...register(`items.${index}.estimatedQuantity`, { valueAsNumber: true, min: 1 })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Unit</label>
                      <input {...register(`items.${index}.unit`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Unit Cost (LKR)</label>
                      <input type="number" {...register(`items.${index}.estimatedUnitCost`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Quarter</label>
                      <select {...register(`items.${index}.quarter`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {QUARTERS.map(q => <option key={q} value={q}>Q{q}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                      <select {...register(`items.${index}.priority`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Budget Summary */}
          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-800">Total Budget Request</span>
            <span className="text-xl font-bold text-blue-700">{fmtCurrency(totalBudget)}</span>
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-all disabled:opacity-60">
            <FaPaperPlane size={13} /> Save & Submit for Dean Review
          </button>
        </div>
      </form>
    </div>
  );
}
