import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  FaBell, FaCheckDouble, FaCircle, FaTimes, FaExternalLinkAlt,
  FaClipboardList, FaGavel, FaFileContract, FaMoneyCheckAlt,
  FaBullhorn, FaRobot, FaShieldAlt, FaSpinner,
} from 'react-icons/fa';
import { setNotifications, setUnreadCount } from '../../app/store';
import notificationService from '../../services/notification.service';

// ─── Icon resolver by notification type ───────────────────────────────────
const resolveIcon = (type) => {
  if (!type) return FaBell;
  if (type.includes('requisition') || type.includes('approval')) return FaClipboardList;
  if (type.includes('tender') || type.includes('bid')) return FaGavel;
  if (type.includes('contract')) return FaFileContract;
  if (type.includes('payment') || type.includes('budget') || type.includes('finance')) return FaMoneyCheckAlt;
  if (type.includes('ai') || type.includes('market')) return FaRobot;
  if (type.includes('award') || type.includes('standstill')) return FaShieldAlt;
  if (type.includes('announcement') || type.includes('system')) return FaBullhorn;
  return FaBell;
};

// ─── Severity/Priority color resolver ─────────────────────────────────────
const severityStyle = (severity, priority) => {
  if (priority === 'urgent') return { dot: 'bg-red-500', badge: 'bg-red-50 border-red-100', icon: 'text-red-500' };
  if (priority === 'high') return { dot: 'bg-orange-500', badge: 'bg-orange-50 border-orange-100', icon: 'text-orange-500' };
  if (severity === 'success') return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-100', icon: 'text-emerald-500' };
  if (severity === 'warning') return { dot: 'bg-amber-500', badge: 'bg-amber-50 border-amber-100', icon: 'text-amber-500' };
  if (severity === 'error') return { dot: 'bg-red-500', badge: 'bg-red-50 border-red-100', icon: 'text-red-500' };
  return { dot: 'bg-blue-500', badge: 'bg-blue-50 border-blue-100', icon: 'text-blue-500' };
};

// ─── Time formatter ────────────────────────────────────────────────────────
const timeAgo = (date) => {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString();
};

// ─── Route resolver by referenceType ──────────────────────────────────────
const resolveLink = (notif) => {
  if (notif.link) return notif.link;
  if (!notif.referenceType || !notif.referenceId) return null;
  const map = {
    procurement: `/procurements/${notif.referenceId}`,
    tender: `/tenders/${notif.referenceId}`,
    contract: `/contracts/${notif.referenceId}`,
    payment: `/payments/${notif.referenceId}`,
    vendor: `/vendors/${notif.referenceId}`,
  };
  return map[notif.referenceType] || null;
};

export default function NotificationBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { notifications, unreadCount } = useSelector((state) => state.ui);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [markingAll, setMarkingAll] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);

  const dropdownRef = useRef(null);
  const prevCountRef = useRef(unreadCount);

  // ─── Fetch unread count (for badge polling) ──────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationService.getUnreadCount();
      if (res?.success) {
        const count = res.data?.count ?? 0;
        dispatch(setUnreadCount(count));
        // Animate bell if new notifications arrived
        if (count > prevCountRef.current) {
          setAnimateBell(true);
          setTimeout(() => setAnimateBell(false), 1000);
        }
        prevCountRef.current = count;
      }
    } catch { /* intentionally ignored */ }
  }, [user, dispatch]);

  // ─── Fetch full notifications list (when dropdown opened) ────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = { limit: 30 };
      if (filter === 'unread') params.unreadOnly = true;
      const res = await notificationService.getAll(params);
      if (res?.success) {
        dispatch(setNotifications(res.data?.data || []));
      }
    } catch { /* intentionally ignored */ }
    finally { setLoading(false); }
  }, [user, dispatch, filter]);

  // ─── Poll unread count every 20 seconds ──────────────────────────────────
  useEffect(() => {
    const runInitial = async () => { await fetchUnreadCount(); };
    runInitial();
    const interval = setInterval(fetchUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // ─── Fetch notifications when dropdown opens ──────────────────────────────
  useEffect(() => {
    if (isOpen) {
      (async () => { await fetchNotifications(); })();
    }
  }, [isOpen, filter, fetchNotifications]);

  // ─── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Mark single notification as read ────────────────────────────────────
  const handleMarkRead = async (e, notif) => {
    e.stopPropagation();
    if (notif.isRead) return;
    try {
      await notificationService.markRead(notif._id);
      dispatch(setNotifications(notifications.map((n) => n._id === notif._id ? { ...n, isRead: true } : n)));
      dispatch(setUnreadCount(Math.max(0, unreadCount - 1)));
    } catch { /* intentionally ignored */ }
  };

  // ─── Mark all as read ────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllRead();
      dispatch(setNotifications(notifications.map((n) => ({ ...n, isRead: true }))));
      dispatch(setUnreadCount(0));
    } catch { /* intentionally ignored */ }
    finally { setMarkingAll(false); }
  };

  // ─── Click notification → navigate ───────────────────────────────────────
  const handleNotifClick = async (notif) => {
    await handleMarkRead({ stopPropagation: () => {} }, notif);
    const link = resolveLink(notif);
    if (link) {
      setIsOpen(false);
      navigate(link);
    }
  };

  const displayedNotifs = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`relative p-2.5 rounded-xl transition-all duration-200 ${
          isOpen
            ? 'bg-emerald-50 text-emerald-600'
            : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
        }`}
        title="Notifications"
        aria-label="Open notifications"
      >
        <FaBell
          size={17}
          className={animateBell ? 'animate-[wiggle_0.5s_ease-in-out]' : ''}
          style={animateBell ? { animation: 'wiggle 0.5s ease-in-out' } : {}}
        />
        {unreadCount > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-extrabold text-white rounded-full shadow-md transition-all duration-300 ${
              unreadCount > 0 ? 'bg-red-500 scale-100' : 'bg-transparent scale-0'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[400px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <FaBell size={15} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  {markingAll
                    ? <FaSpinner size={11} className="animate-spin" />
                    : <FaCheckDouble size={11} />}
                  <span>All read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <FaTimes size={13} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 bg-white">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                  filter === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50" style={{ maxHeight: '370px' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-slate-400">
                <FaSpinner size={22} className="animate-spin text-emerald-500" />
                <p className="text-xs font-medium">Loading notifications...</p>
              </div>
            ) : displayedNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <FaBell size={22} className="opacity-30" />
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications'}
                </p>
                <p className="text-xs text-slate-400 text-center px-4">
                  {filter === 'unread'
                    ? 'You have no unread notifications.'
                    : 'Notifications from procurement workflows will appear here.'}
                </p>
              </div>
            ) : (
              displayedNotifs.map((notif) => {
                const style = severityStyle(notif.severity, notif.priority);
                const Icon = resolveIcon(notif.type);
                const link = resolveLink(notif);

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors group ${
                      !notif.isRead
                        ? 'bg-blue-50/40 hover:bg-blue-50/70'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${style.badge}`}>
                      <Icon size={14} className={style.icon} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-snug line-clamp-2 ${!notif.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {notif.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-extrabold uppercase tracking-wide rounded">
                            Urgent
                          </span>
                        )}
                        {notif.priority === 'high' && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-extrabold uppercase tracking-wide rounded">
                            High
                          </span>
                        )}
                        {notif.category && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wide rounded">
                            {notif.category}
                          </span>
                        )}
                        {link && (
                          <span className="ml-auto text-[10px] text-emerald-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FaExternalLinkAlt size={8} /> View
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <FaCircle size={7} className={`shrink-0 mt-1.5 ${style.dot.replace('bg-', 'text-')}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => { setIsOpen(false); navigate('/communications'); }}
              className="w-full text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              View All in Communications Hub
              <FaExternalLinkAlt size={9} />
            </button>
          </div>
        </div>
      )}

      {/* Bell wiggle keyframes injected inline */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(15deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
}
