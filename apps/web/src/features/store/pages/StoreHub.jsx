import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaBoxOpen, FaPlus, FaSearch, FaWarehouse, FaExclamationTriangle, FaCheckCircle, FaTruck, FaArrowRight, FaArchive, FaClipboardCheck } from 'react-icons/fa';
import inventoryService from '../../../services/inventory.service';



const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  low_stock: 'bg-amber-100 text-amber-700',
  out_of_stock: 'bg-red-100 text-red-700',
  discontinued: 'bg-slate-100 text-slate-500',
  inventory_updated: 'bg-emerald-100 text-emerald-700',
  pending_inspection: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
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
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
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

  const canCreateGRN = ['store_manager', 'admin', 'super_admin'].includes(user?.role);
  const canIssue = ['store_manager', 'admin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    Promise.all([
      inventoryService.getInventoryStats(),
      inventoryService.getInventory({ limit: 20 }),
      inventoryService.getGRNs({ limit: 5 }),
    ]).then(([statsRes, itemsRes, grnRes]) => {
      setStats(statsRes.data?.data || statsRes.data || { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
      const d = itemsRes.data?.data || itemsRes.data || [];
      setItems(d);
      const g = grnRes.data?.data || grnRes.data || [];
      setGrns(g);
    }).catch(() => {
      setItems([]);
      setGrns([]);
      toast.error('Failed to load store data');
    })
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', 'Goods', 'Equipment', 'Consumables', 'Furniture', 'IT', 'Lab', 'Other'];

  const filtered = items.filter(item => {
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchSearch = !search || item.description?.toLowerCase().includes(search.toLowerCase()) || item.itemCode?.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Phases 7 & 8 · Goods Receipt · Inspection · Department Issuance</p>
        </div>
        <div className="flex gap-2">
          {canCreateGRN && (
            <Link to="/store/grn/new" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 transition-all shadow-sm">
              <FaPlus size={12} /> New GRN
            </Link>
          )}
          {canIssue && (
            <Link to="/store/issue" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-600 transition-all shadow-sm">
              <FaArrowRight size={12} /> Issue Items
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FaBoxOpen} label="Total Items" value={loading ? '—' : stats.totalItems} sub="In stock" color="emerald" />
        <StatCard icon={FaExclamationTriangle} label="Low Stock" value={loading ? '—' : stats.lowStock} sub="Below minimum" color="amber" />
        <StatCard icon={FaWarehouse} label="Out of Stock" value={loading ? '—' : stats.outOfStock} sub="Needs reorder" color="red" />
        <StatCard icon={FaCheckCircle} label="Stock Value" value={loading ? '—' : fmtCurrency(stats.totalValue)} sub="Total inventory value" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items or code…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Stock Inventory</h2>
              <span className="text-xs text-slate-400">{filtered.length} items</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Item</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Category</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">Qty</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Unit Cost</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(item => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-800">{item.description}</p>
                          <p className="text-xs text-slate-400 font-mono">{item.itemCode}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{item.category}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`font-bold ${item.quantityOnHand === 0 ? 'text-red-600' : item.status === 'low_stock' ? 'text-amber-600' : 'text-slate-800'}`}>
                            {item.quantityOnHand}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-slate-700">{fmtCurrency(item.unitCost)}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-500'}`}>
                            {fmtStatus(item.status)}
                          </span>
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2"><FaTruck className="text-teal-600" /> Recent GRNs</h2>
              <Link to="/store/grn" className="text-xs text-teal-600 font-semibold hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {grns.map(grn => (
                <div key={grn._id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-mono text-teal-700">{grn.grnNumber}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{grn.supplierName}</p>
                      <p className="text-xs text-slate-400">{grn.deliveryDate}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[grn.status] || 'bg-slate-100 text-slate-500'}`}>
                      {fmtStatus(grn.status)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-2">{fmtCurrency(grn.totalReceivedValue)}</p>
                </div>
              ))}
              {grns.length === 0 && <div className="px-6 py-8 text-center text-slate-400 text-sm">No GRNs yet.</div>}
            </div>
          </div>

          {/* Phase 7-8 Workflow */}
          <div className="bg-linear-to-br from-teal-900 to-teal-800 rounded-2xl p-5 text-white">
            <h3 className="text-xs font-semibold text-teal-300 uppercase tracking-wider mb-3">Phase 7–8 Flow</h3>
            <div className="space-y-2">
              {[
                { step: 'Supplier Delivers', done: true },
                { step: 'Supplies Dept. Receives', done: true },
                { step: 'Store GRN Created', done: true },
                { step: 'Goods Inspection', done: false },
                { step: 'Inventory Updated', done: false },
                { step: 'Dept. Requests Issuance', done: false },
                { step: 'Store Issues Items', done: false },
                { step: 'Dept. Confirms Receipt', done: false },
                { step: '✅ Procurement Completed', done: false },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${s.done ? 'text-teal-300' : 'text-teal-500'}`}>
                  <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-xs ${s.done ? 'bg-teal-400' : 'bg-teal-700'}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  {s.step}
                </div>
              ))}
            </div>
          </div>

          {/* Procurement Completion Status Tracker */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm mb-3">
              <FaClipboardCheck className="text-emerald-600" /> Completion Tracker
            </h3>
            <p className="text-xs text-slate-500 mb-3">Steps 37–45 completion status for active procurements</p>
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
                const matchingGrns = grns.filter(g =>
                  milestone.key === 'grn_created' ? true :
                  milestone.key === 'inspected' ? g.status === 'accepted' :
                  milestone.key === 'stocked' ? g.status === 'inventory_updated' :
                  false
                );
                const count = matchingGrns.length;
                return (
                  <div key={milestone.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 w-5">#{milestone.step}</span>
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

          {/* Archive Action — shown when steps 37–45 are all complete */}
          {grns.some(g => g.status === 'inventory_updated') && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center">
                  <FaArchive className="text-white" size={14} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Archive Completed Procurements</p>
                  <p className="text-xs text-slate-500">Archive records once all steps (37–45) are confirmed complete</p>
                </div>
              </div>
              <Link to="/archive" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-600 transition-all shadow-sm">
                <FaArchive size={12} /> View Archive
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
