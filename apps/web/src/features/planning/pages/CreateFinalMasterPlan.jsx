import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaSpinner, FaSave, FaPaperPlane, FaCheckCircle,
  FaMoneyBillWave, FaArrowLeft, FaClipboardCheck
} from 'react-icons/fa';
import planningService from '../../../services/planning.service';

export default function CreateFinalMasterPlan() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvedItems, setApprovedItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [planYear, setPlanYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await planningService.getApprovedDraftItems();
        if (cancelled) return;
        const data = res?.data?.data || res?.data || [];
        setApprovedItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        toast.error('Failed to load approved draft items');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const toggleItem = (id) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedItemIds.length === approvedItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(approvedItems.map(i => i._id));
    }
  };

  const selectedTotal = approvedItems
    .filter(i => selectedItemIds.includes(i._id))
    .reduce((sum, i) => sum + (i.estimatedTotalCost || 0), 0);

  const handleCreate = async (andSubmit = false) => {
    if (!title.trim()) {
      toast.warning('Please enter a plan title');
      return;
    }
    if (selectedItemIds.length === 0) {
      toast.warning('Please select at least one approved item to include');
      return;
    }

    setSaving(true);
    try {
      // 1. Create the plan
      const createRes = await planningService.createFinalMasterPlan({
        title,
        description,
        planYear,
      });
      const plan = createRes?.data?.data || createRes?.data;
      if (!plan?._id) throw new Error('Failed to create plan');

      // 2. Add items to the plan
      await planningService.addItemsToFinalPlan(plan._id, selectedItemIds);

      // 3. Submit if requested
      if (andSubmit) {
        await planningService.submitFinalMasterPlan(plan._id);
        toast.success('Final Master Plan created and submitted for HOD review!');
      } else {
        toast.success('Final Master Plan created as draft!');
      }

      navigate(`/planning/final-master-plans/${plan._id}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to create Final Master Plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <FaSpinner className="text-4xl text-emerald-600 animate-spin" />
        <p className="text-slate-600 font-semibold">Loading approved draft items...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-linear-to-br from-slate-900 via-slate-800 to-emerald-900 text-white shadow-xl">
        <div className="relative z-10">
          <button
            onClick={() => navigate('/planning/final-master-plans')}
            className="flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold mb-3 transition-colors cursor-pointer"
          >
            <FaArrowLeft /> Back to Final Master Plans
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-extrabold text-[11px] uppercase tracking-wider rounded-full">
              New Plan
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Create Final Master Plan</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Select approved draft procurement items to compile into a Final Master Plan. The plan will then go through the 6-stage approval workflow.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FaClipboardCheck className="text-emerald-600" /> Plan Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Plan Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Final Master Procurement Plan 2026 — Faculty of Applied Sciences"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Plan Year</label>
            <input
              type="number"
              value={planYear}
              onChange={(e) => setPlanYear(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of this Final Master Plan..."
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
      </div>

      {/* Approved Items Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FaCheckCircle className="text-emerald-600" /> Select Approved Draft Items
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These items have been approved by both HOD and Dean. Select items to include in this Final Master Plan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200">
              {selectedItemIds.length} of {approvedItems.length} Selected
            </span>
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
              <FaMoneyBillWave className="text-emerald-500" />
              <span>LKR {selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {approvedItems.length === 0 ? (
          <div className="p-16 text-center">
            <FaCheckCircle className="text-5xl text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Approved Draft Items Available</h3>
            <p className="text-sm text-slate-500 mt-1">
              Draft items must be approved by both HOD and Dean before they can be included in a Final Master Plan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr className="font-bold text-slate-700">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.length === approvedItems.length && approvedItems.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3">Item Code</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Faculty</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Unit Cost</th>
                  <th className="px-3 py-3 text-right">Total Cost</th>
                  <th className="px-3 py-3">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {approvedItems.map(item => {
                  const isSelected = selectedItemIds.includes(item._id);
                  return (
                    <tr
                      key={item._id}
                      onClick={() => toggleItem(item._id)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item._id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">{item.itemCode}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800 max-w-xs truncate">{item.description}</td>
                      <td className="px-3 py-3 text-slate-600">{item.department}</td>
                      <td className="px-3 py-3 text-slate-600 text-[11px]">{item.faculty}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.category === 'Goods' ? 'bg-emerald-100 text-emerald-800' :
                          item.category === 'Services' ? 'bg-sky-100 text-sky-800' :
                          item.category === 'Works' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{item.estimatedQuantity}</td>
                      <td className="px-3 py-3 text-right font-mono">{(item.estimatedUnitCost || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-800">
                        {(item.estimatedTotalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          (item.priority || '').toLowerCase() === 'critical' ? 'bg-rose-100 text-rose-800' :
                          (item.priority || '').toLowerCase() === 'high' ? 'bg-amber-100 text-amber-800' :
                          (item.priority || '').toLowerCase() === 'medium' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center justify-between">
        <button
          onClick={() => navigate('/planning/final-master-plans')}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleCreate(false)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <FaSave /> <span>{saving ? 'Saving...' : 'Save as Draft'}</span>
          </button>
          <button
            onClick={() => handleCreate(true)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-900/40 cursor-pointer disabled:opacity-50"
          >
            <FaPaperPlane /> <span>{saving ? 'Submitting...' : 'Save & Submit for Approval'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
