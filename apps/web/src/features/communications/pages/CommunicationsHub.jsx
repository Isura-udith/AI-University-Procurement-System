import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  FaInbox, FaBell, FaBullhorn, FaComments, FaSearch,
  FaStar, FaReply, FaTimes, FaSpinner, FaPaperPlane, FaUser, FaBuilding, FaCheck, FaChevronRight,
  FaExclamationTriangle, FaEnvelope, FaTrash } from 'react-icons/fa';
import messageService from '../../../services/message.service';
import userService from '../../../services/user.service';
import vendorService from '../../../services/vendor.service';
import notificationService from '../../../services/notification.service';

// ─── Helpers ──────────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return '';
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const TYPE_META = {
  alert: { color: 'amber', label: 'Alert', icon: FaExclamationTriangle },
  supplier: { color: 'purple', label: 'Supplier', icon: FaBuilding },
  announcement: { color: 'emerald', label: 'Announcement', icon: FaBullhorn },
  message: { color: 'blue', label: 'Message', icon: FaEnvelope },
};

const TYPE_COLORS = {
  amber: {
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    avatar: 'bg-amber-100 text-amber-700', badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  purple: {
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',
    avatar: 'bg-purple-100 text-purple-700', badge: 'bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
  },
  emerald: {
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    avatar: 'bg-emerald-100 text-emerald-700', badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  blue: {
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
    avatar: 'bg-blue-100 text-blue-700', badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
};

const ROLES_LIST = [
  { value: '', label: 'All Users (Public Announcement)' },
  { value: 'supplier', label: 'All Suppliers / Vendors' },
  { value: 'procurement_officer', label: 'All Procurement Officers' },
  { value: 'finance_officer', label: 'All Finance Officers' },
  { value: 'department_head', label: 'All Department Heads' },
  { value: 'tec_member', label: 'All TEC Members' },
  { value: 'dean', label: 'All Deans' },
  { value: 'bursar', label: 'Bursar' },
  { value: 'contract_manager', label: 'Contract Managers' },
  { value: 'store_manager', label: 'Store Managers' },
];

const INITIAL_FORM = {
  type: 'message',
  recipientType: 'user',
  recipient: '',
  recipientRole: '',
  category: 'General',
  subject: '',
  body: '',
  replyTo: null,
};

export default function CommunicationsHub() {
  const { user } = useSelector((state) => state.auth);

  // ─── Data State ────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({ all: 0, alerts: 0, supplier: 0, announcements: 0 });
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // ─── Compose State ─────────────────────────────────────────────────────
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipientsList, setRecipientsList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // ─── Starred (local only) ───────────────────────────────────────────────
  const [starred, setStarred] = useState(() => {
    try { return JSON.parse(localStorage.getItem('comm_starred') || '[]'); } catch { return []; }
  });

  // ─── Delete State ──────────────────────────────────────────────────────
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Any user can delete/dismiss messages from their inbox
  // Backend handles soft-delete for broadcasts, hard-delete for direct messages
  const canDelete = !!selectedMsg;

  const searchRef = useRef(null);

  // ─── Tab definitions ───────────────────────────────────────────────────
  const tabs = [
    { id: 'all', label: 'Inbox', icon: FaInbox, count: unreadCounts.all },
    { id: 'sent', label: 'Sent', icon: FaPaperPlane, count: 0 },
    { id: 'alerts', label: 'Workflow Alerts', icon: FaBell, count: unreadCounts.alerts },
    { id: 'supplier', label: 'Supplier Comm.', icon: FaComments, count: unreadCounts.supplier },
    { id: 'announcements', label: 'Announcements', icon: FaBullhorn, count: unreadCounts.announcements },
    { id: 'starred', label: 'Starred', icon: FaStar, count: 0 },
    { id: 'notifications', label: 'Notifications', icon: FaBell, count: unreadNotifsCount },
  ];

  // ─── Fetch unread counts ────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const [msgRes, notifRes] = await Promise.all([
        messageService.getUnreadCount(),
        notificationService.getUnreadCount()
      ]);
      if (msgRes?.success) {
        const c = msgRes.data?.count || {};
        setUnreadCounts({
          all: c.all || 0,
          alerts: c.alerts || 0,
          supplier: c.supplier || 0,
          announcements: c.announcements || 0,
        });
      }
      if (notifRes?.success) {
        setUnreadNotifsCount(notifRes.data?.count || 0);
      }
    } catch {/*commit*/}
  }, []);

  // ─── Fetch messages ────────────────────────────────────────────────────
  // ─── Fetch messages & notifications ────────────────────────────────────
  const fetchData = useCallback(async (showLoading = false, tab, search) => {
    if (showLoading) setLoading(true);
    try {
      if (tab === 'notifications') {
        const res = await notificationService.getAll({ limit: 60 });
        if (res?.success) setNotifications(res.data?.data || []);
      } else {
        let typeParam = 'inbox';
        if (tab === 'alerts') typeParam = 'alert';
        else if (tab === 'supplier') typeParam = 'supplier';
        else if (tab === 'announcements') typeParam = 'announcement';
        else if (tab === 'sent') typeParam = 'sent';
        else if (tab === 'all') typeParam = 'inbox'; // Inbox view by default

        const res = await messageService.getMessages({
          type: typeParam !== 'starred' ? typeParam : undefined,
          search: search || undefined,
          limit: 60,
        });
        if (res?.success) {
          let data = res.data?.data || [];
          if (tab === 'starred') {
            const starredIds = new Set(JSON.parse(localStorage.getItem('comm_starred') || '[]'));
            data = data.filter((m) => starredIds.has(m._id));
          }
          setMessages(data);
          setSelectedMsg((prev) => prev ? (data.find((m) => m._id === prev._id) || prev) : null);
        }
      }
    } catch {/*commit*/}
    finally {
      setLoading(false);
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // ─── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => { await fetchData(true, 'all', ''); })();
    // eslint-disable-next-line
  }, []);

  // ─── Debounced search + tab change ────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => fetchData(false, activeTab, searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery, activeTab, fetchData]);

  // ─── Polling every 15s ────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => fetchData(false, activeTab, searchQuery), 15000);
    return () => clearInterval(iv);
  }, [fetchData, activeTab, searchQuery]);

  // ─── Load compose recipients ───────────────────────────────────────────
  const loadComposeData = async () => {
    setRecipientsLoading(true);
    try {
      const [ur, vr] = await Promise.all([
        userService.getUsers({ limit: 200, isActive: true }),
        vendorService.getAll({ limit: 100 }),
      ]);
      // getUsers uses paginated() → { success, data: [...], pagination }
      // getAll(vendors) uses paginated() → same shape
      // axios interceptor returns response.data, so ur = { success, data: [...], pagination }
      if (ur?.success) {
        const usersArr = Array.isArray(ur.data) ? ur.data : (ur.data?.data || []);
        setRecipientsList(usersArr.filter((u) => u._id !== user?._id));
      }
      if (vr?.success) {
        const vendorsArr = Array.isArray(vr.data) ? vr.data : (vr.data?.data || []);
        setVendorsList(vendorsArr);
      }
    } catch (err) {
      console.error('Failed to load compose data:', err);
    }
    finally { setRecipientsLoading(false); }
  };

  const openCompose = () => {
    setFormData(INITIAL_FORM);
    setFormError('');
    setFormSuccess('');
    setIsComposeOpen(true);
    loadComposeData();
  };

  // ─── Select message → mark read ────────────────────────────────────────
  const handleSelectMessage = async (msg) => {
    setIsConfirmingDelete(false);
    setSelectedMsg(msg);
    // Mark as read if not yet read by the current user
    const isSentByMe = String(msg.sender?._id) === String(user?._id);
    if (!msg.isReadByMe && !isSentByMe) {
      try {
        const res = await messageService.markRead(msg._id);
        if (res?.success) {
          setMessages((prev) => prev.map((m) => m._id === msg._id ? { ...m, isReadByMe: true } : m));
          fetchUnreadCount();
        }
      } catch {/*commit*/}
    }
  };

  // ─── Reply ────────────────────────────────────────────────────────────
  const handleReply = (msg) => {
    const isSenderVendor = msg.sender?.role === 'supplier';
    setFormData({
      type: 'message',
      recipientType: isSenderVendor ? 'vendor' : 'user',
      recipient: msg.sender?._id || '',
      recipientRole: '',
      category: msg.category || 'General',
      subject: msg.subject?.startsWith('Re: ') ? msg.subject : `Re: ${msg.subject}`,
      body: `\n\n── Original Message ──\nFrom: ${getSenderName(msg)}\nSubject: ${msg.subject}\n\n${msg.body}`,
      replyTo: msg._id,
    });
    setFormError('');
    setFormSuccess('');
    setIsComposeOpen(true);
    loadComposeData();
  };

  // ─── Submit compose ───────────────────────────────────────────────────
  const handleSubmitCompose = async (e) => {
    e.preventDefault();
    setSending(true);
    setFormError('');
    setFormSuccess('');
    try {
      if (!formData.subject.trim()) throw new Error('Subject is required.');
      if (!formData.body.trim()) throw new Error('Message body is required.');
      if (formData.type === 'message' && !formData.recipient) throw new Error('Please select a recipient.');

      const payload = {
        type: formData.type,
        category: formData.category,
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        replyTo: formData.replyTo || undefined,
        recipient: formData.type === 'message' ? formData.recipient : undefined,
        recipientRole: formData.type === 'announcement' ? (formData.recipientRole || undefined) : undefined,
      };

      const res = await messageService.sendMessage(payload);
      if (res?.success) {
        setFormSuccess('Message sent successfully!');
        fetchData(false, activeTab, searchQuery);
        setTimeout(() => setIsComposeOpen(false), 1400);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to send message.');
    }
    finally { setSending(false); }
  };

  // ─── Delete Message ───────────────────────────────────────────────────
  const handleDeleteMessage = async () => {
    if (!selectedMsg) return;
    setDeleteLoading(true);
    try {
      const res = await messageService.deleteMessage(selectedMsg._id);
      if (res?.success) {
        setMessages((prev) => prev.filter((m) => m._id !== selectedMsg._id));
        setSelectedMsg(null);
        setIsConfirmingDelete(false);
        fetchUnreadCount();
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete message.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Notification Handlers ──────────────────────────────────────────────
  const handleMarkNotifRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
      fetchUnreadCount();
    } catch {/*commit*/}
  };

  const handleDeleteNotif = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      fetchUnreadCount();
    } catch {/*commit*/}
  };

  // ─── Star toggle ──────────────────────────────────────────────────────────
  const toggleStar = (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setStarred((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      localStorage.setItem('comm_starred', JSON.stringify(next));
      return next;
    });
  };

  // ─── Helper name resolvers ────────────────────────────────────────────
  const getSenderName = (msg) => {
    if (!msg?.sender) return 'System';
    if (msg.sender._id === user?._id) return 'You';
    return `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() || msg.sender.email || 'Unknown';
  };

  const getRecipientName = (msg) => {
    if (msg?.type === 'announcement') {
      return msg.recipientRole
        ? `All ${msg.recipientRole.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}s`
        : 'All Users';
    }
    if (!msg?.recipient) return '—';
    if (msg.recipient._id === user?._id) return 'You';
    return `${msg.recipient.firstName || ''} ${msg.recipient.lastName || ''}`.trim() || msg.recipient.email || '—';
  };

  const getAvatar = (msg) => {
    const name = getSenderName(msg);
    if (name === 'You') return (user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '');
    return name.split(' ').slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase();
  };

  const getMeta = (type) => TYPE_META[type] || TYPE_META.message;
  const getColor = (type) => TYPE_COLORS[getMeta(type).color];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-5 overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-80 bg-linear-to-l from-blue-50 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Communications Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Messages, workflow alerts, announcements and supplier communications</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          {unreadCounts.all > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-extrabold rounded-full">
              {unreadCounts.all} unread
            </span>
          )}
          <button
            onClick={openCompose}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <FaPaperPlane size={12} />
            Compose Message
          </button>
        </div>
      </div>

      {/* ─── Main Panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-row min-h-0">

        {/* Left Sidebar: Tabs */}
        <div className="w-56 shrink-0 border-r border-slate-100 bg-slate-50/40 flex flex-col pt-4 pb-2">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Mailbox</p>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedMsg(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <tab.icon size={14} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </div>
                {tab.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-red-100 text-red-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Stats Summary */}
          <div className="mt-auto mx-3 p-3 bg-slate-100/60 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Summary</p>
            <div className="space-y-1">
              {[
                { label: 'Total', value: messages.length, color: 'text-slate-600' },
                { label: 'Unread', value: unreadCounts.all, color: 'text-blue-600' },
                { label: 'Starred', value: starred.length, color: 'text-amber-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'notifications' ? (
          <div className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-extrabold text-slate-800 mb-6">System Notifications</h2>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <FaBell size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">No notifications</p>
                    <p className="text-xs">You're all caught up.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id} className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      n.isRead ? 'bg-white border-slate-200' : 'bg-blue-50/40 border-blue-200 shadow-sm'
                    }`}>
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <FaBell size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${n.isRead ? 'text-slate-700' : 'text-slate-900 font-bold'}`}>
                            {n.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkNotifRead(n._id)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotif(n._id)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Message List */}
            <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-slate-100 bg-white">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FaTimes size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Message Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <FaSpinner className="animate-spin text-blue-500" size={22} />
                <span className="text-xs font-medium">Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 px-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <FaInbox size={20} className="opacity-30" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No messages</p>
                <p className="text-xs text-center text-slate-400">
                  {searchQuery ? 'No messages match your search.' : 'Your inbox is empty.'}
                </p>
              </div>
            ) : messages.map((msg) => {
              const isSentByMe = String(msg.sender?._id) === String(user?._id);
              const isUnread = !msg.isReadByMe && !isSentByMe;
              const isSelected = selectedMsg?._id === msg._id;
              const color = getColor(msg.type);
              const isStarred = starred.includes(msg._id);

              return (
                <div
                  key={msg._id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : isUnread ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 ${color.avatar}`}>
                    {getAvatar(msg)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-bold truncate max-w-[130px] ${color.text}`}>
                        {isSentByMe ? `→ ${getRecipientName(msg)}` : getSenderName(msg)}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(msg.createdAt)}</span>
                    </div>
                    <p className={`text-xs truncate mb-0.5 ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {msg.subject}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{msg.body}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${color.badge}`}>
                        {getMeta(msg.type).label}
                      </span>
                      {msg.category && msg.category !== 'General' && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {msg.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => toggleStar(e, msg._id)}
                      className={`text-xs transition-colors ${isStarred ? 'text-amber-400' : 'text-slate-200 hover:text-amber-400'}`}
                    >
                      <FaStar size={11} />
                    </button>
                    {isUnread && <span className={`w-2 h-2 rounded-full ${color.dot}`} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message Detail View */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedMsg ? (
            <>
              {/* Detail Header */}
              <div className="px-7 py-5 border-b border-slate-100 bg-white">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    {/* Type badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const color = getColor(selectedMsg.type);
                        const meta = getMeta(selectedMsg.type);
                        const Icon = meta.icon;
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${color.bg} ${color.text} border ${color.border}`}>
                            <Icon size={10} />
                            {meta.label}
                          </span>
                        );
                      })()}
                      {selectedMsg.category && (
                        <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded font-bold uppercase">
                          {selectedMsg.category}
                        </span>
                      )}
                      {!selectedMsg.isReadByMe && String(selectedMsg.sender?._id) !== String(user?._id) && (
                        <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded font-bold">
                          NEW
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 leading-tight mb-3">
                      {selectedMsg.subject}
                    </h2>
                    {/* From/To */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${getColor(selectedMsg.type).avatar}`}>
                        {getAvatar(selectedMsg)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {getSenderName(selectedMsg)}
                          {selectedMsg.sender?.email && (
                            <span className="font-normal text-slate-400 text-xs ml-1">
                              &lt;{selectedMsg.sender.email}&gt;
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          To: <strong>{getRecipientName(selectedMsg)}</strong>
                          {' · '}
                          {new Date(selectedMsg.createdAt).toLocaleString('en-GB', {
                            dateStyle: 'medium', timeStyle: 'short'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => toggleStar(e, selectedMsg._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        starred.includes(selectedMsg._id)
                          ? 'text-amber-500 bg-amber-50'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                      title="Star"
                    >
                      <FaStar size={15} />
                    </button>
                    {selectedMsg.sender?._id !== user?._id && (
                      <button
                        onClick={() => handleReply(selectedMsg)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        title="Reply"
                      >
                        <FaReply size={12} />
                        Reply
                      </button>
                    )}
                    {canDelete && (
                      isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg transition-all animate-fade-in shrink-0">
                          <span className="text-[10px] text-red-700 font-bold">Delete?</span>
                          <button
                            onClick={handleDeleteMessage}
                            disabled={deleteLoading}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[10px] font-bold rounded transition-colors"
                          >
                            {deleteLoading ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setIsConfirmingDelete(false)}
                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsConfirmingDelete(true)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors border border-red-100 shadow-sm"
                          title="Delete Message"
                        >
                          <FaTrash size={12} />
                          Delete
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Reference link */}
                {selectedMsg.referenceType && selectedMsg.referenceId && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <FaChevronRight size={10} className="text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Referenced:</span>
                    <a
                      href={`/${selectedMsg.referenceType}s/${selectedMsg.referenceId}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline capitalize"
                    >
                      {selectedMsg.referenceType} #{String(selectedMsg.referenceId).slice(-6).toUpperCase()}
                    </a>
                  </div>
                )}
              </div>

              {/* Message Body */}
              <div className="flex-1 overflow-y-auto p-7 bg-slate-50/30">
                {selectedMsg.type === 'alert' ? (
                  <div className="max-w-3xl">
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FaExclamationTriangle className="text-amber-600" size={16} />
                        <p className="font-bold text-amber-800">System Action Required</p>
                      </div>
                      <p className="text-amber-700 text-sm leading-relaxed whitespace-pre-line">{selectedMsg.body}</p>
                      {selectedMsg.referenceType === 'procurement' && selectedMsg.referenceId && (
                        <a
                          href={`/procurements/${selectedMsg.referenceId}`}
                          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-sm transition-colors text-xs"
                        >
                          Review Requisition <FaChevronRight size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ) : selectedMsg.type === 'announcement' ? (
                  <div className="max-w-3xl">
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FaBullhorn className="text-emerald-600" size={14} />
                        <p className="font-bold text-emerald-800">Announcement</p>
                      </div>
                      <p className="text-emerald-800 text-sm leading-relaxed whitespace-pre-line">{selectedMsg.body}</p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{selectedMsg.body}</p>
                  </div>
                )}

                {/* Reply thread if exists */}
                {selectedMsg.replyTo && (
                  <div className="max-w-3xl mt-4 opacity-70 border-l-4 border-slate-200 pl-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Original Message</p>
                    <p className="text-xs text-slate-600 font-semibold">{selectedMsg.replyTo.subject}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3 whitespace-pre-line">{selectedMsg.replyTo.body}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 bg-slate-50/30">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center">
                <FaInbox size={32} className="text-blue-200" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-500 text-lg">Select a message</p>
                <p className="text-sm text-slate-400 mt-1">Choose a message from the list to view full details</p>
              </div>
              <button
                onClick={openCompose}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md transition-all"
              >
                <FaPaperPlane size={12} />
                Compose New Message
              </button>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* ─── Compose Modal ────────────────────────────────────────────────── */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-linear-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaPaperPlane size={14} />
                {formData.replyTo ? 'Reply to Message' : 'New Message'}
              </h3>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitCompose} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl">
                  <FaTimes size={12} className="shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl">
                  <FaCheck size={12} className="shrink-0" />
                  {formSuccess}
                </div>
              )}

              {!formData.replyTo && (
                <>
                  {/* Type + Category Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Message Type
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'message', label: 'Direct Message', icon: FaEnvelope },
                          { value: 'announcement', label: 'Announcement', icon: FaBullhorn },
                        ].map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, type: value, recipient: '', recipientRole: '' }))}
                            className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all ${
                              formData.type === value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <Icon size={14} />
                            <span className="text-center leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        {['General', 'Workflow', 'Supplier', 'Financial', 'Announcement'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {formData.type === 'announcement' ? 'Target Audience' : 'Recipient'}
                    </label>
                    {formData.type === 'message' ? (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          {[
                            { value: 'user', label: 'Staff Member', icon: FaUser },
                            { value: 'vendor', label: 'Vendor/Supplier', icon: FaBuilding },
                          ].map(({ value, label, icon: Icon }) => (
                            <label key={value} className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-600">
                              <input
                                type="radio"
                                name="recipientType"
                                checked={formData.recipientType === value}
                                onChange={() => setFormData((p) => ({ ...p, recipientType: value, recipient: '' }))}
                                className="text-blue-600"
                              />
                              <Icon size={12} className="text-slate-400" />
                              {label}
                            </label>
                          ))}
                        </div>
                        {recipientsLoading ? (
                          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                            <FaSpinner className="animate-spin text-blue-500" />
                            Loading contacts...
                          </div>
                        ) : (
                          <select
                            value={formData.recipient}
                            onChange={(e) => setFormData((p) => ({ ...p, recipient: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          >
                            <option value="">-- Select {formData.recipientType === 'user' ? 'user' : 'vendor'} --</option>
                            {formData.recipientType === 'user'
                              ? recipientsList.map((u) => (
                                  <option key={u._id} value={u._id}>
                                    {u.firstName} {u.lastName} ({u.role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')})
                                  </option>
                                ))
                              : vendorsList.map((v) => (
                                  <option key={v._id} value={v._id}>{v.name} — {v.businessRegisterNo}</option>
                                ))
                            }
                          </select>
                        )}
                      </div>
                    ) : (
                      <select
                        value={formData.recipientRole}
                        onChange={(e) => setFormData((p) => ({ ...p, recipientRole: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        {ROLES_LIST.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Enter subject..."
                  disabled={!!formData.replyTo}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message Body</label>
                <textarea
                  rows={formData.replyTo ? 6 : 8}
                  value={formData.body}
                  onChange={(e) => setFormData((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y font-sans"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all"
                >
                  {sending ? <FaSpinner className="animate-spin" size={13} /> : <FaPaperPlane size={13} />}
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
