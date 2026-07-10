import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaSignInAlt, FaUserTie, FaClock, FaMoneyBillWave, FaChartLine, FaShieldAlt, FaChevronRight, FaBoxOpen, FaStar, FaTrophy, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import uwuLogo from '../../../assets/logos/Logo_uwu.jpg';
import Footer from '../../../components/navigation/Footer';
import procurementService from '../../../services/procurement.service';

const HomePage = () => {
  const { isAuthenticated } = useSelector(state => state.auth);
  const [scrolled, setScrolled] = useState(false);
  const [liveNotices, setLiveNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [analytics, setAnalytics] = useState({
    spendData: [],
    categoryData: [],
    monthlyStatusData: [],
    topVendors: [],
    categorySpendData: [],
    recentAwards: [],
    kpis: {
      totalSpendYTD: 'LKR 452M',
      activeTenders: '24',
      registeredVendors: '1,248',
      complianceScore: '98.5%'
    }
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  // Fetch published procurements and public analytics
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resNotices, resAnalytics] = await Promise.all([
          procurementService.getPublic(),
          procurementService.getPublicAnalytics()
        ]);
        
        const items = resNotices.data || resNotices || [];
        setLiveNotices(items);

        const analyticsData = resAnalytics.data || resAnalytics;
        if (analyticsData) {
          setAnalytics({
            spendData: analyticsData.spendData || [],
            categoryData: analyticsData.categoryData || [],
            monthlyStatusData: analyticsData.monthlyStatusData || [],
            topVendors: analyticsData.topVendors || [],
            categorySpendData: analyticsData.categorySpendData || [],
            recentAwards: analyticsData.recentAwards || [],
            kpis: analyticsData.kpis || {
              totalSpendYTD: 'LKR 452M',
              activeTenders: '24',
              registeredVendors: '1,248',
              complianceScore: '98.5%'
            }
          });
        }
      } catch (err) {
        console.warn('Failed to fetch public data:', err);
        setLiveNotices([]);
      } finally {
        setLoadingNotices(false);
      }
    };
    fetchData();
  }, []);

  const formatTime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const activeTenders = liveNotices.map(p => ({
      id: p.referenceNumber || p._id,
      title: p.title,
      type: (p.procurementMethod || 'NCB').split(' - ')[0],
      value: `LKR ${(p.totalEstimatedCost || 0).toLocaleString()}`,
      category: p.category || 'Goods',
      publishedAt: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''),
    }));

  const {
    spendData,
    categoryData,
    monthlyStatusData,
    topVendors,
    categorySpendData,
    recentAwards
  } = analytics;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Glassmorphic Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
            <div className="bg-white p-1 rounded-full shadow-md"><img src={uwuLogo} alt="UWU Logo" className="w-10 h-10 object-contain rounded-full" /></div>
            <div>
              <h1 className={`text-xl font-bold leading-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>Uva Wellassa University</h1>
              <p className={`text-xs font-bold tracking-wide uppercase transition-colors ${scrolled ? 'text-emerald-600' : 'text-emerald-400'}`}>Smart Procurement System</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            {['Active Tenders', 'Analytics', 'Contract Awards'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className={`text-sm font-semibold transition-colors hover:text-emerald-500 ${scrolled ? 'text-slate-600' : 'text-slate-200'}`}>{item}</a>
            ))}
            <Link to="/login" className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-full shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 flex items-center">
              LOGIN
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section with Dynamic Gradient & Glassmorphism */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-800 to-emerald-900 opacity-90 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay z-0"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-8 leading-tight drop-shadow-lg">
              AI DRIVEN <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-400">SMART PROCUREMENT SYSTEM</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed font-light max-w-3xl mx-auto">
              An AI driven, multi tenant SaaS platform accelerating value for money through intelligent automation, transparent e-tendering, and rigorous compliance management.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link to={isAuthenticated ? "/dashboard" : "/login"} className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold rounded-full shadow-xl hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-1 flex items-center justify-center">
                Access Dashboard
              </Link>
              <Link to="/vendor-register" className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-base font-bold rounded-full backdrop-blur-md transition-all flex items-center justify-center">
                Vendor Registration
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats Bar - Pulled up to overlap hero */}
      <section className="relative z-20 -mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 grid grid-cols-1 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {[
            { label: 'Total Spend (YTD)', value: analytics.kpis?.totalSpendYTD || 'LKR 452M', icon: FaMoneyBillWave, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Active Tenders', value: String(analytics.kpis?.activeTenders ?? '24'), icon: FaBoxOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Registered Vendors', value: String(analytics.kpis?.registeredVendors ?? '1,248'), icon: FaUserTie, color: 'text-indigo-600', bg: 'bg-indigo-100' },
            { label: 'Compliance Score', value: analytics.kpis?.complianceScore || '98.5%', icon: FaShieldAlt, color: 'text-purple-600', bg: 'bg-purple-100' }
          ].map((stat, i) => (
            <div key={i} className={`flex items-center space-x-4 ${i !== 0 ? 'pt-6 md:pt-0 md:pl-8' : ''}`}>
              <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} shadow-inner`}><stat.icon size={24} /></div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Common Procurement Dashboard Elements */}
      <section id="analytics" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex justify-between items-end">
            <div>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">University Procurement Analytics</h3>
              <p className="text-slate-500 mt-2 text-lg">Real-time financial tracking and budget utilization insights.</p>
            </div>
            <Link to="/reports/spend" className="hidden sm:flex text-emerald-600 hover:text-emerald-700 font-bold items-center transition-colors">View Full Report <FaChevronRight className="ml-1 text-xs" /></Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Spend Chart */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center"><FaChartLine className="mr-3 text-emerald-500" /> Spend vs Budget (FY 2026)</h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="budget" stroke="#cbd5e1" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                    <Area type="monotone" dataKey="spend" stroke="#10b981" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <h4 className="text-lg font-bold text-slate-800 mb-6">Spend by Category</h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 13, fontWeight: 600}} width={80} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={24}>
                      {categoryData.map((entry, index) => (
                        <cell key={`cell-${index}`} fill={['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b'][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Expanded Analytics Row: Monthly Status, Category Spend, Vendor Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Monthly Status Trends (Stacked Bar) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col hover:shadow-md transition-shadow">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">Monthly Status Trends</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Requisition volume over time</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col hover:shadow-md transition-shadow">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">Category Spend</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Budget utilization by item category</p>
              </div>
              <div className="grow flex flex-col justify-center items-center relative">
                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categorySpendData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                        {categorySpendData.map((entry, idx) => <Cell key={idx} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 w-full px-2">
                  {categorySpendData.map((m, i) => (
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
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center"><FaTrophy className="text-amber-500 mr-2" /> Top Vendors</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Performance rating out of 100</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {topVendors.map((vendor) => (
                  <div key={vendor.id} className="p-3 mb-2 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors">
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
        </div>
      </section>

      {/* Tenders & Awards Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Active Tenders */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <h3 id="active-tenders" className="text-2xl font-extrabold text-slate-900 flex items-center">Live Procurement Notices</h3>
              {activeTenders.length > 3 && (
                <span className="text-sm font-semibold text-slate-500">Showing 3 of {activeTenders.length}</span>
              )}
            </div>
            <div className="space-y-4">
              {activeTenders.slice(0, 3).map(t => (
                <div key={t.id} className="group p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-100 transition-all cursor-pointer bg-slate-50 hover:bg-white relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${t.type === 'ICB' ? 'bg-purple-100 text-purple-700' : t.type === 'Shopping' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{t.type}</span>
                      <span className="text-xs font-mono text-slate-400">{t.id}</span>
                    </div>
                    {t.value && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">{t.value}</span>}
                    {t.security && <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-md">{t.security} Security</span>}
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg leading-tight mb-3 group-hover:text-emerald-700 transition-colors">{t.title}</h4>
                  <div className="flex items-center space-x-3">
                    {t.category && <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">{t.category}</span>}
                    {t.publishedAt && (
                      <span className="text-xs font-medium text-slate-400">Published: {t.publishedAt}</span>
                    )}
                    {t.close && (
                      <div className="flex items-center text-sm font-semibold text-amber-600 bg-amber-50 w-fit px-3 py-1.5 rounded-lg border border-amber-100">
                        <FaClock className="mr-2" /> Closes in: {formatTime(t.close)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loadingNotices && (
                <div className="text-center py-8 text-sm text-slate-400">Loading procurement notices...</div>
              )}
              {!loadingNotices && activeTenders.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">No procurement notices published yet.</div>
              )}
            </div>
          </div>

          {/* Recent Contract Awards */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <h3 id="contract-awards" className="text-2xl font-extrabold text-slate-900 flex items-center">Recent Contract Awards</h3>
              <Link to="/awards" className="text-emerald-600 hover:text-emerald-700 font-bold text-sm">See Archive</Link>
            </div>
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-2">
              {recentAwards.map((award, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-white rounded-2xl transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-200">
                      {award.vendor.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{award.vendor}</p>
                      <p className="text-xs font-medium text-slate-500">{award.title} • {award.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-800">{award.value}</p>
                    <p className="text-[10px] font-mono text-slate-400">{award.contract}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Tenant System Portals */}
      <section className="py-20 bg-slate-50 border-t border-b border-slate-200/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Access Portals</h3>
            <p className="text-slate-500 mt-2 text-base max-w-xl mx-auto">
              Select the appropriate portal to access internal university workflows or secure supplier bidding dashboards.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* University Staff */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-350 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100/80 shadow-inner shrink-0">
                    <FaSignInAlt size={24} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">University Staff Portal</h4>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-8">
                  Secure access for university officials, procurement managers, technical evaluators, and committee members to manage requisitions, budgets, and bid approvals.
                </p>
              </div>
              <Link to="/login" className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20 w-fit">
                <span>Access Staff Portal</span>
                <FaChevronRight className="ml-2 text-xs" />
              </Link>
            </div>
 
            {/* Vendor Portal */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-350 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100/80 shadow-inner shrink-0">
                    <FaUserTie size={24} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">Supplier Portal</h4>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-8">
                  For registered suppliers and prospective bidders to submit digital bids securely, review compliance requirements, upload credentials, and check contract status.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link to="/login" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/20">
                  <span>Supplier Login</span>
                  <FaChevronRight className="ml-2 text-xs" />
                </Link>
                <Link to="/vendor-register" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-slate-100 hover:bg-slate-250 text-slate-700 text-sm font-semibold rounded-xl transition-all border border-slate-200">
                  <span>Register as Vendor</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Premium Footer */}
      <Footer variant="public" theme="dark" />
    </div>
  );
};

export default HomePage;
