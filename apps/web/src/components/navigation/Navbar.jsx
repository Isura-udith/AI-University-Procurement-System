import { Link } from 'react-router-dom';
import {
  FaBars,
  FaIndent,
  FaOutdent,
  FaPlus,
  FaExpand,
  FaCompress,
} from 'react-icons/fa';
import NotificationBell from '../../features/notifications/NotificationBell';

export default function Navbar({
  setSidebarOpen,
  isCollapsed,
  setIsCollapsed,
  activeLabel = 'Dashboard',
  locationPathname = '',
  category = 'all',
  setCategory,
  timeRange = 'month',
  setTimeRange,
  canCreateRequisition = false,
  isFullscreen = false,
  toggleFullScreen,
  messageUnreadCount = 0,
  accent = {},
  userInitial = '',
}) {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-2xs sticky top-0 z-30 border-b border-slate-200/60">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left Side: Mobile & Desktop Toggles + Title */}
        <div className="flex items-center space-x-3">
          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            aria-label="Open mobile navigation menu"
          >
            <FaBars size={18} />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80 shadow-2xs items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            title={isCollapsed ? 'Expand Navigation Bar' : 'Collapse Navigation Bar'}
            aria-label={isCollapsed ? 'Expand Navigation Bar' : 'Collapse Navigation Bar'}
          >
            {isCollapsed ? (
              <FaIndent size={16} className="text-emerald-600" />
            ) : (
              <FaOutdent size={16} className="text-slate-600" />
            )}
          </button>

          <h2 className="text-base font-bold text-slate-800 tracking-tight hidden sm:block">
            {activeLabel}
          </h2>
        </div>

        {/* Right Side: Filters, Actions & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {locationPathname === '/dashboard' && (
            <div className="hidden lg:flex items-center space-x-3 mr-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer hover:bg-slate-50 transition-colors appearance-none shadow-2xs"
              >
                <option value="all">All Categories</option>
                <option value="goods">Goods</option>
                <option value="works">Works</option>
                <option value="services">Services</option>
              </select>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer hover:bg-slate-50 transition-colors appearance-none shadow-2xs"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              {canCreateRequisition && (
                <Link
                  to="/procurements/new"
                  className="group flex items-center px-4 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-xs hover:bg-emerald-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <FaPlus className="mr-1.5 group-hover:rotate-90 transition-transform duration-300" size={12} />{' '}
                  New Requisition
                </Link>
              )}
            </div>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80 shadow-2xs flex items-center justify-center cursor-pointer relative group focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Full Screen Mode'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Full Screen Mode'}
          >
            {isFullscreen ? (
              <FaCompress size={16} className="text-emerald-600" />
            ) : (
              <FaExpand size={16} className="text-slate-600 group-hover:text-emerald-600" />
            )}
          </button>

          {/* Notifications Bell */}
          <NotificationBell messageUnreadCount={messageUnreadCount} />

          {/* Mobile User Avatar */}
          <div
            className={`w-8 h-8 rounded-full bg-linear-to-br ${
              accent.gradient || 'from-emerald-500 to-teal-600'
            } flex items-center justify-center text-[10px] font-bold text-white lg:hidden shadow-2xs`}
          >
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
}
