import { useState } from 'react';
import { FaTrophy, FaExclamationTriangle } from 'react-icons/fa';
import ConfirmModal from '../../../components/ConfirmModal';

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

  const getRankBadge = (i) => {
    if (i === 0) return { label: '1st Recommended', bg: 'bg-amber-100 text-amber-950 border-amber-300' };
    if (i === 1) return { label: '2nd Runner-up', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    return { label: '3rd Place', bg: 'bg-amber-50 text-amber-900 border-amber-200' };
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FaTrophy className="text-amber-500" size={16} />
            <span>Top Bidders & Award Recommendation</span>
          </h3>
          <p className="text-xs text-slate-500">QCBS ranked top 3 bidder proposals for final vendor selection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {topBidders.map((bidder, i) => {
          const isFirst = i === 0;
          const badge = getRankBadge(i);
          return (
            <div
              key={bidder.id || i}
              className={`relative rounded-2xl border p-6 transition-all duration-200 flex flex-col justify-between ${
                isFirst
                  ? 'border-emerald-100 bg-linear-to-b from-emerald-50/60 to-white shadow-md ring-2 ring-emerald-500/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Rank Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${badge.bg}`}>
                  <span>{badge.label}</span>
                </span>
                {isFirst && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-emerald-800">
                    Highest Combined Score
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900 line-clamp-1">{bidder.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Bid ID: {bidder.id?.substring(0, 10) || 'N/A'}</p>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Combined Score</span>
                    <span className={`font-black text-sm ${isFirst ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {(bidder.combined || 0).toFixed(1)} / 100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Technical Score</span>
                    <span className="font-semibold text-slate-700">{(bidder.techWeighted || 0).toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Financial Score</span>
                    <span className="font-semibold text-slate-700">{(bidder.finWeighted || 0).toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Corrected Price</span>
                    <span className="font-bold text-slate-900">
                      LKR {(bidder.correctedPrice || bidder.quotedPrice || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {bidder.hasAnomaly && (
                  <div className="flex items-center space-x-1.5 text-xs text-red-700 font-semibold bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                    <FaExclamationTriangle className="text-red-500" size={11} />
                    <span>Price / Compliance Anomaly Flagged</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                {!disabled && (
                  <button
                    onClick={() => setConfirmBidder(bidder)}
                    className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs ${
                      isFirst
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
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
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to select <span className="font-bold text-emerald-800">{confirmBidder?.name}</span> as the winning vendor for this tender?
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Selected Vendor:</span>
              <span className="font-bold text-emerald-900">{confirmBidder?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Corrected Bid Amount:</span>
              <span className="font-bold text-slate-900">LKR {(confirmBidder?.correctedPrice || confirmBidder?.quotedPrice || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">QCBS Combined Score:</span>
              <span className="font-bold text-emerald-700">{(confirmBidder?.combined || 0).toFixed(1)} / 100</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            This action will mark the vendor as selected, notify the vendor, and update the tender state for Awarding & Contract generation.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}
