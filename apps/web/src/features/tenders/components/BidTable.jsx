import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaLock, FaLockOpen } from 'react-icons/fa';

/**
 * Sortable bid comparison table.
 * @param {Array} bids - [{vendor, bidAmount, bidSecurity, docs, deviations, status, submitted}]
 * @param {function} onUnseal - Called with bid vendor name
 * @param {Array} openedBids - List of already-opened vendor names
 * @param {boolean} showPrices - Whether to show bid amounts (only after opening)
 */
export default function BidTable({ bids = [], onUnseal, openedBids = [], showPrices = false }) {
  if (bids.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">No bids available for this tender.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-5 py-3 font-semibold text-slate-600 w-8">#</th>
            <th className="px-5 py-3 font-semibold text-slate-600">Vendor / Bidder</th>
            <th className="px-5 py-3 font-semibold text-slate-600">Submitted</th>
            {showPrices && <th className="px-5 py-3 font-semibold text-slate-600 text-right">Bid Amount (LKR)</th>}
            <th className="px-5 py-3 font-semibold text-slate-600">Documents</th>
            <th className="px-5 py-3 font-semibold text-slate-600">Bid Security</th>
            <th className="px-5 py-3 font-semibold text-slate-600">Flags</th>
            <th className="px-5 py-3 font-semibold text-slate-600 text-center">Seal Status</th>
          </tr>
        </thead>
        <tbody>
          {bids.map((bid, i) => {
            const isOpened = openedBids.includes(bid.vendor);
            const hasMajor = (bid.deviations || []).some(d => d.includes('MAJOR'));

            return (
              <tr key={i} className={`border-b border-slate-100 transition-colors ${hasMajor ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                <td className="px-5 py-3.5 text-slate-400 font-medium">{i + 1}</td>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-800">{bid.vendor}</p>
                  {bid.bidNumber && <p className="text-[10px] text-slate-400">{bid.bidNumber}</p>}
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500">{bid.submitted || '—'}</td>
                {showPrices && (
                  <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                    {isOpened && bid.bidAmount ? bid.bidAmount.toLocaleString() : '—'}
                  </td>
                )}
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {(bid.docs || []).map((d, j) => (
                      <span key={j} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{d}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {bid.bidSecurity ? (
                    <span className="inline-flex items-center space-x-1 text-xs text-emerald-700"><FaCheckCircle size={10} /><span>Present</span></span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-xs text-red-600 font-semibold"><FaTimesCircle size={10} /><span>Missing</span></span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {(bid.deviations || []).length > 0 ? (
                    <div className="space-y-1">
                      {bid.deviations.map((d, j) => (
                        <span key={j} className={`block text-xs font-medium ${d.includes('MAJOR') ? 'text-red-600' : 'text-amber-600'}`}>
                          <FaExclamationTriangle className="inline mr-1" size={9} />{d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-600">No issues</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {hasMajor ? (
                    <span className="text-xs font-semibold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">Rejected</span>
                  ) : isOpened ? (
                    <span className="inline-flex items-center space-x-1 text-xs text-emerald-600"><FaLockOpen size={10} /><span>Opened</span></span>
                  ) : (
                    <button
                      onClick={() => onUnseal?.(bid.vendor)}
                      className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors flex items-center space-x-1 mx-auto"
                    >
                      <FaLock size={9} /><span>Unseal</span>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
