import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaRobot, FaTrophy, FaBalanceScale, FaTruck, FaShieldAlt, FaSpinner, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import aiService from '../../../services/ai.service';

const REC_TYPES = [
  { key: 'bestPrice', label: 'Best Price', icon: FaTrophy, color: 'emerald', desc: 'Lowest responsive bid' },
  { key: 'bestValue', label: 'Best Value', icon: FaBalanceScale, color: 'blue', desc: 'Highest quality-to-price ratio' },
  { key: 'fastestDelivery', label: 'Fastest Delivery', icon: FaTruck, color: 'purple', desc: 'Top lead-time compliance' },
  { key: 'lowestRisk', label: 'Lowest Risk', icon: FaShieldAlt, color: 'amber', desc: 'Stable, certified supplier' },
];

const colorClasses = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
};

export default function AISmartRecommendationsPage() {
  const { tenderId } = useParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getSmartRecommendations(tenderId);
      setResult(response.data || response);
    } catch (err) {
      setError(err.message || 'Failed to generate recommendations');
    }
    setLoading(false);
  };
  const aiSummary = typeof result?.aiSummary === 'string'
    ? { executiveSummary: result.aiSummary }
    : result?.aiSummary;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <FaBalanceScale className="mr-3 text-blue-600" /> AI Smart Decision Support
        </h1>
        <p className="text-sm text-slate-500 mt-1">Feature 3: Multi-dimensional trade-off analysis for the Bid Evaluation Committee</p>
      </div>

      {/* Governance Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start space-x-3">
        <FaInfoCircle className="text-amber-600 mt-0.5 shrink-0" size={18} />
        <div>
          <p className="text-sm font-bold text-amber-800">⚖ Human-in-the-Loop — Final Approval Required</p>
          <p className="text-xs text-amber-700 mt-1">These are AI-generated recommendations only. The final contract award must be formally approved by the authorized Procurement Committee (RPC, DPC, MPC, or HLPC) per the Public Financial Management Act No. 44 of 2024.</p>
        </div>
      </div>

      {!result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <FaRobot size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Generate AI Recommendations</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Analyze all responsive bids and generate four recommendation types: Best Price, Best Value, Fastest Delivery, and Lowest Risk.</p>
          <button onClick={handleGenerate} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md disabled:opacity-50 flex items-center space-x-2 mx-auto">
            {loading ? <FaSpinner className="animate-spin" /> : <FaRobot />}
            <span>{loading ? 'Analyzing Bids...' : 'Generate Recommendations'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <>
          {/* 4 Recommendation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REC_TYPES.map(({ key, label, icon: Icon, color, desc }) => {
              const rec = result[key];
              const c = colorClasses[color];
              return (
                <div key={key} className={`rounded-3xl border ${c.border} ${c.bg} p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}>
                  <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/30 pointer-events-none" />
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center text-white shadow-md`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h3 className={`font-bold ${c.text}`}>{label}</h3>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </div>

                  {rec ? (
                    <>
                      <div className="bg-white/70 rounded-xl p-4 mb-3">
                        <p className="text-lg font-bold text-slate-900">{rec.vendorName}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{rec.bidNumber}</p>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{rec.rationale}</p>
                      {rec.details && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(rec.details).map(([k, v]) => (
                            <span key={k} className={`px-2.5 py-1 text-xs font-semibold rounded-full ${c.badge}`}>
                              {k.replace(/([A-Z])/g, ' $1').trim()}: {typeof v === 'number' ? v.toLocaleString() : v}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Insufficient data for this recommendation</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Executive Summary */}
          {aiSummary && (
            <div className="bg-slate-900 rounded-3xl shadow-lg p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center space-x-3 mb-4 relative z-10">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
                  <FaRobot size={18} />
                </div>
                <h3 className="text-lg font-bold text-white">AI Executive Summary</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed relative z-10 mb-4">{aiSummary.executiveSummary || aiSummary.aiSummary || 'AI summary generated.'}</p>
              {aiSummary.overallRecommendation && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative z-10 mb-4">
                  <p className="text-xs font-semibold text-emerald-400 uppercase mb-1">Overall Recommendation</p>
                  <p className="text-sm text-white">{aiSummary.overallRecommendation}</p>
                </div>
              )}
              {aiSummary.keyTradeoffs?.length > 0 && (
                <div className="space-y-2 relative z-10">
                  <p className="text-xs font-semibold text-slate-400 uppercase">Key Trade-offs</p>
                  {aiSummary.keyTradeoffs.map((t, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <FaCheckCircle className="text-emerald-400 mt-0.5 shrink-0" size={11} />
                      <p className="text-sm text-slate-300">{t}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Governance Notice */}
          {result.governanceNotice && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-600 text-center italic">
              {result.governanceNotice}
            </div>
          )}
        </>
      )}
    </div>
  );
}
