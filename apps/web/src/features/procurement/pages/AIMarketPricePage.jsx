import { useState } from 'react';
import { FaRobot, FaSearch, FaChartBar, FaHistory, FaLightbulb, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import aiService from '../../../services/ai.service';

export default function AIMarketPricePage() {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getMarketPrice({ rawText });
      setResult(response.data || response);
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    }
    setLoading(false);
  };

  const nlp = result?.nlpResult;
  const price = result?.priceRecommendation;
  const priceBands = price?.priceBands || [];

  const chartData = priceBands.map(b => ({
    name: (b.itemDescription || '').substring(0, 20),
    Low: b.lowPrice,
    Mid: b.midPrice,
    High: b.highPrice,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <FaRobot className="mr-3 text-emerald-600" /> AI Market Price Intelligence
        </h1>
        <p className="text-sm text-slate-500 mt-1">Feature 1 &amp; 4: Natural language requisition parsing with real-time market price recommendations</p>
      </div>

      {/* Governance Banner */}
      <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <FaInfoCircle className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Human-in-the-Loop</p>
          <p className="text-xs text-amber-700 mt-0.5">AI-generated market prices are recommendations only. All prices must be verified by the Procurement Division before use in official documents.</p>
        </div>
      </div>

      {/* NLP Input */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
            <FaSearch size={16} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Natural Language Requisition Input</h3>
            <p className="text-xs text-slate-500">Type your procurement needs in plain language — the AI will extract specifications and recommend prices.</p>
          </div>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g., We need 20 units of 8GB DDR4 RAM and 10 units of 256GB SSD for the Computer Science laboratory..."
          className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
        />

        <div className="flex justify-end mt-4">
          <button
            onClick={handleAnalyze}
            disabled={loading || !rawText.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaRobot />}
            <span>{loading ? 'Analyzing...' : 'Analyze & Get Prices'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start space-x-3">
          <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* NLP Parsed Data */}
          {nlp && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <FaLightbulb className="mr-2 text-amber-500" /> AI-Parsed Specifications
              </h3>

              {nlp.suggestedTitle && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Title</label>
                  <p className="text-sm font-bold text-slate-800 mt-1">{nlp.suggestedTitle}</p>
                </div>
              )}

              {nlp.identifiedSpecs?.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identified Specifications</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {nlp.identifiedSpecs.map((spec, i) => (
                      <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">{spec}</span>
                    ))}
                  </div>
                </div>
              )}

              {nlp.items?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mt-2">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Item</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Category</th>
                        <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Qty</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Unit</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Specs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nlp.items.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-800">{item.description}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">{item.category}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-800">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-slate-600">{item.unit}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{item.specifications}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {nlp.recommendedMethod && (
                <div className="mt-4 flex items-center space-x-2">
                  <FaCheckCircle className="text-emerald-500" size={14} />
                  <span className="text-sm text-slate-600">Recommended Method: <strong className="text-slate-800">{nlp.recommendedMethod}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Price Bands */}
          {priceBands.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <FaChartBar className="mr-2 text-blue-500" /> Market Price Bands
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="Low" fill="#10b981" radius={[4, 4, 0, 0]} name="Low Estimate" />
                      <Bar dataKey="Mid" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Mid Estimate" />
                      <Bar dataKey="High" fill="#f59e0b" radius={[4, 4, 0, 0]} name="High Estimate" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Price Cards */}
              <div className="space-y-4">
                {priceBands.map((band, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-slate-800 text-sm mb-3">{band.itemDescription}</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-emerald-50 rounded-xl">
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase">Low</p>
                        <p className="text-sm font-bold text-emerald-700">LKR {band.lowPrice?.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <p className="text-[10px] font-semibold text-blue-600 uppercase">Recommended</p>
                        <p className="text-sm font-bold text-blue-700">LKR {band.midPrice?.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-2 bg-amber-50 rounded-xl">
                        <p className="text-[10px] font-semibold text-amber-600 uppercase">High</p>
                        <p className="text-sm font-bold text-amber-700">LKR {band.highPrice?.toLocaleString()}</p>
                      </div>
                    </div>
                    {band.confidence && (
                      <div className="flex items-center mt-3 text-xs text-slate-500">
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${band.confidence === 'high' ? 'bg-emerald-500' : band.confidence === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        Confidence: {band.confidence} {band.reasoning && `— ${band.reasoning}`}
                      </div>
                    )}
                  </div>
                ))}

                {/* Overall TCE */}
                {price?.overallTCE && (
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Total Cost Estimate (TCE)</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Low</p>
                        <p className="text-lg font-bold">LKR {price.overallTCE.lowEstimate?.toLocaleString()}</p>
                      </div>
                      <div className="text-center border-x border-slate-700">
                        <p className="text-xs text-emerald-400">Recommended</p>
                        <p className="text-lg font-bold text-emerald-400">LKR {price.overallTCE.midEstimate?.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400">High</p>
                        <p className="text-lg font-bold">LKR {price.overallTCE.highEstimate?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historical Comparison */}
          {price?.historicalComparison && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <FaHistory className="mr-2 text-purple-500" /> Historical Comparison
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Historical Avg Price</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">
                    {price.historicalComparison.avgHistoricalPrice
                      ? `LKR ${price.historicalComparison.avgHistoricalPrice.toLocaleString()}`
                      : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Price Change</p>
                  <p className={`text-xl font-bold mt-1 ${price.historicalComparison.priceChangePercent > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {price.historicalComparison.priceChangePercent != null
                      ? `${price.historicalComparison.priceChangePercent > 0 ? '+' : ''}${price.historicalComparison.priceChangePercent}%`
                      : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Trend</p>
                  <p className="text-xl font-bold text-slate-800 mt-1 capitalize">{price.historicalComparison.trend || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Market Conditions */}
          {price?.marketConditions && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">Market Conditions</p>
              <p className="text-sm text-blue-700">{price.marketConditions}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
