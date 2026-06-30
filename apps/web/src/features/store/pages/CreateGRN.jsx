import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaSave, FaTruck } from 'react-icons/fa';
import inventoryService from '../../../services/inventory.service';
import procurementService from '../../../services/procurement.service';

const INSPECTION_STATUSES = ['pending', 'passed', 'partially_passed', 'failed'];

export default function CreateGRN() {

  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [procurements, setProcurements] = useState([]);

  useEffect(() => {
    procurementService.getAll({ status: 'delivery', limit: 50 })
      .then(res => setProcurements(res.data?.data || res.data || []))
      .catch(() => {});
  }, []);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      procurementId: '',
      supplierName: '',
      supplierInvoiceNumber: '',
      supplierDeliveryNoteNumber: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      storeLocation: '',
      overallInspectionStatus: 'pending_inspection',
      inspectionNotes: '',
      items: [{ description: '', unit: 'Units', orderedQuantity: 1, receivedQuantity: 1, rejectedQuantity: 0, unitCost: '', inspectionStatus: 'pending', rejectionReason: '' }],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = useWatch({ control, name: 'items' });

  const totalValue = watchItems.reduce((sum, i) => sum + (Number(i.receivedQuantity || 0) * Number(i.unitCost || 0)), 0);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const items = data.items.map(i => ({
        ...i,
        orderedQuantity: Number(i.orderedQuantity),
        receivedQuantity: Number(i.receivedQuantity),
        rejectedQuantity: Number(i.rejectedQuantity || 0),
        unitCost: Number(i.unitCost || 0),
      }));
      const payload = { ...data, items };
      const res = await inventoryService.createGRN(payload);
      const newId = res.data?.data?._id || res.data?._id;
      toast.success('GRN created successfully!');
      navigate(newId ? `/store/grn/${newId}` : '/store');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create GRN');
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => append({ description: '', unit: 'Units', orderedQuantity: 1, receivedQuantity: 1, rejectedQuantity: 0, unitCost: '', inspectionStatus: 'pending', rejectionReason: '' });

  const fmtCurrency = (n) => `LKR ${Number(n).toLocaleString()}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
          <FaTruck className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Goods Receipt Note (GRN)</h1>
          <p className="text-sm text-slate-500">Phase 7 · Record supplier delivery and goods inspection</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Delivery Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Delivery Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Linked Procurement</label>
              <select {...register('procurementId')}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">— Select Procurement (optional) —</option>
                {procurements.map(p => (
                  <option key={p._id} value={p._id}>{p.referenceNumber} — {p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Supplier Name *</label>
              <input {...register('supplierName', { required: 'Required' })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Supplier company name" />
              {errors.supplierName && <p className="text-red-500 text-xs mt-1">{errors.supplierName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Supplier Invoice No.</label>
              <input {...register('supplierInvoiceNumber')}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. INV-2026-00124" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Delivery Note No.</label>
              <input {...register('supplierDeliveryNoteNumber')}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. DN-2026-00088" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Delivery Date *</label>
              <input type="date" {...register('deliveryDate', { required: true })}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Store Location</label>
              <input {...register('storeLocation')}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Warehouse A, Bay 3" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Overall Inspection Status</label>
              <select {...register('overallInspectionStatus')}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="pending_inspection">Pending Inspection</option>
                <option value="passed">Passed</option>
                <option value="partially_passed">Partially Passed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Inspection Notes</label>
              <input {...register('inspectionNotes')}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Any inspection observations…" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-semibold text-slate-800">Received Items</h2>
              <p className="text-xs text-slate-400 mt-0.5">Total Value: <strong className="text-teal-700">{fmtCurrency(totalValue)}</strong></p>
            </div>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-100">
              <FaPlus size={10} /> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const received = Number(watchItems[index]?.receivedQuantity || 0);
              const unitCost = Number(watchItems[index]?.unitCost || 0);
              const lineTotal = received * unitCost;
              const inspStatus = watchItems[index]?.inspectionStatus;
              return (
                <div key={field.id} className={`border rounded-xl p-4 space-y-3 ${inspStatus === 'passed' ? 'border-emerald-200 bg-emerald-50/30' : inspStatus === 'failed' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">Item {index + 1}</span>
                    <div className="flex items-center gap-3">
                      {lineTotal > 0 && <span className="text-xs font-bold text-slate-700">= {fmtCurrency(lineTotal)}</span>}
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                          <FaTrash size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Description *</label>
                      <input {...register(`items.${index}.description`, { required: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="Item description" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Unit</label>
                      <input {...register(`items.${index}.unit`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Ordered Qty</label>
                      <input type="number" {...register(`items.${index}.orderedQuantity`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Received Qty</label>
                      <input type="number" {...register(`items.${index}.receivedQuantity`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Rejected Qty</label>
                      <input type="number" {...register(`items.${index}.rejectedQuantity`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Unit Cost (LKR)</label>
                      <input type="number" {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Inspection</label>
                      <select {...register(`items.${index}.inspectionStatus`)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400">
                        {INSPECTION_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    {watchItems[index]?.inspectionStatus === 'failed' && (
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Rejection Reason</label>
                        <input {...register(`items.${index}.rejectionReason`)}
                          className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                          placeholder="Reason for rejection" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-teal-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-teal-800">Total Received Value</span>
            <span className="text-xl font-bold text-teal-700">{fmtCurrency(totalValue)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button type="button" onClick={() => navigate('/store')}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 disabled:opacity-60">
            <FaSave size={13} /> {saving ? 'Saving…' : 'Create GRN'}
          </button>
        </div>
      </form>
    </div>
  );
}
