import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaSpinner, FaInfoCircle, FaChartBar, FaTrophy, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import aiService from '../../../services/ai.service';

const SCORE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1'];

export default function AIComparativeAnalysisPage() {
  const { tenderId } = useParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getComparativeAnalysis(tenderId);
      setResult(response.data || response);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    }
    setLoading(false);
  };

  const matrix = result?.matrix || [];
  const weights = result?.weights || {};

  const barData = matrix.map((m, i) => ({
    name: m.vendorName?.substring(0, 15) || `Vendor ${i + 1}`,
    score: m.compatibilityScore,
    color: SCORE_COLORS[i % SCORE_COLORS.length],
  }));

  const selectedRadar = selectedVendor != null ? matrix[selectedVendor] : null;
  const radarData = selectedRadar ? [
    { subject: 'Price', score: selectedRadar.scores.price, fullMark: 100 },
    { subject: 'Technical', score: selectedRadar.scores.technical, fullMark: 100 },
    { subject: 'Delivery', score: selectedRadar.scores.delivery, fullMark: 100 },
    { subject: 'Financial', score: selectedRadar.scores.financial, fullMark: 100 },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <FaChartBar className="mr-3 text-indigo-600" /> AI Comparative Quotation Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">Feature 7: Side-by-side vendor comparison with unified compatibility scoring</p>
      </div>

      <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <FaInfoCircle className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700"><strong>Human-in-the-Loop:</strong> Compatibility scores are AI-computed advisory metrics. Final vendor selection is by the BEC and Procurement Committee.</p>
      </div>

      {!result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <FaChartBar size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Run Comparative Analysis</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Generate a side-by-side comparison matrix of all bids with unified compatibility scores.</p>
          <button onClick={handleAnalyze} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md disabled:opacity-50 flex items-center space-x-2 mx-auto">
            {loading ? <FaSpinner className="animate-spin" /> : <FaChartBar />}
            <span>{loading ? 'Analyzing...' : 'Generate Comparison'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <FaTrophy className="mx-auto text-emerald-500 mb-2" size={20} />
              <p className="text-xs font-semibold text-emerald-600 uppercase">Best Overall</p>
              <p className="text-lg font-bold text-emerald-800 mt-1">{result.bestOverall}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
              <FaArrowDown className="mx-auto text-blue-500 mb-2" size={20} />
              <p className="text-xs font-semibold text-blue-600 uppercase">Best Price</p>
              <p className="text-lg font-bold text-blue-800 mt-1">{result.bestPrice}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
              <FaArrowUp className="mx-auto text-purple-500 mb-2" size={20} />
              <p className="text-xs font-semibold text-purple-600 uppercase">Best Delivery</p>
              <p className="text-lg font-bold text-purple-800 mt-1">{result.bestDelivery}</p>
            </div>
          </div>

          {/* Weights Display */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-center space-x-6 text-xs">
            <span className="font-semibold text-slate-500">Evaluation Weights:</span>
            {Object.entries(weights).map(([k, v]) => (
              <span key={k} className="px-3 py-1 bg-slate-100 rounded-full font-semibold text-slate-600 capitalize">{k}: {v}%</span>
            ))}
          </div>

          {/* Score Chart + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Compatibility Scores</h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} width={120} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} name="Compatibility Score">
                      {barData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Vendor Detail Radar</h3>
              <p className="text-xs text-slate-500 mb-4">Click a vendor row to view their radar breakdown</p>
              {radarData.length > 0 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <Radar name={selectedRadar?.vendorName} dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">Select a vendor from the table below</div>
              )}
              {selectedRadar && (
                <p className="text-xs text-center text-indigo-600 font-semibold mt-2">{selectedRadar.vendorName} — Score: {selectedRadar.compatibilityScore}/100</p>
              )}
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Detailed Comparison Matrix</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">#</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Vendor</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">Amount</th>
                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Price</th>
                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Technical</th>
                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Delivery</th>
                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Financial</th>
                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((m, i) => (
                    <tr key={i}
                      onClick={() => setSelectedVendor(i)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors ${selectedVendor === i ? 'bg-indigo-50' : 'hover:bg-slate-50'} ${i === 0 ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-5 py-3.5">
                        {i === 0 ? <FaTrophy className="text-amber-500" size={14} /> : <span className="text-slate-400 font-mono">{i + 1}</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{m.vendorName}</p>
                        <p className="text-xs text-slate-400 font-mono">{m.bidNumber}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">LKR {m.quotedAmount?.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-center"><ScoreChip score={m.scores.price} /></td>
                      <td className="px-5 py-3.5 text-center"><ScoreChip score={m.scores.technical} /></td>
                      <td className="px-5 py-3.5 text-center"><ScoreChip score={m.scores.delivery} /></td>
                      <td className="px-5 py-3.5 text-center"><ScoreChip score={m.scores.financial} /></td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 text-sm font-bold rounded-xl ${m.compatibilityScore >= 75 ? 'bg-emerald-100 text-emerald-700' : m.compatibilityScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {m.compatibilityScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          {selectedRadar && (selectedRadar.strengths?.length > 0 || selectedRadar.weaknesses?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center"><FaArrowUp className="mr-2" /> Strengths</h4>
                {(selectedRadar.strengths || []).map((s, i) => (
                  <p key={i} className="text-sm text-emerald-700 mb-1.5">• {s}</p>
                ))}
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center"><FaArrowDown className="mr-2" /> Weaknesses</h4>
                {(selectedRadar.weaknesses || []).map((w, i) => (
                  <p key={i} className="text-sm text-red-700 mb-1.5">• {w}</p>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScoreChip({ score }) {
  const color = score >= 75 ? 'text-emerald-600 bg-emerald-50' : score >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-lg ${color}`}>{score}</span>;
}
