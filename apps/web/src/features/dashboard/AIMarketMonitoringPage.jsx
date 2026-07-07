import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaGlobeAmericas, FaExclamationTriangle, FaCheckCircle,
  FaChartLine, FaSpinner, FaInfoCircle, FaBell, FaArrowUp, FaArrowLeft,
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import aiService from '../../services/ai.service';

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500'    },
  high:     { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500'  },
  low:      { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'   },
};

// Explicit stat card configs — avoids dynamic Tailwind classes that get purged in production
const STAT_CARDS = [
  { key: 'total',      label: 'Total Alerts', icon: FaBell,               iconCls: 'text-blue-500',   valueCls: 'text-blue-600'   },
  { key: 'critical',   label: 'Critical',     icon: FaExclamationTriangle, iconCls: 'text-red-500',    valueCls: 'text-red-600'    },
  { key: 'high',       label: 'High',         icon: FaArrowUp,            iconCls: 'text-orange-500', valueCls: 'text-orange-600' },
  { key: 'categories', label: 'Categories',   icon: FaGlobeAmericas,      iconCls: 'text-indigo-500', valueCls: 'text-indigo-600' },
];

const PIE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6'];

export default function AIMarketMonitoringPage() {
  const [loading,         setLoading]         = useState(true);
  const [data,            setData]            = useState(null);
  const [forecast,        setForecast]        = useState(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [error,           setError]           = useState(null);

  const loadAlerts = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getMarketAlerts(refresh);
      setData(response.data || response);
    } catch (err) {
      setError(err.message || 'Failed to load market alerts');
    }
    setLoading(false);
  }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      await aiService.acknowledgeAlert(alertId, 'Reviewed');
      loadAlerts();
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await aiService.getMarketAlerts(false);
        if (!active) return;
        setData(response.data || response);
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load market alerts');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    (async () => {
      try {
        const response = await aiService.getDemandForecast({});
        if (!active) return;
        setForecast(response.data || response);
      } catch {
        /* optional */
      } finally {
        if (active) {
          setForecastLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const alerts = useMemo(() => data?.alerts || [], [data]);
  const market = useMemo(() => data?.marketSummary, [data]);

  // Memoised derived data
  const severityCounts = useMemo(() =>
    alerts.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {}),
    [alerts]
  );

  const pieData = useMemo(
    () => Object.entries(severityCounts).map(([name, value]) => ({ name, value })),
    [severityCounts]
  );

  const forecastChart = useMemo(
    () => (forecast?.predictions || []).slice(0, 6).map(p => ({
      name:  p.month || p.category || 'Q',
      value: p.predictedValue || 0,
    })),
    [forecast]
  );

  const statValues = {
    total:      alerts.length,
    critical:   severityCounts.critical || 0,
    high:       severityCounts.high     || 0,
    categories: data?.activeCategories?.length || 0,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/ai" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <FaGlobeAmericas className="mr-3 text-indigo-600" /> AI Market Monitoring
            </h1>
            <p className="text-sm text-slate-500 mt-1">Feature 5 &amp; 9: Real-time market intelligence, macroeconomic alerts, and demand forecasting</p>
          </div>
        </div>
        <button
          onClick={() => loadAlerts(true)}
          disabled={loading}
          className="px-4 py-2 bg-white border border-slate-200 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          {loading ? <FaSpinner className="animate-spin" size={12} /> : <FaGlobeAmericas size={12} />}
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-5 py-3.5 rounded-2xl font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaExclamationTriangle size={12} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-base font-bold px-2 py-0.5 rounded-lg transition-colors">×</button>
        </div>
      )}

      {/* Market Summary */}
      {market && (
        <div className="bg-linear-to-r from-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="flex items-center space-x-2 mb-4 relative z-10">
            <FaChartLine className="text-indigo-300" />
            <h3 className="font-bold">Market Overview</h3>
            <span className={`ml-auto px-3 py-1 text-xs font-bold rounded-full ${
              market.overallOutlook === 'favorable'  ? 'bg-emerald-500/20 text-emerald-300' :
              market.overallOutlook === 'challenging'? 'bg-red-500/20 text-red-300' :
              'bg-amber-500/20 text-amber-300'
            }`}>
              {market.overallOutlook?.toUpperCase()}
            </span>
          </div>
          {market.keyIndicators && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-xs text-indigo-200 font-semibold uppercase">Exchange Rate</p>
                <p className="text-lg font-bold mt-1">{market.keyIndicators.exchangeRate || 'N/A'}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-xs text-indigo-200 font-semibold uppercase">Inflation</p>
                <p className="text-sm font-semibold mt-1">{market.keyIndicators.inflationTrend || 'N/A'}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-xs text-indigo-200 font-semibold uppercase">Supply Chain</p>
                <p className="text-sm font-semibold mt-1">{market.keyIndicators.globalSupplyChain || 'N/A'}</p>
              </div>
            </div>
          )}
          {market.strategicRecommendations?.length > 0 && (
            <div className="mt-4 relative z-10">
              <p className="text-xs font-semibold text-indigo-300 uppercase mb-2">Strategic Recommendations</p>
              <div className="space-y-1.5">
                {market.strategicRecommendations.map((r, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <FaCheckCircle className="text-emerald-400 mt-0.5 shrink-0" size={11} />
                    <p className="text-sm text-slate-200">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alert Stats + Severity Pie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards — explicit class strings, no dynamic interpolation */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, iconCls, valueCls }) => (
            <div key={key} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <Icon className={`mx-auto mb-2 ${iconCls}`} size={18} />
              <p className={`text-2xl font-bold ${valueCls}`}>{statValues[key]}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Severity Pie */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Alerts Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Market Intelligence Alerts</h3>
          {loading && <FaSpinner className="animate-spin text-slate-400" size={14} />}
        </div>
        <div className="divide-y divide-slate-100">
          {alerts.length === 0 && !loading && (
            <div className="p-8 text-center text-sm text-slate-400">No active market alerts.</div>
          )}
          {alerts.map((alert, i) => {
            const s = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
            return (
              <div key={alert._id || i} className={`px-6 py-5 ${alert.acknowledged ? 'opacity-60' : ''} hover:bg-slate-50 transition-colors`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`w-3 h-3 rounded-full ${s.dot} mt-1.5 shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-bold text-slate-800">{alert.title}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${s.badge}`}>{alert.severity}</span>
                        {alert.alertType && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">{alert.alertType?.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{alert.description}</p>
                      {alert.affectedCategory && (
                        <p className="text-xs text-slate-500 mt-1.5">Affected Category: <strong>{alert.affectedCategory}</strong></p>
                      )}
                      {alert.recommendation && (
                        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <p className="text-xs text-blue-700"><strong>Recommendation:</strong> {alert.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert._id)}
                      className="ml-4 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demand Forecast */}
      {(forecast || forecastLoading) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md">
              <FaChartLine size={16} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Demand Forecast</h3>
              <p className="text-xs text-slate-500">AI-predicted procurement demand for the next quarter</p>
            </div>
          </div>

          {forecastLoading ? (
            <div className="h-[200px] flex flex-col items-center justify-center space-y-2 text-slate-400">
              <FaSpinner className="animate-spin text-purple-600" size={24} />
              <span className="text-xs font-semibold">Gemini is forecasting quarterly university demand...</span>
            </div>
          ) : (
            <>
              {forecastChart.length > 0 && (
                <div className="h-[250px] w-full mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" fill="url(#purpleGradient)" radius={[6, 6, 0, 0]} name="Predicted Value (LKR)" />
                      <defs>
                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#6d28d9" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {forecast?.recommendations?.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Recommendations</p>
                  {forecast.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start space-x-2 text-sm">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        r.priority === 'high' ? 'bg-red-500' : r.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-slate-700">{r.action} {r.category && <span className="text-slate-400">({r.category})</span>}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Governance */}
      <div className="flex items-start space-x-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
        <FaInfoCircle className="text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500">Market alerts are AI-generated estimates based on model training data. Verify with official CBSL and market sources before taking procurement action.</p>
      </div>
    </div>
  );
}
