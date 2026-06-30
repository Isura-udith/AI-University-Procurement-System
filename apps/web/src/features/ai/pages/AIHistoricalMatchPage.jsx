import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaHistory, FaRobot, FaSpinner, FaInfoCircle, FaCheckCircle,
  FaExclamationTriangle, FaArrowLeft, FaSearch, FaChartLine,
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import aiService from '../../../services/ai.service';
import procurementService from '../../../services/procurement.service';

const DEVIATION_COLORS = {
  within_range: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Within Range', icon: FaCheckCircle, iconColor: 'text-emerald-500' },
  slightly_above: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Slightly Above', icon: FaExclamationTriangle, iconColor: 'text-amber-500' },
  above_range: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Above Range', icon: FaExclamationTriangle, iconColor: 'text-amber-500' },
  significantly_above: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Significantly Above', icon: FaExclamationTriangle, iconColor: 'text-red-500' },
  below_market: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Below Market', icon: FaCheckCircle, iconColor: 'text-blue-500' },
  below_range: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Below Range', icon: FaCheckCircle, iconColor: 'text-blue-500' },
};

export default function AIHistoricalMatchPage() {
  const { procurementId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [procInfo, setProcInfo] = useState(null);

  // Load basic procurement info
  useEffect(() => {
    if (!procurementId) return;
    Promise.resolve().then(async () => {
      try {
        const res = await procurementService.getById(procurementId);
        const p = res?.data || res;
        setProcInfo(p);
      } catch { /* optional – procurement info is non-critical */ }
    });
  }, [procurementId]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getHistoricalMatch(procurementId);
      setResult(response.data || response);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Historical analysis failed');
    }
    setLoading(false);
  };

  const matches = result?.matches || [];
  const deviation = result?.priceDeviation;
  const alerts = result?.alerts || [];
  const summary = result?.summary;

  const deviationStyle = DEVIATION_COLORS[deviation?.assessment] || DEVIATION_COLORS.within_range;
  const DeviationIcon = deviationStyle.icon;

  // Build chart — show historical prices + current estimate
  const chartData = [
    ...matches.slice(0, 5).map(m => ({
      name: m.historicalRef?.substring(0, 14) || 'Past',
      price: m.previousPrice || 0,
      type: 'historical',
    })),
    ...(deviation?.currentEstimate ? [{
      name: 'Current Est.',
      price: deviation.currentEstimate,
      type: 'current',
    }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/ai')}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <FaArrowLeft size={14} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <FaHistory className="mr-3 text-teal-600" /> AI Historical Procurement Analysis
              </h1>
              <p className="text-sm text-slate-500 mt-1">Feature 8: Maps current requisitions to past transactions and flags price anomalies</p>
            </div>
          </div>
          {procInfo && (
            <div className="mt-3 ml-11 flex items-center space-x-3">
              <span className="text-xs font-mono text-slate-500 px-2.5 py-1 bg-slate-100 rounded-lg">{procInfo.referenceNumber || procurementId}</span>
              <span className="text-xs font-semibold text-slate-700">{procInfo.title}</span>
              {procInfo.category && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">{procInfo.category}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Governance Banner */}
      <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <FaInfoCircle className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700">
          <strong>Human-in-the-Loop:</strong> Historical match results are AI advisory. All pricing decisions and budget approvals remain with the authorized Procurement Officer and Finance Division.
        </p>
      </div>

      {/* Launch Panel */}
      {!result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-linear-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <FaHistory size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Run Historical Match Analysis</h3>
          <p className="text-sm text-slate-500 mb-2 max-w-md mx-auto">
            Compare this procurement against UWU's purchase history. The AI will find similar past transactions,
            calculate price deviation, and alert the Bursar's office if costs are disproportionate.
          </p>
          <div className="flex items-center justify-center space-x-6 mb-6 text-xs text-slate-400">
            {['Price Deviation Scoring', 'Vendor History Lookup', 'Quality Report Retrieval', 'Bursar Alerts'].map((s, i) => (
              <span key={i} className="flex items-center space-x-1">
                <FaCheckCircle className="text-teal-400" size={10} />
                <span>{s}</span>
              </span>
            ))}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-8 py-3 bg-linear-to-r from-teal-600 to-cyan-600 text-white text-sm font-bold rounded-xl hover:from-teal-500 hover:to-cyan-500 transition-all shadow-md disabled:opacity-50 flex items-center space-x-2 mx-auto"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            <span>{loading ? 'Searching Historical Records...' : 'Analyze Historical Match'}</span>
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start space-x-3">
          <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Price Deviation Banner */}
          {deviation && (
            <div className={`rounded-2xl border ${deviationStyle.border} ${deviationStyle.bg} px-6 py-5 flex items-start space-x-4`}>
              <DeviationIcon className={`${deviationStyle.iconColor} mt-0.5 shrink-0`} size={20} />
              <div className="flex-1">
                <div className="flex items-center space-x-3 flex-wrap gap-2">
                  <h3 className={`text-base font-bold ${deviationStyle.text}`}>
                    Price Assessment: {deviationStyle.label}
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${deviationStyle.bg} ${deviationStyle.text} border ${deviationStyle.border}`}>
                    {deviation.deviationPercent != null ? `${deviation.deviationPercent > 0 ? '+' : ''}${deviation.deviationPercent}%` : 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {[
                    { label: 'Current Estimate', value: deviation.currentEstimate ? `LKR ${deviation.currentEstimate.toLocaleString()}` : 'N/A' },
                    { label: 'Historical Average', value: deviation.historicalAverage ? `LKR ${deviation.historicalAverage.toLocaleString()}` : 'N/A' },
                    { label: 'Deviation', value: deviation.deviationPercent != null ? `${deviation.deviationPercent > 0 ? '+' : ''}${deviation.deviationPercent}%` : 'N/A' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/60 rounded-xl p-3 text-center">
                      <p className="text-xs font-semibold text-slate-500 uppercase">{item.label}</p>
                      <p className={`text-lg font-bold mt-1 ${deviationStyle.text}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Alerts from AI */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <div key={i} className={`flex items-start space-x-3 px-5 py-4 rounded-2xl border ${alert.severity === 'high' || alert.severity === 'critical' ? 'bg-red-50 border-red-200' : alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                  <FaExclamationTriangle className={`mt-0.5 shrink-0 ${alert.severity === 'high' || alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} size={16} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{alert.type?.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Price History Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
                  <FaChartLine size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Price History vs Current Estimate</h3>
                  <p className="text-xs text-slate-500">Historical transaction prices compared to current estimate</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(v) => [`LKR ${v.toLocaleString()}`, 'Price']}
                    />
                    {deviation?.historicalAverage && (
                      <ReferenceLine y={deviation.historicalAverage} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Hist. Avg', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }} />
                    )}
                    <Bar
                      dataKey="price"
                      radius={[6, 6, 0, 0]}
                      name="Price (LKR)"
                      fill="#14b8a6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Historical Matches Table */}
          {matches.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Historical Transaction Matches</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{matches.length} similar past procurement{matches.length !== 1 ? 's' : ''} found</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">Reference</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">Price (LKR)</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">Vendor</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">Quality Report</th>
                      <th className="px-5 py-3 text-center font-semibold text-slate-600">Relevance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{m.historicalRef || 'N/A'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{m.date ? new Date(m.date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-800">
                          {m.previousPrice ? m.previousPrice.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-slate-800">{m.previousVendor || 'N/A'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs max-w-xs">
                          {m.qualityReport || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="inline-flex items-center space-x-1.5">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-teal-500"
                                style={{ width: `${m.relevanceScore || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-teal-600">{m.relevanceScore || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {summary && (
            <div className="bg-slate-900 rounded-3xl shadow-lg p-6 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center space-x-3 mb-3 relative z-10">
                <FaRobot className="text-emerald-400" size={18} />
                <h3 className="text-lg font-bold text-white">AI Historical Analysis Summary</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed relative z-10">{summary}</p>
            </div>
          )}

          {/* Re-run */}
          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-2.5 bg-white border border-slate-200 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin" size={12} /> : <FaSearch size={12} />}
              <span>Re-run Analysis</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
