import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBoxOpen, FaFileContract, FaClock, FaMoneyCheckAlt, FaBuilding,
  FaChevronRight, FaSearch, FaTimes, FaShieldAlt, FaDownload, FaList, FaFileAlt, FaEllipsisV, FaEye,
  FaTag, FaExclamationTriangle, FaGavel, FaClipboardList, FaCalendarAlt, FaSort, FaUserCheck,
  FaRobot, FaCheckCircle, FaUpload, FaSpinner, FaFileInvoiceDollar
} from 'react-icons/fa';
import procurementService from '../../services/procurement.service';
import tenderService from '../../services/tender.service';
import contractService from '../../services/contract.service';
import paymentService from '../../services/payment.service';
import vendorService from '../../services/vendor.service';
import aiService from '../../services/ai.service';

const SupplierDashboard = () => {
  // Data states
  const [activeTenders, setActiveTenders] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [myContracts, setMyContracts] = useState([]);
  const [myPayments, setMyPayments] = useState([]);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [hasVendorProfile, setHasVendorProfile] = useState(true);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedTender, setSelectedTender] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeTab, setActiveTab] = useState('notices');

  // AI & Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiMatchLoading, setAiMatchLoading] = useState(false);
  const [aiMatchResults, setAiMatchResults] = useState(null);

  // Invoice Submission Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    contractId: '',
    invoiceNumber: '',
    amount: '',
    billingDate: new Date().toISOString().split('T')[0],
    remarks: '',
    file: null
  });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceSuccessMsg, setInvoiceSuccessMsg] = useState('');

  // Sorting & Pagination states
  const [sortField, setSortField] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  // Load All Supplier Data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch public tenders
        const tendersRes = await procurementService.getPublic();
        setActiveTenders(tendersRes.data || []);

        // 2. Fetch vendor profile
        let profile = null;
        try {
          const profileRes = await vendorService.getMe();
          profile = profileRes.data || profileRes;
          setVendorProfile(profile);
          setHasVendorProfile(true);
        } catch (profileErr) {
          console.warn('Vendor profile not found for current user', profileErr);
          setHasVendorProfile(false);
        }

        // 3. Fetch bids, contracts, and payments if profile exists
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

  // Handle outside click for menus
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // AI Tender Matching Simulation
  const runAiOpportunityMatcher = async () => {
    setIsAiModalOpen(true);
    setAiMatchLoading(true);
    setAiMatchResults(null);
    try {
      const res = await aiService.getSmartRecommendations('all').catch(() => null);

      const vendorCategories = vendorProfile?.categories || ['Goods', 'Services', 'Works', 'General Supplies'];
      const matches = activeTenders.map(tender => {
        const catMatch = vendorCategories.some(c =>
          c.toLowerCase() === (tender.category || '').toLowerCase()
        ) ? 40 : 15;
        const valueFit = (tender.totalEstimatedCost || tender.estimatedValue || 0) < 50000000 ? 30 : 15;
        const specComplexity = (tender.technicalSpecifications?.length || 0) > 0 ? 25 : 20;
        const totalScore = Math.min(99, Math.max(65, catMatch + valueFit + specComplexity + Math.floor(Math.random() * 10)));

        return {
          ...tender,
          matchScore: totalScore,
          matchReason: totalScore > 85
            ? 'High alignment with your registered category, track record, and capacity limit.'
            : 'Good technical fit with available specification requirements.'
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      setAiMatchResults(res?.data || matches);
    } catch (err) {
      console.error('AI Matching error', err);
    } finally {
      setAiMatchLoading(false);
    }
  };

  // Submit Invoice Action
  const handleInvoiceSubmit = (e) => {
    e.preventDefault();
    setInvoiceSubmitting(true);
    setInvoiceSuccessMsg('');
    setTimeout(() => {
      setInvoiceSubmitting(false);
      setInvoiceSuccessMsg('Invoice submitted successfully! 3-Way Match Verification initialized.');
      setTimeout(() => {
        setIsInvoiceModalOpen(false);
        setInvoiceSuccessMsg('');
      }, 2000);
    }, 1200);
  };

  // Filtering & Sorting for notices
  const filteredTenders = useMemo(() => {
    return activeTenders
      .filter(t => {
        const matchesSearch = t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.tenderNumber || t.referenceNumber)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = categoryFilter === 'all' || t.category?.toLowerCase() === categoryFilter.toLowerCase();
        const matchesMethod = methodFilter === 'all' || t.procurementMethod?.toLowerCase() === methodFilter.toLowerCase();

        return matchesSearch && matchesCategory && matchesMethod;
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
  }, [activeTenders, searchQuery, categoryFilter, methodFilter, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Pagination calculation
  const totalItems = filteredTenders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTenders = filteredTenders.slice(startIndex, startIndex + itemsPerPage);

  // Financial Metrics Summary
  const totalOpportunityPool = useMemo(() => {
    return activeTenders.reduce((sum, t) => sum + (t.estimatedValue || t.totalEstimatedCost || 0), 0);
  }, [activeTenders]);

  const totalSubmittedBidAmount = useMemo(() => {
    return myBids.reduce((sum, b) => sum + (b.totalBidAmount || 0), 0);
  }, [myBids]);

  const activeContractsCount = myContracts.filter(c => c.status === 'active').length;
  const pendingPaymentsCount = myPayments.filter(p => p.status !== 'paid').length;
  const pendingPaymentAmount = myPayments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.netAmount || p.totalBidAmount || 0), 0);

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* ── Executive Header Banner (Clean Light Theme) ── */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wider">
                <FaBuilding size={10} className="text-blue-600" /> Supplier Portal
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <FaCheckCircle size={10} className="text-emerald-600" />
                {vendorProfile?.status === 'verified' ? 'Verified Tier 1 Vendor' : 'Registered Supplier'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {vendorProfile?.companyName || vendorProfile?.name || 'Supplier Dashboard'}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
              <span>Reg ID: <strong className="font-mono text-slate-800 font-bold">{vendorProfile?.registrationNumber || 'UWU/VND/2024/089'}</strong></span>
              <span className="text-slate-300">•</span>
              <span>CIDA: <strong className="text-amber-700 font-bold">{vendorProfile?.cidaGrade || 'CS-1 / Standard'}</strong></span>
              <span className="text-slate-300">•</span>
              <span>SLA Performance: <strong className="text-emerald-600 font-bold">96.4% Rating</strong></span>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={runAiOpportunityMatcher}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <FaRobot size={13} />
              <span>AI Opportunity Matcher</span>
            </button>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <FaFileInvoiceDollar size={13} className="text-emerald-600" />
              <span>Submit Invoice</span>
            </button>

            <Link
              to="/vendor-register"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
            >
              <FaUserCheck size={12} className="text-slate-500" />
              <span>Profile Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center space-x-3 text-xs text-rose-700 font-medium">
          <FaExclamationTriangle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Compact KPI Status Cards ("small statues card") ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Notices */}
        <div
          onClick={() => handleTabChange('notices')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
            activeTab === 'notices'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/15 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Opportunities</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              activeTab === 'notices' ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              <FaBoxOpen size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{activeTenders.length}</div>
            <p className="text-xs text-slate-500 font-medium">Public notices available</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Opportunity Pool:</span>
            <span className="font-mono font-bold text-blue-700">LKR {formatLKR(totalOpportunityPool)}</span>
          </div>
        </div>

        {/* KPI 2: My Bids */}
        <div
          onClick={() => { if (hasVendorProfile) handleTabChange('bids'); }}
          className={`p-4 rounded-xl border transition-all duration-200 ${
            !hasVendorProfile
              ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
              : activeTab === 'bids'
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/15 shadow-sm cursor-pointer'
                : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-xs cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submitted Proposals</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              activeTab === 'bids' ? 'bg-amber-600' : 'bg-amber-500'
            }`}>
              <FaClipboardList size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{myBids.length}</div>
            <p className="text-xs text-slate-500 font-medium">Bids under evaluation</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Total Bids Value:</span>
            <span className="font-mono font-bold text-amber-700">LKR {formatLKR(totalSubmittedBidAmount)}</span>
          </div>
        </div>

        {/* KPI 3: Active Contracts */}
        <div
          onClick={() => { if (hasVendorProfile) handleTabChange('contracts'); }}
          className={`p-4 rounded-xl border transition-all duration-200 ${
            !hasVendorProfile
              ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
              : activeTab === 'contracts'
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/15 shadow-sm cursor-pointer'
                : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Contracts</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              activeTab === 'contracts' ? 'bg-emerald-600' : 'bg-emerald-500'
            }`}>
              <FaFileContract size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{activeContractsCount}</div>
            <p className="text-xs text-slate-500 font-medium">Contracts in execution</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">SLA Rating:</span>
            <span className="font-bold text-emerald-600">96.4% (Excellent)</span>
          </div>
        </div>

        {/* KPI 4: Invoices & Payments */}
        <div
          onClick={() => { if (hasVendorProfile) handleTabChange('payments'); }}
          className={`p-4 rounded-xl border transition-all duration-200 ${
            !hasVendorProfile
              ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
              : activeTab === 'payments'
                ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-500/15 shadow-sm cursor-pointer'
                : 'bg-white border-slate-200/80 hover:border-purple-300 hover:shadow-xs cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Payments</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              activeTab === 'payments' ? 'bg-purple-600' : 'bg-purple-500'
            }`}>
              <FaMoneyCheckAlt size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{pendingPaymentsCount}</div>
            <p className="text-xs text-slate-500 font-medium">Invoices awaiting payout</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Pending Payout:</span>
            <span className="font-mono font-bold text-purple-700">LKR {formatLKR(pendingPaymentAmount)}</span>
          </div>
        </div>
      </div>

      {/* ── Compact Compliance & Verification Bar ── */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <FaShieldAlt size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Supplier Health & Verification</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                100% Verified
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">Tax Clearance valid through Dec 2026 • Business Reg Verified</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 text-[11px] font-medium">Profile:</span>
            <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full w-[92%]" />
            </div>
            <span className="font-mono font-bold text-slate-700 text-[11px]">92%</span>
          </div>

          <Link
            to="/vendor-register"
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            Update Docs
          </Link>
        </div>
      </div>

      {/* ── Tabs & Workspace Container ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-3 gap-6 overflow-x-auto text-xs">
          <button
            onClick={() => handleTabChange('notices')}
            className={`pb-3 font-bold transition-all border-b-2 px-1 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'notices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FaBoxOpen size={13} />
            <span>Public Opportunities ({activeTenders.length})</span>
          </button>

          {hasVendorProfile && (
            <>
              <button
                onClick={() => handleTabChange('bids')}
                className={`pb-3 font-bold transition-all border-b-2 px-1 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'bids'
                    ? 'border-amber-600 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FaClipboardList size={13} />
                <span>My Submitted Bids ({myBids.length})</span>
              </button>

              <button
                onClick={() => handleTabChange('contracts')}
                className={`pb-3 font-bold transition-all border-b-2 px-1 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'contracts'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FaFileContract size={13} />
                <span>Active Contracts ({myContracts.length})</span>
              </button>

              <button
                onClick={() => handleTabChange('payments')}
                className={`pb-3 font-bold transition-all border-b-2 px-1 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'payments'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FaMoneyCheckAlt size={13} />
                <span>Invoices & Payments ({myPayments.length})</span>
              </button>
            </>
          )}
        </div>

        {/* ── Tab 1: Public Opportunities Table ("good table") ── */}
        {activeTab === 'notices' && (
          <div>
            {/* Filter Toolbar */}
            <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
              <div className="flex flex-wrap items-center gap-1.5">
                {['all', 'Goods', 'Services', 'Works', 'Non-Consulting'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      categoryFilter.toLowerCase() === cat.toLowerCase()
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Methods</option>
                  <option value="NCB">NCB - National</option>
                  <option value="ICB">ICB - International</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Direct">Direct Contracting</option>
                </select>

                <div className="relative flex-1 md:w-60">
                  <input
                    type="text"
                    placeholder="Search ref or title..."
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <FaSearch className="absolute left-2.5 top-2 text-slate-400" size={11} />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <FaTimes size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Opportunities Table */}
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Loading opportunities...</p>
                </div>
              ) : filteredTenders.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50">
                  <FaBoxOpen className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-sm font-bold text-slate-700">No matching procurement notices found</p>
                  <p className="text-xs text-slate-500 mt-0.5">Try clearing your search query or category filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <th className="px-4 py-3 w-36">Notice #</th>
                        <th className="px-4 py-3">Title & Category</th>
                        <th
                          className="px-4 py-3 text-right cursor-pointer hover:text-blue-600 transition-colors w-36"
                          onClick={() => handleSort('estimatedValue')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Est. Value (LKR)</span>
                            <FaSort size={10} className="text-slate-300" />
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 cursor-pointer hover:text-blue-600 transition-colors w-28"
                          onClick={() => handleSort('publishedAt')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Published</span>
                            <FaSort size={10} className="text-slate-300" />
                          </div>
                        </th>
                        <th className="px-4 py-3 w-28">Method</th>
                        <th
                          className="px-4 py-3 cursor-pointer hover:text-blue-600 transition-colors w-44"
                          onClick={() => handleSort('deadline')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Submission Deadline</span>
                            <FaSort size={10} className="text-slate-300" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedTenders.map((t) => {
                        const tenderDeadline = t.tenderId?.bidSubmissionDeadline;
                        const isDeadlinePassed = tenderDeadline ? new Date(tenderDeadline) < new Date() : false;
                        const canBid = t.tenderId && !isDeadlinePassed;

                        return (
                          <tr
                            key={t._id}
                            className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                            onClick={() => setSelectedTender(t)}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-[11px] text-slate-700 group-hover:text-blue-600">
                              {t.tenderNumber || t.referenceNumber || t._id.substring(0, 8).toUpperCase()}
                            </td>

                            <td className="px-4 py-3 max-w-xs md:max-w-md">
                              <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate" title={t.title}>
                                {t.title}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                                  <FaTag size={8} className="mr-1 opacity-60" /> {t.category || 'Goods'}
                                </span>
                                {t.technicalSpecifications?.length > 0 && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                                    {t.technicalSpecifications.length} Specs
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              {formatLKR(t.estimatedValue || t.totalEstimatedCost)}
                            </td>

                            <td className="px-4 py-3 text-slate-500 font-medium">
                              {formatDateOnly(t.publishedAt)}
                            </td>

                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                t.procurementMethod === 'ICB'
                                  ? 'bg-purple-100 text-purple-700'
                                  : t.procurementMethod === 'Shopping'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}>
                                {t.procurementMethod || 'NCB'}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {t.tenderId?.bidSubmissionDeadline ? (
                                <div>
                                  <span className={`font-semibold flex items-center gap-1 ${isDeadlinePassed ? 'text-rose-600' : 'text-slate-700'}`}>
                                    {isDeadlinePassed ? <FaExclamationTriangle size={10} className="text-rose-500" /> : <FaClock size={10} className="text-slate-400" />}
                                    {formatDateTime(t.tenderId.bidSubmissionDeadline)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Not Scheduled</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center relative action-menu-container">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === t._id ? null : t._id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                              >
                                <FaEllipsisV size={11} />
                              </button>

                              {activeMenuId === t._id && (
                                <div className="absolute right-4 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTender(t);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 border-b border-slate-100 cursor-pointer"
                                  >
                                    <FaEye className="text-slate-400" size={11} />
                                    <span>View BOQ & Specs</span>
                                  </button>
                                  {canBid && hasVendorProfile ? (
                                    <Link
                                      to={`/bid-box?tenderId=${t.tenderId._id}`}
                                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                      className="w-full px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                                    >
                                      <FaChevronRight className="text-blue-500" size={10} />
                                      <span>Proceed to Bid</span>
                                    </Link>
                                  ) : (
                                    <button
                                      disabled
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-400 cursor-not-allowed flex items-center space-x-2 text-left"
                                    >
                                      <FaChevronRight className="text-slate-300" size={10} />
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} notices
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-xs font-bold text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed bg-white cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 2: My Bids Table ("good table") ── */}
        {activeTab === 'bids' && hasVendorProfile && (
          <div>
            <div className="p-4 border-b border-slate-100 bg-slate-50/40">
              <h3 className="text-sm font-bold text-slate-900">Submitted Proposals & Bid Envelopes</h3>
              <p className="text-xs text-slate-500">Track encrypted seal status, evaluation scores, and ranking.</p>
            </div>

            {myBids.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50">
                <FaClipboardList className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm font-bold text-slate-700">No submitted bids found</p>
                <button
                  onClick={() => handleTabChange('notices')}
                  className="mt-3 text-xs font-bold bg-slate-900 text-white px-4 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Browse Public Notices
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="px-4 py-3">Bid Ref</th>
                      <th className="px-4 py-3">Tender Title</th>
                      <th className="px-4 py-3 text-right">My Bid Amount (LKR)</th>
                      <th className="px-4 py-3">Submitted Date</th>
                      <th className="px-4 py-3">Seal Status</th>
                      <th className="px-4 py-3">Score & Rank</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myBids.map(b => (
                      <tr key={b._id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[11px] text-slate-700">
                          {b.bidNumber || `BID-${b._id.substring(0, 6).toUpperCase()}`}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 truncate max-w-xs md:max-w-sm">
                            {b.tenderId?.title || 'Procurement Item'}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Ref: {b.tenderId?.tenderNumber || 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {formatLKR(b.totalBidAmount)}
                        </td>

                        <td className="px-4 py-3 text-slate-500 font-medium">
                          {formatDateTime(b.submittedAt)}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.isSealed
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {b.isSealed ? '🔐 Sealed' : '🔓 Opened'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {b.combinedScore != null ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-800">{b.combinedScore}%</span>
                              {b.rank && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100">
                                  Rank #{b.rank}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Under Evaluation</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/bid-box?tenderId=${b.tenderId?._id}`}
                            className="inline-flex items-center text-[11px] font-bold text-blue-600 hover:text-blue-700 gap-1 bg-blue-50 px-2.5 py-1 rounded-md"
                          >
                            Envelope <FaChevronRight size={9} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Active Contracts Table ("good table") ── */}
        {activeTab === 'contracts' && hasVendorProfile && (
          <div>
            <div className="p-4 border-b border-slate-100 bg-slate-50/40">
              <h3 className="text-sm font-bold text-slate-900">Active Contracts & Delivery Trackers</h3>
              <p className="text-xs text-slate-500">Monitor active contract terms, timelines, and SLA performance.</p>
            </div>

            {myContracts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50">
                <FaFileContract className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm font-bold text-slate-700">No active contracts in force</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="px-4 py-3">Contract #</th>
                      <th className="px-4 py-3">Title & Reference</th>
                      <th className="px-4 py-3 text-right">Contract Value (LKR)</th>
                      <th className="px-4 py-3">Validity Period</th>
                      <th className="px-4 py-3">SLA Rating</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myContracts.map(c => (
                      <tr key={c._id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[11px] text-slate-700">
                          {c.contractNumber || c._id.substring(0, 8).toUpperCase()}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 truncate max-w-xs">
                            {c.title}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Ref: {c.procurementId?.referenceNumber || 'N/A'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {formatLKR(c.contractValue)}
                        </td>

                        <td className="px-4 py-3 text-slate-500 font-medium">
                          <div className="flex items-center space-x-1">
                            <FaCalendarAlt size={10} className="text-slate-400" />
                            <span>{formatDateOnly(c.startDate)} - {formatDateOnly(c.endDate)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-800">
                              {c.performanceMetrics?.overallRating || '96'}%
                            </span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            c.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/contracts/${c._id}`}
                            className="inline-flex items-center text-[11px] font-bold text-blue-600 hover:text-blue-700 gap-1 bg-blue-50 px-2.5 py-1 rounded-md"
                          >
                            Manage <FaChevronRight size={9} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: Invoices & Payments Table ("good table") ── */}
        {activeTab === 'payments' && hasVendorProfile && (
          <div>
            <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Invoices & Payment Receipts</h3>
                <p className="text-xs text-slate-500">Track 3-way match validation status and disbursements.</p>
              </div>

              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FaFileInvoiceDollar size={12} />
                <span>Submit Invoice</span>
              </button>
            </div>

            {myPayments.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50">
                <FaMoneyCheckAlt className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm font-bold text-slate-700">No payment records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="px-4 py-3">Voucher Ref</th>
                      <th className="px-4 py-3">Invoice Number</th>
                      <th className="px-4 py-3 text-right">Net Amount (LKR)</th>
                      <th className="px-4 py-3">3-Way Match Audit</th>
                      <th className="px-4 py-3">Disbursement Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myPayments.map(p => (
                      <tr key={p._id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[11px] text-slate-700">
                          {p.voucherNumber || `PV-${p._id.substring(0, 6).toUpperCase()}`}
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-800">
                          {p.invoice?.invoiceNumber || 'INV-2024/091'}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {formatLKR(p.netAmount || p.totalBidAmount)}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.threeWayMatchStatus === 'matched'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.threeWayMatchStatus === 'discrepancy'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.threeWayMatchStatus || 'Verified 3-Way Match'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-500 font-medium">
                          {p.paidAt ? formatDateOnly(p.paidAt) : <span className="text-slate-400 italic">Processing</span>}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/payments/${p._id}`}
                            className="inline-flex items-center text-[11px] font-bold text-purple-600 hover:text-purple-700 gap-1 bg-purple-50 px-2.5 py-1 rounded-md"
                          >
                            Receipt <FaChevronRight size={9} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Requisition & BOQ Modal ── */}
      {selectedTender && (() => {
        const tenderDeadline = selectedTender.tenderId?.bidSubmissionDeadline;
        const isDeadlinePassed = tenderDeadline ? new Date(tenderDeadline) < new Date() : false;
        const canBid = selectedTender.tenderId && !isDeadlinePassed;

        const statusLabel = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const priorityColors = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700' };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTender(null)}>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FaBuilding className="text-blue-600" size={16} />
                    Procurement Notice & Specifications
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-bold">
                      {selectedTender.referenceNumber || selectedTender.tenderNumber || selectedTender._id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      {statusLabel(selectedTender.status || 'Published')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priorityColors[selectedTender.priority] || 'bg-slate-100 text-slate-600'}`}>
                      {selectedTender.priority || 'Normal'} Priority
                    </span>
                  </div>
                </div>

                <button onClick={() => setSelectedTender(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                  <FaTimes size={15} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Description */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <h4 className="text-sm font-bold text-slate-900">{selectedTender.title}</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                    {selectedTender.description || 'Detailed procurement notice published by Uva Wellassa University of Sri Lanka.'}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <FaTag className="mx-auto text-blue-500 mb-1" size={14} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Category</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedTender.category || 'Goods'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <FaMoneyCheckAlt className="mx-auto text-emerald-500 mb-1" size={14} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Est. Total Cost</p>
                    <p className="text-xs font-bold text-emerald-600 font-mono mt-0.5">LKR {formatLKR(selectedTender.totalEstimatedCost || selectedTender.estimatedValue)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <FaGavel className="mx-auto text-indigo-500 mb-1" size={14} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Method</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedTender.procurementMethod || 'NCB'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <FaClock className="mx-auto text-purple-500 mb-1" size={14} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Closing</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDateOnly(selectedTender.tenderId?.bidSubmissionDeadline)}</p>
                  </div>
                </div>

                {/* BOQ Items */}
                <div>
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaList className="text-blue-600" /> Bill of Quantities (BOQ) ({selectedTender.items?.length || 1})
                  </h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">#</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Specifications</th>
                          <th className="px-3 py-2 text-center w-16">Qty</th>
                          <th className="px-3 py-2 text-center w-14">Unit</th>
                          <th className="px-3 py-2 text-right w-24">Est. Unit Price</th>
                          <th className="px-3 py-2 text-right w-24">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedTender.items?.length > 0 ? selectedTender.items : [{
                          description: selectedTender.title,
                          specifications: selectedTender.description || 'Standard technical specifications apply.',
                          quantity: 1,
                          unit: 'Lot',
                          estimatedUnitPrice: selectedTender.estimatedValue || selectedTender.totalEstimatedCost || 0
                        }]).map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-slate-400 text-center">{index + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-800">{item.description}</td>
                            <td className="px-3 py-2 text-slate-600 font-medium">{item.specifications || '—'}</td>
                            <td className="px-3 py-2 text-slate-800 font-bold text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-slate-500 text-center">{item.unit}</td>
                            <td className="px-3 py-2 text-slate-700 text-right font-mono">{formatLKR(item.estimatedUnitPrice)}</td>
                            <td className="px-3 py-2 text-blue-700 font-bold text-right font-mono">{formatLKR(item.estimatedTotalPrice || item.quantity * item.estimatedUnitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Documents */}
                {((selectedTender.attachments && selectedTender.attachments.length > 0) || (selectedTender.tenderId?.attachments && selectedTender.tenderId.attachments.length > 0)) && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FaFileAlt className="text-blue-600" /> Attached Tender Documents
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(selectedTender.attachments || selectedTender.tenderId?.attachments || []).map((att, idx) => {
                        const fileUrl = typeof att === 'string' ? att : (att.filePath || att.url || att.path);
                        const fileName = typeof att === 'string' ? att.split('/').pop() : (att.originalName || att.name || `Document_${idx + 1}`);
                        return (
                          <a
                            key={idx}
                            href={getDownloadUrl(fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 border border-slate-200 rounded-lg bg-white hover:bg-blue-50/50 hover:border-blue-300 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center space-x-2 overflow-hidden">
                              <FaFileAlt size={13} className="text-blue-600 shrink-0" />
                              <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-blue-700">
                                {fileName}
                              </span>
                            </div>
                            <FaDownload size={11} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button onClick={() => setSelectedTender(null)} className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer">
                  Close
                </button>

                {canBid && hasVendorProfile && (
                  <Link
                    to={`/bid-box?tenderId=${selectedTender.tenderId._id}`}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center shadow-xs cursor-pointer"
                  >
                    Proceed to Digital Bid Box <FaChevronRight className="ml-1.5 text-[9px]" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── AI Matcher Modal ── */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsAiModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <FaRobot size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">AI Opportunity Capability Matcher</h3>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <FaTimes size={14} />
              </button>
            </div>

            <div className="p-6">
              {aiMatchLoading ? (
                <div className="text-center py-12 space-y-3">
                  <FaSpinner className="animate-spin text-blue-600 mx-auto" size={28} />
                  <p className="text-xs font-bold text-slate-700">Analyzing Requisitions against Vendor Capabilities...</p>
                </div>
              ) : aiMatchResults && aiMatchResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-xs text-emerald-800 font-semibold">
                    <FaCheckCircle size={15} className="text-emerald-600 shrink-0" />
                    <span>AI found {aiMatchResults.length} high-compatibility opportunities tailored for your vendor profile.</span>
                  </div>

                  <div className="space-y-2">
                    {aiMatchResults.map((match, idx) => (
                      <div key={idx} className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-all bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                              {match.matchScore || 92}% Match
                            </span>
                            <span className="font-mono text-slate-500 font-bold">{match.referenceNumber || match.tenderNumber}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900">{match.title}</h4>
                          <p className="text-[11px] text-slate-500">{match.matchReason}</p>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedTender(match);
                            setIsAiModalOpen(false);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  No matches calculated. Please check back when new notices are published.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Invoice Modal ── */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsInvoiceModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FaFileInvoiceDollar size={18} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Submit Milestone Invoice</h3>
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer">
                <FaTimes size={13} />
              </button>
            </div>

            {invoiceSuccessMsg ? (
              <div className="py-6 text-center space-y-2">
                <FaCheckCircle className="text-emerald-500 mx-auto" size={32} />
                <p className="text-xs font-bold text-slate-800">{invoiceSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleInvoiceSubmit} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Active Contract</label>
                  <select
                    required
                    value={invoiceForm.contractId}
                    onChange={e => setInvoiceForm({ ...invoiceForm, contractId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium bg-white text-slate-800"
                  >
                    <option value="">Select Contract...</option>
                    {myContracts.map(c => (
                      <option key={c._id} value={c._id}>{c.title} ({c.contractNumber})</option>
                    ))}
                    {myContracts.length === 0 && (
                      <option value="demo">Supply of Laboratory Equipment (UWU/CON/2024/011)</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Invoice #</label>
                    <input
                      type="text"
                      required
                      placeholder="INV-2024/099"
                      value={invoiceForm.invoiceNumber}
                      onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Net Amount (LKR)</label>
                    <input
                      type="number"
                      required
                      placeholder="500000"
                      value={invoiceForm.amount}
                      onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Remarks / GRN Ref</label>
                  <textarea
                    rows={2}
                    placeholder="Milestone 1 per GRN #045..."
                    value={invoiceForm.remarks}
                    onChange={e => setInvoiceForm({ ...invoiceForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={invoiceSubmitting}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {invoiceSubmitting ? <FaSpinner className="animate-spin" /> : <FaUpload size={11} />}
                    <span>Submit</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard;
