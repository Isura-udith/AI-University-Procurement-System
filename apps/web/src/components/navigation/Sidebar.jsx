import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaSignOutAlt,
  FaTimes,
  FaGripLinesVertical,
} from 'react-icons/fa';
import uwuLogo from '../../assets/logos/Logo_uwu.jpg';
import MenuItem from './MenuItem';

export default function Sidebar({
  navSections = [],
  activePath = '',
  isCollapsed = false,
  setIsCollapsed,
  sidebarWidth = 280,
  setSidebarWidth,
  sidebarOpen = false,
  setSidebarOpen,
  canCreateRequisition = false,
  userFullName = '',
  userRoleLabel = '',
  userInitial = '',
  accent = {},
  handleLogout,
  badges = {},
}) {
  const [isResizing, setIsResizing] = useState(false);

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
    [isResizing, setIsCollapsed, setSidebarWidth]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.classList.add('select-none', 'cursor-col-resize');
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.classList.remove('select-none', 'cursor-col-resize');
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.classList.remove('select-none', 'cursor-col-resize');
    };
  }, [isResizing, resize, stopResizing]);

  // ─── Mobile Keyboard & Scroll Lock Effects ──────────────────────
  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [sidebarOpen, setSidebarOpen]);

  const effectiveDesktopWidth = isCollapsed ? 80 : sidebarWidth;

  const renderNavList = (onClickLink, collapsed = false) => (
    <nav
      className={`flex-1 ${
        collapsed ? 'px-2 py-4' : 'px-3.5 py-5'
      } space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent`}
    >
      {navSections.map((section, si) => (
        <div key={si} className="space-y-1">
          {section.title && (
            collapsed ? (
              <div className="my-2.5 border-t border-slate-800/80" title={section.title} />
            ) : (
              <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500/90 select-none">
                {section.title}
              </p>
            )
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = activePath === item.path;
              const itemBadge = badges[item.path] || 0;
              return (
                <MenuItem
                  key={item.path}
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                  hint={item.hint}
                  badge={itemBadge}
                  isActive={isActive}
                  collapsed={collapsed}
                  onClick={onClickLink}
                />
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        style={{ width: `${effectiveDesktopWidth}px` }}
        className={`hidden lg:flex lg:flex-col bg-[#0B1120] border-r border-slate-800 text-white fixed inset-y-0 left-0 z-40 shadow-2xl ${
          isResizing ? 'select-none' : 'transition-[width] duration-300 ease-in-out'
        }`}
      >
        {/* Header Logo & Collapse Toggle */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4.5'
          } py-4 border-b border-slate-800/80 bg-[#0B1120]/95 backdrop-blur-xs sticky top-0 z-10`}
        >
          <Link
            to="/"
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity cursor-pointer overflow-hidden"
          >
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center p-1 shadow-xs ring-1 ring-slate-200/20 shrink-0">
              <img src={uwuLogo} alt="UWU" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <p className="text-[15px] font-bold text-slate-100 tracking-wide leading-tight truncate">
                  SmartProcure
                </p>
                <p className="text-[10px] font-semibold text-emerald-400/90 tracking-wider uppercase mt-0.5 truncate">
                  UWU GOSL Compliant
                </p>
              </div>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
          </button>
        </div>

        {/* Quick Action Button */}
        {canCreateRequisition && (
          <div className={`${isCollapsed ? 'px-2' : 'px-4'} pt-4 pb-1`}>
            {isCollapsed ? (
              <Link
                to="/procurements/new"
                className="flex items-center justify-center w-10 h-10 mx-auto bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all group relative focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                title="New Requisition"
              >
                <FaPlus size={14} />
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5 bg-slate-900/95 text-slate-100 text-xs font-semibold rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap backdrop-blur-xs">
                  New Requisition
                </div>
              </Link>
            ) : (
              <Link
                to="/procurements/new"
                className="flex items-center justify-center space-x-2 w-full py-2.5 bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/20 transition-all duration-200 hover:-translate-y-0.5 ring-1 ring-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <FaPlus size={12} /> <span>New Requisition</span>
              </Link>
            )}
          </div>
        )}

        {/* Render Nav Items */}
        {renderNavList(null, isCollapsed)}

        {/* User Profile Footer */}
        <div
          className={`${
            isCollapsed ? 'p-2' : 'p-3.5'
          } border-t border-slate-800/80 bg-[#0B1120]/95 backdrop-blur-xs sticky bottom-0 z-10`}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-2">
              <div
                className={`w-9 h-9 rounded-full bg-linear-to-br ${
                  accent.gradient || 'from-emerald-500 to-teal-600'
                } flex items-center justify-center text-[11px] font-bold text-white shadow-inner ring-2 ring-slate-800`}
                title={`${userFullName} (${userRoleLabel})`}
              >
                {userInitial}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <FaSignOutAlt size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/70 transition-colors p-2.5 rounded-xl border border-slate-700/50 group">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div
                  className={`w-9 h-9 rounded-full bg-linear-to-br ${
                    accent.gradient || 'from-emerald-500 to-teal-600'
                  } flex items-center justify-center text-[11px] font-bold text-white shadow-inner ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all shrink-0`}
                >
                  {userInitial}
                </div>
                <div className="flex flex-col truncate">
                  <p className="text-sm font-semibold text-slate-200 truncate">{userFullName}</p>
                  <p className="text-[10px] text-emerald-400/80 font-medium truncate">
                    {userRoleLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50"
                title="Sign Out"
                aria-label="Sign Out"
              >
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

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-72 bg-[#0B1120] text-white flex flex-col shadow-2xl transition-transform transform translate-x-0 z-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center p-1">
                  <img src={uwuLogo} alt="UWU" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">SmartProcure</p>
                  <p className="text-[9px] font-semibold text-emerald-400 uppercase">GOSL Compliant</p>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 -mr-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {canCreateRequisition && (
              <div className="px-4 pt-4 pb-1">
                <Link
                  to="/procurements/new"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 bg-linear-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/20"
                >
                  <FaPlus size={12} /> <span>New Requisition</span>
                </Link>
              </div>
            )}

            {renderNavList(() => setSidebarOpen(false), false)}

            <div className="p-4 border-t border-slate-800 bg-[#0B1120]">
              <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div
                    className={`w-8 h-8 rounded-full bg-linear-to-br ${
                      accent.gradient || 'from-emerald-500 to-teal-600'
                    } flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
                  >
                    {userInitial}
                  </div>
                  <div className="flex flex-col truncate">
                    <p className="text-xs font-semibold text-slate-200 truncate">{userFullName}</p>
                    <p className="text-[9px] text-emerald-400 font-medium truncate">{userRoleLabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    handleLogout();
                  }}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  aria-label="Sign Out"
                >
                  <FaSignOutAlt size={15} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
