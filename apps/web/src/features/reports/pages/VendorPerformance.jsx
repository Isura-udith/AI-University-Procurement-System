
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { vendor: 'MedTech', score: 88 }, { vendor: 'Lanka Const.', score: 95 },
  { vendor: 'TechVision', score: 72 }, { vendor: 'UniSupply', score: 65 }, { vendor: 'SafeGuard', score: 81 },
];

export default function VendorPerformance() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Vendor Performance</h1><p className="text-sm text-slate-500 mt-1">AI-scored vendor scorecards and risk assessment</p></div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Top Vendor Scores</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="vendor" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Scoring Criteria Weights</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[{ label: 'Delivery', weight: '25%' }, { label: 'Quality', weight: '25%' }, { label: 'Price', weight: '20%' }, { label: 'Compliance', weight: '20%' }, { label: 'Completion', weight: '10%' }].map((c, i) => (
            <div key={i} className="text-center p-3 bg-slate-50 rounded-lg"><p className="text-lg font-bold text-emerald-600">{c.weight}</p><p className="text-xs text-slate-500 mt-1">{c.label}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}
