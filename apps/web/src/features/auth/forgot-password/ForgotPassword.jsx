import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaLock, FaEnvelope, FaArrowLeft, FaUserShield, FaCheckCircle, FaExclamationTriangle, FaClock, FaPaperPlane } from 'react-icons/fa';
import authService from '../../../services/auth.service';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(email.trim(), reason.trim());
      setSubmitted(true);
    } catch (err) {
      console.error('Forgot password submission error:', err);
      setError(err?.message || 'No registered user account found with this email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link
          to="/login"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors mb-6 cursor-pointer"
        >
          <FaArrowLeft size={12} />
          <span>Back to Sign In</span>
        </Link>

        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl p-8">
          {/* Top Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-linear-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              {submitted ? (
                <FaCheckCircle className="text-slate-950" size={28} />
              ) : (
                <FaUserShield className="text-slate-950" size={28} />
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {submitted ? 'Request Sent to Administrators' : 'Reset Account Password'}
            </h1>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {submitted
                ? 'Your password reset request has been dispatched to top-level system administrators.'
                : 'Submit a password reset request directly to top-level system administrators for approval.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-rose-300 text-xs font-medium">
              <FaExclamationTriangle className="text-rose-400 shrink-0 mt-0.5" size={14} />
              <span>{error}</span>
            </div>
          )}

          {!submitted ? (
            <form onSubmit={handleSubmitRequest} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Registered Email Address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@uwu.ac.lk"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Reason for Reset <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Forgot password, locked out of account..."
                  rows={3}
                  className="w-full p-3.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="p-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-xs text-slate-400 flex items-start space-x-2.5">
                <FaLock className="text-emerald-400 shrink-0 mt-0.5" size={13} />
                <span>
                  Password reset requests are reviewed and approved by <strong className="text-slate-200">System Administrators</strong> to ensure highest security standards.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FaPaperPlane size={13} />
                    <span>Send Request to Top-Level Admins</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <FaClock size={15} />
                  <span>Pending Administrator Review</span>
                </div>
                <p className="text-slate-300">
                  Password reset request submitted for <strong className="text-white">{email}</strong>.
                </p>
                <div className="pt-2 border-t border-emerald-500/20 space-y-2 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Notification sent to System Administrators</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                    <span>An administrator will approve your request and issue your password</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
