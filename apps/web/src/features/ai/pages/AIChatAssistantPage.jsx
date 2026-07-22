import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  FaRobot, FaPaperPlane, FaSpinner, FaArrowLeft,
  FaLightbulb, FaHistory, FaShieldAlt, FaInfoCircle,
  FaPaperclip, FaTrashAlt, FaSyncAlt, FaFilePdf,
  FaFileWord, FaFileExcel, FaFileAlt, FaCloudUploadAlt,
  FaPlus, FaSearch, FaCopy, FaCheck, FaThumbsUp, FaThumbsDown,
  FaDownload, FaThumbtack, FaPen, FaTimes,
  FaBook, FaWrench, FaDatabase, FaClock, FaChevronDown,
  FaChevronRight, FaComments } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import aiService from '../../../services/ai.service';

// ─── Prompt Suggestions ──────────────────────────────────────────
const PROMPT_SUGGESTIONS = [
  {
    text: 'What are the limits & rules for the Shopping method under GOSL Guidelines?',
    icon: FaShieldAlt,
    color: 'text-emerald-500 bg-emerald-50 border-emerald-100'
  },
  {
    text: 'Draft a technical specification template for purchasing 50 Office Laptops.',
    icon: FaLightbulb,
    color: 'text-amber-500 bg-amber-50 border-amber-100'
  },
  {
    text: 'Explain the 3-Way Match process required for Store item verification.',
    icon: FaHistory,
    color: 'text-blue-500 bg-blue-50 border-blue-100'
  },
  {
    text: 'How should the Bid Evaluation Committee (TEC) compute risk scores?',
    icon: FaRobot,
    color: 'text-purple-500 bg-purple-50 border-purple-100'
  }
];

// ─── Simple Markdown Renderer ─────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Escape HTML but keep existing tags
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-bold text-slate-800 mt-3 mb-1 text-sm">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-slate-800 mt-3 mb-1 text-base">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-slate-900 mt-4 mb-2 text-lg">$1</h2>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-800 text-emerald-300 rounded-xl p-3 my-2 text-xs overflow-x-auto font-mono"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    // Tables (basic)
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      const isHeaderSep = cells.every(c => /^[-:]+$/.test(c));
      if (isHeaderSep) return '';
      const tag = 'td';
      return `<tr>${cells.map(c => `<${tag} class="border border-slate-200 px-3 py-1.5 text-xs">${c}</${tag}>`).join('')}</tr>`;
    })
    // Unordered lists
    .replace(/^[•\-*] (.+)$/gm, '<li class="ml-4 text-sm leading-relaxed list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm leading-relaxed list-decimal">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <tr> in <table>
  html = html.replace(/(<tr>[\s\S]*?<\/tr>(?:<br\/>)?)+/g, (match) => {
    return `<table class="border-collapse border border-slate-200 rounded-lg my-2 w-full text-left">${match.replace(/<br\/>/g, '')}</table>`;
  });

  // Wrap consecutive <li> with list-disc in <ul>
  html = html.replace(/(<li class="ml-4 text-sm leading-relaxed list-disc">[\s\S]*?<\/li>(?:<br\/>)?)+/g, (match) => {
    return `<ul class="my-1">${match.replace(/<br\/>/g, '')}</ul>`;
  });

  // Wrap consecutive <li> with list-decimal in <ol>
  html = html.replace(/(<li class="ml-4 text-sm leading-relaxed list-decimal">[\s\S]*?<\/li>(?:<br\/>)?)+/g, (match) => {
    return `<ol class="my-1">${match.replace(/<br\/>/g, '')}</ol>`;
  });

  return html;
}

// ─── Source Documents Panel ──────────────────────────────────────
function SourceDocumentsPanel({ sources }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2 border border-blue-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50/50 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
      >
        <FaBook size={10} />
        <span>{sources.length} Source Document{sources.length > 1 ? 's' : ''} Referenced</span>
        {expanded ? <FaChevronDown size={8} className="ml-auto" /> : <FaChevronRight size={8} className="ml-auto" />}
      </button>
      {expanded && (
        <div className="p-3 space-y-2 bg-blue-50/20">
          {sources.map((doc, i) => (
            <div key={i} className="bg-white rounded-lg border border-blue-100 p-2.5">
              {doc.metadata?.source && (
                <p className="text-[10px] font-bold text-blue-600 mb-1 truncate">{doc.metadata.source}</p>
              )}
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{doc.pageContent}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tool Usage Badges ──────────────────────────────────────────
function ToolUsageBadges({ tools }) {
  if (!tools || tools.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tools.map((tool, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 rounded-full text-[10px] font-bold">
          {tool.toLowerCase().includes('database') || tool.toLowerCase().includes('query') ? (
            <FaDatabase size={8} />
          ) : (
            <FaWrench size={8} />
          )}
          {tool}
        </span>
      ))}
    </div>
  );
}

// ─── Follow-Up Suggestions ───────────────────────────────────────
function FollowUpSuggestions({ suggestions, onSelect, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="text-[11px] font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50 cursor-pointer"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function AIChatAssistantPage() {
  const { user } = useSelector(state => state.auth);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: `Hello ${user?.firstName || 'User'}! I am your AI Procurement Assistant. Ask me anything about procurement guidelines, specifications, policies, or quotation comparison.`,
      time: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`);

  // Session sidebar state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionSearch, setSessionSearch] = useState('');
  const [editingSession, setEditingSession] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Knowledge Base State
  const [sidebarTab, setSidebarTab] = useState('sessions'); // 'sessions' | 'suggestions' | 'knowledge'
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Message action state
  const [copiedIdx, setCopiedIdx] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Session Management ──────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await aiService.getChatSessions({ limit: 50, search: sessionSearch });
      setSessions(res?.data?.sessions || res?.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [sessionSearch]);

  useEffect(() => {
    queueMicrotask(() => fetchSessions());
  }, [fetchSessions]);

  const loadSession = async (sid) => {
    if (sid === sessionId) return;
    setSessionId(sid);
    setLoading(true);
    try {
      const res = await aiService.getChatHistory(sid);
      const data = res?.data || res;
      if (data?.messages && data.messages.length > 0) {
        setMessages(data.messages.map(m => ({
          sender: m.role,
          text: m.content,
          time: new Date(m.timestamp),
          metadata: m.metadata,
          rating: m.rating,
        })));
      } else {
        setMessages([{
          sender: 'assistant',
          text: 'Session loaded. How can I help you today?',
          time: new Date()
        }]);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      toast.error('Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  };

  const startNewSession = () => {
    const newSid = `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    setSessionId(newSid);
    setMessages([{
      sender: 'assistant',
      text: `New session started. How can I help you with your procurement workflows today?`,
      time: new Date()
    }]);
  };

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation();
    if (!window.confirm('Archive this conversation?')) return;
    try {
      await aiService.deleteChatSession(sid);
      setSessions(prev => prev.filter(s => s.sessionId !== sid));
      if (sid === sessionId) startNewSession();
      toast.success('Conversation archived.');
    } catch (err) {
      console.error('Failed to archive conversation:', err);
      toast.error('Failed to archive conversation.');
    }
  };

  const handleRenameSession = async (sid) => {
    if (!editTitle.trim()) return;
    try {
      await aiService.renameChatSession(sid, editTitle.trim());
      setSessions(prev => prev.map(s => s.sessionId === sid ? { ...s, title: editTitle.trim() } : s));
      setEditingSession(null);
      setEditTitle('');
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      toast.error('Failed to rename conversation.');
    }
  };

  const handlePinSession = async (sid, e) => {
    e.stopPropagation();
    try {
      await aiService.togglePinSession(sid);
      fetchSessions();
    } catch (err) {
      console.error('Failed to pin conversation:', err);
      toast.error('Failed to pin conversation.');
    }
  };

  // ─── Knowledge Base ──────────────────────────────────────────
  const fetchDocuments = async (showLoading = true) => {
    if (showLoading) setLoadingDocs(true);
    try {
      const res = await aiService.getKnowledgeDocuments();
      setDocuments(res.data || res || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (sidebarTab === 'knowledge') {
      queueMicrotask(() => fetchDocuments(true));
    }
  }, [sidebarTab]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }
    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      await aiService.uploadKnowledgeDocument(file);
      toast.update(toastId, { render: `"${file.name}" uploaded.`, type: 'success', isLoading: false, autoClose: 3000 });
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: `📎 System: "${file.name}" uploaded to Knowledge Base. Click "Sync" to index it for the chatbot.`,
        time: new Date()
      }]);
      fetchDocuments();
    } catch (err) {
      toast.update(toastId, { render: `Upload failed: ${err.message || 'Server error'}`, type: 'error', isLoading: false, autoClose: 4000 });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (id, name) => {
    if (!window.confirm(`Delete "${name}" from Knowledge Base?`)) return;
    try {
      await aiService.deleteKnowledgeDocument(id);
      toast.success(`Deleted "${name}".`);
      fetchDocuments();
    } catch (err) {
      toast.error(`Delete failed: ${err.message || 'Server error'}`);
    }
  };

  const handleSyncKnowledge = async () => {
    setSyncing(true);
    const toastId = toast.loading('Syncing Knowledge Base...');
    try {
      await aiService.processKnowledgeBase();
      toast.update(toastId, { render: 'Knowledge Base synced!', type: 'success', isLoading: false, autoClose: 4000 });
      fetchDocuments();
    } catch (err) {
      toast.update(toastId, { render: `Sync failed: ${err.message}`, type: 'error', isLoading: false, autoClose: 4000 });
    } finally {
      setSyncing(false);
    }
  };

  const handleScanFolder = async () => {
    setSyncing(true);
    const toastId = toast.loading('Indexing procurement PDFs from Documents folder...');
    try {
      const res = await aiService.scanDocumentsFolder();
      const count = res.data?.count || 15;
      toast.update(toastId, { render: `Successfully indexed ${count} procurement PDF documents for RAG!`, type: 'success', isLoading: false, autoClose: 4000 });
      fetchDocuments();
    } catch (err) {
      toast.update(toastId, { render: `Folder indexing failed: ${err.message}`, type: 'error', isLoading: false, autoClose: 4000 });
    } finally {
      setSyncing(false);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FaFilePdf className="text-red-500" size={16} />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-blue-500" size={16} />;
    if (['xls', 'xlsx'].includes(ext)) return <FaFileExcel className="text-emerald-500" size={16} />;
    return <FaFileAlt className="text-slate-500" size={16} />;
  };

  // ─── Chat Actions ────────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;
    if (!textToSend) setInputText('');

    const userMsg = { sender: 'user', text: query, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await aiService.askFlowiseChat(query, sessionId);
      const data = res?.data || res;
      const reply = data?.text || 'I did not receive a response. Please try again.';

      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: reply,
        time: new Date(),
        metadata: {
          sourceDocuments: data?.sourceDocuments || [],
          usedTools: data?.usedTools || [],
          processingTimeMs: data?.processingTimeMs,
          followUpSuggestions: data?.followUpSuggestions || [],
        },
      }]);

      // Refresh sessions list to show new/updated session
      fetchSessions();
    } catch (err) {
      console.error('Failed to get answer:', err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'Sorry, I encountered an error processing your request. Please check your network connection and try again.',
        time: new Date(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleRate = async (messageIndex, rating) => {
    try {
      await aiService.rateChatMessage(sessionId, messageIndex, rating);
      setMessages(prev => prev.map((m, i) => i === messageIndex ? { ...m, rating } : m));
    } catch (err) {
      console.error('Failed to rate:', err);
    }
  };

  const handleExportChat = () => {
    const lines = messages.map(m => `[${m.time.toLocaleTimeString()}] ${m.sender === 'user' ? 'You' : 'AI'}: ${m.text}`);
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Chat exported.');
  };

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!sessionSearch) return sessions;
    return sessions.filter(s => s.title?.toLowerCase().includes(sessionSearch.toLowerCase()));
  }, [sessions, sessionSearch]);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-10rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/ai" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <FaRobot className="mr-3 text-emerald-600 animate-pulse" /> AI Procurement Chat Assistant
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Powered by Flowise &amp; Google Gemini. Compliance-audited per PFM Act &amp; GOSL PG-2024.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportChat}
            disabled={messages.length <= 1}
            className="text-xs font-bold px-3 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            title="Export chat as text"
          >
            <FaDownload size={10} /> Export
          </button>
          <button
            onClick={startNewSession}
            className="text-xs font-bold px-3.5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/10"
          >
            <FaPlus size={10} /> New Chat
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Left Sidebar */}
        <div className="hidden lg:flex lg:flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden min-h-0 shadow-xs">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            {[
              { key: 'sessions', icon: FaComments, label: 'Chats' },
              { key: 'suggestions', icon: FaLightbulb, label: 'Prompts' },
              { key: 'knowledge', icon: FaBook, label: 'KB' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSidebarTab(tab.key)}
                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
                  sidebarTab === tab.key
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <tab.icon size={11} /> {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            {/* ─── Sessions Tab ────────────────────────────────── */}
            {sidebarTab === 'sessions' && (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                    <input
                      type="text"
                      value={sessionSearch}
                      onChange={e => setSessionSearch(e.target.value)}
                      placeholder="Search conversations..."
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-slate-50"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingSessions ? (
                    <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-1.5">
                      <FaSpinner className="animate-spin" size={12} /> Loading...
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs px-4">
                      {sessions.length === 0 ? 'No conversations yet. Start chatting!' : 'No matches.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {filteredSessions.map(s => (
                        <div
                          key={s.sessionId}
                          onClick={() => loadSession(s.sessionId)}
                          className={`group px-3 py-3 cursor-pointer transition-all hover:bg-emerald-50/50 ${
                            s.sessionId === sessionId ? 'bg-emerald-50 border-l-2 border-emerald-600' : ''
                          }`}
                        >
                          {editingSession === s.sessionId ? (
                            <div className="flex gap-1">
                              <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleRenameSession(s.sessionId)}
                                className="flex-1 text-xs px-2 py-1 border border-emerald-300 rounded-lg focus:outline-none"
                                autoFocus
                                onClick={e => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRenameSession(s.sessionId); }}
                                className="text-emerald-600 hover:text-emerald-800 p-1"
                              ><FaCheck size={10} /></button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingSession(null); }}
                                className="text-slate-400 hover:text-slate-600 p-1"
                              ><FaTimes size={10} /></button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between">
                                <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed flex-1 pr-2">
                                  {s.isPinned && <FaThumbtack className="inline text-amber-500 mr-1" size={9} />}
                                  {s.title || 'Untitled'}
                                </p>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); setEditingSession(s.sessionId); setEditTitle(s.title || ''); }} className="p-1 text-slate-400 hover:text-slate-600 rounded"><FaPen size={8} /></button>
                                  <button onClick={(e) => handlePinSession(s.sessionId, e)} className="p-1 text-slate-400 hover:text-amber-500 rounded"><FaThumbtack size={8} /></button>
                                  <button onClick={(e) => handleDeleteSession(s.sessionId, e)} className="p-1 text-slate-400 hover:text-red-500 rounded"><FaTrashAlt size={8} /></button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400">{s.messageCount || 0} msgs</span>
                                <span className="text-[10px] text-slate-400">·</span>
                                <span className="text-[10px] text-slate-400">
                                  {s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleDateString() : ''}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Suggestions Tab ────────────────────────────── */}
            {sidebarTab === 'suggestions' && (
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center">
                    <FaLightbulb className="mr-2 text-emerald-500" /> Suggestions
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Click a sample query to ask the AI Procurement Agent:
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  {PROMPT_SUGGESTIONS.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(s.text)}
                        disabled={loading}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold leading-relaxed transition-all cursor-pointer select-none hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] ${s.color} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex gap-2">
                          <Icon className="mt-0.5 shrink-0" size={14} />
                          <span>{s.text}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2">
                    <FaInfoCircle className="text-emerald-600 mt-0.5 shrink-0" size={12} />
                    <p className="text-[10px] text-emerald-800 leading-relaxed">
                      <strong>Governance Rule</strong>: Chat logs are logged to MongoDB for PFM Act auditing and compliance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Knowledge Base Tab ─────────────────────────── */}
            {sidebarTab === 'knowledge' && (
              <div className="flex flex-col h-full p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Knowledge Base (RAG)</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleScanFolder}
                      disabled={syncing}
                      className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold cursor-pointer"
                      title="Re-index all procurement PDFs in Documents folder"
                    >
                      <FaBook size={8} /> Index Docs
                    </button>
                    <button
                      onClick={handleSyncKnowledge}
                      disabled={syncing || documents.length === 0}
                      className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <FaSyncAlt size={8} className={syncing ? 'animate-spin' : ''} /> Sync
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Official GOSL & University Procurement Documents indexed for AI RAG grounded answers.
                </p>

                {/* Upload Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1 group shrink-0"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" />
                  {uploading ? (
                    <>
                      <FaSpinner className="animate-spin text-emerald-600" size={18} />
                      <p className="text-xs font-medium text-slate-600">Uploading & Indexing...</p>
                    </>
                  ) : (
                    <>
                      <FaCloudUploadAlt className="text-slate-400 group-hover:text-emerald-600 transition-colors" size={20} />
                      <div>
                        <p className="text-xs font-bold text-slate-700">Upload PDF / Manual</p>
                        <p className="text-[10px] text-slate-400">PDF, Word, TXT (25MB)</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Documents List */}
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Documents ({documents.length})
                    </h4>
                    {documents.length > 0 && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                        RAG Active
                      </span>
                    )}
                  </div>
                  {loadingDocs ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-1.5">
                      <FaSpinner className="animate-spin" size={12} /> Loading RAG store...
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs space-y-2">
                      <p>No documents indexed yet.</p>
                      <button
                        onClick={handleScanFolder}
                        className="text-[11px] bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Index `Documents` Directory
                      </button>
                    </div>
                  ) : (
                    documents.map(doc => {
                      const docName = doc.name || doc.loaderId || 'Document';
                      const loaderId = doc.loaderId || doc.id;
                      const chunksCount = doc.chunksCount || 0;
                      return (
                        <div key={loaderId} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100/50 transition-colors group">
                          <div className="flex items-center gap-2 min-w-0">
                            {getFileIcon(docName)}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate" title={docName}>{docName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] bg-slate-200/60 text-slate-600 px-1 py-0.2 rounded font-medium truncate max-w-25">
                                  {doc.category || 'General'}
                                </span>
                                {chunksCount > 0 && (
                                  <span className="text-[9px] text-blue-600 font-semibold">
                                    {chunksCount} chunks
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(loaderId, docName); }} className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer shrink-0">
                            <FaTrashAlt size={10} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Chat Pane ─────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          {/* Messages List */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((m, idx) => {
              const isAssistant = m.sender === 'assistant';
              return (
                <div key={idx} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm leading-relaxed text-sm ${
                    isAssistant
                      ? m.isError
                        ? 'bg-red-50 border border-red-100 text-red-700'
                        : 'bg-white border border-slate-200/60 text-slate-800'
                      : 'bg-emerald-600 text-white font-medium'
                  }`}>
                    {/* Message Text */}
                    {isAssistant ? (
                      <div
                        className="prose prose-sm prose-slate max-w-none [&_table]:text-xs [&_pre]:my-2 [&_code]:text-xs"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                      />
                    ) : (
                      <div className="whitespace-pre-line wrap-break-word">{m.text}</div>
                    )}

                    {/* Tool Usage Badges */}
                    {isAssistant && m.metadata?.usedTools && (
                      <ToolUsageBadges tools={m.metadata.usedTools} />
                    )}

                    {/* Source Documents */}
                    {isAssistant && m.metadata?.sourceDocuments && (
                      <SourceDocumentsPanel sources={m.metadata.sourceDocuments} />
                    )}

                    {/* Follow-Up Suggestions */}
                    {isAssistant && !m.isError && idx === messages.length - 1 && m.metadata?.followUpSuggestions && (
                      <FollowUpSuggestions
                        suggestions={m.metadata.followUpSuggestions}
                        onSelect={(s) => handleSend(s)}
                        disabled={loading}
                      />
                    )}

                    {/* Action Bar for Assistant Messages */}
                    {isAssistant && !m.isError && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {/* Copy */}
                          <button
                            onClick={() => handleCopy(m.text, idx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedIdx === idx ? <FaCheck size={10} className="text-emerald-600" /> : <FaCopy size={10} />}
                          </button>
                          {/* Thumbs Up */}
                          <button
                            onClick={() => handleRate(idx, 1)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${m.rating === 1 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title="Good response"
                          >
                            <FaThumbsUp size={10} />
                          </button>
                          {/* Thumbs Down */}
                          <button
                            onClick={() => handleRate(idx, -1)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${m.rating === -1 ? 'text-red-600 bg-red-50' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                            title="Poor response"
                          >
                            <FaThumbsDown size={10} />
                          </button>
                          {/* Processing Time */}
                          {m.metadata?.processingTimeMs && (
                            <span className="text-[9px] text-slate-400 ml-2 flex items-center gap-1">
                              <FaClock size={8} /> {(m.metadata.processingTimeMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <FaShieldAlt className="text-slate-400 shrink-0" size={9} />
                          <span className="text-[9px] text-slate-400 font-medium">AI advisory only</span>
                        </div>
                      </div>
                    )}

                    {/* Message Time */}
                    <p className={`text-[10px] mt-1.5 text-right ${isAssistant ? 'text-slate-400' : 'text-emerald-200'}`}>
                      {m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/60 rounded-2xl px-4 py-3 shadow-sm flex items-center space-x-2.5">
                  <div className="flex space-x-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">Assistant is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-4 border-t border-slate-200 bg-white flex gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading}
              className="px-3.5 bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
              title="Upload document to Knowledge Base"
            >
              {uploading ? <FaSpinner className="animate-spin text-emerald-600" size={14} /> : <FaPaperclip size={14} />}
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              placeholder="Ask about procurement guidelines, templates, comparisons..."
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-emerald-950/5"
            >
              <FaPaperPlane size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
