import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

/**
 * Interactive evaluation scoring card with radar chart.
 * @param {object} bidder - {name, techScores: {experience, methodology, staff, compliance}, quotedPrice, correctedPrice, combined}
 * @param {Array} criteria - [{name, max, key}]
 * @param {number} techWeight - Technical weight percentage
 * @param {boolean} isWinner - Highlight as winner
 * @param {number} rank - Rank position
 */
export default function EvaluationScore({
  bidder,
  criteria = [],
  techWeight = 70,
  isWinner = false,
  rank = 0,
}) {
  if (!bidder) return null;

  const rawTech = Object.values(bidder.techScores || {}).reduce((s, v) => s + v, 0);
  const techMax = criteria.reduce((s, c) => s + c.max, 0);
  const techPercent = techMax > 0 ? (rawTech / techMax) * 100 : 0;
  const techWeighted = (techPercent * techWeight) / 100;
  const passMark = 70;

  // Radar data
  const radarData = criteria.map(c => ({
    criterion: c.name.split(' ')[0],
    score: bidder.techScores?.[c.key] || 0,
    max: c.max,
    pct: c.max > 0 ? ((bidder.techScores?.[c.key] || 0) / c.max * 100) : 0,
  }));

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isWinner ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
      {/* Header */}
      <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isWinner ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold ${isWinner ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {rank}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{bidder.name}</p>
            {isWinner && <span className="text-[10px] font-bold text-emerald-600 uppercase">Recommended for Award</span>}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-extrabold ${isWinner ? 'text-emerald-600' : 'text-slate-700'}`}>
            {(bidder.combined || (techWeighted + (bidder.finWeighted || 0))).toFixed(1)}
          </p>
          <p className="text-[10px] text-slate-400">Combined Score</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%">
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 10, fill: '#64748b' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar
                dataKey="pct"
                stroke={isWinner ? '#10b981' : '#6366f1'}
                fill={isWinner ? '#10b981' : '#6366f1'}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip formatter={(v) => `${v.toFixed(0)}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          {criteria.map((c, i) => {
            const score = bidder.techScores?.[c.key] || 0;
            const pct = c.max > 0 ? (score / c.max * 100) : 0;
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">{c.name}</span>
                  <span className={`font-bold ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {score}/{c.max}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Pass/Fail indicator */}
          <div className={`flex items-center justify-between p-2.5 rounded-lg border ${techPercent >= passMark ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <span className="text-xs font-semibold text-slate-700">Technical Pass Mark ({passMark}%)</span>
            <span className={`text-xs font-bold ${techPercent >= passMark ? 'text-emerald-700' : 'text-red-700'}`}>
              {techPercent.toFixed(1)}% — {techPercent >= passMark ? '✓ PASS' : '✗ FAIL'}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Corrected Price</span>
            <span className="font-bold text-slate-800">LKR {(bidder.correctedPrice || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
