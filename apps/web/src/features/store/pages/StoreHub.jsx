import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FaBoxOpen, FaPlus, FaSearch, FaWarehouse, FaExclamationTriangle, FaCheckCircle,
  FaTruck, FaArrowRight, FaClipboardCheck, FaHistory, FaSlidersH, FaTimes
} from 'react-icons/fa';
import inventoryService from '../../../services/inventory.service';

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  low_stock: 'bg-amber-100 text-amber-700 border-amber-200',
  out_of_stock: 'bg-red-100 text-red-700 border-red-200',
  discontinued: 'bg-slate-100 text-slate-500 border-slate-200',
  inventory_updated: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending_inspection: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const fmtCurrency = (n) => n ? `LKR ${Number(n).toLocaleString()}` : '—';
const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
  };
  return (
    <div className={`rounded-2xl border p-5 flex items-start gap-4 ${colors[color]}`}>
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs">
        <Icon size={18} className={`text-${color}-600`} />
      </div>
      <div>
        <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function StoreHub() {
  const { user } = useSelector(s => s.auth);
  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
  const [items, setItems] = useState([]);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals state
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);

  // Form states
  const [newItem, setNewItem] = useState({
    description: '',
    category: 'Lab',
    unit: 'Units',
    quantityOnHand: 0,
    minimumStockLevel: 2,
    unitCost: '',
    location: 'Main Store Room A',
    binNumber: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    type: 'adjustment',
    reason: '',
  });

  const isStoreManager = ['store_manager', 'admin', 'super_admin'].includes(user?.role);

  const fetchStoreData = () => {
    return Promise.all([
      inventoryService.getInventoryStats(),
      inventoryService.getInventory({ limit: 50 }),
      inventoryService.getGRNs({ limit: 5 }),
    ]).then(([statsRes, itemsRes, grnRes]) => {
      setStats(statsRes.data?.data || statsRes.data || { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
      setItems(itemsRes.data?.data || itemsRes.data || []);
      setGrns(grnRes.data?.data || grnRes.data || []);
    }).catch(() => {
      toast.error('Failed to load store data');
    }).finally(() => setLoading(false));
  };

  const reloadData = (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    fetchStoreData();
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await inventoryService.createItem({
        ...newItem,
        quantityOnHand: Number(newItem.quantityOnHand),
        minimumStockLevel: Number(newItem.minimumStockLevel),
        unitCost: Number(newItem.unitCost || 0),
      });
      toast.success('New inventory item added successfully!');
      setAddItemModalOpen(false);
      setNewItem({ description: '', category: 'Lab', unit: 'Units', quantityOnHand: 0, minimumStockLevel: 2, unitCost: '', location: 'Main Store Room A', binNumber: '' });
      reloadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add item');
    }
  };

  const handleOpenAdjust = (item) => {
    setSelectedItem(item);
    setAdjustForm({ quantity: 0, type: 'adjustment', reason: '' });
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await inventoryService.adjustStock(selectedItem._id, adjustForm);
      toast.success('Stock quantity adjusted!');
      setAdjustModalOpen(false);
      reloadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const handleOpenHistory = async (item) => {
    setSelectedItem(item);
    setHistoryModalOpen(true);
    setHistoryLogs([]);
    try {
      const res = await inventoryService.getItemHistory(item._id);
      setHistoryLogs(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to fetch item history');
    }
  };

  const categories = ['all', 'Goods', 'Equipment', 'Consumables', 'Furniture', 'IT', 'Lab', 'Other'];

  const filtered = items.filter(item => {
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchSearch = !search || item.description?.toLowerCase().includes(search.toLowerCase()) || item.itemCode?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store & Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1">Phases 7 & 8 · Goods Receipt · Technical Inspection · Department Distribution</p>
        </div>
        <div className="flex gap-2">
          {isStoreManager && (
            <button
              onClick={() => setAddItemModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-all shadow-xs"
            >
              <FaPlus size={12} /> Add Item
            </button>
          )}
          {isStoreManager && (
            <Link to="/store/grn/new" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 transition-all shadow-xs">
              <FaPlus size={12} /> New GRN
            </Link>
          )}
          <Link to="/store/issue" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-600 transition-all shadow-xs">
            <FaArrowRight size={12} /> Issue Items
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FaBoxOpen} label="Total Items" value={loading ? '—' : stats.totalItems} sub="In store catalog" color="emerald" />
        <StatCard icon={FaExclamationTriangle} label="Low Stock" value={loading ? '—' : stats.lowStock} sub="Below min threshold" color="amber" />
        <StatCard icon={FaWarehouse} label="Out of Stock" value={loading ? '—' : stats.outOfStock} sub="Requires reorder" color="red" />
        <StatCard icon={FaCheckCircle} label="Stock Valuation" value={loading ? '—' : fmtCurrency(stats.totalValue)} sub="Current total value" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item description or code…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Store Stock Catalog</h2>
              <span className="text-xs text-slate-400 font-semibold">{filtered.length} items registered</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-400">Loading inventory data…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500 font-semibold">
                      <th className="text-left px-6 py-3">Item Details</th>
                      <th className="text-left px-3 py-3">Category</th>
                      <th className="text-center px-3 py-3">In Stock</th>
                      <th className="text-right px-3 py-3">Unit Cost</th>
                      <th className="text-left px-3 py-3">Status</th>
                      <th className="text-right px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(item => (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-semibold text-slate-800">{item.description}</p>
                          <p className="text-xs text-teal-700 font-mono">{item.itemCode || 'UWU/STK/—'}</p>
                        </td>
                        <td className="px-3 py-3.5 text-xs text-slate-500">{item.category}</td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={`font-bold text-sm ${item.quantityOnHand === 0 ? 'text-red-600' : item.status === 'low_stock' ? 'text-amber-600' : 'text-slate-800'}`}>
                            {item.quantityOnHand}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                        </td>
                        <td className="px-3 py-3.5 text-right text-sm font-semibold text-slate-700">{fmtCurrency(item.unitCost)}</td>
                        <td className="px-3 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-500'}`}>
                            {fmtStatus(item.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isStoreManager && (
                              <button
                                onClick={() => handleOpenAdjust(item)}
                                title="Adjust Stock Quantity"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-xs font-semibold"
                              >
                                <FaSlidersH size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenHistory(item)}
                              title="View Transaction Audit Ledger"
                              className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition-colors text-xs font-semibold"
                            >
                              <FaHistory size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Recent GRNs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2"><FaTruck className="text-teal-600" /> Recent GRNs</h2>
              <Link to="/store/grn" className="text-xs text-teal-600 font-semibold hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {grns.map(grn => (
                <div key={grn._id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-mono font-bold text-teal-700">{grn.grnNumber}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{grn.supplierName}</p>
                      <p className="text-xs text-slate-400">{grn.deliveryDate ? new Date(grn.deliveryDate).toLocaleDateString() : '—'}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[grn.status] || 'bg-slate-100 text-slate-500'}`}>
                      {fmtStatus(grn.status)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-2">{fmtCurrency(grn.totalReceivedValue)}</p>
                </div>
              ))}
              {grns.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm">No GRNs recorded yet.</div>}
            </div>
          </div>

          {/* Phase 7-8 Workflow Tracker */}
          <div className="bg-linear-to-br from-slate-900 to-teal-950 rounded-2xl p-5 text-white shadow-md">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">Phase 7–8 Workflow Lifecycle</h3>
            <div className="space-y-2">
              {[
                { step: 'Supplier Delivers Goods', done: true },
                { step: 'Supplies Division Receives', done: true },
                { step: 'Store GRN Created', done: true },
                { step: 'Goods Inspection Conducted', done: grns.some(g => g.status === 'accepted' || g.status === 'inventory_updated') },
                { step: 'Store Inventory Updated', done: grns.some(g => g.status === 'inventory_updated') },
                { step: 'Department Requests Issuance', done: true },
                { step: 'Store Issues Items to Dept.', done: true },
                { step: 'Department Confirms Receipt', done: true },
                { step: '✅ Procurement Completed (Step 45)', done: true },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-2.5 text-xs ${s.done ? 'text-teal-300 font-semibold' : 'text-slate-500'}`}>
                  <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] ${s.done ? 'bg-teal-400 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  {s.step}
                </div>
              ))}
            </div>
          </div>

          {/* Procurement Completion Status Tracker */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm mb-3">
              <FaClipboardCheck className="text-emerald-600" /> Completion Tracker
            </h3>
            <p className="text-xs text-slate-500 mb-3">Steps 37–45 completion milestones</p>
            <div className="space-y-2">
              {[
                { label: 'Delivered', step: 37, key: 'delivered' },
                { label: 'GRN Created', step: 38, key: 'grn_created' },
                { label: 'Inspected', step: 40, key: 'inspected' },
                { label: 'Stocked', step: 41, key: 'stocked' },
                { label: 'Issued', step: 43, key: 'issued' },
                { label: 'Received by Dept.', step: 44, key: 'received' },
                { label: 'Completed', step: 45, key: 'completed' },
              ].map((milestone) => {
                const count = grns.length;
                return (
                  <div key={milestone.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 w-6">#{milestone.step}</span>
                      <span className="font-medium text-slate-700">{milestone.label}</span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Add New Inventory Item */}
      {addItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add New Stock Item</h3>
              <button onClick={() => setAddItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <FaTimes size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Item Description *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. High Precision Centrifuge Machine"
                  value={newItem.description}
                  onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    placeholder="Units, Boxes, Sets..."
                    value={newItem.unit}
                    onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.quantityOnHand}
                    onChange={e => setNewItem(prev => ({ ...prev, quantityOnHand: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.minimumStockLevel}
                    onChange={e => setNewItem(prev => ({ ...prev, minimumStockLevel: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Cost (LKR)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newItem.unitCost}
                    onChange={e => setNewItem(prev => ({ ...prev, unitCost: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={e => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bin Number</label>
                  <input
                    type="text"
                    placeholder="e.g. B-05"
                    value={newItem.binNumber}
                    onChange={e => setNewItem(prev => ({ ...prev, binNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-500 shadow-xs"
                >
                  Create Stock Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adjust Stock Quantity */}
      {adjustModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Adjust Stock Quantity</h3>
                <p className="text-xs text-slate-500">{selectedItem.description}</p>
              </div>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <FaTimes size={16} />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-xs flex justify-between">
                <span>Current Quantity on Hand:</span>
                <span className="font-bold text-slate-800">{selectedItem.quantityOnHand} {selectedItem.unit}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Adjustment Quantity (+ to add, - to reduce) *</label>
                <input
                  required
                  type="number"
                  placeholder="e.g. +5 or -2"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Adjustment Reason *</label>
                <input
                  required
                  type="text"
                  placeholder="Audit discrepancy, damages, write-off, manual check..."
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-500 shadow-xs"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Stock Audit Ledger History */}
      {historyModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FaHistory className="text-teal-600" /> Stock Audit Ledger
                </h3>
                <p className="text-xs text-slate-500">{selectedItem.description} ({selectedItem.itemCode || 'UWU/STK/—'})</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {historyLogs.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">No transaction history recorded yet for this item.</p>
              ) : (
                historyLogs.map((tx, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold uppercase px-2 py-0.5 rounded-md text-[10px] ${tx.type === 'receipt' ? 'bg-emerald-100 text-emerald-800' : tx.type === 'issuance' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {tx.type}
                        </span>
                        <span className="font-semibold text-slate-800">{tx.reason || 'Transaction'}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1">
                        By: {tx.performedBy?.name || 'System User'} · {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${tx.quantity > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Prev: {tx.previousQty ?? '—'} → New: {tx.newQty ?? '—'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
