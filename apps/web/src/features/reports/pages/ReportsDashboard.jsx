import { Link } from 'react-router-dom';
import { FaChartBar, FaUsers, FaDownload, FaFileAlt, FaMoneyBillWave, FaFilter, FaShieldAlt } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const spendByDept = [
  { dept: 'Medicine', spend: 28.5 }, { dept: 'Applied Sci.', spend: 18.2 },
  { dept: 'Tech Studies', spend: 14.7 }, { dept: 'Management', spend: 8.3 },
  { dept: 'Animal Sci.', spend: 6.1 },
];

const complianceData = [
  { name: 'Compliant', value: 87, color: '#10b981' },
  { name: 'Minor Issues', value: 9, color: '#f59e0b' },
  { name: 'Non-Compliant', value: 4, color: '#ef4444' },
];

const reportTypes = [
  { title: 'Financial Analytics', desc: 'Comprehensive budget utilization and variance reporting.', icon: FaMoneyBillWave, color: 'blue', link: '/reports/spend' },
  { title: 'Supplier Intelligence', desc: 'AI-driven vendor performance, risk scorecards & diversity metrics.', icon: FaUsers, color: 'purple', link: '/reports/vendor-performance' },
  { title: 'Procurement KPI Metrics', desc: 'Cycle times, savings tracking, and operational efficiency.', icon: FaChartBar, color: 'emerald', link: '/reports/spend' },
  { title: 'GOSL Compliance Audit', desc: 'Regulatory compliance tracking for the Auditor-General.', icon: FaFileAlt, color: 'amber', link: '/archive' },
  { title: 'User Audit Trail', desc: 'Login, logout, password changes, and security activity monitoring.', icon: FaShieldAlt, color: 'indigo', link: '/reports/user-audit' },
];

export default function ReportsDashboard() {
  return (
    <div className="space-y-6 pb-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-purple-100/50 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Advanced Reporting Engine</h1>
        </div>
        <div className="flex items-center space-x-4 relative z-10">
          <button className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center shadow-sm">
            <FaFilter className="mr-2 text-slate-400" /> Filter Data
          </button>
          <button className="px-6 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition-all flex items-center transform hover:-translate-y-0.5">
            <FaDownload className="mr-2" /> Export Dashboard
          </button>
        </div>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {reportTypes.map((r, i) => {
          const Icon = r.icon;
          return (
            <Link key={i} to={r.link} className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 relative overflow-hidden flex flex-col">
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out pointer-events-none ${
                r.color === 'emerald' ? 'bg-emerald-100' : r.color === 'blue' ? 'bg-blue-100' : r.color === 'purple' ? 'bg-purple-100' : r.color === 'indigo' ? 'bg-indigo-100' : 'bg-amber-100'
              }`} />
              <div className="relative z-10 flex-1">
                <div className="flex items-center space-x-4 mb-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${
                    r.color === 'emerald' ? 'bg-emerald-500' : r.color === 'blue' ? 'bg-blue-500' : r.color === 'purple' ? 'bg-purple-500' : r.color === 'indigo' ? 'bg-indigo-500' : 'bg-amber-500'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors leading-tight">{r.title}</h3>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{r.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Department */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Spend by Department</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">YTD Expenditure (LKR Millions)</p>
          </div>
          <div className="grow w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendByDept} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dept" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                <Bar dataKey="spend" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={32} name="Total Spend" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compliance Pie */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">GOSL Compliance Status</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Audit compliance across all active tenders</p>
          </div>
          <div className="grow flex flex-col justify-center items-center relative">
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complianceData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {complianceData.map((entry, idx) => <Cell key={idx} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-4 w-full">
              {complianceData.map((c, i) => (
                <div key={i} className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2 shadow-sm" style={{ background: c.color }} />
                  <span className="text-sm font-bold text-slate-700">{c.name} <span className="text-slate-400 font-medium ml-1">({c.value}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
