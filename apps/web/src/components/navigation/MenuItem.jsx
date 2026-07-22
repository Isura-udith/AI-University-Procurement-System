import { Link } from 'react-router-dom';

export default function MenuItem({
  path,
  label,
  icon: Icon,
  isActive,
  collapsed = false,
  hint,
  badge = 0,
  onClick,
}) {
  return (
    <Link
      to={path}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center ${
        collapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
      } rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
        isActive
          ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-xs'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
      }`}
    >
      {/* Active Left Pill */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
      )}

      {/* Main Content (Icon + Label) */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} overflow-hidden min-w-0`}>
        <div className="relative shrink-0 flex items-center justify-center">
          <Icon
            size={18}
            className={`transition-colors duration-200 ${
              isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          />
          {/* Badge Dot in Collapsed Mode */}
          {collapsed && badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full border border-slate-900 shadow-sm animate-pulse">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>

        {!collapsed && (
          <span className={`truncate text-sm ${isActive ? 'font-semibold text-slate-100' : 'font-medium'}`}>
            {label}
          </span>
        )}
      </div>

      {/* Trailing Elements in Expanded Mode (Hint / Badge) */}
      {!collapsed && (
        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {badge > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          {hint && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 border-slate-700/50'
              }`}
            >
              {hint}
            </span>
          )}
        </div>
      )}

      {/* Floating Tooltip for Collapsed Mode */}
      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5 bg-slate-900/95 text-slate-100 text-xs font-semibold rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap backdrop-blur-xs flex items-center space-x-2">
          <span>{label}</span>
          {badge > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-500 text-white rounded-full">
              {badge}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
