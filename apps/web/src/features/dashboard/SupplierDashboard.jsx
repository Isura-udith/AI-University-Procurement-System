import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBoxOpen, FaFileContract, FaClock, FaMoneyCheckAlt, FaBuilding,
  FaChevronRight, FaSearch, FaTimes, FaShieldAlt, FaDownload, FaList,
  FaFilePdf, FaFileWord, FaFileExcel, FaFileAlt, FaEllipsisV, FaEye,
  FaTag, FaExclamationTriangle, FaGavel, FaClipboardList,
   FaCalendarAlt, FaSort,FaUserCheck
} from 'react-icons/fa';
import procurementService from '../../services/procurement.service';
import tenderService from '../../services/tender.service';
import contractService from '../../services/contract.service';
import paymentService from '../../services/payment.service';
import vendorService from '../../services/vendor.service';

const SupplierDashboard = () => {
  const [activeTenders, setActiveTenders] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [myContracts, setMyContracts] = useState([]);
  const [myPayments, setMyPayments] = useState([]);
  const [hasVendorProfile, setHasVendorProfile] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTender, setSelectedTender] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeTab, setActiveTab] = useState('notices');
  
  // Sorting states for Notices table
  const [sortField, setSortField] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const getDownloadUrl = (filePath) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
    const path = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${base}${path}`;
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FaFilePdf className="text-red-500 shrink-0" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-blue-500 shrink-0" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FaFileExcel className="text-emerald-500 shrink-0" />;
    return <FaFileAlt className="text-slate-400 shrink-0" />;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  };

  const formatLKR = (v) => {
    if (v == null) return '0.00';
    return Number(v).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Fetch all necessary dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch public tenders (always available)
        const tendersRes = await procurementService.getPublic();
        setActiveTenders(tendersRes.data || []);

        // 2. Fetch vendor profile (catch 404 if profile does not exist)
        let profile = null;
        try {
          const profileRes = await vendorService.getMe();
          profile = profileRes.data || profileRes;
          setHasVendorProfile(true);
        } catch (profileErr) {
          console.warn('Vendor profile not found for current user', profileErr);
          setHasVendorProfile(false);
        }

        // 3. If vendor profile exists, fetch bids, contracts, and payments
        if (profile) {
          const [bidsRes, contractsRes, paymentsRes] = await Promise.allSettled([
            tenderService.getMyBids(),
            contractService.getAll(),
            paymentService.getAll()
          ]);

          if (bidsRes.status === 'fulfilled') {
            setMyBids(bidsRes.value.data || bidsRes.value || []);
          }
          if (contractsRes.status === 'fulfilled') {
            setMyContracts(contractsRes.value.data || contractsRes.value || []);
          }
          if (paymentsRes.status === 'fulfilled') {
            setMyPayments(paymentsRes.value.data || paymentsRes.value || []);
          }
        }
      } catch (err) {
        console.error('Failed to load supplier dashboard data', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Handle outside click to close popover menus
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sorting helper for Notices
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort active tenders
  const filteredTenders = activeTenders
    .filter(t => {
      const matchesSearch = t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.tenderNumber || t.referenceNumber)?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let valA, valB;
      if (sortField === 'deadline') {
        valA = new Date(a.tenderId?.bidSubmissionDeadline || 0).getTime();
        valB = new Date(b.tenderId?.bidSubmissionDeadline || 0).getTime();
      } else if (sortField === 'estimatedValue') {
        valA = a.estimatedValue || a.totalEstimatedCost || 0;
        valB = b.estimatedValue || b.totalEstimatedCost || 0;
      } else {
        valA = new Date(a.publishedAt || 0).getTime();
        valB = new Date(b.publishedAt || 0).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination logic
  const totalItems = filteredTenders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTenders = filteredTenders.slice(startIndex, startIndex + itemsPerPage);

  // Count active contracts and pending payments
  const activeContractsCount = myContracts.filter(c => c.status === 'active').length;
  const pendingPaymentsCount = myPayments.filter(p => p.status !== 'paid').length;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Error Alert Banner ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 flex items-start space-x-3.5 shadow-sm animate-fade-in">
          <div className="bg-rose-100 p-3 rounded-2xl text-rose-700 shrink-0">
            <FaExclamationTriangle size={20} />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900">Dashboard Error</h4>
            <p className="text-xs text-slate-600 mt-1 font-medium max-w-xl">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Active Notices */}
        <div 
          onClick={() => handleTabChange('notices')}
          className={`group rounded-3xl border p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[128px] cursor-pointer ${
            activeTab === 'notices' 
              ? 'bg-blue-50/50 border-blue-200 ring-2 ring-blue-500/10' 
              : 'bg-white border-slate-100 hover:border-blue-205'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${
              activeTab === 'notices' ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              <FaBoxOpen size={20} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
              Open Bids
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {activeTenders.length}
            </h3>
            <p className="text-[11px] font-bold text-slate-455 mt-2 tracking-wider uppercase">
              Procurement Notices
            </p>
          </div>
        </div>

        {/* Card 2: My Submitted Bids */}
        <div 
          onClick={() => {
            if (hasVendorProfile) handleTabChange('bids');
          }}
          className={`group rounded-3xl border p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[128px] ${
            !hasVendorProfile 
              ? 'opacity-65 cursor-not-allowed bg-slate-50 border-slate-100' 
              : activeTab === 'bids'
                ? 'bg-amber-50/50 border-amber-200 ring-2 ring-amber-500/10 cursor-pointer' 
                : 'bg-white border-slate-100 hover:border-amber-205 cursor-pointer'
          }`}
          title={!hasVendorProfile ? "Requires vendor profile" : ""}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${
              activeTab === 'bids' ? 'bg-amber-600' : 'bg-amber-500'
            }`}>
              <FaClock size={20} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              My Submissions
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {myBids.length}
            </h3>
            <p className="text-[11px] font-bold text-slate-455 mt-2 tracking-wider uppercase">
              My Submitted Bids
            </p>
          </div>
        </div>

        {/* Card 3: My Active Contracts */}
        <div 
          onClick={() => {
            if (hasVendorProfile) handleTabChange('contracts');
          }}
          className={`group rounded-3xl border p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[128px] ${
            !hasVendorProfile 
              ? 'opacity-65 cursor-not-allowed bg-slate-50 border-slate-100' 
              : activeTab === 'contracts'
                ? 'bg-emerald-50/50 border-emerald-200 ring-2 ring-emerald-500/10 cursor-pointer' 
                : 'bg-white border-slate-100 hover:border-emerald-205 cursor-pointer'
          }`}
          title={!hasVendorProfile ? "Requires vendor profile" : ""}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${
              activeTab === 'contracts' ? 'bg-emerald-600' : 'bg-emerald-500'
            }`}>
              <FaFileContract size={20} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              In Force
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {activeContractsCount}
            </h3>
            <p className="text-[11px] font-bold text-slate-455 mt-2 tracking-wider uppercase">
              Active Contracts
            </p>
          </div>
        </div>

        {/* Card 4: Pending Payments */}
        <div 
          onClick={() => {
            if (hasVendorProfile) handleTabChange('payments');
          }}
          className={`group rounded-3xl border p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[128px] ${
            !hasVendorProfile 
              ? 'opacity-65 cursor-not-allowed bg-slate-50 border-slate-100' 
              : activeTab === 'payments'
                ? 'bg-purple-50/50 border-purple-200 ring-2 ring-purple-500/10 cursor-pointer' 
                : 'bg-white border-slate-100 hover:border-purple-205 cursor-pointer'
          }`}
          title={!hasVendorProfile ? "Requires vendor profile" : ""}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${
              activeTab === 'payments' ? 'bg-purple-600' : 'bg-purple-500'
            }`}>
              <FaMoneyCheckAlt size={20} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
              Processing
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {pendingPaymentsCount}
            </h3>
            <p className="text-[11px] font-bold text-slate-455 mt-2 tracking-wider uppercase">
              Pending Payments
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab Selector ── */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => handleTabChange('notices')}
          className={`pb-4 text-sm font-extrabold transition-all border-b-2 px-1 ${
            activeTab === 'notices' 
              ? 'border-blue-600 text-slate-955 font-black' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FaBoxOpen size={14} className={activeTab === 'notices' ? 'text-blue-600' : ''} />
            <span>Procurement Notices ({activeTenders.length})</span>
          </div>
        </button>

        {hasVendorProfile && (
          <>
            <button
              onClick={() => handleTabChange('bids')}
              className={`pb-4 text-sm font-extrabold transition-all border-b-2 px-1 ${
                activeTab === 'bids' 
                  ? 'border-amber-505 border-amber-500 text-slate-955 font-black' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaClipboardList size={14} className={activeTab === 'bids' ? 'text-amber-500' : ''} />
                <span>My Bids ({myBids.length})</span>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('contracts')}
              className={`pb-4 text-sm font-extrabold transition-all border-b-2 px-1 ${
                activeTab === 'contracts' 
                  ? 'border-emerald-500 text-slate-955 font-black' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaFileContract size={14} className={activeTab === 'contracts' ? 'text-emerald-500' : ''} />
                <span>My Contracts ({myContracts.length})</span>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('payments')}
              className={`pb-4 text-sm font-extrabold transition-all border-b-2 px-1 ${
                activeTab === 'payments' 
                  ? 'border-purple-500 text-slate-955 font-black' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaMoneyCheckAlt size={14} className={activeTab === 'payments' ? 'text-purple-500' : ''} />
                <span>Invoices & Payments ({myPayments.length})</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* ── Tab Content Panel ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Tab 1: Public Procurement Notices */}
        {activeTab === 'notices' && (
          <>
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/40">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-950 flex items-center">
                  Public Procurement Opportunities
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  Search, review specifications, and download bidding documents.
                </p>
              </div>

              {/* Filters Panel */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Category Selector Tabs */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl w-full sm:w-auto">
                  {['all', 'Goods', 'Services', 'Works'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                        categoryFilter === cat 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <input
                    type="text"
                    placeholder="Search notice ref or title..."
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                  <FaSearch className="absolute left-3 top-3 text-slate-400" size={11} />
                  {searchQuery && (
                    <button 
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <FaTimes size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
                  <p className="text-xs text-slate-500 font-bold">Loading notices...</p>
                </div>
              ) : filteredTenders.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-250">
                  <FaBoxOpen className="mx-auto text-slate-300 mb-3" size={36} />
                  <p className="text-sm font-extrabold text-slate-700">No active procurement notices found</p>
                  <p className="text-xs text-slate-505 mt-1 max-w-sm mx-auto">Try refining your search keyword or selecting a different category filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                        <th className="px-6 py-5 w-36 rounded-tl-2xl">Tender Number</th>
                        <th className="px-6 py-5">Title & Category</th>
                        <th 
                          className="px-6 py-5 text-right cursor-pointer hover:text-blue-600 transition-colors w-40 group"
                          onClick={() => handleSort('estimatedValue')}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Est. Value (LKR)</span>
                            <FaSort size={10} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-5 cursor-pointer hover:text-blue-600 transition-colors w-32 group"
                          onClick={() => handleSort('publishedAt')}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Published</span>
                            <FaSort size={10} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </th>
                        <th className="px-6 py-5 w-32">Method</th>
                        <th 
                          className="px-6 py-5 cursor-pointer hover:text-blue-600 transition-colors w-48 group"
                          onClick={() => handleSort('deadline')}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Deadline</span>
                            <FaSort size={10} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </th>
                        <th className="px-6 py-5 text-center w-28 rounded-tr-2xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedTenders.map((t) => {
                        const tenderDeadline = t.tenderId?.bidSubmissionDeadline;
                        const isDeadlinePassed = tenderDeadline ? new Date(tenderDeadline) < new Date() : false;
                        const canBid = t.tenderId && !isDeadlinePassed;

                        return (
                          <tr 
                            key={t._id} 
                            className="bg-white hover:bg-blue-50/30 transition-all duration-300 transform hover:-translate-y-1px hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.15)] group cursor-pointer relative z-0 hover:z-10" 
                            onClick={() => setSelectedTender(t)}
                          >
                            <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                              {t.tenderNumber || t.referenceNumber || t._id.substring(0, 8).toUpperCase()}
                            </td>
                            <td className="px-6 py-5 max-w-xs md:max-w-md">
                              <div className="font-normal text-sm text-slate-800 group-hover:text-blue-700 transition-colors truncate" title={t.title}>
                                {t.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-normal text-slate-500 uppercase tracking-wider">
                                  <FaTag size={8} className="mr-1 opacity-70" /> {t.category || 'Goods'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right font-extrabold text-slate-900 text-sm">
                              {formatLKR(t.estimatedValue || t.tce || t.totalEstimatedCost)}
                            </td>
                            <td className="px-6 py-5 text-xs font-bold text-slate-500">
                              {formatDateOnly(t.publishedAt)}
                            </td>
                            <td className="px-6 py-5">
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                t.procurementMethod === 'ICB' 
                                  ? 'bg-purple-100/50 text-purple-700 border border-purple-200/50' 
                                  : t.procurementMethod === 'Shopping' 
                                    ? 'bg-amber-100/50 text-amber-700 border border-amber-200/50' 
                                    : 'bg-blue-100/50 text-blue-700 border border-blue-200/50'
                              }`}>
                                {t.procurementMethod || 'NCB'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              {t.tenderId?.bidSubmissionDeadline ? (
                                <div className="space-y-1.5">
                                  <span className={`font-extrabold text-[13px] flex items-center gap-1.5 ${isDeadlinePassed ? 'text-rose-500' : 'text-slate-700'}`}>
                                    {isDeadlinePassed ? <FaExclamationTriangle size={12} className="text-rose-400" /> : <FaClock size={12} className="text-slate-400" />}
                                    {formatDateTime(t.tenderId.bidSubmissionDeadline)}
                                  </span>
                                  {!isDeadlinePassed && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full inline-block border border-emerald-100/50">
                                      Active Bidding
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs font-medium">Not Scheduled</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center relative action-menu-container">
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setActiveMenuId(activeMenuId === t._id ? null : t._id); 
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all inline-flex items-center"
                              >
                                <FaEllipsisV size={12} />
                              </button>
                              {activeMenuId === t._id && (
                                <div className="absolute right-6 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-35 text-left border-slate-150 animate-scale-in">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTender(t);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 border-b border-slate-100"
                                  >
                                    <FaEye className="text-slate-400" size={11} />
                                    <span>View Full Details</span>
                                  </button>
                                  {canBid && hasVendorProfile ? (
                                    <Link
                                      to={`/bid-box?tenderId=${t.tenderId._id}`}
                                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                      className="w-full px-4 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                                    >
                                      <FaChevronRight className="text-blue-500" size={11} />
                                      <span>Proceed to Bid</span>
                                    </Link>
                                  ) : (
                                    <button
                                      disabled
                                      className="w-full px-4 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed flex items-center space-x-2 text-left"
                                      title={!hasVendorProfile ? "Please register profile to bid" : "Bidding closed"}
                                    >
                                      <FaChevronRight className="text-slate-300" size={11} />
                                      <span>Bidding Closed</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {totalPages > 1 && filteredTenders.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30 rounded-b-3xl">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} entries
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      Previous
                    </button>
                    <div className="text-xs font-bold text-slate-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 2: My Bids & Proposals */}
        {activeTab === 'bids' && hasVendorProfile && (
          <>
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40">
              <h3 className="text-lg font-bold text-slate-955">My Bid Submissions</h3>
              <p className="text-xs font-semibold text-slate-400">Track and manage your submitted digital bid envelopes.</p>
            </div>
            
            <div className="p-6">
              {myBids.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-250">
                  <FaClipboardList className="mx-auto text-slate-350 mb-3" size={36} />
                  <p className="text-sm font-extrabold text-slate-700">No bids submitted yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Select a public notice to proceed with your proposal or click on "Bid Box" to submit.
                  </p>
                  <button 
                    onClick={() => handleTabChange('notices')}
                    className="mt-4 inline-flex items-center text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
                  >
                    Browse Notices
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                        <th className="px-6 py-5 rounded-tl-2xl">Bid Number</th>
                        <th className="px-6 py-5">Tender Reference & Title</th>
                        <th className="px-6 py-5 text-right">My Bid Amount (LKR)</th>
                        <th className="px-6 py-5">Submitted On</th>
                        <th className="px-6 py-5">Sealed Status</th>
                        <th className="px-6 py-5">Combined Score / Rank</th>
                        <th className="px-6 py-5 text-center rounded-tr-2xl">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {myBids.map(b => (
                        <tr key={b._id} className="bg-white hover:bg-blue-50/30 transition-all duration-300 transform hover:-translate-y-1px hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.15)] group relative z-0 hover:z-10">
                          <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                            {b.bidNumber || `BID-${b._id.substring(0, 6).toUpperCase()}`}
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-extrabold text-sm text-slate-800 group-hover:text-blue-700 transition-colors truncate max-w-xs md:max-w-sm">
                              {b.tenderId?.title || 'Unknown Tender'}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 mt-1 block tracking-wider">
                              {b.tenderId?.tenderNumber || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-extrabold text-slate-900 text-sm">
                            {formatLKR(b.totalBidAmount)}
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-500">
                            {formatDateTime(b.submittedAt)}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                              b.isSealed 
                                ? 'bg-amber-100/50 text-amber-700 border-amber-200/50' 
                                : 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50'
                            }`}>
                              {b.isSealed ? '🔐 Sealed' : '🔓 Unsealed'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            {b.combinedScore != null ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-black text-slate-800">{b.combinedScore}%</span>
                                {b.rank && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-600 font-black px-2 py-0.5 rounded-md border border-indigo-100/50">
                                    Rank #{b.rank}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic font-medium">Awaiting eval</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <Link
                              to={`/bid-box?tenderId=${b.tenderId?._id}`}
                              className="inline-flex items-center text-[11px] font-black text-blue-600 hover:text-blue-700 hover:underline gap-1 bg-blue-50/50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Open Box <FaChevronRight size={10} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 3: My Active Contracts */}
        {activeTab === 'contracts' && hasVendorProfile && (
          <>
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40">
              <h3 className="text-lg font-bold text-slate-955">Active Contracts</h3>
              <p className="text-xs font-semibold text-slate-400">View performance score, delivery milestones, and variations.</p>
            </div>

            <div className="p-6">
              {myContracts.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-250">
                  <FaFileContract className="mx-auto text-slate-350 mb-3" size={36} />
                  <p className="text-sm font-extrabold text-slate-700">No contracts active</p>
                  <p className="text-xs text-slate-550 mt-1">Contracts will appear here once a tender is awarded and agreements are finalized.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                        <th className="px-6 py-5 rounded-tl-2xl">Contract #</th>
                        <th className="px-6 py-5">Title & Reference</th>
                        <th className="px-6 py-5 text-right">Value (LKR)</th>
                        <th className="px-6 py-5">Duration</th>
                        <th className="px-6 py-5">SLA Score</th>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5 text-center rounded-tr-2xl">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {myContracts.map(c => (
                        <tr key={c._id} className="bg-white hover:bg-blue-50/30 transition-all duration-300 transform hover:-translate-y-1px hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.15)] group relative z-0 hover:z-10">
                          <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                            {c.contractNumber || c._id.substring(0, 8).toUpperCase()}
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-extrabold text-sm text-slate-800 group-hover:text-blue-700 transition-colors truncate max-w-xs">
                              {c.title}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 mt-1 block tracking-wider">
                              Ref: {c.procurementId?.referenceNumber || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-extrabold text-slate-900 text-sm">
                            {formatLKR(c.contractValue)}
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-500">
                            <div className="flex items-center space-x-1.5">
                              <FaCalendarAlt size={12} className="text-slate-400" />
                              <span>{formatDateOnly(c.startDate)} - {formatDateOnly(c.endDate)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-black text-slate-800">
                                {c.performanceMetrics?.overallRating || '95'}%
                              </span>
                              <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                              c.status === 'active' 
                                ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50' 
                                : 'bg-slate-100/50 text-slate-700 border-slate-200/50'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <Link
                              to={`/contracts/${c._id}`}
                              className="inline-flex items-center text-[11px] font-black text-blue-600 hover:text-blue-700 hover:underline gap-1 bg-blue-50/50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Manage <FaChevronRight size={10} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 4: Invoices & Payments */}
        {activeTab === 'payments' && hasVendorProfile && (
          <>
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40">
              <h3 className="text-lg font-bold text-slate-955">Invoices & Payments</h3>
              <p className="text-xs font-semibold text-slate-400">Track 3-way match audit verification, invoice approvals, and payment receipts.</p>
            </div>

            <div className="p-6">
              {myPayments.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-250">
                  <FaMoneyCheckAlt className="mx-auto text-slate-350 mb-3" size={36} />
                  <p className="text-sm font-extrabold text-slate-700">No payment records found</p>
                  <p className="text-xs text-slate-505 mt-1">Invoices submitted against active contract milestones will generate payments here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100 shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                        <th className="px-6 py-5 rounded-tl-2xl">Voucher Ref</th>
                        <th className="px-6 py-5">Invoice Number</th>
                        <th className="px-6 py-5 text-right">Net Amount (LKR)</th>
                        <th className="px-6 py-5">3-Way Match</th>
                        <th className="px-6 py-5">Disbursed Date</th>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5 text-center rounded-tr-2xl">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {myPayments.map(p => (
                        <tr key={p._id} className="bg-white hover:bg-blue-50/30 transition-all duration-300 transform hover:-translate-y-1px hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.15)] group relative z-0 hover:z-10">
                          <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                            {p.voucherNumber || `PV-${p._id.substring(0, 6).toUpperCase()}`}
                          </td>
                          <td className="px-6 py-5 font-extrabold text-slate-800 text-sm">
                            {p.invoice?.invoiceNumber || '—'}
                          </td>
                          <td className="px-6 py-5 text-right font-extrabold text-slate-900 text-sm">
                            {formatLKR(p.netAmount || p.totalBidAmount)}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                              p.threeWayMatchStatus === 'matched' 
                                ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50' 
                                : p.threeWayMatchStatus === 'discrepancy' 
                                  ? 'bg-rose-100/50 text-rose-700 border-rose-200/50' 
                                  : 'bg-slate-100/50 text-slate-600 border-slate-200/50'
                            }`}>
                              {p.threeWayMatchStatus || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-500">
                            {p.paidAt ? formatDateOnly(p.paidAt) : <span className="text-slate-400 italic">Processing</span>}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                              p.status === 'paid' 
                                ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50' 
                                : 'bg-amber-100/50 text-amber-700 border-amber-200/50'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <Link
                              to={`/payments/${p._id}`}
                              className="inline-flex items-center text-[11px] font-black text-blue-600 hover:text-blue-700 hover:underline gap-1 bg-blue-50/50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Details <FaChevronRight size={10} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Detailed Procurement Modal ── */}
      {selectedTender && (() => {
        const tenderDeadline = selectedTender.tenderId?.bidSubmissionDeadline;
        const isDeadlinePassed = tenderDeadline ? new Date(tenderDeadline) < new Date() : false;
        const canBid = selectedTender.tenderId && !isDeadlinePassed;

        const statusLabel = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const priorityColors = { low: 'bg-slate-100 text-slate-655', medium: 'bg-blue-105 text-blue-700', high: 'bg-amber-105 text-amber-700', urgent: 'bg-red-105 text-red-700' };
        const statusColors = {
          draft: 'bg-slate-100 text-slate-655', submitted: 'bg-blue-105 text-blue-700', under_review: 'bg-indigo-105 text-indigo-700',
          published: 'bg-emerald-105 text-emerald-700', bidding: 'bg-teal-105 text-teal-700', completed: 'bg-green-105 text-green-700',
          rejected: 'bg-red-105 text-red-700', cancelled: 'bg-red-105 text-red-655', on_hold: 'bg-amber-105 text-amber-700',
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTender(null)}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto animate-scale-in border border-slate-100" onClick={e => e.stopPropagation()}>
              {/* Sticky Header */}
              <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10 rounded-t-3xl">
                <div>
                  <h3 className="text-xl font-black text-slate-955 flex items-center">
                    <FaBuilding className="text-blue-600 mr-2.5" size={20} />
                    Procurement Notice Full Details
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="font-mono text-xs bg-slate-100 border border-slate-202 px-2.5 py-1 rounded-lg text-slate-700 font-bold">
                      {selectedTender.referenceNumber || selectedTender.tenderNumber || selectedTender._id}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusColors[selectedTender.status] || 'bg-slate-100 text-slate-655'}`}>
                      {statusLabel(selectedTender.status)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${priorityColors[selectedTender.priority] || 'bg-slate-100 text-slate-655'}`}>
                      {selectedTender.priority || 'Medium'} Priority
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedTender(null)} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-150">
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* ── Title, Description & Justification ──────────── */}
                <div className="bg-linear-to-br from-slate-50 to-indigo-50/20 p-6 rounded-2xl border border-slate-150 shadow-inner">
                  <h4 className="text-base font-black text-slate-900 leading-snug">{selectedTender.title}</h4>
                  <p className="text-xs text-slate-600 mt-3.5 leading-relaxed whitespace-pre-line font-medium">{selectedTender.description || 'No description provided.'}</p>
                  {selectedTender.justification && (
                    <div className="mt-4 pt-4 border-t border-slate-202/60">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">Justification</p>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium">{selectedTender.justification}</p>
                    </div>
                  )}
                </div>

                {/* ── Status & Classification Quick Info ──────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                    <FaTag className="mx-auto text-blue-500 mb-2" size={16} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Category</p>
                    <p className="text-xs font-black text-slate-808 mt-1">{selectedTender.category || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                    <FaMoneyCheckAlt className="mx-auto text-emerald-500 mb-2" size={16} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Est. Cost</p>
                    <p className="text-xs font-black text-emerald-600 mt-1">LKR {formatLKR(selectedTender.totalEstimatedCost || selectedTender.estimatedValue)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                    <FaGavel className="mx-auto text-indigo-500 mb-2" size={16} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Method</p>
                    <p className="text-xs font-black text-slate-808 mt-1">{selectedTender.procurementMethod || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                    <FaShieldAlt className="mx-auto text-amber-500 mb-2" size={16} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Committee</p>
                    <p className="text-xs font-black text-slate-808 mt-1">{selectedTender.assignedCommittee || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm text-center">
                    <FaUserCheck className="mx-auto text-purple-550 mb-2" size={16} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Approval Auth.</p>
                    <p className="text-xs font-black text-slate-808 mt-1">{statusLabel(selectedTender.approvalAuthority) || 'N/A'}</p>
                  </div>
                </div>

                {/* ── Key Timelines ─────────────────────────────────── */}
                <div className="space-y-4">
                  <h5 className="text-xs font-extrabold text-slate-900 flex items-center uppercase tracking-wider">
                    <FaClock className="text-indigo-550 mr-2" /> Key Timeline & Dates
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50/30 p-4.5 rounded-xl border border-blue-100/70">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Published Date</p>
                      <p className="text-xs font-extrabold text-slate-808 mt-1">{formatDateOnly(selectedTender.publishedAt)}</p>
                    </div>
                    <div className="bg-rose-50/30 p-4.5 rounded-xl border border-rose-100/70">
                      <p className="text-[9px] font-black text-rose-600 uppercase tracking-wider">Submission Deadline</p>
                      <p className="text-xs font-extrabold text-slate-808 mt-1">{formatDateTime(selectedTender.tenderId?.bidSubmissionDeadline)}</p>
                    </div>
                    <div className="bg-amber-50/30 p-4.5 rounded-xl border border-amber-100/70">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Clarification Deadline</p>
                      <p className="text-xs font-extrabold text-slate-808 mt-1">{formatDateTime(selectedTender.tenderId?.clarificationDeadline)}</p>
                    </div>
                    <div className="bg-purple-50/30 p-4.5 rounded-xl border border-purple-100/70">
                      <p className="text-[9px] font-black text-purple-600 uppercase tracking-wider">Pre-Bid Meeting</p>
                      <p className="text-xs font-extrabold text-slate-808 mt-1">{formatDateTime(selectedTender.tenderId?.preBidMeetingDate)}</p>
                    </div>
                  </div>
                </div>

                {/* ── Requirements & Financial Info ─────────────────── */}
                <div className="space-y-4">
                  <h5 className="text-xs font-extrabold text-slate-900 flex items-center uppercase tracking-wider">
                    <FaShieldAlt className="text-amber-550 mr-2" /> Requirements & Financial Specifications
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4.5">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-extrabold text-slate-400 mb-1">Currency</p>
                      <p className="text-xs font-black text-slate-800">{selectedTender.currency || 'LKR'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-extrabold text-slate-400 mb-1">VAT Inclusive</p>
                      <p className="text-xs font-black text-slate-800">
                        {selectedTender.vatInclusive ? 'Yes' : 'No'}
                        {selectedTender.vatAmount ? ` (LKR ${formatLKR(selectedTender.vatAmount)})` : ''}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-extrabold text-slate-400 mb-1">Document Fee</p>
                      <p className="text-xs font-black text-slate-800">
                        {selectedTender.tenderId?.documentFee ? `LKR ${formatLKR(selectedTender.tenderId.documentFee)}` : 'Free'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-extrabold text-slate-400 mb-1">Bid Security Required</p>
                      <p className="text-xs font-black text-slate-800">
                        {selectedTender.tenderId?.bidSecurityRequired
                          ? (selectedTender.tenderId.bidSecurityAmount
                            ? `LKR ${formatLKR(selectedTender.tenderId.bidSecurityAmount)} (${selectedTender.tenderId.bidSecurityValidityDays || 180} days)`
                            : 'Yes')
                          : 'No'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-extrabold text-slate-400 mb-1">DAPP Reference</p>
                      <p className="text-xs font-black text-slate-800">{selectedTender.dappReference || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-extrabold text-slate-400 mb-1">MPP Reference</p>
                      <p className="text-xs font-black text-slate-800">{selectedTender.mppReference || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* ── Line Items ────────────────────────────────────── */}
                <div className="space-y-4">
                  <h5 className="text-xs font-extrabold text-slate-900 flex items-center uppercase tracking-wider">
                    <FaList className="text-blue-600 mr-2" /> Items Specifications & Quantities ({selectedTender.items?.length || 0})
                  </h5>
                  <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-202 sticky top-0 z-10 text-slate-500 font-extrabold">
                        <tr>
                          <th className="px-4 py-3 text-center w-12">#</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Specifications</th>
                          <th className="px-4 py-3 text-center w-20">Qty</th>
                          <th className="px-4 py-3 text-center w-16">Unit</th>
                          <th className="px-4 py-3 text-right w-28">Unit Price</th>
                          <th className="px-4 py-3 text-right w-28">Total Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTender.items?.map((item, index) => (
                          <tr key={item._id || index} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-extrabold text-slate-400 text-center">{index + 1}</td>
                            <td className="px-4 py-3 font-extrabold text-slate-850">{item.description}</td>
                            <td className="px-4 py-3 text-slate-500 font-medium">{item.specifications || '—'}</td>
                            <td className="px-4 py-3 text-slate-808 font-black text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-slate-500 text-center font-bold">{item.unit}</td>
                            <td className="px-4 py-3 text-slate-700 font-bold text-right">{formatLKR(item.estimatedUnitPrice)}</td>
                            <td className="px-4 py-3 text-blue-750 font-black text-right">{formatLKR(item.estimatedTotalPrice || item.quantity * item.estimatedUnitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {selectedTender.items?.length > 0 && (
                        <tfoot className="bg-slate-50 border-t-2 border-slate-202">
                          <tr>
                            <td colSpan={6} className="px-4 py-3 text-right text-xs font-black text-slate-700 uppercase tracking-wider">Grand Total</td>
                            <td className="px-4 py-3 text-right text-sm font-black text-blue-755">{formatLKR(selectedTender.totalEstimatedCost || selectedTender.estimatedValue)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* ── Documents & Attachments ───────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Bidding Documents */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-extrabold text-slate-900 flex items-center uppercase tracking-wider">
                      <FaFileContract className="text-blue-500 mr-2" /> Bidding Documents
                    </h5>
                    {selectedTender.tenderId?.tenderDocuments?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTender.tenderId.tenderDocuments.map((doc, idx) => (
                          <a
                            key={idx}
                            href={getDownloadUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200 transition-all group"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {getFileIcon(doc.name)}
                              <span className="text-xs font-bold text-slate-705 truncate group-hover:text-blue-700">{doc.name}</span>
                            </div>
                            <FaDownload className="text-slate-400 group-hover:text-blue-600 transition-colors" size={12} />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4.5 bg-slate-50 rounded-xl border border-slate-200/60 text-center text-xs text-slate-400 font-medium italic">
                        No bidding documents uploaded.
                      </div>
                    )}
                  </div>

                  {/* Supporting Attachments */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-extrabold text-slate-900 flex items-center uppercase tracking-wider">
                      <FaFileContract className="text-emerald-500 mr-2" /> Supporting Attachments
                    </h5>
                    {selectedTender.attachments?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTender.attachments.map((doc, idx) => (
                          <a
                            key={idx}
                            href={getDownloadUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/40 hover:border-emerald-200 transition-all group"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {getFileIcon(doc.name)}
                              <span className="text-xs font-bold text-slate-750 truncate group-hover:text-emerald-700">{doc.name}</span>
                            </div>
                            <FaDownload className="text-slate-400 group-hover:text-emerald-600 transition-colors" size={12} />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4.5 bg-slate-50 rounded-xl border border-slate-200/60 text-center text-xs text-slate-400 font-medium italic">
                        No supporting attachments uploaded.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Modal Footer ──────────────────────────────────── */}
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-3xl sticky bottom-0">
                <div>
                  {isDeadlinePassed && (
                    <span className="text-xs font-bold text-rose-650 bg-rose-50 border border-rose-150 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
                      <FaExclamationTriangle size={11} />
                      <span>Bidding period has closed for this SPN notice</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => setSelectedTender(null)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors">
                    Close
                  </button>
                  {canBid && hasVendorProfile ? (
                    <Link
                      to={`/bid-box?tenderId=${selectedTender.tenderId._id}`}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-650 hover:shadow-lg text-white text-xs font-bold rounded-xl flex items-center shadow-md shadow-blue-550/20 active:scale-95 transition-all"
                    >
                      Proceed to Bid Box <FaChevronRight className="ml-2 text-[10px]" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SupplierDashboard;
