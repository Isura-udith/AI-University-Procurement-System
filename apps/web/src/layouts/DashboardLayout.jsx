import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaTachometerAlt, FaClipboardList, FaCheckDouble, FaLock,
  FaFileAlt, FaBoxOpen, FaGavel, FaBalanceScale,
  FaFileContract, FaTruck, FaMoneyCheckAlt, FaChartBar,
  FaUsers, FaBars, FaTimes, FaSignOutAlt, FaPlus,
  FaShieldAlt, FaArchive, FaEnvelope, FaFolder, FaUserShield, FaBrain, FaStore,
  FaLayerGroup, FaCalendarAlt, FaMoneyBillWave, FaWarehouse, FaSitemap, FaRobot,
  FaExpand, FaCompress, FaChevronLeft, FaChevronRight, FaIndent, FaOutdent,
  FaGripLinesVertical,
} from 'react-icons/fa';
import uwuLogo from '../assets/logos/Logo_uwu.jpg';
import { logout } from '../app/store';

import { ROLES, ROLE_CONFIG, getRoleLabel } from '../constants/roles';
import { canAccessRoute } from '../constants/routes';
import { hasPermission, PERMISSIONS } from '../constants/permissions';
import Footer from '../components/navigation/Footer';
import NotificationBell from '../features/notifications/NotificationBell';
import messageService from '../services/message.service';

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
      { path: '/planning/master-plans', label: 'Master Plans (3-Yr)', icon: FaLayerGroup },
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
      { path: '/archive', label: 'Archive', icon: FaArchive },
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
    return 280; // default width in px (w-70 equivalent)
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

  const [isResizing, setIsResizing] = useState(false);
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

  // ─── Drag Resizing Handlers ────────────────────────────────────
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth < 130) {
          setIsCollapsed(true);
        } else {
          setIsCollapsed(false);
          setSidebarWidth(Math.max(200, Math.min(420, newWidth)));
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

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

    if (isAuthenticated && user) {
      fetchMessageUnreadCount();
      const interval = setInterval(fetchMessageUnreadCount, 20000); // 20s poll
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
      // Clean up script on unmount
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      // Remove any chatbot elements that the library appended to the DOM
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

  // Redirect supplier to supplier portal, guest to public page
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

  // Check if user can create requisitions
  const canCreateRequisition = hasPermission(userRole, PERMISSIONS.CREATE_REQUISITION);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const effectiveDesktopWidth = isCollapsed ? 80 : sidebarWidth;

  const renderNav = (onClickLink, collapsed = false) => (
    <nav className={`flex-1 ${collapsed ? 'px-2 py-4' : 'px-4 py-6'} space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent`}>
      {filteredSections.map((section, si) => (
        <div key={si}>
          {section.title && (
            collapsed ? (
              <div className="my-2 border-t border-slate-800/80" title={section.title} />
            ) : (
              <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500/80">
                {section.title}
              </p>
            )
          )}
          <div className="space-y-1">
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClickLink}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex items-center ${collapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  )}
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} overflow-hidden`}>
                    <Icon size={18} className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    {!collapsed && <span className={`truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>}
                  </div>
                  {!collapsed && item.hint && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border shrink-0 ${isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700/50'}`}>
                      {item.hint}
                    </span>
                  )}
                  {/* Floating Tooltip for Collapsed Sidebar */}
                  {collapsed && (
                    <div className="fixed left-20 ml-2 px-3 py-1.5 bg-slate-900 text-slate-100 text-xs font-semibold rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside
        style={{ width: `${effectiveDesktopWidth}px` }}
        className={`hidden lg:flex lg:flex-col bg-[#0B1120] border-r border-slate-800 text-white fixed inset-y-0 left-0 z-40 shadow-2xl ${
          isResizing ? 'select-none' : 'transition-[width] duration-300 ease-in-out'
        }`}
      >
        {/* Header Logo & Collapse Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'} py-4 border-b border-slate-800/80 bg-[#0B1120]/95 backdrop-blur sticky top-0 z-10`}>
          <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity cursor-pointer overflow-hidden">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center p-1 shadow-sm ring-1 ring-slate-200/20 shrink-0">
              <img src={uwuLogo} alt="UWU" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <p className="text-[15px] font-bold text-slate-100 tracking-wide leading-tight truncate">SmartProcure</p>
                <p className="text-[10px] font-semibold text-emerald-400/90 tracking-wider uppercase mt-0.5 truncate">UWU GOSL Compliant</p>
              </div>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
          </button>
        </div>

        {/* Quick Action Button */}
        {canCreateRequisition && (
          <div className={`${isCollapsed ? 'px-2' : 'px-4'} pt-4 pb-2`}>
            {isCollapsed ? (
              <Link
                to="/procurements/new"
                className="flex items-center justify-center w-10 h-10 mx-auto bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all group relative"
                title="New Requisition"
              >
                <FaPlus size={14} />
                <div className="fixed left-20 ml-2 px-3 py-1.5 bg-slate-900 text-slate-100 text-xs font-semibold rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap">
                  New Requisition
                </div>
              </Link>
            ) : (
              <Link
                to="/procurements/new"
                className="flex items-center justify-center space-x-2 w-full py-2.5 bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/20 transition-all duration-200 hover:-translate-y-0.5 ring-1 ring-emerald-500/50"
              >
                <FaPlus size={12} /> <span>New Requisition</span>
              </Link>
            )}
          </div>
        )}

        {renderNav(null, isCollapsed)}

        {/* User Profile Footer */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-slate-800/80 bg-[#0B1120]/95 backdrop-blur sticky bottom-0 z-10`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-2">
              <div
                className={`w-9 h-9 rounded-full bg-linear-to-br ${accent.gradient} flex items-center justify-center text-[11px] font-bold text-white shadow-inner ring-2 ring-slate-800`}
                title={`${userFullName} (${userRoleLabel})`}
              >
                {userInitial}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                title="Sign Out"
              >
                <FaSignOutAlt size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/60 transition-colors p-3 rounded-xl border border-slate-700/50 group">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className={`w-9 h-9 rounded-full bg-linear-to-br ${accent.gradient} flex items-center justify-center text-[11px] font-bold text-white shadow-inner ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all shrink-0`}>
                  {userInitial}
                </div>
                <div className="flex flex-col truncate">
                  <p className="text-sm font-semibold text-slate-200 truncate">{userFullName}</p>
                  <p className="text-[10px] text-emerald-400/80 font-medium truncate">{userRoleLabel}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 shrink-0" title="Sign Out">
                <FaSignOutAlt size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Drag Resize Handle (Desktop) */}
        <div
          onMouseDown={startResizing}
          onDoubleClick={() => {
            setIsCollapsed(false);
            setSidebarWidth(280);
          }}
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors group z-50 ${
            isResizing ? 'bg-emerald-500' : ''
          }`}
          title="Drag edge to adjust width, double click to reset width"
        >
          <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <FaGripLinesVertical className="text-emerald-400 text-[10px]" />
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[#0B1120] text-white flex flex-col shadow-2xl transition-transform transform translate-x-0">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
              <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center p-1">
                  <img src={uwuLogo} alt="UWU" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">SmartProcure</p>
                  <p className="text-[9px] font-semibold text-emerald-400 uppercase">GOSL Compliant</p>
                </div>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <FaTimes size={18} />
              </button>
            </div>
            <div className="px-5 pt-4 pb-2 space-y-3">
              {canCreateRequisition && (
                <Link to="/procurements/new" onClick={() => setSidebarOpen(false)} className="flex items-center justify-center space-x-2 w-full py-2.5 bg-linear-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/20">
                  <FaPlus size={12} /> <span>New Requisition</span>
                </Link>
              )}
            </div>
            {renderNav(() => setSidebarOpen(false), false)}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div
        style={{ marginLeft: `${effectiveDesktopWidth}px` }}
        className={`flex-1 flex flex-col min-h-screen ${
          isResizing ? 'select-none' : 'transition-[margin-left] duration-300 ease-in-out'
        }`}
      >
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-slate-200/60">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center space-x-3">
              {/* Mobile Sidebar Toggle Button */}
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <FaBars size={18} />
              </button>

              {/* Desktop Sidebar Collapse Toggle Button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80 shadow-2xs items-center justify-center cursor-pointer"
                title={isCollapsed ? "Expand Navigation Bar" : "Adjust / Collapse Navigation Bar"}
              >
                {isCollapsed ? <FaIndent size={16} className="text-emerald-600" /> : <FaOutdent size={16} className="text-slate-600" />}
              </button>

              <h2 className="text-base font-bold text-slate-800 tracking-tight hidden sm:block">
                {allNavItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {location.pathname === '/dashboard' && (
                <div className="hidden lg:flex items-center space-x-3 mr-2">
                  <select value={category} onChange={e => setCategory(e.target.value)} className="pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer hover:bg-slate-50 transition-colors appearance-none shadow-sm">
                    <option value="all">All Categories</option>
                    <option value="goods">Goods</option>
                    <option value="works">Works</option>
                    <option value="services">Services</option>
                  </select>
                  <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer hover:bg-slate-50 transition-colors appearance-none shadow-sm">
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                  </select>
                  {canCreateRequisition && (
                    <Link to="/procurements/new" className="group flex items-center px-4 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-500 transition-all">
                      <FaPlus className="mr-1.5 group-hover:rotate-90 transition-transform duration-300" size={12} /> New Requisition
                    </Link>
                  )}
                </div>
              )}

              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullScreen}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80 shadow-2xs flex items-center justify-center cursor-pointer relative group"
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Full Screen Mode"}
              >
                {isFullscreen ? (
                  <FaCompress size={16} className="text-emerald-600" />
                ) : (
                  <FaExpand size={16} className="text-slate-600 group-hover:text-emerald-600" />
                )}
              </button>
              
              <NotificationBell messageUnreadCount={messageUnreadCount} />
              <div className={`w-8 h-8 rounded-full bg-linear-to-br ${accent.gradient} flex items-center justify-center text-[10px] font-bold text-white lg:hidden shadow-sm`}>
                {userInitial}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50/50 flex flex-col">
          <Outlet context={{ category, setCategory, timeRange, setTimeRange }} />
          <Footer variant="dashboard" theme="light" />
        </main>
      </div>
    </div>
  );
}
