import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaLock, FaLockOpen, FaExclamationTriangle, FaCheckCircle, FaSpinner, FaShieldAlt } from 'react-icons/fa';
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
      const tceVal = lockTarget.totalEstimatedCost || lockTarget.tce || 0;
      toast.success(`Budget locked for "${lockTarget.title}" — LKR ${tceVal.toLocaleString()} reserved.`);
      const res = await procurementService.getBudgetStatus();
      setItems(res.data || []);
    } catch (err) {
      const msg = err?.message || err?.error || 'Failed to lock budget';
      toast.error(`❌ ${msg}`);
    } finally {
      setLockTarget(null);
    }
  };

  const handleUnlock = async () => {
    if (!unlockTarget) return;
    try {
      await procurementService.unlockBudget(unlockTarget._id || unlockTarget.id);
      toast.info(`Budget unlocked for "${unlockTarget.title}" — Funds released back to DAPP pool.`);
      const res = await procurementService.getBudgetStatus();
      setItems(res.data || []);
    } catch (err) {
      const msg = err?.message || err?.error || 'Failed to unlock budget';
      toast.error(`❌ ${msg}`);
    } finally {
      setUnlockTarget(null);
    }
  };

  const totalLocked = items.filter(i => ['locked', 'budget_locked'].includes(i.status)).reduce((s, i) => s + (i.totalEstimatedCost || i.tce || 0), 0);
  const pendingItems = items.filter(i => !['locked', 'budget_locked'].includes(i.status) && i.status !== 'rejected');
  const totalPending = pendingItems.reduce((s, i) => s + (i.totalEstimatedCost || i.tce || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* ── Hero Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">  
          <FaLock size={160} /> 
        </div>

        <div className="relative z-10 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Financial Validation & Budget Lock</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Funds Locked</p>
            <p className="text-xl font-black text-emerald-700 mt-1">LKR {(totalLocked / 1000000).toFixed(1)}M</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{items.filter(i => ['locked', 'budget_locked'].includes(i.status)).length} Procurements Reserved</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FaLock size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Lock</p>
            <p className="text-xl font-black text-amber-600 mt-1">LKR {(totalPending / 1000000).toFixed(1)}M</p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">{pendingItems.length} Awaiting Lock</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FaExclamationTriangle size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Insufficient Budget</p>
            <p className="text-2xl font-black text-red-600 mt-1">{items.filter(i => i.status === 'rejected').length}</p>
            <p className="text-[10px] text-red-500 font-semibold mt-0.5">Budget Exceeded</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <FaExclamationTriangle size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tracked</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{items.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">DAPP Items Checked</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <FaShieldAlt size={18} />
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Faculty Budget Utilization (FY{new Date().getFullYear()})</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {facultyBudgets.map((fb, i) => {
                const pct = fb.allocated > 0 ? (fb.utilized / fb.allocated * 100) : 0;
                const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div key={i} className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-800">{fb.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pct > 90 ? 'bg-red-100 text-red-700' : pct > 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
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
                  const isPending = !isLocked && item.status !== 'rejected';
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr key={item._id || item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700">
                        <span className="bg-blue-50 px-2 py-0.5 rounded-md">{item.referenceNumber || item.id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-400 font-medium">{item.faculty}</p>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 text-right">{tceVal.toLocaleString()}</td>
                      <td className={`px-5 py-3.5 font-bold text-right ${sufficient ? 'text-emerald-700' : 'text-red-600'}`}>
                        {balanceVal.toLocaleString()}
                        {!sufficient && <p className="text-[10px] text-red-500 mt-0.5">Shortfall: {(tceVal - balanceVal).toLocaleString()}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        {isLocked && (
                          <div>
                            <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                              <FaLock size={9} /> <span>Funds Locked</span>
                            </span>
                            {(item.lockedAt || item.budgetLockedAt) && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{item.lockedAt || new Date(item.budgetLockedAt).toISOString().split('T')[0]}</p>}
                          </div>
                        )}
                        {isPending && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full">Pending Validation</span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center space-x-1 text-xs font-bold text-red-700 bg-red-100/80 px-2.5 py-1 rounded-full">
                            <FaExclamationTriangle size={9} /> <span>Insufficient Budget</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isPending && sufficient && (
                          <button
                            onClick={() => setLockTarget(item)}
                            className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 shadow-xs transition-colors flex items-center space-x-1.5 mx-auto"
                          >
                            <FaLock size={9} /> <span>Lock Funds</span>
                          </button>
                        )}
                        {isPending && !sufficient && (
                          <span className="text-xs text-red-600 font-semibold">Insufficient Budget</span>
                        )}
                        {isRejected && (
                          <span className="text-xs text-red-500 font-semibold">Cannot proceed</span>
                        )}
                        {isLocked && (
                          <div className="flex items-center justify-center space-x-3">
                            <span className="text-xs text-emerald-600 font-bold flex items-center space-x-1"><FaCheckCircle size={10} /> <span>Validated</span></span>
                            <button
                              onClick={() => setUnlockTarget(item)}
                              className="text-xs text-slate-400 hover:text-amber-600 font-semibold flex items-center space-x-1 transition-colors"
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
