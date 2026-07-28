import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUserPlus, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import authService from '../../../services/auth.service';
import { DEPARTMENTS_AND_FACULTIES } from '../../../constants/departments';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    role: 'department_user',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const update = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        department: form.department,
        role: form.role || 'department_user',
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="flex items-center space-x-2 text-sm text-slate-500 hover:text-emerald-600 mb-6 transition-colors">
          <FaArrowLeft size={12} />
          <span>Back to Login</span>
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
            <p className="text-sm text-slate-500 mt-1">UWU Smart Procurement System</p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
              <FaExclamationTriangle className="text-red-500 shrink-0" size={14} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-6 space-y-3">
              <FaCheckCircle className="mx-auto text-emerald-500" size={48} />
              <h3 className="text-lg font-bold text-slate-900">Registration Successful!</h3>
              <p className="text-xs text-slate-500">Your account has been created. Redirecting to login page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={e => update('firstName', e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={e => update('lastName', e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="your.name@uwu.ac.lk"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Faculty</label>
                <select
                  value={form.department}
                  onChange={e => update('department', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">Select Department / Faculty</option>
                  {DEPARTMENTS_AND_FACULTIES.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <FaUserPlus size={14} />
                    <span>Register</span>
                  </>
                )}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-500 mt-4">
            Already have an account? <Link to="/login" className="text-emerald-600 font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

