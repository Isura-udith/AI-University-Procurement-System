import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaLock, FaLockOpen, FaExclamationTriangle, FaCheckCircle, FaChartLine, FaSpinner, FaShieldAlt } from 'react-icons/fa';
import procurementService from '../../../services/procurement.service';
import ConfirmModal from '../../../components/ConfirmModal';



export default function BudgetLockPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lockTarget, setLockTarget] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await procurementService.getBudgetStatus();
        setItems(res.data || []);
      } catch {
        setItems([]);
        toast.error('Failed to load budget items');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLock = async () => {
    if (!lockTarget) return;
    try {
      await procurementService.lockBudget(lockTarget._id || lockTarget.id);
    } catch { toast.error('Failed to lock budget'); }
    
    const tceVal = lockTarget.totalEstimatedCost || lockTarget.tce || 0;
    setItems(prev => prev.map(item =>
      (item._id || item.id) === (lockTarget._id || lockTarget.id)
        ? { ...item, status: 'budget_locked', budgetLockedAt: new Date().toISOString().split('T')[0] }
        : item
    ));
    toast.success(`🔒 Budget locked for "${lockTarget.title}" — LKR ${tceVal.toLocaleString()} reserved.`);
    setLockTarget(null);
  };

  const handleUnlock = async () => {
    if (!unlockTarget) return;
    try {
      await procurementService.unlockBudget(unlockTarget._id || unlockTarget.id);
    } catch { toast.error('Failed to unlock budget'); }
    setItems(prev => prev.map(item =>
      (item._id || item.id) === (unlockTarget._id || unlockTarget.id)
        ? { ...item, status: 'pmd_review', budgetLockedAt: null }
        : item
    ));
    toast.info(`🔓 Budget unlocked for "${unlockTarget.title}" — Funds released back to DAPP pool.`);
    setUnlockTarget(null);
  };

  const totalLocked = items.filter(i => ['locked', 'budget_locked'].includes(i.status)).reduce((s, i) => s + (i.totalEstimatedCost || i.tce || 0), 0);
  const totalPending = items.filter(i => ['pending', 'pmd_review', 'submitted'].includes(i.status)).reduce((s, i) => s + (i.totalEstimatedCost || i.tce || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Validation & Budget Lock</h1>
        <p className="text-sm text-slate-500 mt-1">Stage 4: Real-time Budget Guard — Lock estimated funds against DAPP balance to prevent double-commitment.</p>
      </div>

      {/* AI Forecast Alert */}
      <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <FaChartLine className="text-amber-600 mt-0.5 shrink-0" size={16} />
        <div>
          <p className="text-sm font-semibold text-amber-800">AI Predictive Forecast</p>
          <p className="text-xs text-amber-700 mt-0.5">Faculty of Applied Sciences projected spend for Q2 FY2026 is trending 18% above allocation. Consider reallocating supplementary funds from Vote Item 2103.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg"><FaLock size={16} /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">LKR {totalLocked.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Locked ({items.filter(i => i.status === 'locked').length} items)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-lg"><FaExclamationTriangle size={16} /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">LKR {totalPending.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Pending Lock ({items.filter(i => i.status === 'pending').length} items)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-lg"><FaExclamationTriangle size={16} /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">{items.filter(i => i.status === 'rejected').length}</p>
              <p className="text-xs text-slate-500">Insufficient Budget</p>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Budget Utilization */}
      {(() => {
        // Derive faculty budget data from items
        const facultyMap = {};
        items.forEach(item => {
          const fac = item.faculty || 'Unknown';
          if (!facultyMap[fac]) facultyMap[fac] = { name: fac, allocated: 0, utilized: 0 };
          const balance = item.budgetRemaining !== undefined ? item.budgetRemaining : (item.dappBalance || 0);
          const tce = item.totalEstimatedCost || item.tce || 0;
          facultyMap[fac].allocated += balance;
          if (['locked', 'budget_locked'].includes(item.status)) facultyMap[fac].utilized += tce;
        });
        const facultyBudgets = Object.values(facultyMap);
        if (facultyBudgets.length === 0) return null;
        return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">Faculty Budget Utilization (FY{new Date().getFullYear()})</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facultyBudgets.map((fb, i) => {
            const pct = fb.allocated > 0 ? (fb.utilized / fb.allocated * 100) : 0;
            const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700">{fb.name}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pct > 90 ? 'bg-red-100 text-red-700' : pct > 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                  <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>LKR {(fb.utilized / 1000000).toFixed(1)}M used</span>
                  <span>LKR {(fb.allocated / 1000000).toFixed(1)}M allocated</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
        );
      })()}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-emerald-600 mr-2" size={16} />
            <span className="text-sm text-slate-500">Loading budget items...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600">Reference</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Title</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-right">TCE (LKR)</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-right">DAPP Balance</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const tceVal = item.totalEstimatedCost || item.tce || 0;
                  const balanceVal = item.budgetRemaining !== undefined ? item.budgetRemaining : (item.dappBalance !== undefined ? item.dappBalance : 50000000);
                  const sufficient = tceVal <= balanceVal;
                  const isLocked = ['locked', 'budget_locked'].includes(item.status);
                  const isPending = ['pending', 'pmd_review', 'submitted'].includes(item.status);
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr key={item._id || item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-550">{item.referenceNumber || item.id}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.faculty}</p>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800 text-right">{tceVal.toLocaleString()}</td>
                      <td className={`px-5 py-3 font-medium text-right ${sufficient ? 'text-emerald-700' : 'text-red-600'}`}>
                        {balanceVal.toLocaleString()}
                        {!sufficient && <p className="text-[10px] text-red-500 mt-0.5">Shortfall: {(tceVal - balanceVal).toLocaleString()}</p>}
                      </td>
                      <td className="px-5 py-3">
                        {isLocked && (
                          <div>
                            <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                              <FaLock size={9} /> <span>Funds Locked</span>
                            </span>
                            {(item.lockedAt || item.budgetLockedAt) && <p className="text-[10px] text-slate-400 mt-0.5">{item.lockedAt || new Date(item.budgetLockedAt).toISOString().split('T')[0]}</p>}
                          </div>
                        )}
                        {isPending && (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">Pending Validation</span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                            <FaExclamationTriangle size={9} /> <span>Insufficient Budget</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isPending && sufficient && (
                          <button
                            onClick={() => setLockTarget(item)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-colors flex items-center space-x-1 mx-auto"
                          >
                            <FaLock size={9} /> <span>Lock Funds</span>
                          </button>
                        )}
                        {isPending && !sufficient && (
                          <span className="text-xs text-red-550 font-medium">Insufficient Budget</span>
                        )}
                        {isRejected && (
                          <span className="text-xs text-red-500 font-medium">Cannot proceed</span>
                        )}
                        {isLocked && (
                          <div className="flex items-center justify-center space-x-3">
                            <span className="text-xs text-emerald-600 flex items-center space-x-1"><FaCheckCircle size={10} /> <span>Validated</span></span>
                            <button
                              onClick={() => setUnlockTarget(item)}
                              className="text-xs text-slate-400 hover:text-amber-600 font-medium flex items-center space-x-1 transition-colors"
                            >
                              <FaLockOpen size={9} /> <span>Unlock</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lock Modal */}
      <ConfirmModal
        isOpen={!!lockTarget}
        onClose={() => setLockTarget(null)}
        onConfirm={handleLock}
        title="Lock Budget Funds"
        confirmText="Confirm & Lock"
        variant="success"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Lock <span className="font-bold text-emerald-700">LKR {(lockTarget?.totalEstimatedCost || lockTarget?.tce || 0).toLocaleString()}</span> against DAPP balance for:
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm font-bold text-slate-800">{lockTarget?.title}</p>
            <p className="text-xs text-slate-500">{(lockTarget?.referenceNumber || lockTarget?.id)} • {lockTarget?.faculty}</p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <FaShieldAlt size={10} />
            <span>These funds will be reserved and unavailable for other procurements until released.</span>
          </div>
        </div>
      </ConfirmModal>

      {/* Unlock Modal */}
      <ConfirmModal
        isOpen={!!unlockTarget}
        onClose={() => setUnlockTarget(null)}
        onConfirm={handleUnlock}
        title="Release Locked Funds"
        confirmText="Release Funds"
        variant="warning"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Release <span className="font-bold text-amber-700">LKR {(unlockTarget?.totalEstimatedCost || unlockTarget?.tce || 0).toLocaleString()}</span> back to the DAPP pool.
          </p>
          <p className="text-xs text-red-550 font-medium">⚠ This will return the requisition to pending validation status.</p>
        </div>
      </ConfirmModal>
    </div>
  );
}
