import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaSave, FaTruck, FaSearch, FaTimes } from 'react-icons/fa';
import inventoryService from '../../../services/inventory.service';
import procurementService from '../../../services/procurement.service';

const INSPECTION_STATUSES = ['pending', 'passed', 'partially_passed', 'failed'];

export default function CreateGRN() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [procurements, setProcurements] = useState([]);
  const [procurementSearch, setProcurementSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Fetch active procurements for searchable dropdown selection
    procurementService.getAll({ limit: 100 })
      .then(res => setProcurements(res.data?.data || res.data || []))
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      procurementId: '',
      supplierName: '',
      supplierInvoiceNumber: '',
      supplierDeliveryNoteNumber: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      storeLocation: 'Main Store Room A',
      overallInspectionStatus: 'passed',
      inspectionNotes: '',
      items: [{ description: '', unit: 'Units', orderedQuantity: 1, receivedQuantity: 1, rejectedQuantity: 0, unitCost: '', inspectionStatus: 'passed', rejectionReason: '' }],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = useWatch({ control, name: 'items' });

  const totalValue = (watchItems || []).reduce((sum, i) => sum + (Number(i?.receivedQuantity || 0) * Number(i?.unitCost || 0)), 0);

  const filteredProcurements = procurements.filter(p => {
    if (!procurementSearch.trim()) return true;
    const q = procurementSearch.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.referenceNumber?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.supplierName?.toLowerCase().includes(q) ||
      p.winningSupplier?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  const selectProcurement = (p) => {
    if (!p) {
      setSelectedProcurement(null);
      setValue('procurementId', '');
      setProcurementSearch('');
      setIsDropdownOpen(false);
      return;
    }

    setSelectedProcurement(p);
    setValue('procurementId', p._id);
    setProcurementSearch(`${p.referenceNumber || p.code || p._id} — ${p.title}`);
    setIsDropdownOpen(false);

    // Auto-fill supplier name
    const supplier = p.winningSupplier || p.supplierName || p.vendorName || p.selectedVendor?.name || p.vendor?.name || '';
    if (supplier) {
      setValue('supplierName', supplier);
    }

    // Auto-fill items list
    const sourceItems = p.items || p.lineItems || [];
    if (sourceItems.length > 0) {
      const formattedItems = sourceItems.map(item => ({
        description: item.description || item.itemDescription || item.title || item.name || '',
        unit: item.unit || 'Units',
        orderedQuantity: Number(item.quantity || item.orderedQuantity || item.qty || 1),
        receivedQuantity: Number(item.quantity || item.receivedQuantity || item.qty || 1),
        rejectedQuantity: 0,
        unitCost: Number(item.estimatedUnitPrice || item.unitPrice || item.unitCost || item.price || 0),
        inspectionStatus: 'passed',
        rejectionReason: ''
      }));
      setValue('items', formattedItems);
      toast.success(`Auto-loaded ${formattedItems.length} item(s) from ${p.referenceNumber || p.title}`);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const items = (data.items || []).map(i => ({
        ...i,
        orderedQuantity: Number(i.orderedQuantity || 1),
        receivedQuantity: Number(i.receivedQuantity || 1),
        rejectedQuantity: Number(i.rejectedQuantity || 0),
        unitCost: Number(i.unitCost || 0),
      }));

      const payload = {
        ...data,
        procurementId: data.procurementId || undefined,
        items
      };

      await inventoryService.createGRN(payload);
      toast.success('Goods Receipt Note created successfully!');
      navigate('/store');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create GRN');
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => append({
    description: '',
    unit: 'Units',
    orderedQuantity: 1,
    receivedQuantity: 1,
    rejectedQuantity: 0,
    unitCost: '',
    inspectionStatus: 'passed',
    rejectionReason: ''
  });

  const fmtCurrency = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      {/* Page Title & Top Actions */}
      <div className="relative overflow-hidden bg-[#0d1527] rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none text-emerald-500"> 
          <FaTruck size={160} /> 
        </div>

        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Create Goods Receipt Note
          </h1>
        </div>

        <div className="relative z-10 flex items-center space-x-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/store')}
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/60 shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>Back to Store</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Delivery Info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Delivery & Inspection Details</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/50">
              Goods Receipt Form
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Searchable Linked Procurement Component */}
            <div className="relative" ref={dropdownRef}>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Linked Procurement</span>
                {selectedProcurement && (
                  <button
                    type="button"
                    onClick={() => selectProcurement(null)}
                    className="text-xs text-red-500 hover:text-red-700 font-normal cursor-pointer"
                  >
                    Clear selection
                  </button>
                )}
              </label>

              <div className="relative">
                <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" size={13} />
                <input
                  type="text"
                  value={procurementSearch}
                  onChange={(e) => {
                    setProcurementSearch(e.target.value);
                    setIsDropdownOpen(true);
                    if (!e.target.value) {
                      setValue('procurementId', '');
                      setSelectedProcurement(null);
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Type to search procurement title, ref no..."
                  className="w-full pl-10 pr-9 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white"
                />

                {procurementSearch && (
                  <button
                    type="button"
                    onClick={() => selectProcurement(null)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <FaTimes size={13} />
                  </button>
                )}
              </div>

              {/* Dropdown Menu Results */}
              {isDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 divide-y divide-slate-100">
                  {filteredProcurements.length > 0 ? (
                    filteredProcurements.map((p) => (
                      <div
                        key={p._id}
                        onClick={() => selectProcurement(p)}
                        className={`p-3 hover:bg-emerald-50/60 cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                          selectedProcurement?._id === p._id ? 'bg-emerald-50/80 border-l-4 border-emerald-500' : ''
                        }`}
                      >
                        <div>
                          <p className="text-xs font-mono font-bold text-slate-800">
                            {p.referenceNumber || p.code || p._id}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{p.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            {p.category && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                                {p.category}
                              </span>
                            )}
                            {(p.winningSupplier || p.supplierName) && (
                              <span className="text-emerald-700 font-medium">
                                Supplier: {p.winningSupplier || p.supplierName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            {(p.items || p.lineItems || []).length} Items
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No matching procurements found. You can enter details manually below.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supplier Name *</label>
              <input
                {...register('supplierName', { required: 'Supplier name is required' })}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="Supplier company name"
              />
              {errors.supplierName && <p className="text-red-500 text-xs mt-1">{errors.supplierName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supplier Invoice No.</label>
              <input
                {...register('supplierInvoiceNumber')}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="e.g. INV-2026-00124"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Delivery Note No.</label>
              <input
                {...register('supplierDeliveryNoteNumber')}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="e.g. DN-2026-00088"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Delivery Date *</label>
              <input
                type="date"
                {...register('deliveryDate', { required: true })}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Store Location</label>
              <input
                {...register('storeLocation')}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="e.g. Main Store Room A, Bay 3"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Overall Inspection Status</label>
              <select
                {...register('overallInspectionStatus')}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white"
              >
                <option value="passed">Passed - Verified Good Condition</option>
                <option value="partially_passed">Partially Passed - Accepted with Variance</option>
                <option value="pending_inspection">Pending Inspection</option>
                <option value="failed">Failed - Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Inspection Notes</label>
              <input
                {...register('inspectionNotes')}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                placeholder="Inspection observations or quality remarks…"
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-base text-slate-800">Received Line Items</h2>
              <p className="text-xs text-slate-500 mt-0.5">Total Value: <strong className="text-emerald-700 font-mono text-sm">{fmtCurrency(totalValue)}</strong></p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <FaPlus size={10} />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const received = Number(watchItems?.[index]?.receivedQuantity || 0);
              const unitCost = Number(watchItems?.[index]?.unitCost || 0);
              const lineTotal = received * unitCost;
              const inspStatus = watchItems?.[index]?.inspectionStatus;

              return (
                <div
                  key={field.id}
                  className={`border rounded-xl p-4 space-y-3 transition-all ${
                    inspStatus === 'passed'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : inspStatus === 'failed'
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                      Item #{index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      {lineTotal > 0 && (
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          Line Total: {fmtCurrency(lineTotal)}
                        </span>
                      )}
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Item Description *</label>
                      <input
                        {...register(`items.${index}.description`, { required: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                        placeholder="e.g. Dell Latitude Laptops / Lab Reagent A"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Unit of Measure</label>
                      <input
                        {...register(`items.${index}.unit`)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                        placeholder="Units / Boxes / Packs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Ordered Qty</label>
                      <input
                        type="number"
                        {...register(`items.${index}.orderedQuantity`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Received Qty *</label>
                      <input
                        type="number"
                        {...register(`items.${index}.receivedQuantity`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Rejected Qty</label>
                      <input
                        type="number"
                        {...register(`items.${index}.rejectedQuantity`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Cost (LKR)</label>
                      <input
                        type="number"
                        {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Item Inspection</label>
                      <select
                        {...register(`items.${index}.inspectionStatus`)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                      >
                        {INSPECTION_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {watchItems?.[index]?.inspectionStatus === 'failed' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Rejection Reason</label>
                        <input
                          {...register(`items.${index}.rejectionReason`)}
                          className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                          placeholder="State exact reason for rejection..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-[#0d1527] text-white rounded-xl p-4 flex items-center justify-between shadow-md">
            <span className="text-xs sm:text-sm font-semibold text-slate-300">Total GRN Received Valuation</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">{fmtCurrency(totalValue)}</span>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/store')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-60 cursor-pointer"
          >
            <FaSave size={13} />
            <span>{saving ? 'Creating GRN...' : 'Create Goods Receipt Note'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
