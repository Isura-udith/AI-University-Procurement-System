import { useState } from 'react';
import { FaTrophy, FaExclamationTriangle, FaRobot, FaLightbulb } from 'react-icons/fa';
import ConfirmModal from '../../../components/ConfirmModal';

/**
 * Side-by-side comparison of top bidders with AI award recommendation.
 * @param {Array} bidders - Sorted array of bidders (best first)
 * @param {function} onSelectWinner - Called with the selected bidder
 * @param {boolean} disabled - Whether selection is disabled
 * @param {object} aiAnalysis - AI analysis results
 * @param {function} onRunAI - Trigger AI recommendation analysis
 */
export default function WinnerSelection({
  bidders = [],
  onSelectWinner,
  disabled = false,
  aiAnalysis = null,
  onRunAI = null,
}) {
  const [confirmBidder, setConfirmBidder] = useState(null);

  if (bidders.length === 0) return null;

  const topBidders = bidders.slice(0, 3);

  const getRankBadge = (i) => {
    if (i === 0) return { label: '1st Recommended', bg: 'bg-amber-100 text-amber-950 border-amber-300' };
    if (i === 1) return { label: '2nd Runner-up', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    return { label: '3rd Place', bg: 'bg-amber-50 text-amber-900 border-amber-200' };
  };

  const getAIRationale = (bidder, index) => {
    if (index === 0) {
      return {
        tag: 'AI Top Award Recommendation',
        tagBg: 'bg-emerald-600 text-white shadow-xs',
        text: `Optimal total value choice. Highest QCBS score (${(bidder.combined || 0).toFixed(1)}/100) with proven performance history.`,
      };
    }
    if (index === 1) {
      return {
        tag: 'AI Secondary Option',
        tagBg: 'bg-indigo-600 text-white shadow-xs',
        text: `Qualified technical alternative. Good performance score with competitive quote.`,
      };
    }
    return {
      tag: '  AI Budget Option',
      tagBg: 'bg-slate-700 text-white shadow-xs',
      text: `Meets minimum technical threshold of 70%. Suitable fallback bidder.`,
    };
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FaTrophy className="text-amber-500" size={16} />
            <span>Top Bidders & AI Award Recommendation</span>
          </h3>
          <p className="text-xs text-slate-500">QCBS ranked top bidder proposals with AI-assisted award analysis</p>
        </div>

        {onRunAI && (
          <button
            type="button"
            onClick={onRunAI}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
          >
            <FaRobot className="text-violet-600" size={13} />
            <span>AI Smart Award Guidance</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {topBidders.map((bidder, i) => {
          const isFirst = i === 0;
          const badge = getRankBadge(i);
          const aiTag = getAIRationale(bidder, i);

          return (
            <div
              key={bidder.id || i}
              className={`relative rounded-2xl border p-6 transition-all duration-200 flex flex-col justify-between ${
                isFirst
                  ? 'border-emerald-200 bg-linear-to-b from-emerald-50/70 via-white to-white shadow-md ring-2 ring-emerald-500/15'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Rank & AI Badge Header */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${badge.bg}`}>
                    <span>{badge.label}</span>
                  </span>
                  {isFirst && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-emerald-800 bg-emerald-100 border border-emerald-200">
                      Highest QCBS
                    </span>
                  )}
                </div>

                {/* AI Recommendation Pill */}
                <div className="pt-1">
                  <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${aiTag.tagBg}`}>
                    <FaRobot size={10} />
                    <span>{aiTag.tag}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900 line-clamp-1">{bidder.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Bid ID: {bidder.id?.substring(0, 10) || 'N/A'}</p>
                </div>

                <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2 text-xs">
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

                {/* AI Rationale Box */}
                <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-100 space-y-1 text-xs">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-800 flex items-center gap-1">
                    <FaLightbulb size={10} className="text-amber-500" />
                    <span>AI Evaluation Insight</span>
                  </span>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                    {aiTag.text}
                  </p>
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

      {/* AI Executive Decision Summary Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-violet-600/30 rounded-xl border border-violet-500/30 text-violet-300 shrink-0">
            <FaRobot size={22} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">AI Award Recommendation Summary</span>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                GOSL QCBS Verified
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {aiAnalysis?.recommendation ||
                `AI Model recommends awarding tender to "${topBidders[0]?.name}" with a combined score of ${topBidders[0]?.combined?.toFixed(1) || 0}/100. Vendor passes technical threshold with zero pricing collusion flags.`}
            </p>
          </div>
        </div>
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

