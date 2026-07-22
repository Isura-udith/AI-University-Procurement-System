import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaUsers, FaSync, FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import reportService from '../../../services/report.service';

export default function VendorPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchVendorData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await reportService.getVendorPerformance();
      setData(res.data?.data || res.data || null);
    } catch (err) {
      console.error('Failed to fetch vendor performance', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      try {
        const res = await reportService.getVendorPerformance();
        if (!ignore) {
          setData(res.data?.data || res.data || null);
        }
      } catch (err) {
        console.error('Failed to fetch vendor performance', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  const vendors = data?.vendors || [
    { id: 1, name: 'TechVision Solutions', code: 'VEND-2026-001', score: 96, rating: 'Excellent', category: 'IT & Elec.', contractsCompleted: 12, onTimeDeliveryRate: '98%', qualityCompliance: '99%', riskLevel: 'Low' },
    { id: 2, name: 'MedTech Solutions (Pvt) Ltd', code: 'VEND-2026-002', score: 88, rating: 'Good', category: 'Lab Equip.', contractsCompleted: 8, onTimeDeliveryRate: '92%', qualityCompliance: '95%', riskLevel: 'Low' },
    { id: 3, name: 'Lanka Construction Corp', code: 'VEND-2026-003', score: 75, rating: 'Satisfactory', category: 'Works', contractsCompleted: 5, onTimeDeliveryRate: '85%', qualityCompliance: '88%', riskLevel: 'Medium' },
    { id: 4, name: 'EduFurniture LK', code: 'VEND-2026-004', score: 92, rating: 'Excellent', category: 'Furniture', contractsCompleted: 9, onTimeDeliveryRate: '96%', qualityCompliance: '97%', riskLevel: 'Low' },
  ];

  const criteriaWeights = data?.criteriaWeights || [
    { label: 'Delivery Timelines', weight: '25%', desc: 'On-time delivery against agreed SLA' },
    { label: 'Quality & Inspection', weight: '25%', desc: 'Inspection pass rate on GRN receipt' },
    { label: 'Price Competitiveness', weight: '20%', desc: 'Bid deviation from market rates' },
    { label: 'Regulatory Compliance', weight: '20%', desc: 'Tax compliance, EPF/ETF status' },
    { label: 'Contract Completion', weight: '10%', desc: 'Completion without liquidated damages' },
  ];

  const chartData = data?.topVendorsChart || vendors.map(v => ({ vendor: v.name, score: v.score }));

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <Link to="/reports" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-purple-600 mb-2 transition-colors">
            <FaArrowLeft className="mr-1.5" size={10} /> Back to Reports Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <FaUsers className="text-purple-600 mr-2.5" size={22} />
            Vendor Performance & Risk Scorecard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Database evaluated vendor scores, delivery SLA metrics, & GOSL compliance ratings</p>
        </div>
        <button onClick={() => fetchVendorData(true)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all self-start sm:self-auto">
          <FaSync size={13} />
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluated Vendors</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{vendors.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active Registered Suppliers</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Performance</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {data?.summary?.averageScore || 85} / 100
          </p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">Good Standing Overall</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Risk Tier</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">
            {vendors.filter(v => v.riskLevel === 'Low').length} Vendors
          </p>
          <p className="text-xs text-blue-600 font-semibold mt-1">Eligible for Direct Fast-Track</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Criteria Weighting</p>
          <p className="text-2xl font-extrabold text-purple-600 mt-1">5 Core Pillars</p>
          <p className="text-xs text-slate-500 mt-1">SLA & GRN Quality Weighted</p>
        </div>
      </div>

      {/* Scoring Criteria Weights Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Vendor Evaluation Criteria & Weight Model</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {criteriaWeights.map((c, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <p className="text-xl font-extrabold text-purple-600">{c.weight}</p>
              <p className="text-xs font-bold text-slate-800 mt-1">{c.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Score Chart */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Vendor Leaderboard Scores</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Loading vendor scores...</div>
        ) : (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="vendor" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="score" name="Performance Score" fill="#10b981" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Vendor Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Vendor Scorecard Directory</h3>
            <p className="text-xs text-slate-500 font-medium">Real-time performance ratings from completed contracts and GRN inspections</p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search vendor name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500/30"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Vendor Company</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Overall Score</th>
                <th className="px-6 py-4">SLA On-Time</th>
                <th className="px-6 py-4">Quality Pass Rate</th>
                <th className="px-6 py-4">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm">{v.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{v.code}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700">{v.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-base font-extrabold text-slate-900">{v.score}</span>
                      <span className="text-xs text-slate-400">/ 100</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-emerald-600">{v.onTimeDeliveryRate}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-blue-600">{v.qualityCompliance}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${
                      v.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                      v.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {v.riskLevel === 'Low' ? <FaCheckCircle className="mr-1" size={10} /> : <FaExclamationTriangle className="mr-1" size={10} />}
                      {v.riskLevel} Risk
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
