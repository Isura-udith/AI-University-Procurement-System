import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaTachometerAlt, FaClipboardList, FaCheckDouble, FaLock,
  FaFileAlt, FaBoxOpen, FaGavel, FaBalanceScale,
  FaFileContract, FaTruck, FaMoneyCheckAlt, FaChartBar,
  FaUsers, FaShieldAlt, FaEnvelope, FaFolder, FaUserShield, FaBrain, FaStore,
  FaLayerGroup, FaCalendarAlt, FaMoneyBillWave, FaWarehouse, FaSitemap, FaRobot, FaTable,
} from 'react-icons/fa';
import { logout } from '../app/store';

import { ROLES, ROLE_CONFIG, getRoleLabel } from '../constants/roles';
import { canAccessRoute } from '../constants/routes';
import { hasPermission, PERMISSIONS } from '../constants/permissions';
import Footer from '../components/navigation/Footer';
import Sidebar from '../components/navigation/Sidebar';
import Navbar from '../components/navigation/Navbar';
import messageService from '../services/message.service';
import procurementService from '../services/procurement.service';

// ─── Full Navigation Sections with role access ─────────────────
const navSections = [
  {
    title: null,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
    ]
  },
  {
    title: 'Procurement Lifecycle',
    items: [
      { path: '/procurements', label: 'Requisitions', icon: FaClipboardList },
      { path: '/approvals', label: 'Approvals', icon: FaCheckDouble },
      { path: '/budget-lock', label: 'Budget Lock', icon: FaLock },
    ]
  },
  {
    title: 'Tendering',
    items: [
      { path: '/tenders', label: 'Bid Preparation', icon: FaFileAlt },
      { path: '/bid-box', label: 'Digital Bid Box', icon: FaBoxOpen },
      { path: '/bid-opening', label: 'Bid Opening', icon: FaGavel },
      { path: '/evaluation', label: 'Evaluation', icon: FaBalanceScale },
    ]
  },
  {
    title: 'Awards & Contracts',
    items: [
      { path: '/awards', label: 'Award & Standstill', icon: FaShieldAlt },
      { path: '/contracts', label: 'Contracts', icon: FaFileContract },
    ]
  },
  {
    title: 'Strategic Planning',
    items: [
      { path: '/workflow', label: '45-Step Lifecycle', icon: FaSitemap },
      { path: '/planning', label: 'Planning Hub', icon: FaLayerGroup },
      { path: '/planning/draft-sheet', label: 'Draft Plan Sheet', icon: FaTable },
      { path: '/planning/final-master-plans', label: 'Final Master Plans', icon: FaClipboardList },
      { path: '/planning/annual-plans', label: 'Annual Plans', icon: FaCalendarAlt },
      { path: '/planning/budget-distribution', label: 'Budget Distribution', icon: FaMoneyBillWave },
    ]
  },
  {
    title: 'Delivery & Finance',
    items: [
      { path: '/delivery', label: '3-Way Match', icon: FaTruck },
      { path: '/payments', label: 'Payments', icon: FaMoneyCheckAlt },
    ]
  },
  {
    title: 'Store & Inventory',
    items: [
      { path: '/store', label: 'Store Hub', icon: FaWarehouse },
      { path: '/store/grn/new', label: 'Create GRN', icon: FaTruck },
      { path: '/store/issue', label: 'Issue Items', icon: FaBoxOpen },
    ]
  },
  {
    title: 'Hubs & Operations',
    items: [
      { path: '/communications', label: 'Communications', icon: FaEnvelope },
      { path: '/documents', label: 'Documents', icon: FaFolder },
    ]
  },
  {
    title: 'AI Intelligence',
    items: [
      { path: '/ai', label: 'AI Hub', icon: FaBrain, hint: 'AI' },
      { path: '/ai/chat', label: 'AI Chat Assistant', icon: FaRobot },
    ]
  },
  {
    title: 'Administration',
    items: [
      { path: '/supplier-dashboard', label: 'Supplier Dashboard', icon: FaStore },
      { path: '/users', label: 'User Management', icon: FaUserShield },
      { path: '/vendors', label: 'Vendors', icon: FaUsers },
      { path: '/reports', label: 'Reports & Audit', icon: FaChartBar },
    ]
  },
];

// ─── Role-specific accent color mapping ────────────────────────
const ROLE_ACCENT = {
  rose:    { gradient: 'from-rose-500 to-pink-600',    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',        ring: 'ring-rose-500' },
  purple:  { gradient: 'from-purple-500 to-violet-600', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',  ring: 'ring-purple-500' },
  blue:    { gradient: 'from-blue-500 to-indigo-600',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',        ring: 'ring-blue-500' },
  emerald: { gradient: 'from-emerald-500 to-teal-600',  badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', ring: 'ring-emerald-500' },
  amber:   { gradient: 'from-amber-500 to-orange-600',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    ring: 'ring-amber-500' },
  teal:    { gradient: 'from-teal-500 to-cyan-600',     badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',        ring: 'ring-teal-500' },
  indigo:  { gradient: 'from-indigo-500 to-blue-600',   badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',  ring: 'ring-indigo-500' },
  slate:   { gradient: 'from-slate-500 to-gray-600',    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',     ring: 'ring-slate-500' },
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('month');
  const [category, setCategory] = useState('all');
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(state => state.auth);

  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // ─── Sidebar Adjustment & Drag Resizing State ─────────────────
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('smartprocure_sidebar_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && parsed.width >= 180 && parsed.width <= 450) {
          return parsed.width;
        }
      }
    } catch { /* ignored */ }
    return 280; // default width in px
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('smartprocure_sidebar_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.isCollapsed);
      }
    } catch { /* ignored */ }
    return false;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Persist sidebar preferences
  useEffect(() => {
    try {
      localStorage.setItem(
        'smartprocure_sidebar_settings',
        JSON.stringify({ width: sidebarWidth, isCollapsed })
      );
    } catch { /* ignored */ }
  }, [sidebarWidth, isCollapsed]);

  // ─── Full Screen Handler & Event Listeners ────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) docEl.requestFullscreen();
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
      else if (docEl.mozRequestFullScreen) docEl.mozRequestFullScreen();
      else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  };

  // Fetch Message Unread Count & Pending Approvals Count
  useEffect(() => {
    let isMounted = true;

    const fetchMessageUnreadCount = async () => {
      try {
        const res = await messageService.getUnreadCount();
        if (res?.success && isMounted) {
          setMessageUnreadCount(res.data?.count?.all || 0);
        }
      } catch { /* intentionally ignored */ }
    };

    const fetchPendingApprovals = async () => {
      try {
        const res = await procurementService.getPendingApprovals();
        if (res?.data && isMounted) {
          const list = Array.isArray(res.data) ? res.data : (res.data.items || res.data.data || []);
          setPendingApprovalsCount(list.length);
        }
      } catch { /* intentionally ignored */ }
    };

    if (isAuthenticated && user) {
      fetchMessageUnreadCount();
      fetchPendingApprovals();
      const interval = setInterval(() => {
        fetchMessageUnreadCount();
        fetchPendingApprovals();
      }, 20000); // 20s poll
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Load Flowise Embed Chatbot script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js';
    script.async = true;
    
    script.onload = () => {
      if (window.Chatbot) {
        window.Chatbot.init({
          chatflowid: 'e09a9b3b-0e76-4bb6-ba2a-4f1878d7eacb',
          apiHost: 'http://localhost:3000',
          chatTriggerBtnFrame: {
            style: {
              bottom: '25px',
              right: '25px',
              backgroundColor: '#059669', // Emerald 600
            }
          },
          theme: {
            button: {
              backgroundColor: '#059669',
              right: 25,
              bottom: 25,
              size: 'medium',
              iconSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
            },
            chatWindow: {
              showTitle: true,
              title: 'AI Procurement Assistant',
              titleAvatarSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
              welcomeMessage: 'Hello! I am your AI Procurement Assistant. How can I help you today?',
              backgroundColor: '#ffffff',
              height: 500,
              width: 400,
              fontSize: 14,
              userMessage: {
                backgroundColor: '#059669',
                textColor: '#ffffff',
              },
              textInput: {
                placeholder: 'Type your question...',
                backgroundColor: '#ffffff',
                textColor: '#334155',
                sendButtonColor: '#059669',
              }
            }
          }
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      const chatbotContainer = document.querySelector('flowise-chatbot');
      if (chatbotContainer) {
        chatbotContainer.remove();
      }
    };
  }, []);

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect guest to public page
  if (user.role === ROLES.GUEST) {
    return <Navigate to="/" replace />;
  }

  const userRole = user.role || ROLES.DEPARTMENT_USER;
  const roleConfig = ROLE_CONFIG[userRole] || ROLE_CONFIG[ROLES.DEPARTMENT_USER];
  const roleColor = roleConfig?.color || 'emerald';
  const accent = ROLE_ACCENT[roleColor] || ROLE_ACCENT.emerald;

  const userInitial = (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '');
  const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const userRoleLabel = getRoleLabel(userRole);

  // ─── Filter nav sections by role access ────────────────────────
  const filteredSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessRoute(userRole, item.path)),
    }))
    .filter(section => section.items.length > 0);

  const allNavItems = filteredSections.flatMap(s => s.items);

  // ─── Compute Active Nav Item without Multi-Highlight Overlaps ──
  const activeNavItem = allNavItems
    .filter(item => {
      if (item.path === '/dashboard') {
        return location.pathname === '/dashboard';
      }
      return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    })
    .sort((a, b) => b.path.length - a.path.length)[0];

  const activePath = activeNavItem?.path || '';
  const activeLabel = activeNavItem?.label || 'Dashboard';

  // Check if user can create requisitions
  const canCreateRequisition = hasPermission(userRole, PERMISSIONS.CREATE_REQUISITION);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const effectiveDesktopWidth = isCollapsed ? 80 : sidebarWidth;

  const badges = {
    '/approvals': pendingApprovalsCount,
    '/communications': messageUnreadCount,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Component */}
      <Sidebar
        navSections={filteredSections}
        activePath={activePath}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        canCreateRequisition={canCreateRequisition}
        userFullName={userFullName}
        userRoleLabel={userRoleLabel}
        userInitial={userInitial}
        accent={accent}
        handleLogout={handleLogout}
        badges={badges}
      />

      {/* Main Content Area */}
      <div
        style={{ marginLeft: `${effectiveDesktopWidth}px` }}
        className="flex-1 flex flex-col min-h-screen transition-[margin-left] duration-300 ease-in-out"
      >
        {/* Header Navbar Component */}
        <Navbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          activeLabel={activeLabel}
          locationPathname={location.pathname}
          category={category}
          setCategory={setCategory}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          canCreateRequisition={canCreateRequisition}
          isFullscreen={isFullscreen}
          toggleFullScreen={toggleFullScreen}
          messageUnreadCount={messageUnreadCount}
          accent={accent}
          userInitial={userInitial}
        />

        {/* Main Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50/50 flex flex-col">
          <Outlet context={{ category, setCategory, timeRange, setTimeRange }} />
          <Footer variant="dashboard" theme="light" />
        </main>
      </div>
    </div>
  );
}
