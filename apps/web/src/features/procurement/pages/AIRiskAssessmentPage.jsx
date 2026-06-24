import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaShieldAlt, FaRobot, FaSpinner, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import aiService from '../../../services/ai.service';

const RISK_COLORS = {
  Low: { gradient: 'from-emerald-500 to-green-600', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  Medium: { gradient: 'from-amber-500 to-orange-500', text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  High: { gradient: 'from-red-500 to-rose-600', text: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200' },
};

export default function AIRiskAssessmentPage() {
  const { procurementId } = useParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getRiskScore(procurementId);
      setResult(response.data || response);
    } catch (err) {
      setError(err.message || 'Risk analysis failed');
    }
    setLoading(false);
  };

  const riskLevel = result?.riskLevel || 'Medium';
  const riskColors = RISK_COLORS[riskLevel] || RISK_COLORS.Medium;
  const factors = result?.factors || [];
  const radarData = factors.map(f => ({ subject: f.factor.replace(/ & /g, '\n'), score: f.score, fullMark: 100 }));
  const aiAnalysis = result?.aiRiskAnalysis;

  // Risk gauge calculations
  const score = result?.riskScore || 0;
  const gaugeRotation = -90 + (score / 100) * 180;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <FaShieldAlt className="mr-3 text-orange-600" /> AI Risk Assessment
        </h1>
        <p className="text-sm text-slate-500 mt-1">Feature 6: Dynamic procurement risk scoring with 5-factor weighted analysis</p>
      </div>

      <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <FaInfoCircle className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700"><strong>Human-in-the-Loop:</strong> Risk scores are advisory. Approval routing and procurement decisions remain with authorized officers per GOSL regulations.</p>
      </div>

      {!result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <FaShieldAlt size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Run Risk Assessment</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Analyze price deviation, vendor history, delivery patterns, specification restrictiveness, and document completeness.</p>
          <button onClick={handleAnalyze} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-bold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all shadow-md disabled:opacity-50 flex items-center space-x-2 mx-auto">
            {loading ? <FaSpinner className="animate-spin" /> : <FaShieldAlt />}
            <span>{loading ? 'Analyzing...' : 'Analyze Risk'}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <>
          {/* Risk Gauge + Radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Gauge */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-6">Dynamic Risk Score</h3>

              {/* Animated Gauge */}
              <div className="relative w-48 h-24 mb-6">
                <svg viewBox="0 0 200 100" className="w-full h-full">
                  {/* Background arc */}
                  <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                  {/* Green zone */}
                  <path d="M 20 95 A 80 80 0 0 1 73 24" fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
                  {/* Amber zone */}
                  <path d="M 73 24 A 80 80 0 0 1 127 24" fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
                  {/* Red zone */}
                  <path d="M 127 24 A 80 80 0 0 1 180 95" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
                  {/* Needle */}
                  <g transform={`rotate(${gaugeRotation}, 100, 95)`}>
                    <line x1="100" y1="95" x2="100" y2="25" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="100" cy="95" r="6" fill="#1e293b" />
                  </g>
                  {/* Labels */}
                  <text x="20" y="100" textAnchor="middle" className="text-[10px]" fill="#64748b">0</text>
                  <text x="100" y="12" textAnchor="middle" className="text-[10px]" fill="#64748b">50</text>
                  <text x="180" y="100" textAnchor="middle" className="text-[10px]" fill="#64748b">100</text>
                </svg>
              </div>

              <div className={`text-center px-6 py-3 rounded-2xl ${riskColors.bg} ring-2 ${riskColors.ring}`}>
                <p className={`text-3xl font-black ${riskColors.text}`}>{score}</p>
                <p className={`text-sm font-bold ${riskColors.text} uppercase tracking-wider`}>{riskLevel} Risk</p>
              </div>

              <p className="text-xs text-slate-400 mt-3 text-center">
                Formula: WeightedRisk = Σ(FactorWeight<sub>i</sub> × FactorRiskScore<sub>i</sub>)
              </p>
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">Risk Dimension Analysis</h3>
              {radarData.length > 0 && (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <Radar name="Risk Score" dataKey="score" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Factor Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Risk Factor Breakdown</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {factors.map((f, i) => (
                <div key={i} className="px-6 py-4 flex items-center space-x-4">
                  <div className="shrink-0">
                    {f.severity === 'high' ? <FaTimesCircle className="text-red-500" size={16} /> :
                      f.severity === 'medium' ? <FaExclamationTriangle className="text-amber-500" size={16} /> :
                        <FaCheckCircle className="text-emerald-500" size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-slate-800">{f.factor}</h4>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-semibold text-slate-400">{f.weight}</span>
                        <span className={`text-sm font-bold ${f.score >= 70 ? 'text-red-600' : f.score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{f.score}/100</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{f.detail}</p>
                    {/* Progress bar */}
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${f.score >= 70 ? 'bg-red-500' : f.score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${f.score}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Mitigation Strategies */}
          {aiAnalysis && (
            <div className="bg-slate-900 rounded-3xl shadow-lg p-6 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center space-x-3 mb-4 relative z-10">
                <FaRobot className="text-emerald-400" size={18} />
                <h3 className="text-lg font-bold text-white">AI Risk Mitigation Strategies</h3>
              </div>
              {aiAnalysis.overallAssessment && (
                <p className="text-sm text-slate-300 mb-4 relative z-10">{aiAnalysis.overallAssessment}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {aiAnalysis.mitigationStrategies?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-400 uppercase mb-2">Mitigation Strategies</p>
                    {aiAnalysis.mitigationStrategies.map((s, i) => (
                      <div key={i} className="flex items-start space-x-2 mb-1.5">
                        <FaCheckCircle className="text-emerald-400 mt-0.5 shrink-0" size={10} />
                        <p className="text-sm text-slate-300">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
                {aiAnalysis.complianceWarnings?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-400 uppercase mb-2">Compliance Warnings</p>
                    {aiAnalysis.complianceWarnings.map((w, i) => (
                      <div key={i} className="flex items-start space-x-2 mb-1.5">
                        <FaExclamationTriangle className="text-amber-400 mt-0.5 shrink-0" size={10} />
                        <p className="text-sm text-slate-300">{w}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
