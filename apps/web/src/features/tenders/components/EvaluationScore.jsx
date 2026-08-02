import { useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaPencilAlt, FaChartPie, FaChartBar, FaRobot, FaSpinner } from 'react-icons/fa';

/**
 * Interactive evaluation scoring card with radar/bar score chart.
 * @param {object} bidder - Bidder data
 * @param {Array} criteria - [{name, max, key}]
 * @param {number} techWeight - Technical weight percentage
 * @param {number} finWeight - Financial weight percentage
 * @param {boolean} isWinner - Highlight as winner
 * @param {number} rank - Rank position
 * @param {function} onScore - Callback when scoring button clicked
 * @param {function} onAIScore - Callback when AI scoring button clicked
 * @param {string|number} aiScoringId - ID of bidder currently being scored by AI
 */
export default function EvaluationScore({
  bidder,
  criteria = [],
  techWeight = 70,
  finWeight = 30,
  isWinner = false,
  rank = 0,
  onScore,
  onAIScore,
  aiScoringId,
}) {
  const [chartType, setChartType] = useState('radar'); // 'radar' | 'bar'
  const isAIScoring = aiScoringId === bidder?.id;


  if (!bidder) return null;

  const rawTech = Object.values(bidder.techScores || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const techMax = criteria.reduce((s, c) => s + c.max, 0);
  const techPercent = techMax > 0 ? (rawTech / techMax) * 100 : 0;
  const techWeighted = (techPercent * techWeight) / 100;
  const passMark = 70;
  const isPassed = techPercent >= passMark;

  // Radar data
  const radarData = criteria.map(c => {
    const key = c.key || c.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const val = bidder.techScores?.[key] ?? bidder.techScores?.[c.name] ?? 0;
    const maxVal = c.max || 100;
    const pct = maxVal > 0 ? (val / maxVal * 100) : 0;
    return {
      criterion: c.name.length > 16 ? c.name.substring(0, 14) + '…' : c.name,
      fullName: c.name,
      score: val,
      max: maxVal,
      pct: pct,
    };
  });

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
      isWinner 
        ? 'border-emerald-300 ring-1 ring-emerald-500/20 shadow-md' 
        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}>
      {/* Header Bar */}
      <div className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isWinner ? 'border-emerald-200 bg-emerald-50/20' : 'bg-slate-50/80 border-slate-200' 
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-base font-bold text-slate-900">{bidder.name}</h4>
            {bidder.hasAnomaly && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                <FaExclamationTriangle size={9} />
                <span>Anomaly</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            {isWinner ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1">
                <FaCheckCircle size={10} />
                <span>Recommended for Award</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">Rank #{rank} Evaluated Bidder</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className={`text-xl font-black ${isWinner ? 'text-emerald-700' : 'text-slate-900'}`}>
              {(bidder.combined || (techWeighted + (bidder.finWeighted || 0))).toFixed(1)}
              <span className="text-xs font-semibold text-slate-400"> / 100</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Combined Score</p>
          </div>

          <div className="flex items-center space-x-2">
            {onAIScore && (
              <button
                type="button"
                onClick={() => onAIScore(bidder)}
                disabled={isAIScoring}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 hover:border-violet-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Auto-score vendor proposal using AI evaluation model"
              >
                {isAIScoring ? (
                  <FaSpinner className="animate-spin text-violet-600" size={10} />
                ) : (
                  <FaRobot size={11} className="text-violet-600" />
                )}
                <span>{isAIScoring ? 'AI Scoring...' : 'AI Auto-Score'}</span>
              </button>
            )}

            {onScore && (
              <button
                type="button"
                onClick={() => onScore(bidder)}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
              >
                <FaPencilAlt size={10} />
                <span>Score Bidder</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Radar / Score Chart Container */}
        <div className="lg:col-span-5 bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1 px-1 border-b border-slate-200/60 pb-1.5">
            <span className="flex items-center gap-1.5">
              <span>Technical Score Breakdown</span>
            </span>
            <div className="flex items-center space-x-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px]">
              <button
                type="button"
                onClick={() => setChartType('radar')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  chartType === 'radar' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Radar Chart View"
              >
                <FaChartPie size={9} />
                <span>Radar</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  chartType === 'bar' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Bar Chart View"
              >
                <FaChartBar size={9} />
                <span>Bar</span>
              </button>
            </div>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'radar' && criteria.length >= 3 ? (
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeWidth={1.5} />
                  <PolarAngleAxis 
                    dataKey="criterion" 
                    tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }} 
                  />
                  <PolarRadiusAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                    axisLine={false} 
                  />
                  <Radar
                    name="Score %"
                    dataKey="pct"
                    stroke={isWinner ? '#047857' : '#4338ca'}
                    fill={isWinner ? '#10b981' : '#6366f1'}
                    fillOpacity={0.45}
                    strokeWidth={3.5}
                    dot={{ r: 5.5, fill: isWinner ? '#047857' : '#4338ca', stroke: '#ffffff', strokeWidth: 2.5 }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-700 space-y-1">
                            <p className="font-bold text-slate-200">{data.fullName}</p>
                            <p className="text-emerald-400 font-semibold">
                              Score: <span className="text-white">{data.score} / {data.max}</span> ({data.pct.toFixed(1)}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              ) : (
                <BarChart data={radarData} layout="vertical" margin={{ top: 10, right: 15, left: 10, bottom: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis type="category" dataKey="criterion" tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }} width={90} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-700 space-y-1">
                            <p className="font-bold text-slate-200">{data.fullName}</p>
                            <p className="text-emerald-400 font-semibold">
                              Score: <span className="text-white">{data.score} / {data.max}</span> ({data.pct.toFixed(1)}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={26}>
                    {radarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pct >= 70 ? '#10b981' : entry.pct >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Criteria Breakdown & Financial Score */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tech Score ({techWeight}%)</span>
              <span className="text-sm font-bold text-slate-800">{rawTech} / {techMax}</span>
              <span className="text-[11px] text-slate-500 font-medium ml-1.5">({techWeighted.toFixed(1)} weighted)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Financial Score ({finWeight}%)</span>
              <span className="text-sm font-bold text-slate-800">{(bidder.finWeighted || 0).toFixed(1)}</span>
              <span className="text-[11px] text-slate-500 font-medium ml-1.5">pts</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {criteria.map((c, i) => {
              const key = c.key || c.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
              const score = bidder.techScores?.[key] ?? bidder.techScores?.[c.name] ?? 0;
              const pct = c.max > 0 ? (score / c.max * 100) : 0;
              return (
                <div key={i} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-800 font-semibold">{c.name}</span>
                    <span className={`font-extrabold ${pct >= 70 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                      {score} / {c.max} <span className="text-[10px] text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compliance & Pass/Fail status */}
          <div className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
            isPassed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {isPassed ? <FaCheckCircle className="text-emerald-600" size={13} /> : <FaTimesCircle className="text-red-600" size={13} />}
              <span className="font-bold text-slate-800">Technical Qualification ({passMark}% Threshold)</span>
            </div>
            <span className={`font-bold px-2 py-0.5 rounded-full uppercase text-[10px] ${
              isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {techPercent.toFixed(1)}% — {isPassed ? 'QUALIFIED' : 'DISQUALIFIED'}
            </span>
          </div>

          {/* Pricing Info */}
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Quoted / Corrected Price:</span>
            <span className="font-bold text-slate-900">
              LKR {(bidder.correctedPrice || bidder.quotedPrice || 0).toLocaleString()}
            </span>
          </div>

          {bidder.evaluationNotes && (
            <div className="text-xs p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 italic">
              <span className="font-bold not-italic text-slate-800 mr-1">TEC Remarks:</span>
              "{bidder.evaluationNotes}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
