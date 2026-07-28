import { FaStar, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import ConfirmModal from '../../../components/ConfirmModal';
import { useState } from 'react';

/**
 * Side-by-side comparison of top bidders with award selection.
 * @param {Array} bidders - Sorted array of bidders (best first)
 * @param {function} onSelectWinner - Called with the selected bidder
 * @param {boolean} disabled - Whether selection is disabled
 */
export default function WinnerSelection({ bidders = [], onSelectWinner, disabled = false }) {
  const [confirmBidder, setConfirmBidder] = useState(null);

  if (bidders.length === 0) return null;

  const topBidders = bidders.slice(0, 3);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Award Recommendation</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topBidders.map((bidder, i) => {
          const isFirst = i === 0;
          return (
            <div key={bidder.id || i} className={`relative rounded-xl border p-5 transition-all ${
              isFirst ? 'border-emerald-300 bg-emerald-50/30 shadow-md' : 'border-slate-200 bg-white hover:shadow-sm'
            }`}>
              {/* Rank Badge */}
              <div className={`absolute -top-3 left-4 w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shadow-sm ${
                isFirst ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {isFirst ? <FaStar size={10} /> : i + 1}
              </div>

              <div className="pt-2 space-y-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">{bidder.name}</p>
                  {isFirst && <p className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Highest Combined Score</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Combined Score</span>
                    <span className={`font-bold ${isFirst ? 'text-emerald-700' : 'text-slate-700'}`}>{(bidder.combined || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Technical</span>
                    <span className="font-medium text-slate-700">{(bidder.techWeighted || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Financial</span>
                    <span className="font-medium text-slate-700">{(bidder.finWeighted || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Bid Price</span>
                    <span className="font-bold text-slate-800">LKR {(bidder.correctedPrice || 0).toLocaleString()}</span>
                  </div>
                </div>

                {bidder.hasAnomaly && (
                  <div className="flex items-center space-x-1 text-[10px] text-red-500 font-semibold bg-red-50 px-2 py-1 rounded">
                    <FaExclamationTriangle size={8} /> <span>Anomaly Detected</span>
                  </div>
                )}

                {!disabled && (
                  <button
                    onClick={() => setConfirmBidder(bidder)}
                    className={`w-full flex items-center justify-center space-x-1.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      isFirst
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FaCheckCircle size={10} />
                    <span>{isFirst ? 'Win & Select Vendor' : 'Select Instead'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmBidder}
        onClose={() => setConfirmBidder(null)}
        onConfirm={async () => {
          await onSelectWinner?.(confirmBidder);
          setConfirmBidder(null);
        }}
        title="Win & Select Vendor"
        confirmText="Confirm & Send Selection"
        variant="success"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Select <span className="font-bold text-emerald-700">{confirmBidder?.name}</span> as the winning vendor and send notification?
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Bid Amount</span>
              <span className="font-bold text-slate-800">LKR {(confirmBidder?.correctedPrice || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Combined Score</span>
              <span className="font-bold text-emerald-700">{(confirmBidder?.combined || 0).toFixed(1)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Confirming this will mark <span className="font-bold">{confirmBidder?.name}</span> as the winning vendor, send the selection notice, and display their selected items on their Supplier Dashboard.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}
