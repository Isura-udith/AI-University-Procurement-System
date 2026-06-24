import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaEye, FaRobot, FaSpinner, FaArrowLeft, FaCheckCircle,
  FaFilter, FaChartBar, FaClock, FaUser,
} from 'react-icons/fa';
import aiService from '../../../services/ai.service';
import Pagination from '../../../components/Pagination';

const FEATURE_LABELS = {
  'market_price': 'Market Price',
  'nlp_parsing': 'NLP Parsing',
  'bid_verification': 'Bid Verification',
  'smart_recommendations': 'Smart Recommendations',
  'market_alerts': 'Market Monitoring',
  'risk_scoring': 'Risk Scoring',
  'comparative_analysis': 'Comparative Analysis',
  'historical_match': 'Historical Match',
  'demand_forecasting': 'Demand Forecast',
};

const FEATURE_COLORS = {
  'market_price': 'bg-emerald-100 text-emerald-700',
  'nlp_parsing': 'bg-teal-100 text-teal-700',
  'bid_verification': 'bg-blue-100 text-blue-700',
  'smart_recommendations': 'bg-violet-100 text-violet-700',
  'market_alerts': 'bg-indigo-100 text-indigo-700',
  'risk_scoring': 'bg-orange-100 text-orange-700',
  'comparative_analysis': 'bg-pink-100 text-pink-700',
  'historical_match': 'bg-cyan-100 text-cyan-700',
  'demand_forecasting': 'bg-purple-100 text-purple-700',
};

export default function AIExplainabilityPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [featureFilter, setFeatureFilter] = useState('');
  const limit = 15;

  const loadLogs = async (p = 1, feature = '') => {
    setLoading(true);
    try {
      const params = { page: p, limit };
      if (feature) params.feature = feature;
      const [logsRes, statsRes] = await Promise.allSettled([
        aiService.getExplainabilityLogs(params),
        aiService.getExplainabilityStats(),
      ]);
      if (logsRes.status === 'fulfilled') {
        const d = logsRes.value?.data || logsRes.value;
        setLogs(d?.data || d?.logs || []);
        setTotal(d?.total || 0);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value?.data || statsRes.value);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => loadLogs(1, featureFilter));
  }, [featureFilter]);

  const handlePageChange = (p) => {
    setPage(p);
    loadLogs(p, featureFilter);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link to="/ai" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <FaEye className="mr-3 text-slate-600" /> AI Explainability Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete audit log of all AI analyses — governance compliance per GOSL PG-2024 & PFM Act
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total AI Analyses', value: stats.total || 0, icon: FaRobot, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Last 24 Hours', value: stats.last24h || 0, icon: FaClock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Feature Types', value: stats.byFeature?.length || 0, icon: FaChartBar, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Active Features', value: Object.keys(FEATURE_LABELS).length, icon: FaCheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl border border-slate-200 p-4 flex items-center space-x-4`}>
              <s.icon className={`${s.color} shrink-0`} size={22} />
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature Usage Breakdown */}
      {stats?.byFeature?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">AI Feature Usage Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byFeature.map((f, i) => (
              <button
                key={i}
                onClick={() => setFeatureFilter(featureFilter === f._id ? '' : f._id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  featureFilter === f._id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : `${FEATURE_COLORS[f._id] || 'bg-slate-100 text-slate-600'} border-transparent`
                }`}
              >
                <span>{FEATURE_LABELS[f._id] || f._id}</span>
                <span className="font-bold">×{f.count}</span>
                {f.avgProcessingTime && (
                  <span className="opacity-70">~{Math.round(f.avgProcessingTime)}ms</span>
                )}
              </button>
            ))}
          </div>
          {featureFilter && (
            <button
              onClick={() => setFeatureFilter('')}
              className="mt-3 text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1"
            >
              <FaFilter size={10} />
              <span>Clear filter</span>
            </button>
          )}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI Operation Logs</h3>
            <p className="text-xs text-slate-500 mt-0.5">{total} total records</p>
          </div>
          {loading && <FaSpinner className="animate-spin text-slate-400" size={14} />}
        </div>

        {logs.length === 0 && !loading ? (
          <div className="py-16 text-center">
            <FaRobot className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-sm text-slate-400">No AI analysis logs found.</p>
            <p className="text-xs text-slate-400 mt-1">Run any AI feature to generate audit trail entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Feature</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Model</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Input Summary</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Output</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Time (ms)</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Generated By</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log._id || i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${FEATURE_COLORS[log.aiFeature] || 'bg-slate-100 text-slate-600'}`}>
                        {FEATURE_LABELS[log.aiFeature] || log.aiFeature || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-slate-500">{log.model || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="text-xs text-slate-600 truncate">{log.inputSummary || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="text-xs text-slate-600 truncate">{log.outputSummary || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs font-mono font-semibold ${log.processingTimeMs > 5000 ? 'text-red-500' : log.processingTimeMs > 2000 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {log.processingTimeMs ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {log.generatedBy ? (
                        <div className="flex items-center space-x-1.5">
                          <FaUser size={10} className="text-slate-400" />
                          <span className="text-xs text-slate-600">
                            {log.generatedBy.firstName} {log.generatedBy.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">System</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500">
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <FaEye size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div className="px-5 py-4 border-t border-slate-100">
            <Pagination page={page} totalPages={Math.ceil(total / limit)} onPageChange={handlePageChange} />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">AI Log Detail</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedLog._id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {[
                { label: 'Feature', value: FEATURE_LABELS[selectedLog.aiFeature] || selectedLog.aiFeature },
                { label: 'Model', value: selectedLog.model },
                { label: 'Temperature', value: selectedLog.temperature },
                { label: 'Processing Time', value: selectedLog.processingTimeMs ? `${selectedLog.processingTimeMs}ms` : null },
                { label: 'Input Summary', value: selectedLog.inputSummary },
                { label: 'Output Summary', value: selectedLog.outputSummary },
                { label: 'Data Sources', value: selectedLog.dataSources?.join(', ') },
                { label: 'Disclaimer', value: selectedLog.disclaimer },
                { label: 'Generated At', value: selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : null },
              ].filter(f => f.value != null && f.value !== '').map((field, i) => (
                <div key={i} className="flex items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-36 shrink-0 pt-0.5">{field.label}</span>
                  <span className="text-sm text-slate-700">{String(field.value)}</span>
                </div>
              ))}
              {selectedLog.weightsApplied && Object.keys(selectedLog.weightsApplied).length > 0 && (
                <div className="flex items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-36 shrink-0 pt-0.5">Weights Applied</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedLog.weightsApplied).map(([k, v]) => (
                      <span key={k} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{k}: {v}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
