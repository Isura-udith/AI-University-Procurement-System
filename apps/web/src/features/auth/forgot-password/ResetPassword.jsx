import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FaLock, FaKey, FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';
import authService from '../../../services/auth.service';

export default function ResetPassword() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const initialToken = params.token || searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please provide a valid reset token.');
      return;
    }
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.resetPassword(token.trim(), password);
      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err?.message || 'Failed to reset password. Token may be invalid or expired.');
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
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors mb-6"
        >
          <FaArrowLeft size={12} />
          <span>Back to Sign In</span>
        </Link>

        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-linear-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              {success ? <FaCheckCircle className="text-white" size={28} /> : <FaLock className="text-white" size={26} />}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {success ? 'Password Reset Complete' : 'Reset Account Password'}
            </h1>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {success
                ? 'Your new password is now active. You can sign in immediately.'
                : 'Enter your verification token and set a new password for your account.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-rose-300 text-xs font-medium">
              <FaExclamationTriangle className="text-rose-400 shrink-0 mt-0.5" size={14} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 font-medium text-center">
                Password updated successfully!
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/25"
              >
                Sign In With New Password
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Verification Token
                </label>
                <div className="relative">
                  <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter reset token"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full pl-11 pr-12 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full pl-11 pr-12 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirm ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
