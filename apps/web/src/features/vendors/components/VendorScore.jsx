import { FaStar, FaTrophy, FaExclamationTriangle, FaShieldAlt } from "react-icons/fa";

export function ScoreProgressBar({ label, value, max = 100, suffix = "%" }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const getBarColor = (val) => {
    if (val >= 80) return "bg-emerald-500";
    if (val >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-900 font-bold">
          {value} {suffix}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(
            percentage
          )}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function VendorScore({ score = 0, metrics = {} }) {
  const getBadgeTier = (s) => {
    if (s >= 85) return { label: "Tier 1 — Preferred", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: FaTrophy };
    if (s >= 70) return { label: "Tier 2 — Verified", color: "bg-blue-100 text-blue-800 border-blue-300", icon: FaShieldAlt };
    if (s >= 50) return { label: "Tier 3 — Moderate Risk", color: "bg-amber-100 text-amber-800 border-amber-300", icon: FaStar };
    return { label: "High Risk / Under Review", color: "bg-red-100 text-red-800 border-red-300", icon: FaExclamationTriangle };
  };

  const tier = getBadgeTier(score);
  const Icon = tier.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Performance Scorecard</h3>
          <p className="text-xs text-slate-500 mt-0.5">Automated rating based on procurement history</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center space-x-1.5 ${tier.color}`}>
          <Icon size={12} />
          <span>{tier.label}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
        <div className="relative flex items-center justify-center">
          <div
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-white shadow-md font-extrabold ${
              score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
            }`}
          >
            <span className="text-3xl leading-none">{score}</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider opacity-80 mt-1">
              / 100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1 w-full text-center sm:text-left">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">Completed Contracts</span>
            <span className="text-base font-bold text-slate-900">{metrics.completedContracts || 0}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">Quality Rating</span>
            <span className="text-base font-bold text-slate-900">{metrics.qualityRating || 0} / 5</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">Delivery Score</span>
            <span className="text-base font-bold text-slate-900">{metrics.deliveryTimeliness || 0}%</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">Compliance Score</span>
            <span className="text-base font-bold text-slate-900">{metrics.complianceScore || 0}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <ScoreProgressBar label="Delivery Timeliness" value={metrics.deliveryTimeliness || 0} />
        <ScoreProgressBar label="Quality Rating" value={metrics.qualityRating || 0} max={5} suffix="/ 5" />
        <ScoreProgressBar label="Price Competitiveness" value={metrics.priceCompetitiveness || 0} />
        <ScoreProgressBar label="Compliance Score" value={metrics.complianceScore || 0} />
      </div>
    </div>
  );
}
