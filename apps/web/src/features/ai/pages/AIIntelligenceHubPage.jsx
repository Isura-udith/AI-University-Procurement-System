import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FaRobot, FaChartBar, FaShieldAlt, FaBalanceScale,
  FaGlobeAmericas, FaHistory, FaLightbulb, FaChartLine,
  FaSpinner, FaExclamationTriangle, FaArrowRight,
  FaBrain, FaEye, FaTimes,
} from 'react-icons/fa';
import aiService from '../../../services/ai.service';
import procurementService from '../../../services/procurement.service';
import tenderService from '../../../services/tender.service';

// ─── Feature Registry ─────────────────────────────────────────────
const AI_FEATURES = [
  {
    id: 'chat-assistant',
    feature: 'Interactive',
    title: 'AI Procurement Assistant',
    subtitle: 'Flowise & Gemini Conversational Agent',
    description: 'Ask questions about procurement guidelines, specifications, policies, or compare quotations interactively using our customized AI agent.',
    icon: FaRobot,
    gradient: 'from-teal-500 to-emerald-600',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
    path: '/ai/chat',
    roles: ['department_user', 'department_head', 'procurement_officer', 'admin', 'vc', 'dean', 'super_admin'],
    requiresId: false,
    category: 'Requisition',
  },
  {
    id: 'market-price',
    feature: '1 & 4',
    title: 'Market Price Intelligence',
    subtitle: 'NLP Requisition Parsing',
    description: 'Type your procurement needs in plain language. Gemini AI extracts specifications and calculates optimal price bands from market data.',
    icon: FaLightbulb,
    gradient: 'from-emerald-500 to-teal-600',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    path: '/ai/market-price',
    roles: ['department_user', 'department_head', 'procurement_officer', 'admin', 'super_admin'],
    requiresId: false,
    category: 'Requisition',
  },
  {
    id: 'bid-verification',
    feature: '2',
    title: 'Bid Price Verification',
    subtitle: 'Anomaly & Collusion Detection',
    description: 'AI audits all submitted quotations against market averages, historical records, and peer bids. Flags overpricing and collusion patterns.',
    icon: FaShieldAlt,
    gradient: 'from-blue-500 to-indigo-600',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    path: '/ai/bid-verification',
    roles: ['procurement_officer', 'tec_member', 'admin', 'super_admin'],
    requiresId: 'tender',
    category: 'Evaluation',
  },
  {
    id: 'smart-recommendations',
    feature: '3',
    title: 'Smart Decision Support',
    subtitle: 'Trade-off Analysis (BEC)',
    description: 'Multi-dimensional vendor analysis providing Best Price, Best Value, Fastest Delivery, and Lowest Risk recommendations for the committee.',
    icon: FaBalanceScale,
    gradient: 'from-violet-500 to-purple-600',
    badgeColor: 'bg-violet-100 text-violet-700 border-violet-200',
    path: '/ai/recommendations',
    roles: ['procurement_officer', 'tec_member', 'admin', 'vc', 'dean', 'super_admin'],
    requiresId: 'tender',
    category: 'Evaluation',
  },
  {
    id: 'market-monitoring',
    feature: '5',
    title: 'Dynamic Market Monitoring',
    subtitle: 'Macroeconomic Intelligence',
    description: 'Continuous scanning of exchange rates, inflation, and commodity trends. Proactive alerts when market volatility threatens procurement budgets.',
    icon: FaGlobeAmericas,
    gradient: 'from-indigo-500 to-blue-600',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    path: '/ai/market-monitoring',
    roles: ['procurement_officer', 'bursar', 'finance_officer', 'admin', 'vc', 'super_admin'],
    requiresId: false,
    category: 'Monitoring',
  },
  {
    id: 'risk-assessment',
    feature: '6',
    title: 'Procurement Risk Scoring',
    subtitle: '5-Factor Weighted Analysis',
    description: 'Dynamic risk score (Low/Medium/High) evaluating price deviation, vendor history, delivery patterns, spec restrictiveness, and documents.',
    icon: FaExclamationTriangle,
    gradient: 'from-orange-500 to-red-600',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
    path: '/ai/risk-assessment',
    roles: ['procurement_officer', 'bursar', 'finance_officer', 'admin', 'vc', 'dean', 'super_admin'],
    requiresId: 'procurement',
    category: 'Risk',
  },
  {
    id: 'comparative-analysis',
    feature: '7',
    title: 'Comparative Quotation Analysis',
    subtitle: 'Unified Compatibility Scoring',
    description: 'Side-by-side vendor comparison matrix with compatibility scores out of 100, weighted by price, warranty, delivery, and financial strength.',
    icon: FaChartBar,
    gradient: 'from-pink-500 to-rose-600',
    badgeColor: 'bg-pink-100 text-pink-700 border-pink-200',
    path: '/ai/comparative-analysis',
    roles: ['procurement_officer', 'tec_member', 'admin', 'super_admin'],
    requiresId: 'tender',
    category: 'Evaluation',
  },
  {
    id: 'historical-match',
    feature: '8',
    title: 'Historical Procurement Analysis',
    subtitle: 'Past Transaction Matching',
    description: 'Maps current requisitions to past transactions. Alerts if current cost is disproportionate to previous purchases of similar items.',
    icon: FaHistory,
    gradient: 'from-teal-500 to-cyan-600',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
    path: '/ai/historical-match',
    roles: ['procurement_officer', 'bursar', 'finance_officer', 'admin', 'super_admin'],
    requiresId: 'procurement',
    category: 'Analysis',
  },
  {
    id: 'demand-forecast',
    feature: '9',
    title: 'Demand Forecasting',
    subtitle: 'Academic Calendar Intelligence',
    description: 'AI-predicted procurement demand by faculty/category, seasonal patterns aligned with UWU academic calendar and intake periods.',
    icon: FaChartLine,
    gradient: 'from-purple-500 to-pink-600',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    path: '/ai/market-monitoring',
    roles: ['procurement_officer', 'bursar', 'finance_officer', 'admin', 'vc', 'super_admin'],
    requiresId: false,
    category: 'Forecasting',
    note: 'Available inside Market Monitoring',
  },
  {
    id: 'explainability',
    feature: '10',
    title: 'Explainability & Audit Trail',
    subtitle: 'Compliance & Decision Logs',
    description: 'Complete audit trail of Gemini AI prompts, responses, model configurations, latency metrics, and confidence weights. Aligns with PFM Act No. 44 of 2024.',
    icon: FaEye,
    gradient: 'from-slate-600 to-slate-800',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    path: '/ai/explainability',
    roles: ['auditor', 'admin', 'vc', 'super_admin', 'procurement_officer'],
    requiresId: false,
    category: 'Audit',
  },
];

const CATEGORY_COLORS = {
  Requisition: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Evaluation:  'bg-blue-50 text-blue-700 border-blue-200',
  Monitoring:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  Risk:        'bg-orange-50 text-orange-700 border-orange-200',
  Analysis:    'bg-teal-50 text-teal-700 border-teal-200',
  Forecasting: 'bg-purple-50 text-purple-700 border-purple-200',
  Audit:       'bg-slate-50 text-slate-700 border-slate-200',
};

const STATUS_CFG = {
  connected:      { bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: 'text-emerald-800', sub: 'text-emerald-700' },
  quota_exceeded: { bg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500',   label: 'text-amber-800',   sub: 'text-amber-700' },
  unconfigured:   { bg: 'bg-red-50 border-red-200',         dot: 'bg-red-500',     label: 'text-red-800',     sub: 'text-red-700' },
  error:          { bg: 'bg-red-50 border-red-200',         dot: 'bg-red-500',     label: 'text-red-800',     sub: 'text-red-700' },
};

const STATUS_LABELS = {
  connected:      'Connected',
  quota_exceeded: 'Quota Exceeded',
  unconfigured:   'Not Configured',
  error:          'Connection Error',
};

// ─── Sub-components ───────────────────────────────────────────────

function AIStatusBanner({ aiStatus }) {
  const cfg = STATUS_CFG[aiStatus.status] || {
    bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400', label: 'text-slate-800', sub: 'text-slate-600',
  };
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-5 py-3.5 ${cfg.bg}`}>
      <span className={`mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full ${cfg.dot} ${aiStatus.status === 'connected' ? 'animate-pulse' : ''}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${cfg.label}`}>
          Gemini AI &mdash; {aiStatus.model || '?'}&nbsp;&middot;&nbsp;
          {STATUS_LABELS[aiStatus.status] || aiStatus.status}
        </p>
        <p className={`text-xs mt-0.5 ${cfg.sub}`}>{aiStatus.message}</p>
        {aiStatus.detail && aiStatus.status !== 'connected' && (
          <details className="mt-1">
            <summary className={`text-[11px] cursor-pointer font-semibold ${cfg.sub} opacity-70`}>Technical detail</summary>
            <pre className={`mt-1 text-[10px] whitespace-pre-wrap break-all font-mono ${cfg.sub} opacity-80`}>{aiStatus.detail}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

function IdPickerModal({ type, items, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => items.filter(i =>
      (i.label || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.ref  || '').toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800">Select {type === 'tender' ? 'Tender' : 'Procurement'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choose a record to analyze</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <FaTimes size={14} />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${type}s...`}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
          />
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              {items.length === 0 ? `No ${type}s found in the system` : 'No matches for your search'}
            </div>
          )}
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="w-full text-left px-5 py-4 hover:bg-emerald-50 transition-colors group"
            >
              <p className="font-semibold text-slate-800 group-hover:text-emerald-700 text-sm">{item.label}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{item.ref}</p>
              {item.status && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mt-1 inline-block capitalize">{item.status}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function AIIntelligenceHubPage() {
  const { user } = useSelector(state => state.auth);
  const navigate  = useNavigate();

  const [stats,        setStats]        = useState(null);
  const [tenders,      setTenders]      = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [picker,       setPicker]       = useState(null);
  const [filter,       setFilter]       = useState('All');
  const [aiStatus,     setAiStatus]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [tRes, pRes, sRes] = await Promise.allSettled([
          tenderService.getAll({ limit: 50 }),
          procurementService.getAll({ limit: 50 }),
          aiService.getExplainabilityStats(),
        ]);

        if (cancelled) return;

        if (tRes.status === 'fulfilled') {
          const t = tRes.value || {};
          setTenders((t.data || t.tenders || []).map(x => ({
            id:     x._id,
            label:  x.title || x.tenderNumber || 'Unnamed Tender',
            ref:    x.tenderNumber || '',
            status: x.status,
          })));
        }
        if (pRes.status === 'fulfilled') {
          const p = pRes.value || {};
          setProcurements((p.data || p.procurements || []).map(x => ({
            id:     x._id,
            label:  x.title || x.referenceNumber || 'Unnamed Procurement',
            ref:    x.referenceNumber || '',
            status: x.status,
          })));
        }
        if (sRes.status === 'fulfilled') {
          setStats(sRes.value?.data || sRes.value);
        }

        // Non-blocking AI status check
        aiService.getAIStatus()
          .then(r => { if (!cancelled) setAiStatus(r?.data || r); })
          .catch(() => {
            if (!cancelled) setAiStatus({ status: 'error', model: '', message: 'Could not reach the AI status endpoint.' });
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const userRole = user?.role || '';

  const accessibleFeatures = useMemo(
    () => AI_FEATURES.filter(f => f.roles.includes(userRole)),
    [userRole]
  );

  const categories = useMemo(
    () => ['All', ...new Set(AI_FEATURES.map(f => f.category))],
    []
  );

  const displayed = useMemo(
    () => filter === 'All' ? accessibleFeatures : accessibleFeatures.filter(f => f.category === filter),
    [accessibleFeatures, filter]
  );

  const handleFeatureClick = (feature) => {
    if (!feature.requiresId) { navigate(feature.path); return; }
    setPicker({ feature });
  };

  const handlePickId = (id) => {
    const { feature } = picker;
    setPicker(null);
    navigate(`${feature.path}/${id}`);
  };

  const pickerItems = picker?.feature?.requiresId === 'tender' ? tenders : procurements;

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-linear-to-br from-slate-700 via-slate-600 to-slate-700 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
                <FaBrain size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Gemini AI Powered</p>
                <h1 className="text-3xl font-black text-white">AI Intelligence Hub</h1>
              </div>
            </div>
            <p className="text-slate-300 max-w-xl text-sm leading-relaxed">
              Nine integrated AI features powered by Google Gemini AI, designed for Sri Lanka&apos;s
              Procurement Guidelines 2024.
            </p>
          </div>

          {/* Stats KPIs */}
          {!loading && stats && (
            <div className="grid grid-cols-3 gap-3 shrink-0">
              {[
                { label: 'Total AI Analyses', value: stats.total      || 0,                        icon: FaRobot,      color: 'text-emerald-400' },
                { label: 'Last 24 Hours',      value: stats.last24h   || 0,                        icon: FaChartLine,  color: 'text-blue-400'    },
                { label: 'Feature Types',      value: stats.byFeature?.length || 0,                icon: FaChartBar,   color: 'text-violet-400'  },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center backdrop-blur-sm">
                  <s.icon className={`mx-auto mb-2 ${s.color}`} size={18} />
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Status Banner */}
      {aiStatus && <AIStatusBanner aiStatus={aiStatus} />}

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              filter === cat
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
        {['auditor', 'admin', 'vc', 'super_admin', 'procurement_officer'].includes(userRole) && (
          <Link
            to="/ai/explainability"
            className="ml-auto flex items-center space-x-2 px-4 py-1.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <FaEye size={12} />
            <span>Audit Logs</span>
          </Link>
        )}
      </div>

      {/* Feature Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <FaSpinner className="animate-spin text-emerald-500 mx-auto" size={32} />
            <p className="text-sm text-slate-500">Loading AI Intelligence Hub...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayed.map(feature => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group relative bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-1"
                onClick={() => handleFeatureClick(feature)}
              >
                {/* Top accent bar */}
                <div className={`h-1 w-full bg-linear-to-r ${feature.gradient}`} />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${feature.gradient} flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[feature.category]}`}>
                        {feature.category}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        F-{feature.feature}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{feature.title}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{feature.subtitle}</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-3">{feature.description}</p>

                  {feature.note && (
                    <p className="text-xs text-slate-400 italic mt-2">ℹ {feature.note}</p>
                  )}

                  {/* Footer */}
                  <div className="mt-5 flex items-center justify-between">
                    {feature.requiresId ? (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
                        Requires {feature.requiresId} selection
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full">
                        Ready to launch
                      </span>
                    )}
                    <div className={`flex items-center space-x-1 text-xs font-bold text-transparent bg-clip-text bg-linear-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <span>Open</span>
                      <FaArrowRight size={10} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ID Picker Modal */}
      {picker && (
        <IdPickerModal
          type={picker.feature.requiresId}
          items={pickerItems}
          onSelect={handlePickId}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
