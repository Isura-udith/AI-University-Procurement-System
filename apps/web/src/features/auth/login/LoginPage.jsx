import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  FaSignInAlt, FaShieldAlt, FaLock, FaEnvelope, FaEye, FaEyeSlash,
  FaKey, FaUsersCog, FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import uwuLogo from '../../../assets/logos/Logo_uwu.jpg';
import { setCredentials } from '../../../app/store';
import authService from '../../../services/auth.service';
import DEMO_USERS, { DEMO_PASSWORD, groupedDemoUsers, formatRole } from '../../../constants/demoUsers';
import { getLandingPage } from '../../../constants/routes';
import { ROLE_CONFIG } from '../../../constants/roles';

// ─── Colour mappings for category badges ─────────────────────
const CAT_COLORS = {
  System:      { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-500' },
  Executive:   { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  Finance:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  Procurement: { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500' },
  Department:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  Operations:  { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-500' },
  External:    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  Oversight:   { bg: 'bg-slate-100', text: 'text-slate-700',  border: 'border-slate-200',  dot: 'bg-slate-500' },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [demoPanelOpen, setDemoPanelOpen] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const grouped = groupedDemoUsers();

  // ─── Authenticate & redirect to role-specific landing page ──
  const loginUser = (user) => {
    dispatch(setCredentials({
      user: {
        id: user.employeeId || user.id || user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        jobTitle: user.jobTitle || ROLE_CONFIG[user.role]?.label,
        employeeId: user.employeeId,
        category: user.category,
        faculty: user.faculty,
        department: user.department,
        tenantId: user.tenantId || 'uwu-main',
      },
      accessToken: user.accessToken || `demo-jwt-${user.role}-token`,
    }));
    // Navigate to role-appropriate landing page
    const landingPage = getLandingPage(user.role);
    navigate(landingPage);
  };

  // ─── Form submit handler ────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};

    // validation
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Minimum 6 characters';

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // lockout
    if (failedAttempts >= 3) {
      setErrors({ general: 'Account locked after 3 failed attempts. Contact IT support.' });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      
      const userData = response.data?.user || response.data;
      const token = response.data?.token || response.data?.accessToken || 'backend-token';

      setFailedAttempts(0);
      loginUser({ ...userData, accessToken: token });
    } catch (error) {
      setFailedAttempts(prev => prev + 1);
      const remaining = 3 - (failedAttempts + 1);
      setErrors({
        general: remaining > 0
          ? error.response?.data?.message || `Invalid credentials. ${remaining} attempt(s) remaining.`
          : 'Account locked after 3 failed attempts. Contact IT support.'
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Demo quick login — fills form and auto-submits via backend API ──
  const handleDemoLogin = async (user) => {
    setEmail(user.email);
    setPassword(DEMO_PASSWORD);
    setDemoPanelOpen(false);
    setErrors({});
    setFailedAttempts(0);

    // Auto-submit via backend (database check)
    setLoading(true);
    try {
      const response = await authService.login({ email: user.email, password: DEMO_PASSWORD });
      const userData = response.data?.user || response.data;
      const token = response.data?.token || response.data?.accessToken || 'backend-token';
      setFailedAttempts(0);
      loginUser({ ...userData, accessToken: token });
    } catch (error) {
      setErrors({
        general: error?.message || error?.response?.data?.message || 'Login failed. Please ensure the database is seeded.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetLock = async () => {
    setFailedAttempts(0);
    setErrors({});
    if (email) {
      try {
        await authService.resetLock(email);
      } catch {
        // silent catch
      }
    }
  };

  // ─── UI ─────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white relative flex-col justify-between p-12 h-full">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-linear-to-br from-emerald-600 to-blue-600" />
        </div>
        {/* Animated glow orbs */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10">
          <Link to="/" className="flex items-center space-x-4 mb-12 hover:opacity-90 transition-opacity">
            <div className="p-1.5 bg-white rounded-full shadow-lg shadow-white/10">
              <img src={uwuLogo} alt="UWU" className="w-12 h-12 rounded-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Uva Wellassa University</h1>
              <p className="text-emerald-400 text-sm font-medium">Smart Procurement System</p>
            </div>
          </Link>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight mb-6">
            Institutional Procurement Portal
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            Role-Based Procurement Automation with Financial Control, AI Compliance Auditing, and Multi-Tier Approvals.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800 pt-6">
          <span>&copy; {new Date().getFullYear()} Uva Wellassa University</span>
          <span className="flex items-center space-x-1.5 text-emerald-400">
            <FaShieldAlt size={12} />
            <span>256-bit Encrypted</span>
          </span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">Please sign in with your institutional credentials to securely access your portal.</p>
            </div>

            {errors.general && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <FaShieldAlt className="text-red-500 mt-0.5 shrink-0" size={14} />
                  <span>{errors.general}</span>
                </div>
                {(failedAttempts > 0 || errors.general.includes('locked')) && (
                  <button
                    type="button"
                    onClick={handleResetLock}
                    className="ml-3 text-xs font-bold text-red-700 underline hover:text-red-900 shrink-0 cursor-pointer"
                  >
                    Reset Lock
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Institutional Email</label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="username@uwu.ac.lk"
                        autoComplete="off"
                        className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border ${errors.email ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm`}
                      />
                    </div>
                    {errors.email && <p className="mt-1.5 text-xs text-red-500 font-bold">{errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-slate-700">Password</label>
                      <Link to="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 font-bold transition-colors">Forgot Password?</Link>
                    </div>
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="off"
                        className={`w-full pl-11 pr-12 py-3.5 bg-slate-50 border ${errors.password ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm`}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPw ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1.5 text-xs text-red-500 font-bold">{errors.password}</p>}
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">Remember me for 30 days</span>
                    </label>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || failedAttempts >= 3}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 bg-linear-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/40 hover:-translate-y-0.5 mt-2"
                  >
                    {loading ? (
                      <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <><span>Sign In to Portal</span></>
                    )}
                  </button>
                </form>

                <div className="mt-8 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-slate-400 font-bold tracking-wider text-[10px] uppercase">Or continue with</span>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════
                    DEMO ROLE QUICK-LOGIN PANEL
                    ═══════════════════════════════════════════════ */}
                <div className="mt-6 relative">
                  <button
                    type="button"
                    onClick={() => setDemoPanelOpen(!demoPanelOpen)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <span className="flex items-center space-x-2.5">
                      <FaUsersCog className="text-emerald-500" size={16} />
                      <span>Demo Accounts ({DEMO_USERS.length} Roles)</span>
                    </span>
                    {demoPanelOpen
                      ? <FaChevronUp className="text-slate-400 group-hover:text-slate-600 transition-colors" size={12} />
                      : <FaChevronDown className="text-slate-400 group-hover:text-slate-600 transition-colors" size={12} />}
                  </button>

                  {demoPanelOpen && (
                    <div className="absolute bottom-full left-0 w-full mb-3 bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 ring-1 ring-black/5">
                      {/* Info bar */}
                      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center space-x-2">
                        <FaKey className="text-emerald-500" size={11} />
                        <p className="text-xs font-semibold text-emerald-700">
                          Password for all accounts: <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800">{DEMO_PASSWORD}</span>
                        </p>
                      </div>

                      {/* Scrollable role list */}
                      <div className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-slate-100">
                        {Object.entries(grouped).map(([category, users]) => {
                          const cat = CAT_COLORS[category] || CAT_COLORS.Oversight;
                          return (
                            <div key={category}>
                              {/* Category header */}
                              <div className={`px-4 py-2 ${cat.bg} border-b ${cat.border} flex items-center space-x-2 sticky top-0 z-10`}>
                                <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${cat.text}`}>{category}</span>
                              </div>
                              {/* Users */}
                              {users.map(user => (
                                <button
                                  key={user.email}
                                  onClick={() => handleDemoLogin(user)}
                                  disabled={loading}
                                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group disabled:opacity-50"
                                >
                                  <div className="flex items-center space-x-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg ${cat.bg} ${cat.text} flex items-center justify-center text-xs font-bold shrink-0 border ${cat.border}`}>
                                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                                        {user.firstName} {user.lastName}
                                      </p>
                                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                                      <p className="text-[10px] text-slate-300 truncate italic">{user.accessArea}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 shrink-0 pl-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cat.bg} ${cat.text} border ${cat.border}`}>
                                      {formatRole(user.role)}
                                    </span>
                                    <FaSignInAlt className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={11} />
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vendor register link */}
                <div className="mt-8 text-center bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                  <p className="text-sm text-slate-600 font-medium">
                    Are you a supplier? <Link to="/vendor-register" className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors ml-1 hover:underline underline-offset-2">Register as a Vendor</Link>
                  </p>
                </div>

          </div>
        </div>
      </div>
    </div>
  );
}
