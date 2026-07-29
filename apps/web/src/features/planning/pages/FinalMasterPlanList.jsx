import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaPlus, FaSpinner, FaClipboardList, FaSearch, FaChevronRight, FaMoneyBillWave, FaFilter, FaFileAlt, FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import planningService from '../../../services/planning.service';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  hod_review: { label: 'HOD Review', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  hod_approved: { label: 'HOD Approved', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  dean_review: { label: 'Dean Review', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  dean_approved: { label: 'Dean Approved', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  bursar_review: { label: 'Bursar Review', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  bursar_approved: { label: 'Bursar Approved', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  finance_committee_review: { label: 'Finance Committee Review', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  finance_committee_approved: { label: 'Finance Committee Approved', color: 'bg-lime-100 text-lime-800 border-lime-300' },
  vc_review: { label: 'VC Review', color: 'bg-violet-100 text-violet-800 border-violet-300' },
  vc_approved: { label: 'VC Approved', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300' },
  council_review: { label: 'Council Review', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  council_approved: { label: 'Council Approved', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-700 border-gray-300' },
};

export default function FinalMasterPlanList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadPlans() {
      setLoading(true);
      try {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        const res = await planningService.getFinalMasterPlans(params);
        if (!ignore) {
          const data = res?.data?.data || res?.data || [];
          setPlans(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          toast.error('Failed to load Final Master Plans');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  const filteredPlans = plans.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (p.title || '').toLowerCase().includes(q) ||
           (p.referenceNumber || '').toLowerCase().includes(q) ||
           (p.faculty || '').toLowerCase().includes(q);
  });

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-300' };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <FaSpinner className="text-4xl text-emerald-600 animate-spin" />
        <p className="text-slate-600 font-semibold">Loading Final Master Plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">  
          <FaFileAlt size={160} /> 
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Final Master Plans</h1>
          </div>
          <Link
            to="/planning/final-master-plans/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            <FaPlus size={11} /> <span>Create Final Master Plan</span>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Final Plans</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{plans.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Compiled Plans</p>
          </div>
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <FaClipboardList size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Plans</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {plans.filter(p => p.status === 'active' || p.status === 'council_approved').length}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Approved & Published</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FaCheckCircle size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Action</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {plans.filter(p => p.status.includes('review') || p.status.includes('submitted')).length}
            </p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">In Approval Pipeline</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FaExclamationTriangle size={18} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Value</p>
            <p className="text-xl font-black text-blue-700 mt-1">
              LKR {(plans.reduce((acc, p) => acc + (p.totalEstimatedBudget || p.bursarEstimatedBudget || 0), 0) / 1000000).toFixed(1)}M
            </p>
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Estimated Budget</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FaMoneyBillWave size={18} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <FaSearch className="absolute left-3 top-2.5 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search by title, reference, faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <FaFilter className="text-slate-400 text-sm" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="hod_review">HOD Review</option>
            <option value="dean_review">Dean Review</option>
            <option value="bursar_review">Bursar Review</option>
            <option value="finance_committee_review">Finance Committee Review</option>
            <option value="vc_review">VC Review</option>
            <option value="council_review">Council Review</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-16 text-center">
          <FaClipboardList className="text-5xl text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Final Master Plans Found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Create a new Final Master Plan by importing approved draft procurement items.
          </p>
          <Link
            to="/planning/final-master-plans/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition-all"
          >
            <FaPlus /> Create Final Master Plan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPlans.map(plan => (
            <div
              key={plan._id}
              onClick={() => navigate(`/planning/final-master-plans/${plan._id}`)}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer p-5 group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-mono text-slate-500 font-bold">{plan.referenceNumber || 'Pending...'}</p>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5 group-hover:text-emerald-700 transition-colors">
                    {plan.title}
                  </h3>
                </div>
                <FaChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors text-sm mt-1" />
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {getStatusBadge(plan.status)}
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                  {plan.items?.length || 0} Items
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                  Year: {plan.planYear}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <FaMoneyBillWave className="text-emerald-500" />
                  <span>LKR {(plan.totalEstimatedBudget || plan.bursarEstimatedBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <span className="text-slate-400">
                  {plan.faculty || 'All Faculties'}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>By: {plan.createdBy?.name || plan.createdBy?.email || 'Unknown'}</span>
                <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
