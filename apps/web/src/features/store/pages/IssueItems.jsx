import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowRight, FaCheck, FaPlus, FaTrash, FaBoxes, FaSearch, FaTimes } from 'react-icons/fa';
import inventoryService from '../../../services/inventory.service';
import { DEPARTMENTS_AND_FACULTIES, DEPARTMENTS_BY_FACULTY } from '../../../constants/departments';

function InventoryItemPicker({ itemIndex, currentItemId, currentDescription, inventory, onSelect }) {
  const [prevDescription, setPrevDescription] = useState(currentDescription);
  const [search, setSearch] = useState(currentDescription || '');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  if (currentDescription !== prevDescription) {
    setPrevDescription(currentDescription);
    setSearch(currentDescription || '');
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableItems = inventory.filter(v => v.quantityOnHand > 0);

  const filtered = availableItems.filter(v => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.description?.toLowerCase().includes(q) ||
      v.itemCode?.toLowerCase().includes(q) ||
      v.category?.toLowerCase().includes(q) ||
      v.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">Select Inventory Item (Searchable) *</label>
      <div className="relative">
        <FaSearch className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={12} />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (!e.target.value) {
              onSelect(itemIndex, null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type to search item name, code..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white font-medium"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              onSelect(itemIndex, null);
            }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <FaTimes size={12} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((inv) => (
              <div
                key={inv._id}
                onClick={() => {
                  onSelect(itemIndex, inv);
                  setSearch(inv.description);
                  setIsOpen(false);
                }}
                className={`p-2.5 hover:bg-emerald-50/60 cursor-pointer text-xs transition-colors flex items-center justify-between gap-2 ${
                  currentItemId === inv._id ? 'bg-emerald-50 font-bold border-l-4 border-emerald-500' : ''
                }`}
              >
                <div>
                  <p className="font-bold text-slate-800">{inv.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Code: {inv.itemCode || inv._id} · Cat: {inv.category || 'General'}</p>
                </div>
                <span className="shrink-0 px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] border border-emerald-200/60">
                  Stock: {inv.quantityOnHand} {inv.unit || 'Units'}
                </span>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">
              No in-stock items found matching "{search}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssuanceCard({ issuance, onApprove, onIssue, onConfirm, userRole }) {
  const isStoreManager = ['store_manager', 'admin', 'super_admin'].includes(userRole);
  const isDeptUser = ['department_head', 'department_user'].includes(userRole);

  const statusColors = {
    requested: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    issued: 'bg-teal-100 text-teal-800 border-teal-200',
    received_by_department: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-200/50">
            {issuance.issuanceNumber || issuance._id}
          </p>
          <p className="font-bold text-slate-800 mt-1.5 text-sm">{issuance.requestingDepartment}</p>
          {issuance.requestingFaculty && (
            <p className="text-xs text-slate-500 font-medium">{issuance.requestingFaculty}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${statusColors[issuance.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {issuance.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      <div className="space-y-1.5">
        {issuance.items?.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
            <span className="text-slate-700 font-semibold">{item.description}</span>
            <div className="text-right">
              <span className="font-bold text-slate-900 font-mono">{item.issuedQuantity} {item.unit || 'Units'}</span>
              {item.purpose && <p className="text-[10px] text-slate-400">{item.purpose}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        {isStoreManager && issuance.status === 'requested' && (
          <button
            onClick={() => onApprove(issuance._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <FaCheck size={10} /> Approve Request
          </button>
        )}
        {isStoreManager && issuance.status === 'approved' && (
          <button
            onClick={() => onIssue(issuance._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <FaArrowRight size={10} /> Issue Items
          </button>
        )}
        {isDeptUser && issuance.status === 'issued' && (
          <button
            onClick={() => onConfirm(issuance._id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <FaCheck size={10} /> Confirm Receipt
          </button>
        )}
        {issuance.status === 'received_by_department' && (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
            <FaCheck size={10} /> Completed
          </div>
        )}
      </div>
    </div>
  );
}

export default function IssueItems() {
  const { user } = useSelector(s => s.auth);
  const [issuances, setIssuances] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const initialFaculty = user?.faculty && DEPARTMENTS_AND_FACULTIES.includes(user.faculty)
    ? user.faculty
    : 'Faculty of Applied Sciences';
  const availableDepts = DEPARTMENTS_BY_FACULTY[initialFaculty] || [];
  const initialDept = user?.department && availableDepts.includes(user.department)
    ? user.department
    : availableDepts[0] || '';

  const [form, setForm] = useState({
    requestingFaculty: initialFaculty,
    requestingDepartment: initialDept,
    items: [{ inventoryItemId: '', description: '', issuedQuantity: 1, unit: 'Units', purpose: '' }],
  });

  useEffect(() => {
    Promise.all([
      inventoryService.getIssuances({ limit: 50 }),
      inventoryService.getInventory({ limit: 100 }),
    ]).then(([issRes, invRes]) => {
      const issData = issRes.data?.data || issRes.data || [];
      setIssuances(issData);
      const invData = invRes.data?.data || invRes.data || [];
      setInventory(invData);
    }).catch(() => {
      setIssuances([]);
      setInventory([]);
      toast.error('Failed to load issuance data');
    })
      .finally(() => setLoading(false));
  }, []);

  const handleFacultyChange = (newFaculty) => {
    const depts = DEPARTMENTS_BY_FACULTY[newFaculty] || [];
    const firstDept = depts[0] || '';
    setForm(f => ({
      ...f,
      requestingFaculty: newFaculty,
      requestingDepartment: firstDept
    }));
  };

  const handleSelectInventoryItem = (index, invItem) => {
    setForm(f => {
      const items = [...f.items];
      if (!invItem) {
        items[index] = {
          ...items[index],
          inventoryItemId: '',
          description: '',
          unit: 'Units'
        };
      } else {
        items[index] = {
          ...items[index],
          inventoryItemId: invItem._id,
          description: invItem.description,
          unit: invItem.unit || 'Units'
        };
      }
      return { ...f, items };
    });
  };

  const handleExportCSV = () => {
    if (!issuances || issuances.length === 0) {
      toast.info('No issuance records to export.');
      return;
    }
    const headers = ['Issuance Number', 'Department', 'Faculty', 'Status', 'Items Count', 'Created Date'];
    const rows = issuances.map(iss => [
      iss.issuanceNumber || iss._id,
      `"${(iss.requestingDepartment || '').replace(/"/g, '""')}"`,
      `"${(iss.requestingFaculty || '').replace(/"/g, '""')}"`,
      iss.status || '',
      (iss.items || []).length,
      new Date(iss.createdAt || Date.now()).toLocaleDateString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `issuances_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Issuances exported to CSV');
  };

  const handleApprove = async (id) => {
    try {
      const res = await inventoryService.approveIssuance(id);
      const updated = res.data?.data || res.data;
      setIssuances(prev => prev.map(i => i._id === id ? (updated && updated._id === id ? updated : { ...i, status: 'approved' }) : i));
      toast.success('Issuance request approved!');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to approve request'); }
  };

  const handleIssue = async (id) => {
    try {
      const res = await inventoryService.issueItems(id);
      const updated = res.data?.data || res.data;
      setIssuances(prev => prev.map(i => i._id === id ? (updated && updated._id === id ? updated : { ...i, status: 'issued' }) : i));
      toast.success('Items issued to department!');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const handleConfirm = async (id) => {
    try {
      await inventoryService.confirmDeptReceipt(id);
      setIssuances(prev => prev.map(i => i._id === id ? { ...i, status: 'received_by_department' } : i));
      toast.success('Receipt confirmed — Procurement Completed!');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const handleCreate = async () => {
    if (!form.requestingDepartment) {
      toast.error('Please select a requesting department.');
      return;
    }
    const invalidItems = form.items.filter(i => !i.inventoryItemId || !i.issuedQuantity);
    if (invalidItems.length > 0) {
      toast.error('Please select an inventory item and enter a valid quantity for all requested rows.');
      return;
    }

    try {
      const items = form.items.map(i => ({ ...i, issuedQuantity: Number(i.issuedQuantity) }));
      const res = await inventoryService.createIssuance({ ...form, items });
      const newIss = res.data?.data || res.data;
      setIssuances(prev => [newIss, ...prev]);
      setShowForm(false);
      toast.success('Issuance request created!');
    } catch (err) { console.error(err); toast.error('Failed to create issuance'); }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { inventoryItemId: '', description: '', issuedQuantity: 1, unit: 'Units', purpose: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const byStatus = (status) => issuances.filter(i => i.status === status);

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      {/* Page Title & Top Actions */}
      <div className="relative overflow-hidden bg-[#0d1527] rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none text-emerald-500"> 
          <FaBoxes size={160} /> 
        </div>

        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Item Issuance & Distribution
          </h1>
        </div>

        <div className="relative z-10 flex items-center space-x-3 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/60 shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>Export CSV</span>
          </button>

          <Link
            to="/store"
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/60 shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>Back to Store</span>
          </Link>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <FaPlus size={12} />
            <span>Request Issuance</span>
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-6 space-y-5 animate-scale-in">
          <h2 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>New Issuance Request</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">Department Request</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Faculty / Division *</label>
              <select
                value={form.requestingFaculty}
                onChange={e => handleFacultyChange(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white"
              >
                {DEPARTMENTS_AND_FACULTIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department / Section *</label>
              <select
                value={form.requestingDepartment}
                onChange={e => setForm(f => ({ ...f, requestingDepartment: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white"
              >
                {(DEPARTMENTS_BY_FACULTY[form.requestingFaculty] || []).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="text-xs font-bold text-slate-700">Requested Items</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <FaPlus size={10} /> Add Item
              </button>
            </div>

            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="sm:col-span-2">
                  <InventoryItemPicker
                    itemIndex={i}
                    currentItemId={item.inventoryItemId}
                    currentDescription={item.description}
                    inventory={inventory}
                    onSelect={handleSelectInventoryItem}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Requested Qty</label>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.issuedQuantity}
                    min={1}
                    onChange={e => setForm(f => { const items = [...f.items]; items[i].issuedQuantity = e.target.value; return { ...f, items }; })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose / Notes</label>
                  <input
                    placeholder="e.g. Lab usage"
                    value={item.purpose}
                    onChange={e => setForm(f => { const items = [...f.items]; items[i].purpose = e.target.value; return { ...f, items }; })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                  />
                </div>
                <div className="flex items-center justify-end">
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <FaTrash size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { status: 'requested', label: 'Requested', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
          { status: 'approved', label: 'Approved — Ready to Issue', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
          { status: 'issued', label: 'Issued to Dept.', badge: 'bg-teal-100 text-teal-800 border-teal-200' },
          { status: 'received_by_department', label: 'Completed', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
        ].map(col => (
          <div key={col.status} className="space-y-3">
            <div className={`text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl border flex items-center justify-between ${col.badge}`}>
              <span>{col.label}</span>
              <span className="bg-white rounded-full px-2 py-0.5 text-xs font-mono font-black shadow-xs">
                {byStatus(col.status).length}
              </span>
            </div>

            {loading ? (
              <div className="text-center text-slate-400 text-xs py-6">Loading issuances…</div>
            ) : byStatus(col.status).length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                No items in this stage
              </div>
            ) : (
              byStatus(col.status).map(iss => (
                <IssuanceCard
                  key={iss._id}
                  issuance={iss}
                  userRole={user?.role}
                  onApprove={handleApprove}
                  onIssue={handleIssue}
                  onConfirm={handleConfirm}
                />
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
