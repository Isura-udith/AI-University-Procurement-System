import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  FaRobot, FaPaperPlane, FaSpinner, FaArrowLeft,
  FaLightbulb, FaHistory, FaShieldAlt, FaInfoCircle
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import aiService from '../../../services/ai.service';

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
  const [sessionId, setSessionId] = useState(() => `session-${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    if (!textToSend) setInputText('');

    // Add user message
    const userMsg = { sender: 'user', text: query, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await aiService.askFlowiseChat(query, sessionId);
      const reply = res?.data?.text || res?.text || 'I did not receive a response. Please try again.';
      
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: reply,
        time: new Date()
      }]);
    } catch (err) {
      console.error('Failed to get answer:', err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'Sorry, I encountered an error connecting to the Flowise agent. Make sure the Flowise server is running locally.',
        time: new Date(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-10rem)] flex flex-col space-y-4">
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
        <button
          onClick={() => {
            setSessionId(`session-${Math.random().toString(36).substr(2, 9)}`);
            setMessages([
              {
                sender: 'assistant',
                text: 'New session started. How can I help you with your procurement workflows today?',
                time: new Date()
              }
            ]);
          }}
          className="text-xs font-bold px-3.5 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
        >
          Reset Session
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Left Suggestions Pane */}
        <div className="hidden lg:flex lg:flex-col space-y-4 bg-white border border-slate-200/80 rounded-2xl p-5 overflow-y-auto">
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
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-start gap-2.5">
              <FaInfoCircle className="text-emerald-600 mt-0.5 shrink-0" size={14} />
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                <strong>Governance Rule</strong>: Chat logs are logged to MongoDB for PFM Act auditing and compliance logs.
              </p>
            </div>
          </div>
        </div>

        {/* Right Chat Pane */}
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
                    <div className="whitespace-pre-line wrap-break-words">
                      {m.text}
                    </div>
                    {/* Footnote for Assistant replies */}
                    {isAssistant && !m.isError && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <FaShieldAlt className="text-slate-400 shrink-0" size={10} />
                        <span>AI recommendation only. Review against PFM Act guidelines before action.</span>
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
            
            {/* Loading / Typing Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/60 rounded-2xl px-4 py-3 shadow-sm flex items-center space-x-2.5">
                  <FaSpinner className="animate-spin text-emerald-600" size={14} />
                  <span className="text-xs text-slate-500 font-semibold">Assistant is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 border-t border-slate-200 bg-white flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              placeholder="Ask a question about procurement guidelines, templates, comparisons..."
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
