
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jul', spend: 8.2, budget: 12 }, { month: 'Aug', spend: 11.5, budget: 12 },
  { month: 'Sep', spend: 9.8, budget: 12 }, { month: 'Oct', spend: 14.1, budget: 15 },
  { month: 'Nov', spend: 12.3, budget: 15 }, { month: 'Dec', spend: 10.7, budget: 15 },
  { month: 'Jan', spend: 12.5, budget: 18 }, { month: 'Feb', spend: 15.2, budget: 18 },
  { month: 'Mar', spend: 8.7, budget: 18 }, { month: 'Apr', spend: 22.1, budget: 20 },
];

export default function SpendAnalysis() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Spend Analysis</h1><p className="text-sm text-slate-500 mt-1">Budget utilization and expenditure tracking — FY 2026</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[{ label: 'Total Spend YTD', value: 'LKR 111.4M' }, { label: 'Budget Utilized', value: '68.5%' }, { label: 'Savings Achieved', value: 'LKR 8.2M' }, { label: 'Avg Cycle Time', value: '18 Days' }].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><p className="text-xs text-slate-500">{kpi.label}</p><p className="text-xl font-bold text-slate-900 mt-1">{kpi.value}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly Spend vs Budget (LKR M)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="budget" stroke="#94a3b8" strokeDasharray="5 5" fillOpacity={0} /><Area type="monotone" dataKey="spend" stroke="#10b981" fill="#10b98130" strokeWidth={2} /></AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
