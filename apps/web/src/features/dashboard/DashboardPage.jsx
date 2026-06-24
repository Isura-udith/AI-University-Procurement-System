import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import SupplierDashboard from './SupplierDashboard';
import {
  FaClipboardList, FaMoneyCheckAlt, FaUsers, FaFileContract,
  FaArrowUp, FaArrowDown, FaClock, FaRobot, FaChartLine,
  FaExclamationTriangle, FaCheckCircle,
  FaBoxOpen, FaShieldAlt, FaChevronRight,
  FaStar, FaTrophy
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart, Legend } from 'recharts';

const KPI_DATA = [
  { label: 'Active Requisitions', value: '24', change: '+3', trend: 'up', icon: FaClipboardList, color: 'emerald', path: '/procurements' },
  { label: 'Pending Approvals', value: '8', change: '-2', trend: 'down', icon: FaClock, color: 'amber', path: '/approvals' },
  { label: 'Active Contracts', value: '15', change: '+1', trend: 'up', icon: FaFileContract, color: 'blue', path: '/contracts' },
  { label: 'Registered Vendors', value: '1,248', change: '+42', trend: 'up', icon: FaUsers, color: 'indigo', path: '/vendors' },
];

const SPEND_DATA = [
  { month: 'Jan', spent: 12.5, budget: 18 }, { month: 'Feb', spent: 15.2, budget: 18 },
  { month: 'Mar', spent: 8.7, budget: 18 }, { month: 'Apr', spent: 22.1, budget: 20 },
  { month: 'May', spent: 14.3, budget: 20 }, { month: 'Jun', spent: 0, budget: 20 },
];

const PIPELINE_DATA = [
  { stage: 'Requisition', count: 12 }, { stage: 'Approval', count: 8 },
  { stage: 'Budget Lock', count: 5 }, { stage: 'Tendering', count: 7 },
  { stage: 'Evaluation', count: 3 }, { stage: 'Award', count: 2 },
  { stage: 'Contract', count: 4 }, { stage: 'Delivery', count: 6 },
];

const METHOD_DATA = [
  { name: 'NCB', value: 45, color: '#10b981' },
  { name: 'ICB', value: 15, color: '#6366f1' },
  { name: 'Shopping', value: 30, color: '#f59e0b' },
  { name: 'Direct', value: 10, color: '#ef4444' },
];

const STATUS_DATA = [
  { name: 'Pending', value: 25, color: '#f59e0b' },
  { name: 'Approved', value: 45, color: '#3b82f6' },
  { name: 'In Progress', value: 15, color: '#8b5cf6' },
  { name: 'Completed', value: 10, color: '#10b981' },
  { name: 'Rejected', value: 5, color: '#ef4444' },
];

const LEAD_TIME_DATA = [
  { method: 'NCB', days: 45 },
  { method: 'ICB', days: 90 },
  { method: 'Shopping', days: 21 },
  { method: 'Direct', days: 7 },
];

const FACULTY_SPEND = [
  { name: 'FAS', spend: 45, budget: 50 },
  { name: 'FOM', spend: 85, budget: 90 },
  { name: 'FOTS', spend: 30, budget: 40 },
  { name: 'FOAHS', spend: 20, budget: 35 },
  { name: 'MGT', spend: 15, budget: 20 },
];

const CATEGORY_SPEND_DATA = [
  { name: 'IT & Elec.', value: 35, color: '#3b82f6' },
  { name: 'Lab Equip.', value: 25, color: '#10b981' },
  { name: 'Furniture', value: 20, color: '#f59e0b' },
  { name: 'Consulting', value: 15, color: '#8b5cf6' },
  { name: 'Vehicles', value: 5, color: '#ef4444' },
];

const MONTHLY_STATUS_DATA = [
  { month: 'Jan', Pending: 10, Approved: 25, Completed: 15 },
  { month: 'Feb', Pending: 12, Approved: 28, Completed: 18 },
  { month: 'Mar', Pending: 18, Approved: 22, Completed: 25 },
  { month: 'Apr', Pending: 15, Approved: 30, Completed: 20 },
  { month: 'May', Pending: 25, Approved: 15, Completed: 10 },
];

const TOP_VENDORS = [
  { id: 1, name: 'TechCorp Solutions', score: 96, category: 'IT & Elec.', trend: 'up' },
  { id: 2, name: 'MediSupply Co.', score: 88, category: 'Lab Equip.', trend: 'up' },
  { id: 3, name: 'BuildPro Const.', score: 75, category: 'Works', trend: 'down' },
  { id: 4, name: 'EduFurniture LK', score: 92, category: 'Furniture', trend: 'up' },
  { id: 5, name: 'Global Consult.', score: 68, category: 'Consulting', trend: 'down' },
];

const RECENT_ACTIVITY = [
  { id: 1, action: 'Requisition submitted', ref: 'UWU/G/NCB/2026/012', user: 'Dr. A. Perera', time: '5 min ago', type: 'create', path: '/procurements' },
  { id: 2, action: 'Approval granted by HOD', ref: 'UWU/G/NCB/2026/009', user: 'Prof. K. Silva', time: '15 min ago', type: 'approve', path: '/approvals' },
  { id: 3, action: 'Budget lock confirmed', ref: 'UWU/W/NCB/2026/003', user: 'System (Auto)', time: '32 min ago', type: 'lock', path: '/budget-lock' },
  { id: 4, action: 'Bid submission received', ref: 'UWU/G/NCB/2026/001', user: 'Vendor: MedTech', time: '1 hr ago', type: 'bid', path: '/bid-box' },
  { id: 5, action: 'AI flagged pricing anomaly', ref: 'UWU/S/ICB/2026/002', user: 'AI Engine', time: '2 hrs ago', type: 'alert', path: '/reports' },
];

const AI_INSIGHTS = [
  { id: 1, severity: 'warning', title: 'Budget Overrun Risk', desc: 'Faculty of Applied Sciences Q2 spend trending 18% above DAPP allocation.', time: '10 min ago' },
  { id: 2, severity: 'info', title: 'Demand Forecast Ready', desc: 'Lab consumables demand for July-Sept predicted at LKR 8.2M.', time: '1 hr ago' },
  { id: 3, severity: 'danger', title: 'Collusion Pattern Detected', desc: 'Bid prices from 3 vendors show statistical clustering (p < 0.05).', time: '2 hrs ago' },
];

const PENDING_TASKS = [
  { id: 1, task: 'Review & approve requisition', ref: 'UWU/G/NCB/2026/012', deadline: '2 days', priority: 'high', path: '/approvals' },
  { id: 2, task: 'Sign conflict of interest declaration', ref: 'BEC-2026-003', deadline: '1 day', priority: 'urgent', path: '/evaluation' },
  { id: 3, task: 'Complete bid evaluation scoring', ref: 'UWU/G/NCB/2026/001', deadline: '5 days', priority: 'medium', path: '/evaluation' },
  { id: 4, task: 'Verify 3-way match for delivery', ref: 'PO-2026-045', deadline: '3 days', priority: 'high', path: '/delivery' },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100', border: 'border-emerald-200' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100', border: 'border-amber-200' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100', border: 'border-blue-200' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-100', border: 'border-indigo-200' },
};

export default function DashboardPage() {
  const { user } = useSelector(state => state.auth);

  if (user?.role === 'supplier') {
    return <SupplierDashboard />;
  }

  return (
    <div className="space-y-8 pb-10">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_DATA.map((kpi, i) => {
          const Icon = kpi.icon;
          const colors = colorMap[kpi.color];
          return (
            <Link to={kpi.path} key={i} className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 relative overflow-hidden block">
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${colors.light} opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out pointer-events-none`} />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${colors.bg} shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{kpi.value}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">{kpi.label}</p>
                  </div>
                </div>
                <div className={`flex items-center px-2 py-1 rounded-lg text-xs font-bold ${kpi.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {kpi.trend === 'up' ? <FaArrowUp size={10} className="mr-1" /> : <FaArrowDown size={10} className="mr-1" />}
                  {kpi.change}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend vs Budget Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                Spend vs Budget Allocation
              </h3>
            </div>
          </div>
          <div className="grow w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SPEND_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                <Area type="monotone" dataKey="budget" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="6 6" fillOpacity={0} name="Budget" />
                <Area type="monotone" dataKey="spent" stroke="#10b981" strokeWidth={3} fill="url(#spendGrad)" name="Actual Spend" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Procurement Methods Pie */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Procurement Methods</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Distribution of active procurements</p>
          </div>
          <div className="grow flex flex-col justify-center items-center relative">
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={METHOD_DATA} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {METHOD_DATA.map((entry, idx) => <Cell key={idx} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4 w-full px-4">
              {METHOD_DATA.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center text-xs font-bold text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm" style={{ background: m.color }} />
                    {m.name}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Analytics Row: Lead Time & Faculty Spend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Time by Method */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Procurement Lead Time</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Average days from requisition to award by method</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LEAD_TIME_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="method" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                <Bar dataKey="days" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} name="Avg Days" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Faculty Spend Distribution */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Faculty Spend Distribution</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Actual spend vs budget allocation (LKR Millions)</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FACULTY_SPEND} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} width={50} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="budget" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} name="Budget" />
                <Bar dataKey="spend" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} name="Spend" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Row: Pipeline & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Bar Chart */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Procurement Pipeline</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Volume by lifecycle stage</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PIPELINE_DATA} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} width={90} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} name="Items" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Procurement Statuses Pie */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Procurement Statuses</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Current state of requisitions</p>
          </div>
          <div className="grow flex flex-col justify-center items-center relative">
            <div className="w-full h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={STATUS_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {STATUS_DATA.map((entry, idx) => <Cell key={idx} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 w-full px-2">
              {STATUS_DATA.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center text-[11px] font-bold text-slate-600 truncate mr-2">
                    <span className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm shrink-0" style={{ background: m.color }} />
                    <span className="truncate">{m.name}</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-900">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My Pending Tasks */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">My Action Items</h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Tasks requiring your attention</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm shadow-inner">
              {PENDING_TASKS.length}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {PENDING_TASKS.map((task, i) => (
              <Link to={task.path} key={task.id} className={`group px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${i !== PENDING_TASKS.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="flex items-center space-x-4 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${task.priority === 'urgent' ? 'bg-red-500 shadow-red-200' :
                    task.priority === 'high' ? 'bg-amber-500 shadow-amber-200' : 'bg-blue-400 shadow-blue-200'
                    }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{task.task}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{task.ref}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 shrink-0 pl-4">
                  <span className="text-xs font-semibold text-slate-500 flex items-center bg-slate-100 px-2.5 py-1 rounded-md">
                    <FaClock className="mr-1.5 text-slate-400" /> {task.deadline}
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 group-hover:border-emerald-500 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-all">
                    <FaChevronRight size={10} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded Analytics Row: Monthly Status, Category Spend, Vendor Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Status Trends (Stacked Bar) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Monthly Status Trends</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Requisition volume over time</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_STATUS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569' }} />
                <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={30} />
                <Bar dataKey="Approved" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Spend Distribution (Donut) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Category Spend</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Budget utilization by item category</p>
          </div>
          <div className="grow flex flex-col justify-center items-center relative">
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={CATEGORY_SPEND_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                    {CATEGORY_SPEND_DATA.map((entry, idx) => <Cell key={idx} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 w-full px-2">
              {CATEGORY_SPEND_DATA.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center text-[11px] font-bold text-slate-600 truncate mr-2">
                    <span className="w-2.5 h-2.5 rounded-full mr-1.5 shadow-sm shrink-0" style={{ background: m.color }} />
                    <span className="truncate">{m.name}</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-900">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Vendor Performance List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center"><FaTrophy className="text-amber-500 mr-2" /> Top Vendors</h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Performance rating out of 100</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {TOP_VENDORS.map((vendor) => (
              <div key={vendor.id} className="p-3 mx-2 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <FaStar className="text-amber-400" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{vendor.name}</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{vendor.category}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-3">
                  <div className={`flex items-center text-sm font-bold ${vendor.score >= 90 ? 'text-emerald-600' : vendor.score >= 80 ? 'text-blue-600' : vendor.score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    {vendor.score}
                  </div>
                  <div className={`flex items-center text-[10px] font-bold mt-1 ${vendor.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {vendor.trend === 'up' ? <FaArrowUp size={8} className="mr-0.5" /> : <FaArrowDown size={8} className="mr-0.5" />}
                    {vendor.trend === 'up' ? '+2%' : '-1%'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: AI Insights & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Intelligence Feed */}
        <div className="bg-slate-900 rounded-3xl shadow-lg flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
                <FaRobot size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">AI Intelligence Feed</h3>
                <p className="text-xs font-medium text-emerald-400 mt-0.5">Automated ML risk analysis</p>
              </div>
            </div>
            <Link to="/ai/market-monitoring" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20">Open AI Hub</Link>
          </div>
          <div className="flex-1 p-2 relative z-10">
            {AI_INSIGHTS.map((insight) => (
              <Link to="/ai/market-monitoring" key={insight.id} className="block m-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className={`mt-0.5 shrink-0 ${insight.severity === 'danger' ? 'text-red-400' :
                    insight.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                    {insight.severity === 'danger' ? <FaExclamationTriangle size={16} /> :
                      insight.severity === 'warning' ? <FaExclamationTriangle size={16} /> :
                        <FaChartLine size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-white">{insight.title}</p>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-3">{insight.time}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{insight.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity Audit */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">System Activity</h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Real-time audit trail log</p>
            </div>
            <Link to="/reports" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">View Audit Log</Link>
          </div>
          <div className="flex-1 p-2">
            {RECENT_ACTIVITY.map((act) => (
              <Link to={act.path} key={act.id} className="group p-3 mx-2 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${act.type === 'create' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    act.type === 'approve' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      act.type === 'lock' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                        act.type === 'bid' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          act.type === 'alert' ? 'bg-red-50 text-red-600 border border-red-100' :
                            'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                    {act.type === 'create' ? <FaClipboardList size={14} /> :
                      act.type === 'approve' ? <FaCheckCircle size={14} /> :
                        act.type === 'lock' ? <FaMoneyCheckAlt size={14} /> :
                          act.type === 'bid' ? <FaBoxOpen size={14} /> :
                            act.type === 'alert' ? <FaExclamationTriangle size={14} /> :
                              <FaShieldAlt size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{act.action}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      <span className="font-mono">{act.ref}</span> • {act.user}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400 shrink-0 whitespace-nowrap pl-4 flex items-center">
                  {act.time} <FaChevronRight size={10} className="ml-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
