import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaArrowRight, FaCheck, FaPlus, FaTrash } from 'react-icons/fa';
import inventoryService from '../../../services/inventory.service';



const FACULTIES = [
  'Faculty of Applied Sciences', 'Faculty of Medicine', 'Faculty of Management Studies',
  'Faculty of Technology', 'ICT Centre', 'Library', 'Works Division', 'Administration',
];

function IssuanceCard({ issuance, onIssue, onConfirm, userRole }) {
  const isStoreManager = ['store_manager', 'admin', 'super_admin'].includes(userRole);
  const isDeptUser = ['department_head', 'department_user'].includes(userRole);

  const statusColors = {
    requested: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    issued: 'bg-teal-100 text-teal-700',
    received_by_department: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg inline-block">{issuance.issuanceNumber}</p>
          <p className="font-semibold text-slate-800 mt-1">{issuance.requestingDepartment}</p>
          <p className="text-xs text-slate-400">{issuance.requestingFaculty}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${statusColors[issuance.status] || 'bg-slate-100 text-slate-500'}`}>
          {issuance.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      <div className="space-y-1">
        {issuance.items?.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-700">{item.description}</span>
            <div className="text-right">
              <span className="font-semibold text-slate-800">{item.issuedQuantity} {item.unit}</span>
              {item.purpose && <p className="text-xs text-slate-400">{item.purpose}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        {isStoreManager && issuance.status === 'approved' && (
          <button onClick={() => onIssue(issuance._id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-500 transition-colors">
            <FaArrowRight size={10} /> Issue Items
          </button>
        )}
        {isDeptUser && issuance.status === 'issued' && (
          <button onClick={() => onConfirm(issuance._id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-colors">
            <FaCheck size={10} /> Confirm Receipt
          </button>
        )}
        {issuance.status === 'received_by_department' && (
          <div className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg">
            <FaCheck size={10} /> Procurement Completed
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
  const [form, setForm] = useState({
    requestingDepartment: user?.department || '',
    requestingFaculty: user?.faculty || '',
    items: [{ inventoryItemId: '', description: '', issuedQuantity: 1, unit: 'Units', purpose: '' }],
  });

  useEffect(() => {
    Promise.all([
      inventoryService.getIssuances({ limit: 30 }),
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
      toast.success('Receipt confirmed — Procurement Completed! 🎉');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const handleCreate = async () => {
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Item Issuance</h1>
          <p className="text-sm text-slate-500 mt-1">Phase 8 · Department requests → Store issues → Department confirms → Procurement Completed</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 transition-all shadow-sm">
          <FaPlus size={12} /> Request Issuance
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-6 space-y-5 animate-scale-in">
          <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">New Issuance Request</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department *</label>
              <input value={form.requestingDepartment} onChange={e => setForm(f => ({ ...f, requestingDepartment: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Department name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Faculty</label>
              <select value={form.requestingFaculty} onChange={e => setForm(f => ({ ...f, requestingFaculty: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500">
                {FACULTIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Items Requested</label>
              <button type="button" onClick={addItem} className="text-xs text-teal-600 font-semibold hover:underline"><FaPlus size={10} className="inline mr-1" />Add</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                <div className="sm:col-span-2">
                  <select value={item.inventoryItemId} onChange={e => {
                    const inv = inventory.find(v => v._id === e.target.value);
                    setForm(f => { const items = [...f.items]; items[i] = { ...items[i], inventoryItemId: e.target.value, description: inv?.description || '', unit: inv?.unit || 'Units' }; return { ...f, items }; });
                  }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400">
                    <option value="">— Select Item —</option>
                    {inventory.filter(v => v.quantityOnHand > 0).map(v => (
                      <option key={v._id} value={v._id}>{v.description} (Qty: {v.quantityOnHand})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input type="number" placeholder="Qty" value={item.issuedQuantity} min={1}
                    onChange={e => setForm(f => { const items = [...f.items]; items[i].issuedQuantity = e.target.value; return { ...f, items }; })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400" />
                </div>
                <div>
                  <input placeholder="Purpose" value={item.purpose}
                    onChange={e => setForm(f => { const items = [...f.items]; items[i].purpose = e.target.value; return { ...f, items }; })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400" />
                </div>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 py-2">
                    <FaTrash size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-500">Submit Request</button>
          </div>
        </div>
      )}

      {/* Kanban view */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { status: 'requested', label: 'Requested', color: 'amber' },
          { status: 'approved', label: 'Approved — Ready to Issue', color: 'blue' },
          { status: 'issued', label: 'Issued to Dept.', color: 'teal' },
          { status: 'received_by_department', label: '✅ Completed', color: 'emerald' },
        ].map(col => (
          <div key={col.status} className="space-y-3">
            <div className={`text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-xl bg-${col.color}-50 text-${col.color}-700`}>
              {col.label}
              <span className="ml-2 bg-white rounded-full px-1.5 py-0.5 text-xs">{byStatus(col.status).length}</span>
            </div>
            {loading ? (
              <div className="text-center text-slate-400 text-xs py-4">Loading…</div>
            ) : byStatus(col.status).length === 0 ? (
              <div className="text-center text-slate-300 text-xs py-4 bg-white rounded-xl border border-dashed border-slate-200">Empty</div>
            ) : byStatus(col.status).map(iss => (
              <IssuanceCard key={iss._id} issuance={iss} userRole={user?.role} onIssue={handleIssue} onConfirm={handleConfirm} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
