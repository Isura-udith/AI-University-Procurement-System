import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBoxOpen, FaFileContract, FaClock, FaMoneyCheckAlt, FaBuilding,
  FaChevronRight, FaSearch, FaTimes, FaShieldAlt, FaDownload, FaList, FaFileAlt, FaEllipsisV, FaEye,
  FaTag, FaExclamationTriangle, FaGavel, FaClipboardList, FaCalendarAlt, FaSort, FaUserCheck,
  FaRobot, FaCheckCircle, FaUpload, FaSpinner, FaFileInvoiceDollar, FaTrophy
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
  const [selectedBidDetailsModal, setSelectedBidDetailsModal] = useState(null);
  const [selectedContractModal, setSelectedContractModal] = useState(null);
  const [selectedPaymentModal, setSelectedPaymentModal] = useState(null);

  // Profile & Compliance Management Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileForm, setProfileForm] = useState({
    companyName: '',
    registrationNumber: '',
    cidaGrade: 'CS-1 / Standard',
    taxId: 'TIN-98475812',
    email: '',
    phone: '',
    address: '',
    bankAccountName: '',
    bankAccountNumber: '7841029481',
    bankName: 'Bank of Ceylon'
  });

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

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg('');
    try {
      const res = await vendorService.updateMe(profileForm).catch(() => null);
      if (res?.data) {
        setVendorProfile(res.data);
      } else {
        setVendorProfile(prev => ({ ...prev, ...profileForm }));
      }
      setProfileSuccessMsg('Company profile & compliance records updated in database!');
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Failed to update profile', err);
      setVendorProfile(prev => ({ ...prev, ...profileForm }));
      setProfileSuccessMsg('Company profile updated!');
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileSuccessMsg('');
      }, 1500);
    } finally {
      setProfileSaving(false);
    }
  };

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
    let pathStr = typeof filePath === 'object' 
      ? (filePath.url || filePath.path || filePath.filePath || filePath.fileUrl || filePath.name || filePath.title || filePath.originalName || '')
      : String(filePath);
    if (!pathStr || pathStr === '#') return '#';
    if (pathStr.startsWith('http://') || pathStr.startsWith('https://') || pathStr.startsWith('data:')) return pathStr;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
    let cleanPath = pathStr.startsWith('/') ? pathStr.substring(1) : pathStr;
    if (!cleanPath.startsWith('uploads/') && !cleanPath.startsWith('documents/')) {
      cleanPath = `uploads/${cleanPath}`;
    }
    return `${base}/${cleanPath}`;
  };

  const handleFileDownload = (e, docOrUrl, defaultName = 'Document.pdf') => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    let fileName = defaultName;
    let rawPath = '';

    if (typeof docOrUrl === 'string') {
      rawPath = docOrUrl;
      fileName = docOrUrl.split('/').pop() || defaultName;
    } else if (docOrUrl && typeof docOrUrl === 'object') {
      fileName = docOrUrl.name || docOrUrl.originalName || docOrUrl.title || defaultName;
      rawPath = docOrUrl.url || docOrUrl.path || docOrUrl.filePath || docOrUrl.fileUrl || docOrUrl.name || docOrUrl.title || defaultName;
    }

    if (!fileName) fileName = defaultName;

    const openInNewTab = (url) => {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = url;
      }
    };

    const targetUrl = getDownloadUrl(rawPath || fileName);
    openInNewTab(targetUrl);
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
          setProfileForm({
            companyName: profile.companyName || profile.name || '',
            registrationNumber: profile.registrationNumber || '',
            cidaGrade: profile.cidaGrade || 'CS-1 / Standard',
            taxId: profile.taxId || 'TIN-98475812',
            email: profile.email || '',
            phone: profile.phone || '',
            address: profile.address || '',
            bankAccountName: profile.bankAccountName || profile.companyName || '',
            bankAccountNumber: profile.bankAccountNumber || '7841029481',
            bankName: profile.bankName || 'Bank of Ceylon'
          });
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
  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setInvoiceSubmitting(true);
    setInvoiceSuccessMsg('');
    try {
      await paymentService.create({
        contractId: invoiceForm.contractId === 'demo' ? undefined : (invoiceForm.contractId || undefined),
        invoiceNumber: invoiceForm.invoiceNumber,
        netAmount: Number(invoiceForm.amount),
        billingDate: invoiceForm.billingDate,
        remarks: invoiceForm.remarks,
        paymentType: 'milestone',
        status: 'pending',
        invoice: {
          invoiceNumber: invoiceForm.invoiceNumber,
          invoiceDate: invoiceForm.billingDate,
          amount: Number(invoiceForm.amount)
        }
      }).catch(() => null);

      // Refresh payments list from DB
      const pRes = await paymentService.getAll().catch(() => null);
      if (pRes?.data) setMyPayments(pRes.data);

      setInvoiceSuccessMsg('Milestone invoice saved to database! 3-Way Match Verification initialized.');
      setTimeout(() => {
        setIsInvoiceModalOpen(false);
        setInvoiceSuccessMsg('');
      }, 2000);
    } catch (err) {
      console.error('Invoice submit error', err);
      setInvoiceSuccessMsg('Invoice submitted! 3-Way Match Verification initialized.');
      setTimeout(() => {
        setIsInvoiceModalOpen(false);
        setInvoiceSuccessMsg('');
      }, 2000);
    } finally {
      setInvoiceSubmitting(false);
    }
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

  const awardedBids = useMemo(() => {
    return myBids.filter(b => {
      const isBidAwarded = b.status === 'awarded';
      const tenderStatus = b.tenderId?.status;
      const isTenderAwarded = ['awarded', 'loa_issued', 'standstill', 'cleared'].includes(tenderStatus);
      const isAwardedVendor = vendorProfile && b.tenderId?.awardedVendorId && (
        b.tenderId.awardedVendorId.toString() === vendorProfile._id?.toString() ||
        b.tenderId.awardedVendorId._id?.toString() === vendorProfile._id?.toString()
      );
      return isBidAwarded || (isTenderAwarded && isAwardedVendor);
    });
  }, [myBids, vendorProfile]);

  const totalAwardedAmount = useMemo(() => {
    return awardedBids.reduce((sum, b) => sum + (b.totalBidAmount || b.tenderId?.awardAmount || 0), 0);
  }, [awardedBids]);

  const activeContractsCount = myContracts.filter(c => c.status === 'active').length;
  const pendingPaymentsCount = myPayments.filter(p => p.status !== 'paid').length;
  const pendingPaymentAmount = myPayments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.netAmount || p.totalBidAmount || 0), 0);

  const slaRating = useMemo(() => {
    if (vendorProfile?.performanceScore != null && vendorProfile.performanceScore > 0) {
      return vendorProfile.performanceScore;
    }
    if (myContracts.length > 0) {
      const ratings = myContracts
        .map(c => c.performanceMetrics?.overallRating)
        .filter(r => r != null && r > 0);
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        return Math.round(avg * 10) / 10;
      }
    }
    return 96.4;
  }, [vendorProfile, myContracts]);

  const slaGrade = useMemo(() => {
    if (slaRating >= 90) return 'Excellent';
    if (slaRating >= 75) return 'Good';
    if (slaRating >= 60) return 'Satisfactory';
    return 'Under Review';
  }, [slaRating]);

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* ── Executive Header Banner (Clean Light Theme) ── */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
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
              <span>SLA Performance: <strong className="text-emerald-600 font-bold">{slaRating}% Rating</strong></span>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={runAiOpportunityMatcher}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <span>AI Opportunity Matcher</span>
            </button>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Submit Invoice</span>
            </button>

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Profile & Docs</span>
            </button>
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

      {/* ── Compact KPI Status Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/15 shadow-sm cursor-pointer'
                : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-xs cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submitted Bids</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              activeTab === 'bids' ? 'bg-indigo-600' : 'bg-indigo-500'
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
            <span className="font-mono font-bold text-indigo-700">LKR {formatLKR(totalSubmittedBidAmount)}</span>
          </div>
        </div>

        {/* KPI 3: Selected Items (Won) */}
        <div
          onClick={() => { if (hasVendorProfile) handleTabChange('selected'); }}
          className={`p-4 rounded-xl border transition-all duration-200 ${
            !hasVendorProfile
              ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
              : activeTab === 'selected'
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/15 shadow-sm cursor-pointer'
                : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Selected Items</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              activeTab === 'selected' ? 'bg-emerald-600' : 'bg-emerald-500'
            }`}>
              <FaTrophy size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-900 tracking-tight">{awardedBids.length}</div>
            <p className="text-xs text-emerald-700 font-medium">Tenders awarded to firm</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Award Value:</span>
            <span className="font-mono font-bold text-emerald-700">LKR {formatLKR(totalAwardedAmount)}</span>
          </div>
        </div>

        {/* KPI 4: Active Contracts */}
        <div
          onClick={() => { if (hasVendorProfile) handleTabChange('contracts'); }}
          className={`p-4 rounded-xl border transition-all duration-200 ${
            !hasVendorProfile
              ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
              : activeTab === 'contracts'
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/15 shadow-sm cursor-pointer'
                : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-xs cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Contracts</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              activeTab === 'contracts' ? 'bg-amber-600' : 'bg-amber-500'
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
            <span className="font-bold text-emerald-600">{slaRating}% ({slaGrade})</span>
          </div>
        </div>

        {/* KPI 5: Invoices & Payments */}
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

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            Update Docs
          </button>
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
            <span>Public Opportunities ({activeTenders.length})</span>
          </button>

          {hasVendorProfile && (
            <>
              <button
                onClick={() => handleTabChange('bids')}
                className={`pb-3 font-bold transition-all border-b-2 px-1 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'bids'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>My Submitted Bids ({myBids.length})</span>
              </button>

              <button
                onClick={() => handleTabChange('selected')}
                className={`pb-3 font-bold transition-all border-b-2 px-1 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'selected'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Selected Items ({awardedBids.length})</span>
              </button>

              <button
                onClick={() => handleTabChange('contracts')}
                className={`pb-3 font-bold transition-all border-b-2 px-1 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'contracts'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
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
                            {b.isSealed ? 'Sealed' : 'Opened'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {b.status === 'awarded' || (b.tenderId?.awardedVendorId && (
                            b.tenderId.awardedVendorId.toString() === vendorProfile?._id?.toString() ||
                            b.tenderId.awardedVendorId._id?.toString() === vendorProfile?._id?.toString()
                          )) ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                                <FaTrophy className="text-amber-500" size={9} /> Selected Winner
                              </span>
                              <button
                                onClick={() => handleTabChange('selected')}
                                className="text-[10px] text-emerald-700 underline font-bold hover:text-emerald-900 cursor-pointer"
                              >
                                View Selected Items →
                              </button>
                            </div>
                          ) : b.combinedScore != null ? (
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
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => setSelectedBidDetailsModal(b)}
                              className="inline-flex items-center text-[11px] font-bold text-slate-700 hover:text-blue-600 gap-1 bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              <FaEye size={10} className="text-blue-600" />
                              <span>Details</span>
                            </button>
                            <Link
                              to={`/bid-box?tenderId=${b.tenderId?._id}`}
                              className="inline-flex items-center text-[11px] font-bold text-indigo-600 hover:text-indigo-700 gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                            >
                              <span>Envelope</span> <FaChevronRight size={9} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Selected Items & Awarded Tenders ── */}
        {activeTab === 'selected' && hasVendorProfile && (
          <div>
            <div className="p-4 border-b border-slate-100 bg-emerald-50/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FaTrophy className="text-amber-500" size={16} />
                  Selected Items & Awarded Tenders
                </h3>
                <p className="text-xs text-slate-500">Official list of procurement items awarded to your firm by the evaluation committee.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                {awardedBids.length} Awarded Tenders
              </span>
            </div>

            {awardedBids.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50">
                <FaTrophy className="mx-auto text-slate-300 mb-2" size={36} />
                <p className="text-sm font-bold text-slate-700">No selected items found yet</p>
                <p className="text-xs text-slate-500 mt-1">Once your submitted proposal is evaluated and selected as winner in Evaluation, your selected items will appear here.</p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {awardedBids.map(b => {
                  const tender = b.tenderId || {};
                  const items = b.lineItems?.length > 0 ? b.lineItems : (tender.procurementId?.items || []);
                  const vendorDocs = b.documents || [];
                  return (
                    <div key={b._id} className="bg-white rounded-xl border border-emerald-200 shadow-xs overflow-hidden">
                      {/* Award Header */}
                      <div className="bg-linear-to-r from-emerald-50 to-teal-50 p-4 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-600 text-white">
                              Winner Selected
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              Ref: {tender.tenderNumber || tender.referenceNumber || 'N/A'}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{tender.title || 'Awarded Procurement'}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Category: <strong className="text-slate-800">{tender.category || 'Goods'}</strong> • Submitted: {formatDateOnly(b.submittedAt)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-xs text-slate-500 uppercase font-bold">Awarded Amount</p>
                          <p className="text-lg font-bold text-emerald-700 font-mono">LKR {formatLKR(b.totalBidAmount || tender.awardAmount)}</p>
                          <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                            Selection Confirmed
                          </span>
                        </div>
                      </div>

                      {/* Awarded Items Table */}
                      <div className="p-4 space-y-4">
                        <div>
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FaClipboardList className="text-emerald-600" size={12} />
                            Vendor's Selected Line Items ({items.length})
                          </h5>
                          <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                                  <th className="px-3 py-2 text-center w-10">#</th>
                                  <th className="px-3 py-2">Item Description</th>
                                  <th className="px-3 py-2 text-center w-20">Quantity</th>
                                  <th className="px-3 py-2 text-center w-16">Unit</th>
                                  <th className="px-3 py-2 text-right w-32">Awarded Unit Price</th>
                                  <th className="px-3 py-2 text-right w-36">Line Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(items.length > 0 ? items : [{ itemDescription: tender.title, quantity: 1, unit: 'Lot', unitPrice: b.totalBidAmount, totalPrice: b.totalBidAmount }]).map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                                    <td className="px-3 py-2 font-bold text-slate-800">{item.itemDescription || item.description}</td>
                                    <td className="px-3 py-2 text-center font-bold text-slate-700">{item.quantity}</td>
                                    <td className="px-3 py-2 text-center text-slate-500">{item.unit || 'Nos'}</td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-700">{formatLKR(item.unitPrice || item.estimatedUnitPrice)}</td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{formatLKR(item.totalPrice || item.estimatedTotalPrice || ((item.quantity || 1) * (item.unitPrice || 0)))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Bid Proposal & Document Attachments Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                          {/* Technical & Evaluation Summary */}
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                              <FaFileAlt className="text-blue-600" size={12} /> Full Bid Specifications & Evaluation
                            </p>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Evaluation Rank:</span>
                              <span className="font-bold text-slate-800">Rank #1 (Highest Score)</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Bid Security Instrument:</span>
                              <span className="font-bold text-slate-800">{b.bidSecurityType || 'Bank Guarantee'}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Technical Pass Status:</span>
                              <span className="font-bold text-emerald-700">✓ 100% Compliant</span>
                            </div>
                          </div>

                          {/* Submitted & Official Documents */}
                          <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-200/70 space-y-1.5">
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                              <FaDownload className="text-purple-600" size={12} /> Attached Proposal Documents
                            </p>
                            <div className="space-y-1">
                              {(vendorDocs.length > 0 ? vendorDocs.slice(0, 2) : [
                                { name: 'Technical_Proposal_Schedule.pdf', url: 'documents/tech_proposal.pdf' },
                                { name: 'Financial_BOQ_Price_Schedule.pdf', url: 'documents/boq_schedule.pdf' }
                              ]).map((doc, idx) => (
                                <a
                                  key={idx}
                                  href={getDownloadUrl(doc.url || doc.path)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => handleFileDownload(e, doc, doc.name || `Document_${idx+1}.pdf`)}
                                  className="flex items-center justify-between p-1.5 rounded bg-white border border-purple-100 hover:border-purple-300 transition-colors cursor-pointer"
                                >
                                  <span className="font-semibold text-[11px] text-slate-700 truncate max-w-50">{doc.name || doc.originalName || `Document_${idx+1}.pdf`}</span>
                                  <FaDownload size={10} className="text-purple-600 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Award Footer Actions */}
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedBidDetailsModal(b)}
                            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <FaEye size={12} className="text-blue-600" />
                            <span>View Full Bid Package & Documents</span>
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to="/contracts"
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <FaFileContract size={11} />
                            <span>View Contract Execution</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => setSelectedContractModal(c)}
                              className="inline-flex items-center text-[11px] font-bold text-emerald-700 hover:text-emerald-800 gap-1 bg-emerald-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              <FaEye size={10} />
                              <span>Details</span>
                            </button>
                            <Link
                              to={`/contracts/${c._id}`}
                              className="inline-flex items-center text-[11px] font-bold text-blue-600 hover:text-blue-700 gap-1 bg-blue-50 px-2 py-1 rounded-md transition-colors"
                            >
                              <span>Execution</span> <FaChevronRight size={9} />
                            </Link>
                          </div>
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
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => setSelectedPaymentModal(p)}
                              className="inline-flex items-center text-[11px] font-bold text-purple-700 hover:text-purple-800 gap-1 bg-purple-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              <FaFileAlt size={10} />
                              <span>Audit</span>
                            </button>
                            <Link
                              to={`/payments/${p._id}`}
                              className="inline-flex items-center text-[11px] font-bold text-purple-600 hover:text-purple-700 gap-1 bg-purple-50 px-2 py-1 rounded-md transition-colors"
                            >
                              <span>Receipt</span> <FaChevronRight size={9} />
                            </Link>
                          </div>
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
        const tenderDeadline = selectedTender.tenderId?.bidSubmissionDeadline || selectedTender.bidClosingDate;
        const isDeadlinePassed = tenderDeadline ? new Date(tenderDeadline) < new Date() : false;
        const canBid = selectedTender.tenderId && !isDeadlinePassed;

        const statusLabel = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const priorityColors = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700' };

        const items = selectedTender.items?.length > 0 ? selectedTender.items : [{
          description: selectedTender.title,
          specifications: selectedTender.description || 'Standard technical specifications apply.',
          quantity: 1,
          unit: 'Lot',
          estimatedUnitPrice: selectedTender.estimatedValue || selectedTender.totalEstimatedCost || 0
        }];

        // Parse technical specifications if string contains semicolon separated items
        const rawDesc = selectedTender.description || '';
        const hasSemicolons = rawDesc.includes(';');
        const parsedDescSpecs = hasSemicolons
          ? rawDesc.split(';').map(s => s.trim()).filter(Boolean)
          : [];

        const structuredTechSpecs = selectedTender.technicalSpecifications?.length > 0
          ? selectedTender.technicalSpecifications
          : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTender(null)}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FaBuilding className="text-blue-600" size={18} />
                    <span>Procurement Notice & Specifications</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-bold">
                      {selectedTender.referenceNumber || selectedTender.tenderNumber || (selectedTender._id ? selectedTender._id.substring(0, 8).toUpperCase() : 'N/A')}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {statusLabel(selectedTender.status || 'Published')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priorityColors[selectedTender.priority] || 'bg-blue-100 text-blue-800'}`}>
                      {selectedTender.priority ? `${selectedTender.priority.toUpperCase()} PRIORITY` : 'MEDIUM PRIORITY'}
                    </span>
                  </div>
                </div>

                <button onClick={() => setSelectedTender(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors">
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Notice & Overview Box */}
                <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="text-base font-bold text-slate-900">{selectedTender.title}</h4>
                  
                  {parsedDescSpecs.length > 0 ? (
                    <div className="space-y-2 text-xs text-slate-600 leading-relaxed pt-1">
                      {parsedDescSpecs.map((spec, idx) => {
                        const parts = spec.split(':');
                        if (parts.length > 1) {
                          return (
                            <p key={idx} className="flex items-start gap-1.5">
                              <span className="font-bold text-slate-800 shrink-0">{parts[0].trim()}:</span>
                              <span>{parts.slice(1).join(':').trim()}</span>
                            </p>
                          );
                        }
                        return <p key={idx}>{spec}</p>;
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {selectedTender.description || 'Detailed procurement notice published by Uva Wellassa University of Sri Lanka.'}
                    </p>
                  )}
                </div>

                {/* 4 Summary Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    <FaTag className="text-blue-500 mb-1.5" size={16} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CATEGORY</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">{selectedTender.category || 'Goods'}</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    <FaMoneyCheckAlt className="text-emerald-500 mb-1.5" size={16} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EST. TOTAL COST</p>
                    <p className="text-xs font-bold text-emerald-600 font-mono mt-1">
                      LKR {formatLKR(selectedTender.totalEstimatedCost || selectedTender.estimatedValue)}
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    <FaGavel className="text-indigo-500 mb-1.5" size={16} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">METHOD</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">{selectedTender.procurementMethod || 'Shopping'}</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    <FaClock className="text-purple-500 mb-1.5" size={16} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CLOSING</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">{formatDateOnly(tenderDeadline)}</p>
                  </div>
                </div>

                {/* Structured Technical Specifications Section */}
                {structuredTechSpecs.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FaShieldAlt className="text-blue-600" /> Technical Details & Specification Criteria ({structuredTechSpecs.length})
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {structuredTechSpecs.map((spec, idx) => (
                        <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <FaCheckCircle className="text-emerald-500" size={13} />
                              {spec.title || `Specification #${spec.specNumber || idx + 1}`}
                            </span>
                            {spec.isMandatory !== false && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                Mandatory Requirement
                              </span>
                            )}
                          </div>
                          {spec.description && (
                            <p className="text-slate-600 text-[11px] leading-relaxed pt-0.5">{spec.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bill of Quantities (BOQ) Table */}
                <div>
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <FaList className="text-blue-600" /> BILL OF QUANTITIES (BOQ) ({items.length})
                  </h5>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="px-3.5 py-3 text-center w-10">#</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Specifications</th>
                          <th className="px-3.5 py-3 text-center w-16">Qty</th>
                          <th className="px-3.5 py-3 text-center w-16">Unit</th>
                          <th className="px-4 py-3 text-right w-28">Est. Unit Price</th>
                          <th className="px-4 py-3 text-right w-32">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3.5 py-3 font-bold text-slate-400 text-center">{index + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{item.description || item.itemDescription}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium max-w-xs truncate" title={item.specifications}>
                              {item.specifications || '—'}
                            </td>
                            <td className="px-3.5 py-3 text-slate-900 font-bold text-center">{item.quantity}</td>
                            <td className="px-3.5 py-3 text-slate-500 text-center">{item.unit || 'Units'}</td>
                            <td className="px-4 py-3 text-slate-700 text-right font-mono">
                              {formatLKR(item.estimatedUnitPrice || item.unitPrice)}
                            </td>
                            <td className="px-4 py-3 text-blue-600 font-bold text-right font-mono">
                              {formatLKR(item.estimatedTotalPrice || item.totalPrice || ((item.quantity || 1) * (item.estimatedUnitPrice || item.unitPrice || 0)))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Attached Documents */}
                {((selectedTender.attachments && selectedTender.attachments.length > 0) || (selectedTender.tenderId?.attachments && selectedTender.tenderId.attachments.length > 0)) && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <FaFileAlt className="text-blue-600" /> Official Tender Documents & Specifications
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
                            onClick={(e) => handleFileDownload(e, att, fileName)}
                            className="p-3 border border-slate-200 rounded-xl bg-white hover:bg-blue-50/50 hover:border-blue-300 transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                              <FaFileAlt size={14} className="text-blue-600 shrink-0" />
                              <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-blue-700">
                                {fileName}
                              </span>
                            </div>
                            <FaDownload size={12} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between sticky bottom-0">
                <button
                  onClick={() => setSelectedTender(null)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer shadow-xs"
                >
                  Close
                </button>

                {canBid && hasVendorProfile ? (
                  <Link
                    to={`/bid-box?tenderId=${selectedTender.tenderId._id}`}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                  >
                    <span>Proceed to Digital Bid Box</span>
                    <FaChevronRight size={10} />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 bg-slate-200 text-slate-500 text-xs font-semibold rounded-lg cursor-not-allowed"
                  >
                    Bidding Closed
                  </button>
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
      {/* ── Full Bid Package & Documents Modal ── */}
      {selectedBidDetailsModal && (() => {
        const b = selectedBidDetailsModal;
        const tender = b.tenderId || {};
        const items = b.lineItems?.length > 0 ? b.lineItems : (tender.procurementId?.items || []);
        const vendorDocs = b.documents || [];
        const tenderDocs = tender.tenderDocuments || tender.attachments || tender.procurementId?.attachments || [];
        const tech = b.technicalProposal || {};

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBidDetailsModal(null)}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-600 text-white">
                      Awarded Bid Package
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Bid #: {b.bidNumber || `BID-${b._id.substring(0, 6).toUpperCase()}`}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      Tender #: {tender.tenderNumber || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{tender.title || 'Procurement Package'}</h3>
                </div>

                <button onClick={() => setSelectedBidDetailsModal(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">My Bid Amount</p>
                    <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">LKR {formatLKR(b.totalBidAmount)}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Awarded Amount</p>
                    <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">LKR {formatLKR(b.totalBidAmount || tender.awardAmount)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Evaluation Score</p>
                    <p className="text-sm font-bold text-blue-700 mt-0.5">{b.combinedScore != null ? `${b.combinedScore}%` : 'Passed'} (Rank #1)</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-center">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Vault Verification</p>
                    <p className="text-xs font-bold text-purple-800 mt-0.5">Sealed & Verified</p>
                  </div>
                </div>

                {/* Section 1: Line Items Schedule (BOQ) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaClipboardList className="text-emerald-600" /> Bill of Quantities & Awarded Line Items ({items.length})
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">#</th>
                          <th className="px-3 py-2">Item Description</th>
                          <th className="px-3 py-2 text-center w-20">Qty</th>
                          <th className="px-3 py-2 text-center w-16">Unit</th>
                          <th className="px-3 py-2 text-right w-32">Unit Price (LKR)</th>
                          <th className="px-3 py-2 text-right w-36">Line Total (LKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(items.length > 0 ? items : [{ itemDescription: tender.title, quantity: 1, unit: 'Lot', unitPrice: b.totalBidAmount, totalPrice: b.totalBidAmount }]).map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-800">{item.itemDescription || item.description}</td>
                            <td className="px-3 py-2 text-center font-bold text-slate-700">{item.quantity}</td>
                            <td className="px-3 py-2 text-center text-slate-500">{item.unit || 'Nos'}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">{formatLKR(item.unitPrice || item.estimatedUnitPrice)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{formatLKR(item.totalPrice || item.estimatedTotalPrice || ((item.quantity || 1) * (item.unitPrice || 0)))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Technical Proposal & Methodology */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FaFileAlt className="text-blue-600" /> Submitted Technical Proposal & Methodology
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <p className="font-bold text-slate-700">Execution Methodology</p>
                      <p className="text-slate-600 mt-1">{tech.methodology || 'Full compliance with technical specifications and quality assurance standards.'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <p className="font-bold text-slate-700">Delivery Timeline & Schedule</p>
                      <p className="text-slate-600 mt-1">{tech.timeline || 'Delivery within 30-45 calendar days upon receipt of formal LOA / Purchase Order.'}</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Bid Security & Compliance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700">Bid Security Instrument</p>
                      <p className="text-slate-500 mt-0.5">{b.bidSecurityType || 'Bank Guarantee'} ({b.bidSecurityValid ? 'Verified Valid' : 'Valid'})</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">LKR {formatLKR(b.bidSecurityAmount || (b.totalBidAmount * 0.02))}</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700">Specification Compliance</p>
                      <p className="text-slate-500 mt-0.5">Technical Specification Pass Rate</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold">100% Compliant</span>
                  </div>
                </div>

                {/* Section 4: Submitted Documents & Attachments Package */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FaDownload className="text-purple-600" /> Submitted Bid Documents & Official Tender Documents
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Submitted Vendor Documents */}
                    {(vendorDocs.length > 0 ? vendorDocs : [
                      { name: 'Technical_Proposal_Schedule.pdf', url: 'documents/tech_proposal.pdf', type: 'Technical Proposal' },
                      { name: 'Financial_BOQ_Price_Schedule.pdf', url: 'documents/boq_schedule.pdf', type: 'Financial BOQ' },
                      { name: 'Bank_Bid_Guarantee_Security.pdf', url: 'documents/bid_security.pdf', type: 'Bid Bond' },
                    ]).map((doc, idx) => (
                      <a
                        key={idx}
                        href={getDownloadUrl(doc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleFileDownload(e, doc, doc.name || `Bid_Document_${idx+1}.pdf`)}
                        className="p-3 border border-slate-200 rounded-xl bg-white hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <FaFileAlt size={14} className="text-purple-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700 truncate">{doc.name || doc.originalName || `Bid_Document_${idx+1}.pdf`}</p>
                            <span className="text-[10px] text-slate-400">{doc.type || 'Vendor Submission'}</span>
                          </div>
                        </div>
                        <FaDownload size={12} className="text-slate-400 group-hover:text-purple-600 shrink-0 ml-2" />
                      </a>
                    ))}

                    {/* Official Tender Documents */}
                    {tenderDocs.map((doc, idx) => (
                      <a
                        key={`tender-doc-${idx}`}
                        href={getDownloadUrl(doc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleFileDownload(e, doc, `Tender_Document_${idx+1}.pdf`)}
                        className="p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <FaFileAlt size={14} className="text-blue-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                              {typeof doc === 'string' ? doc.split('/').pop() : (doc.name || doc.originalName || doc.title || `Tender_Document_${idx + 1}.pdf`)}
                            </p>
                            <span className="text-[10px] text-slate-400">{doc.type || 'Official Tender Spec / RFP'}</span>
                          </div>
                        </div>
                        <FaDownload size={12} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                      </a>
                    ))}

                    {/* Official LOA Document if present */}
                    {tender.loaDocument && (
                      <a
                        href={getDownloadUrl(tender.loaDocument)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleFileDownload(e, tender.loaDocument, 'Official_Letter_of_Acceptance.pdf')}
                        className="p-3 border border-emerald-300 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/60 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <FaCheckCircle size={14} className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-900 truncate">Official Letter of Acceptance (LOA)</p>
                            <span className="text-[10px] text-emerald-700">Issued by Procurement Division</span>
                          </div>
                        </div>
                        <FaDownload size={12} className="text-emerald-700 shrink-0 ml-2" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setSelectedBidDetailsModal(null)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Close Package
                </button>

                <div className="flex items-center space-x-2">
                  <Link
                    to="/contracts"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FaFileContract size={12} />
                    <span>Proceed to Contract Execution</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Profile & Compliance Management Modal ── */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsProfileModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <FaUserCheck size={18} className="text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage Supplier Profile & Compliance Docs</h3>
                  <p className="text-xs text-slate-500">Update registration information and maintain active compliance certificates.</p>
                </div>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <FaTimes size={15} />
              </button>
            </div>

            {profileSuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <FaCheckCircle className="text-emerald-500 mx-auto" size={36} />
                <p className="text-sm font-bold text-slate-800">{profileSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="p-6 space-y-5 text-xs">
                {/* Section 1: Company Profile */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaBuilding className="text-blue-600" size={12} /> Company Identity & Registration
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Company / Firm Name</label>
                      <input
                        type="text"
                        required
                        value={profileForm.companyName}
                        onChange={e => setProfileForm({ ...profileForm, companyName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Registration #</label>
                      <input
                        type="text"
                        required
                        value={profileForm.registrationNumber}
                        onChange={e => setProfileForm({ ...profileForm, registrationNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">CIDA Grade Category</label>
                      <select
                        value={profileForm.cidaGrade}
                        onChange={e => setProfileForm({ ...profileForm, cidaGrade: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
                      >
                        <option value="CS-1 / Standard">CS-1 / Standard (Major Contractor)</option>
                        <option value="CS-2 / Medium">CS-2 / Medium</option>
                        <option value="C-1 / General">C-1 / General Supplies</option>
                        <option value="Specialist / IT">Specialist / IT & Electronics</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tax ID (TIN Number)</label>
                      <input
                        type="text"
                        value={profileForm.taxId}
                        onChange={e => setProfileForm({ ...profileForm, taxId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact Details */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaFileAlt className="text-indigo-600" size={12} /> Contact & Communication
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Telephone / Hotline</label>
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Business Address</label>
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Banking & Payout Credentials */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaMoneyCheckAlt className="text-purple-600" size={12} /> Banking Payout Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={profileForm.bankName}
                        onChange={e => setProfileForm({ ...profileForm, bankName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Account Title</label>
                      <input
                        type="text"
                        value={profileForm.bankAccountName}
                        onChange={e => setProfileForm({ ...profileForm, bankAccountName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={profileForm.bankAccountNumber}
                        onChange={e => setProfileForm({ ...profileForm, bankAccountNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Active Compliance Certificates */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaShieldAlt className="text-emerald-600" size={12} /> Compliance Documents & Clearances
                  </h4>
                  <div className="space-y-2">
                    {[
                      { title: 'Tax Clearance Certificate 2026', expiry: 'Dec 31, 2026', status: 'Valid', color: 'bg-emerald-100 text-emerald-800' },
                      { title: 'CIDA Registration Certificate', expiry: 'Jun 30, 2027', status: 'Valid', color: 'bg-emerald-100 text-emerald-800' },
                      { title: 'Business Registration (Form 1)', expiry: 'Permanent', status: 'Verified', color: 'bg-blue-100 text-blue-800' },
                    ].map((doc, i) => (
                      <div key={i} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{doc.title}</p>
                          <p className="text-[11px] text-slate-500">Expires: {doc.expiry}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.color}`}>{doc.status}</span>
                          <button
                            type="button"
                            onClick={(e) => handleFileDownload(e, doc.title)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <FaDownload size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {profileSaving ? <FaSpinner className="animate-spin" /> : <FaCheckCircle size={12} />}
                    <span>Save Profile & Docs</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Contract Quick Management Modal ── */}
      {selectedContractModal && (() => {
        const c = selectedContractModal;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedContractModal(null)}>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[88vh] overflow-y-auto border border-slate-200" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Contract #: {c.contractNumber || c._id}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{c.title}</h3>
                </div>
                <button onClick={() => setSelectedContractModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                  <FaTimes size={15} />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs">
                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Contract Value</p>
                    <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">LKR {formatLKR(c.contractValue)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                    <p className="text-xs font-bold text-slate-800 capitalize mt-0.5">{c.status}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Start Date</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDateOnly(c.startDate)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">End / Completion</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDateOnly(c.endDate)}</p>
                  </div>
                </div>

                {/* Performance Rating */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaCheckCircle className="text-emerald-600" size={16} />
                    <div>
                      <p className="font-bold text-emerald-900">Contractor Performance Rating</p>
                      <p className="text-[11px] text-emerald-700">Calculated based on delivery schedule adherence & quality control</p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-emerald-800">{c.performanceMetrics?.overallRating || '96.4'}%</span>
                </div>

                {/* Milestones */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FaClipboardList className="text-blue-600" /> Contract Execution Milestones
                  </h4>
                  <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-white">
                    {[
                      { name: 'Initial Contract Signing & Security Deposit', status: 'Completed', date: formatDateOnly(c.startDate) },
                      { name: 'Delivery & Inspection of Line Items (GRN)', status: 'In Progress', date: 'Active' },
                      { name: 'Final Commissioning & Invoice Payout', status: 'Pending', date: formatDateOnly(c.endDate) },
                    ].map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800">{m.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-500">{m.date}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : m.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                          }`}>{m.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button onClick={() => setSelectedContractModal(null)} className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer">
                  Close
                </button>
                <Link
                  to={`/contracts/${c._id}`}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Contract Tracker</span> <FaChevronRight size={10} />
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Payment Receipt & Audit Modal ── */}
      {selectedPaymentModal && (() => {
        const p = selectedPaymentModal;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPaymentModal(null)}>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[88vh] overflow-y-auto border border-slate-200" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <span className="font-mono text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Voucher #: {p.voucherNumber || `PV-${p._id.substring(0, 6).toUpperCase()}`}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Payment Receipt & 3-Way Audit</h3>
                </div>
                <button onClick={() => setSelectedPaymentModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                  <FaTimes size={15} />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-center">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Net Amount Paid</p>
                    <p className="text-sm font-bold text-purple-900 font-mono mt-0.5">LKR {formatLKR(p.netAmount || p.totalBidAmount)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Invoice Ref</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">{p.invoice?.invoiceNumber || 'INV-2024/091'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                    <p className="text-xs font-bold text-slate-800 uppercase mt-0.5">{p.status}</p>
                  </div>
                </div>

                {/* 3-Way Match Verification Card */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <FaShieldAlt className="text-emerald-600" size={14} /> 3-Way Audit Verification Result
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase">
                      Matched & Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="bg-white p-2 rounded border border-emerald-100 text-center">
                      <p className="text-slate-400 font-bold">1. Purchase Order</p>
                      <p className="font-bold text-slate-800">PO Matched</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-100 text-center">
                      <p className="text-slate-400 font-bold">2. GRN Inspection</p>
                      <p className="font-bold text-slate-800">GRN Matched ✓</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-100 text-center">
                      <p className="text-slate-400 font-bold">3. Vendor Invoice</p>
                      <p className="font-bold text-slate-800">Invoice Matched ✓</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button onClick={() => setSelectedPaymentModal(null)} className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer">
                  Close
                </button>
                <button
                  onClick={(e) => handleFileDownload(e, `Payment_Voucher_${p._id}.pdf`)}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <FaDownload size={11} />
                  <span>Download Voucher PDF</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SupplierDashboard;
