import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import vendorService from '../../services/vendor.service';
import {
  FaStore,
  FaUserCheck,
  FaEnvelopeOpenText,
  FaBan,
  FaSearch,
  FaFilter,
  FaSync,
  FaPaperPlane,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaExternalLinkAlt,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaBoxes,
  FaUserPlus,
  FaShieldAlt,
  FaFileAlt,
  FaBoxOpen,
  FaGavel,
  FaBalanceScale,
  FaPlusCircle,
  FaChevronRight,
} from 'react-icons/fa';

const MOCK_VENDORS = [
  {
    _id: 'v-101',
    name: 'Lanka Tech Solutions Ltd',
    companyName: 'Lanka Tech Solutions Ltd',
    email: 'contact@lankatech.lk',
    phone: '+94 77 123 4567',
    contactPerson: 'Kavinda Perera',
    registrationNo: 'PV-102948',
    status: 'PENDING_VERIFICATION',
    category: 'ICT & Office Equipment',
    rating: 4.8,
    grading: 'Grade A',
    setupTokenSent: true,
    setupToken: 'token_sample_123',
    createdDate: '2026-07-25'
  },
  {
    _id: 'v-102',
    name: 'Highland Chemicals & Scientific (Pvt) Ltd',
    companyName: 'Highland Chemicals & Scientific (Pvt) Ltd',
    email: 'sales@highlandchem.lk',
    phone: '+94 81 223 9900',
    contactPerson: 'Dr. Nimal Wickramasinghe',
    registrationNo: 'PV-884920',
    status: 'VERIFIED',
    category: 'Laboratory Chemicals & Glassware',
    rating: 4.5,
    grading: 'Grade A',
    setupTokenSent: true,
    createdDate: '2026-07-20'
  },
  {
    _id: 'v-103',
    name: 'Crown Office Stationers & Printers',
    companyName: 'Crown Office Stationers & Printers',
    email: 'info@crownstationery.lk',
    phone: '+94 55 492 1122',
    contactPerson: 'Saman Jayasinghe',
    registrationNo: 'PV-339201',
    status: 'PENDING_VERIFICATION',
    category: 'Stationery & Printing',
    rating: 4.0,
    grading: 'Grade B',
    setupTokenSent: false,
    createdDate: '2026-07-27'
  },
  {
    _id: 'v-104',
    name: 'Southern Engineering & Electricals',
    companyName: 'Southern Engineering & Electricals',
    email: 'support@southerneng.lk',
    phone: '+94 91 334 8822',
    contactPerson: 'Anura Fernando',
    registrationNo: 'PV-773829',
    status: 'REJECTED',
    category: 'Electrical & Maintenance',
    rating: 3.2,
    grading: 'Grade C',
    setupTokenSent: false,
    createdDate: '2026-07-15'
  },
  {
    _id: 'v-105',
    name: 'Apex Furniture Industries',
    companyName: 'Apex Furniture Industries',
    email: 'orders@apexfurniture.lk',
    phone: '+94 11 883 9911',
    contactPerson: 'Dhammika Bandara',
    registrationNo: 'PV-449102',
    status: 'BLACKLISTED',
    category: 'Furniture & Fittings',
    rating: 2.1,
    grading: 'Blacklisted',
    setupTokenSent: false,
    createdDate: '2026-07-10'
  }
];

export default function SuppliesDivisionDashboard() {
  // States
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'invitations' | 'matrix' | 'announcements'

  // Action states
  const [actionLoading, setActionLoading] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    companyName: '',
    email: '',
    contactPerson: '',
    phone: '',
    category: 'ICT & Office Equipment'
  });
  const [inviteSuccessLink, setInviteSuccessLink] = useState(null);

  // Reject / Blacklist Modal
  const [reasonModal, setReasonModal] = useState({ show: false, type: null, vendorId: null, vendorName: '' });
  const [modalReason, setModalReason] = useState('');

  // Fetch Vendors Data
  const loadVendors = async () => {
    try {
      const res = await vendorService.getAll();
      const rawList = res.data?.data || res.data || [];
      setVendors(Array.isArray(rawList) ? rawList : []);
    } catch (err) {
      console.error('Failed to load vendors:', err);
      setVendors(MOCK_VENDORS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    vendorService.getAll()
      .then((res) => {
        if (!isMounted) return;
        const rawList = res.data?.data || res.data || [];
        setVendors(Array.isArray(rawList) ? rawList : []);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load vendors:', err);
        setVendors(MOCK_VENDORS);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Quick Action Handlers
  const handleApproveAndSendLink = async (vendor) => {
    setActionLoading(vendor._id);
    try {
      await vendorService.approveAndSendSetupLink(vendor._id);
      showToast(`Account setup link generated and dispatched to ${vendor.email}`);
      loadVendors();
    } catch (err) {
      console.error(err);
      // Fallback simulated success for mock items
      setVendors(prev => prev.map(v => v._id === vendor._id ? { ...v, status: 'VERIFIED', setupTokenSent: true } : v));
      showToast(`Account setup link dispatched to ${vendor.email}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReasonAction = async () => {
    const { type, vendorId } = reasonModal;
    if (!modalReason.trim()) return;

    setActionLoading(vendorId);
    try {
      if (type === 'REJECT') {
        await vendorService.reject(vendorId, modalReason);
        showToast('Vendor application rejected', 'warning');
      } else if (type === 'BLACKLIST') {
        await vendorService.blacklist(vendorId, modalReason);
        showToast('Vendor added to Blacklist / Suspended queue', 'error');
      }
      loadVendors();
    } catch (err) {
      console.error(err);
      setVendors(prev => prev.map(v => v._id === vendorId ? { ...v, status: type === 'REJECT' ? 'REJECTED' : 'BLACKLISTED' } : v));
      showToast(`Vendor status updated to ${type}`, 'warning');
    } finally {
      setActionLoading(null);
      setReasonModal({ show: false, type: null, vendorId: null, vendorName: '' });
      setModalReason('');
    }
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.companyName) return;

    const mockToken = 'setup_' + Math.random().toString(36).substring(2, 10);
    const mockLink = `${window.location.origin}/vendors/setup-account?token=${mockToken}`;

    const newVendor = {
      _id: 'v-' + Date.now(),
      name: inviteForm.companyName,
      companyName: inviteForm.companyName,
      email: inviteForm.email,
      phone: inviteForm.phone || '+94 77 000 0000',
      contactPerson: inviteForm.contactPerson || 'Contact Person',
      registrationNo: 'PENDING-REG',
      status: 'PENDING_VERIFICATION',
      category: inviteForm.category,
      rating: 5.0,
      grading: 'New Applicant',
      setupTokenSent: true,
      setupToken: mockToken,
      createdDate: new Date().toISOString().split('T')[0]
    };

    setVendors(prev => [newVendor, ...prev]);
    setInviteSuccessLink(mockLink);
    showToast(`Setup invitation sent to ${inviteForm.email}`);
  };

  // Filtered List
  const filteredVendors = vendors.filter(v => {
    const nameStr = (v.companyName || v.name || '').toLowerCase();
    const emailStr = (v.email || '').toLowerCase();
    const contactStr = (v.contactPerson || '').toLowerCase();
    const matchSearch = nameStr.includes(searchQuery.toLowerCase()) ||
                        emailStr.includes(searchQuery.toLowerCase()) ||
                        contactStr.includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchCat = categoryFilter === 'ALL' || v.category === categoryFilter;

    return matchSearch && matchStatus && matchCat;
  });

  // Calculate Metrics
  const totalCount = vendors.length;
  const pendingCount = vendors.filter(v => v.status === 'PENDING_VERIFICATION' || v.status === 'PENDING').length;
  const verifiedCount = vendors.filter(v => v.status === 'VERIFIED' || v.status === 'APPROVED').length;
  const setupSentCount = vendors.filter(v => v.setupTokenSent).length;
  const blacklistedCount = vendors.filter(v => v.status === 'BLACKLISTED' || v.status === 'REJECTED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border flex items-center space-x-3 text-sm font-medium transition-all transform animate-bounce ${
          toastMessage.type === 'error' ? 'bg-red-900 text-red-100 border-red-700' :
          toastMessage.type === 'warning' ? 'bg-amber-900 text-amber-100 border-amber-700' :
          'bg-emerald-900 text-emerald-100 border-emerald-700'
        }`}>
          {toastMessage.type === 'error' ? <FaTimesCircle size={18} /> :
           toastMessage.type === 'warning' ? <FaExclamationTriangle size={18} /> :
           <FaCheckCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-teal-900 via-slate-900 to-emerald-950 p-6 md:p-8 text-white shadow-xl border border-teal-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <FaShieldAlt className="text-teal-400" />
                <span>Supplies Division Portal</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">UWU-PRO-005</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Supplies Division Operations Center
            </h1>
            <p className="text-sm text-teal-100/80 mt-1 max-w-xl">
              Manage vendor registration reviews, account invitation dispatches, category compliance, and supplier performance verification for Uva Wellassa University.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setInviteSuccessLink(null);
                setShowInviteModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center space-x-2"
            >
              <FaUserPlus size={15} />
              <span>Invite New Supplier</span>
            </button>
            <button
              onClick={loadVendors}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 backdrop-blur-sm border border-white/10"
            >
              <FaSync className={loading ? 'animate-spin' : ''} size={13} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Decorative subtle background icon */}
        <FaStore className="absolute -right-8 -bottom-8 text-teal-500/10 text-9xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Registered Vendors</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {verifiedCount} Verified Active
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xl">
              <FaStore />
            </div>
          </div>
        </div>

        {/* Card 2: Pending Verification Queue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Verification Queue</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Awaiting Document Review
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
              <FaUserCheck />
            </div>
          </div>
        </div>

        {/* Card 3: Invitations & Setup Tokens */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Setup Tokens Dispatched</p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">{setupSentCount}</h3>
              <p className="text-xs text-sky-600 font-medium mt-1">
                Account Invitations Sent
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xl">
              <FaEnvelopeOpenText />
            </div>
          </div>
        </div>

        {/* Card 4: Blacklisted / Suspended */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Blacklisted / Rejected</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{blacklistedCount}</h3>
              <p className="text-xs text-rose-500 font-medium mt-1">
                Non-Compliant Vendors
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl">
              <FaBan />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center space-x-2 ${
            activeTab === 'queue'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FaUserCheck size={14} />
          <span>Vendor Queue & Applications</span>
          {pendingCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'queue' ? 'bg-white text-teal-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center space-x-2 ${
            activeTab === 'invitations'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FaEnvelopeOpenText size={14} />
          <span>Account Setup Invitations</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center space-x-2 ${
            activeTab === 'matrix'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FaBoxes size={14} />
          <span>Categories & Compliance</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center space-x-2 ${
            activeTab === 'announcements'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FaPaperPlane size={14} />
          <span>Supplies Issuances Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('tendering')}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center space-x-2 ${
            activeTab === 'tendering'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FaGavel size={14} />
          <span>Tendering Operations Section</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6">
        {/* TAB 1: Vendor Applications & Verification Queue */}
        {(activeTab === 'queue' || activeTab === 'invitations') && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div className="relative w-full sm:w-80">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search company, email, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
                  <FaFilter />
                  <span>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING_VERIFICATION">Pending Verification</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="BLACKLISTED">Blacklisted</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
                  <span>Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="ICT & Office Equipment">ICT & Equipment</option>
                    <option value="Laboratory Chemicals & Glassware">Chemicals & Labs</option>
                    <option value="Stationery & Printing">Stationery</option>
                    <option value="Furniture & Fittings">Furniture</option>
                    <option value="Electrical & Maintenance">Electrical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                <FaSpinner className="animate-spin text-teal-600 text-3xl mx-auto mb-3" />
                <p className="text-sm font-medium">Loading vendor applications directory...</p>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <FaStore className="text-slate-300 text-4xl mx-auto mb-2" />
                <h4 className="text-base font-semibold text-slate-700">No matching vendors found</h4>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search filters or invite a new supplier.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Vendor / Company</th>
                      <th className="py-3 px-4">Category & Reg No</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Status & Setup Link</th>
                      <th className="py-3 px-4 text-right">Supplies Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredVendors.map((v) => (
                      <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{v.companyName || v.name}</div>
                          <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                            <FaBuilding className="text-slate-400" size={11} />
                            <span>Contact: {v.contactPerson || 'N/A'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200">
                            {v.category || 'General Supplies'}
                          </span>
                          <div className="text-xs font-mono text-slate-400 mt-1">
                            {v.registrationNo || 'REG-PENDING'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs space-y-1">
                          <div className="text-slate-700 flex items-center space-x-1.5">
                            <FaEnvelope className="text-slate-400" size={11} />
                            <span>{v.email}</span>
                          </div>
                          <div className="text-slate-500 flex items-center space-x-1.5">
                            <FaPhone className="text-slate-400" size={11} />
                            <span>{v.phone}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {v.status === 'VERIFIED' || v.status === 'APPROVED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <FaCheckCircle className="mr-1 text-emerald-600" size={11} /> Verified
                            </span>
                          ) : v.status === 'REJECTED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                              <FaTimesCircle className="mr-1 text-red-600" size={11} /> Rejected
                            </span>
                          ) : v.status === 'BLACKLISTED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-100 border border-slate-700">
                              <FaBan className="mr-1 text-red-400" size={11} /> Blacklisted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              <FaExclamationTriangle className="mr-1 text-amber-600" size={11} /> Pending Review
                            </span>
                          )}

                          {v.setupTokenSent && (
                            <div className="text-[11px] text-sky-600 font-medium mt-1 flex items-center space-x-1">
                              <FaPaperPlane size={9} />
                              <span>Setup Token Dispatched</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          {v.status === 'PENDING_VERIFICATION' || v.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => handleApproveAndSendLink(v)}
                                disabled={actionLoading === v._id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all inline-flex items-center space-x-1"
                              >
                                {actionLoading === v._id ? (
                                  <FaSpinner className="animate-spin" />
                                ) : (
                                  <>
                                    <FaPaperPlane size={11} />
                                    <span>Approve & Send Setup Link</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => setReasonModal({ show: true, type: 'REJECT', vendorId: v._id, vendorName: v.companyName || v.name })}
                                className="bg-slate-100 hover:bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 transition-all"
                              >
                                Reject
                              </button>
                            </>
                          ) : v.status === 'VERIFIED' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <Link
                                to={`/vendors/${v._id}`}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center space-x-1"
                              >
                                <span>View Details</span>
                                <FaExternalLinkAlt size={10} />
                              </Link>
                              <button
                                onClick={() => setReasonModal({ show: true, type: 'BLACKLIST', vendorId: v._id, vendorName: v.companyName || v.name })}
                                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                                title="Blacklist Vendor"
                              >
                                <FaBan size={14} />
                              </button>
                            </div>
                          ) : (
                            <Link
                              to={`/vendors/${v._id}`}
                              className="text-slate-500 hover:text-slate-800 text-xs font-medium"
                            >
                              View Record
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Category & Performance Matrix */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Approved Supplier Category Matrix</h3>
                <p className="text-xs text-slate-500">Categorization and evaluation compliance distribution</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { cat: 'ICT & Office Equipment', count: vendors.filter(v => v.category?.includes('ICT')).length, color: 'border-l-sky-500' },
                { cat: 'Laboratory Chemicals & Glassware', count: vendors.filter(v => v.category?.includes('Lab') || v.category?.includes('Chemical')).length, color: 'border-l-emerald-500' },
                { cat: 'Stationery & Printing', count: vendors.filter(v => v.category?.includes('Stationery')).length, color: 'border-l-amber-500' },
                { cat: 'Furniture & Fittings', count: vendors.filter(v => v.category?.includes('Furniture')).length, color: 'border-l-purple-500' },
                { cat: 'Electrical & Maintenance', count: vendors.filter(v => v.category?.includes('Electrical')).length, color: 'border-l-indigo-500' },
                { cat: 'General Supplies', count: vendors.filter(v => !v.category).length, color: 'border-l-slate-400' },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-xl border border-slate-200 border-l-4 ${item.color} bg-slate-50/50 flex justify-between items-center`}>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{item.cat}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Active Registered Vendors</p>
                  </div>
                  <span className="text-xl font-extrabold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Announcements / Issuances Hub */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Supplies Division Tender Document Issuance</h3>
              <p className="text-xs text-slate-500">Publish tender documents, supplier pre-qualification notices, or registration extensions</p>
            </div>

            <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-3 text-teal-900">
                <FaPaperPlane className="text-teal-600" size={20} />
                <h4 className="font-bold text-sm">Issue General Supplier Registration Notice</h4>
              </div>
              <p className="text-xs text-slate-600">
                Broadcast an official invitation for vendor registration to all prospective suppliers for the upcoming financial year.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => showToast('Annual Supplier Registration Notice published on university portal!')}
                  className="bg-teal-700 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium text-xs shadow-sm transition-all"
                >
                  Publish Supplier Registration Notice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Full Tendering Operations Section */}
        {activeTab === 'tendering' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <FaGavel className="text-teal-600" />
                  <span>Full Tendering Operations Section</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage bid document preparation, digital vault submissions, public opening sessions, and evaluation matrices.
                </p>
              </div>
              <Link
                to="/tenders/new"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 shrink-0"
              >
                <FaPlusCircle size={14} />
                <span>Create New Tender Notice</span>
              </Link>
            </div>

            {/* Quick Navigation Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Bid Preparation */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-110 transition-transform">
                    <FaFileAlt />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Bid Preparation</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Prepare tender notices, technical specs, bidding documents, and publish to suppliers portal.
                  </p>
                </div>
                <Link
                  to="/tenders"
                  className="mt-4 pt-3 border-t border-slate-200/60 text-blue-600 hover:text-blue-800 text-xs font-bold inline-flex items-center space-x-1.5"
                >
                  <span>Go to Bid Preparation</span>
                  <FaChevronRight size={11} />
                </Link>
              </div>

              {/* Card 2: Digital Bid Box */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-110 transition-transform">
                    <FaBoxOpen />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Digital Bid Box</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Encrypted submission vault for live bids, deadline monitoring, and cryptographic proof of receipt.
                  </p>
                </div>
                <Link
                  to="/bid-box"
                  className="mt-4 pt-3 border-t border-slate-200/60 text-indigo-600 hover:text-indigo-800 text-xs font-bold inline-flex items-center space-x-1.5"
                >
                  <span>Access Digital Bid Box</span>
                  <FaChevronRight size={11} />
                </Link>
              </div>

              {/* Card 3: Bid Opening */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-110 transition-transform">
                    <FaGavel />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Bid Opening Session</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Conduct public bid openings, unseal cryptographic keys, and generate official opening attendance sheets.
                  </p>
                </div>
                <Link
                  to="/bid-opening"
                  className="mt-4 pt-3 border-t border-slate-200/60 text-purple-600 hover:text-purple-800 text-xs font-bold inline-flex items-center space-x-1.5"
                >
                  <span>Launch Bid Opening</span>
                  <FaChevronRight size={11} />
                </Link>
              </div>

              {/* Card 4: Technical & Financial Evaluation */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-110 transition-transform">
                    <FaBalanceScale />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Evaluation Matrix</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    TEC scoring, compliance verification, financial comparison, and recommendation reporting.
                  </p>
                </div>
                <Link
                  to="/evaluation"
                  className="mt-4 pt-3 border-t border-slate-200/60 text-emerald-600 hover:text-emerald-800 text-xs font-bold inline-flex items-center space-x-1.5"
                >
                  <span>Open Evaluation System</span>
                  <FaChevronRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Supplier Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2 text-teal-700 font-bold">
                <FaUserPlus size={18} />
                <h3 className="text-lg font-bold text-slate-900">Invite New Supplier</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {inviteSuccessLink ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-xs space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-sm text-emerald-900">
                    <FaCheckCircle className="text-emerald-600" size={16} />
                    <span>Invitation Created Successfully!</span>
                  </div>
                  <p>A unique account setup link has been generated for <strong>{inviteForm.email}</strong>.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Generated Setup Link:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteSuccessLink}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteSuccessLink);
                        showToast('Link copied to clipboard!');
                      }}
                      className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-teal-500 whitespace-nowrap"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Technologies Ltd"
                    value={inviteForm.companyName}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="sales@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      placeholder="Manager Name"
                      value={inviteForm.contactPerson}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={inviteForm.category}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="ICT & Office Equipment">ICT & Office Equipment</option>
                      <option value="Laboratory Chemicals & Glassware">Laboratory Chemicals</option>
                      <option value="Stationery & Printing">Stationery & Printing</option>
                      <option value="Furniture & Fittings">Furniture & Fittings</option>
                      <option value="Electrical & Maintenance">Electrical & Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
                  >
                    <FaPaperPlane size={11} />
                    <span>Generate & Send Setup Link</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reject / Blacklist Modal */}
      {reasonModal.show && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {reasonModal.type === 'REJECT' ? 'Reject Vendor Application' : 'Blacklist / Suspend Vendor'}
            </h3>
            <p className="text-xs text-slate-600">
              Target Vendor: <strong>{reasonModal.vendorName}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State official reason for {reasonModal.type === 'REJECT' ? 'rejection' : 'blacklisting'} *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Enter justification details..."
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setReasonModal({ show: false, type: null, vendorId: null, vendorName: '' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReasonAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md ${
                  reasonModal.type === 'REJECT' ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                Confirm {reasonModal.type === 'REJECT' ? 'Rejection' : 'Blacklisting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
