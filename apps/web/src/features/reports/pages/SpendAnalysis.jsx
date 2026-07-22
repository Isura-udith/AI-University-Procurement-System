import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FaMoneyBillWave, FaChartPie, FaDownload, FaSync, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import reportService from '../../../services/report.service';

export default function SpendAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSpendData = async () => {
    try {
      const res = await reportService.getSpendAnalysis();
      setData(res.data?.data || res.data || null);
    } catch (err) {
      console.error('Failed to fetch spend analysis', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchSpendData();
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const res = await reportService.getSpendAnalysis();
        if (isMounted) {
          setData(res.data?.data || res.data || null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch spend analysis', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const overview = data?.overview || {
    totalSpendYTD: 'LKR 111.4M',
    budgetUtilized: '68.5%',
    savingsAchieved: 'LKR 8.2M',
    avgCycleTime: '18 Days',
    totalPaidYTD: 'LKR 84.2M',
    totalRequisitions: 45,
  };

  const monthlySpend = data?.monthlySpend || [
    { month: 'Jan', spend: 12.5, budget: 12.5 },
    { month: 'Feb', spend: 15.2, budget: 12.5 },
    { month: 'Mar', spend: 8.7, budget: 12.5 },
    { month: 'Apr', spend: 22.1, budget: 12.5 },
    { month: 'May', spend: 14.8, budget: 12.5 },
    { month: 'Jun', spend: 18.3, budget: 12.5 },
  ];

  const byDepartment = data?.byDepartment || [
    { dept: 'Medicine', spend: 28.5, count: 14 },
    { dept: 'Applied Sciences', spend: 18.2, count: 10 },
    { dept: 'Technology', spend: 14.7, count: 8 },
    { dept: 'Management', spend: 8.3, count: 5 },
    { dept: 'Animal Science', spend: 6.1, count: 4 },
  ];

  const byCategory = data?.byCategory || [
    { category: 'IT & Electronics', spend: 35.2, count: 18 },
    { category: 'Laboratory Equipment', spend: 25.4, count: 12 },
    { category: 'Furniture & Fixtures', spend: 18.1, count: 8 },
    { category: 'Maintenance & Repairs', spend: 12.6, count: 5 },
    { category: 'Consulting Services', spend: 8.5, count: 2 },
  ];

  const kpiCards = [
    { label: 'Total Spend YTD', value: overview.totalSpendYTD, sub: 'Approved Requisitions', color: 'emerald' },
    { label: 'Budget Utilized', value: overview.budgetUtilized, sub: 'Against Allocated Annual Budget', color: 'purple' },
    { label: 'Savings Achieved', value: overview.savingsAchieved, sub: 'Via Competitive Bidding', color: 'blue' },
    { label: 'Avg Cycle Time', value: overview.avgCycleTime, sub: 'Requisition to Award', color: 'amber' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <Link to="/reports" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-purple-600 mb-2 transition-colors">
            <FaArrowLeft className="mr-1.5" size={10} /> Back to Reports Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <FaMoneyBillWave className="text-emerald-500 mr-2.5" size={22} />
            Financial Spend & Budget Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time expenditure tracking, department allocation, and monthly trend analysis — FY 2026</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={handleRefresh} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all">
            <FaSync size={13} />
          </button>
          <button className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-emerald-500 transition-all flex items-center">
            <FaDownload className="mr-1.5" size={11} /> Export Spend Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly Spend Area Chart */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Monthly Spend vs Allocated Budget (LKR Millions)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Aggregated actual spend against monthly threshold targets</p>
          </div>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Loading spend chart...</div>
        ) : (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Area type="monotone" dataKey="budget" name="Monthly Budget Target" stroke="#94a3b8" strokeDasharray="5 5" fillOpacity={0} strokeWidth={2} />
                <Area type="monotone" dataKey="spend" name="Actual Spend (LKR M)" stroke="#10b981" fill="#10b98125" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grid: Department & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Spend */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Spend by Faculty / Department</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDepartment} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} width={110} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="spend" name="Spend (LKR M)" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <FaChartPie className="text-purple-500 mr-2" size={16} />
              Category Spend Breakdown
            </h3>
            <div className="space-y-3">
              {byCategory.map((cat, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{cat.category}</p>
                    <p className="text-[10px] text-slate-400">{cat.count} Requisitions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">LKR {cat.spend}M</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
