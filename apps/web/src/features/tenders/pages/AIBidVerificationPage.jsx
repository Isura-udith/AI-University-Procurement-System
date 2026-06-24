import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaRobot, FaExclamationTriangle, FaCheckCircle, FaShieldAlt, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import aiService from '../../../services/ai.service';

export default function AIBidVerificationPage() {
  const { tenderId } = useParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.verifyQuotations(tenderId);
      setResult(response.data || response);
    } catch (err) {
      setError(err.message || 'Verification failed');
    }
    setLoading(false);
  };

  const stats = result?.statistics;
  const bids = result?.verifiedBids || [];
  const anomalies = result?.anomalies || [];
  const collusion = result?.collusionPatterns;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <FaShieldAlt className="mr-3 text-blue-600" /> AI Seller Price Verification
        </h1>
        <p className="text-sm text-slate-500 mt-1">Feature 2: Anomaly detection against market averages, historical records, and competing bids</p>
      </div>

      {/* Governance */}
      <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <FaInfoCircle className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700"><strong>Human-in-the-Loop:</strong> Anomaly flags are for BEC review. No bids are automatically rejected by the AI system.</p>
      </div>

      {!result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <FaRobot className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Run AI Price Verification</h3>
          <p className="text-sm text-slate-500 mb-6">Analyze all bids for tender anomalies, overpricing, and collusion patterns.</p>
          <button onClick={handleVerify} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md disabled:opacity-50 flex items-center space-x-2 mx-auto">
            {loading ? <FaSpinner className="animate-spin" /> : <FaShieldAlt />}
            <span>{loading ? 'Analyzing Bids...' : 'Verify Quotations'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start space-x-3">
          <FaExclamationTriangle className="text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <>
          {/* Anomaly Alerts */}
          {anomalies.length > 0 && (
            <div className="space-y-3">
              {anomalies.map((a, i) => (
                <div key={i} className={`flex items-start space-x-4 px-5 py-4 rounded-2xl border ${a.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <FaExclamationTriangle className={`mt-0.5 shrink-0 ${a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} size={18} />
                  <div>
                    <p className={`text-sm font-bold ${a.severity === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
                      ⚠ High Price Anomaly Alert — {a.vendorName}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{a.message}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs">
                      <span className="font-semibold text-slate-500">Bid: LKR {a.bidAmount?.toLocaleString()}</span>
                      <span className={`font-bold ${a.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>+{a.deviationPercent}% above market</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Bids Analyzed', value: stats.bidCount, color: 'blue' },
                { label: 'Market Mean', value: `LKR ${Math.round(stats.mean).toLocaleString()}`, color: 'emerald' },
                { label: "Engineer's Est.", value: stats.engineersEstimate ? `LKR ${stats.engineersEstimate.toLocaleString()}` : 'N/A', color: 'purple' },
                { label: 'Anomalies', value: anomalies.length, color: anomalies.length > 0 ? 'red' : 'emerald' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 text-${s.color}-600`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Verified Bids Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Bid Verification Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Vendor</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-600">Quoted Amount</th>
                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Dev. from Mean</th>
                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Dev. from Estimate</th>
                    <th className="px-5 py-3 text-center font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((bid, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${bid.isAnomaly ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{bid.vendorName}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700">LKR {bid.quotedAmount?.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-sm font-bold ${parseFloat(bid.deviationFromMean) > 20 ? 'text-red-600' : parseFloat(bid.deviationFromMean) < -20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {bid.deviationFromMean}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-sm text-slate-600">{bid.deviationFromEstimate}</td>
                      <td className="px-5 py-3.5 text-center">
                        {bid.isAnomaly ? (
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">ANOMALY</span>
                        ) : bid.anomalyType === 'suspiciously_low' ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">LOW</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center justify-center space-x-1">
                            <FaCheckCircle size={10} /><span>Normal</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Collusion Detection */}
          {collusion && collusion.risk !== 'insufficient_data' && (
            <div className={`rounded-2xl border p-5 ${collusion.risk === 'high' ? 'bg-red-50 border-red-200' : collusion.risk === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <h3 className={`text-sm font-bold ${collusion.risk === 'high' ? 'text-red-800' : collusion.risk === 'medium' ? 'text-amber-800' : 'text-emerald-800'}`}>
                Collusion Risk: {collusion.risk?.toUpperCase()}
              </h3>
              {collusion.patterns?.map((p, i) => (
                <div key={i} className="mt-2 flex items-start space-x-2">
                  <FaExclamationTriangle className={`mt-0.5 shrink-0 ${p.severity === 'critical' ? 'text-red-500' : p.severity === 'high' ? 'text-amber-500' : 'text-blue-500'}`} size={12} />
                  <p className="text-sm text-slate-700"><strong className="capitalize">{p.type.replace(/_/g, ' ')}:</strong> {p.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* AI Assessment */}
          {result?.aiVerification && (
            <div className="bg-slate-900 rounded-3xl p-6 text-white">
              <div className="flex items-center space-x-3 mb-4">
                <FaRobot className="text-emerald-400" size={20} />
                <h3 className="text-lg font-bold">AI Assessment</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{result.aiVerification.overallAssessment}</p>
              {result.aiVerification.recommendations?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {result.aiVerification.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <FaCheckCircle className="text-emerald-400 mt-0.5 shrink-0" size={12} />
                      <p className="text-sm text-slate-300">{r}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
