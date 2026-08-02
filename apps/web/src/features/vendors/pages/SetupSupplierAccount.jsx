import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import vendorService from '../../../services/vendor.service';
import { setCredentials } from '../../../app/store';
import {
  FaEnvelope,
  FaLock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaUser,
  FaShieldAlt,
  FaArrowRight
} from 'react-icons/fa';
import uwuLogo from '../../../assets/logos/Logo_uwu.jpg';
import Footer from '../../../components/navigation/Footer';

export default function SetupSupplierAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const token = searchParams.get('token');

  const [loading, setLoading] = useState(Boolean(token));
  const [vendorInfo, setVendorInfo] = useState(null);
  const [fetchError, setFetchError] = useState(
    !token ? 'No setup token provided in the URL. Please check your invitation email.' : ''
  );

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!token) return;

    vendorService.getSetupAccountInfo(token)
      .then((res) => {
        const data = res.data?.data || res.data;
        setVendorInfo(data);
        const nameParts = (data.contactPerson || '').trim().split(' ');
        setForm(prev => ({
          ...prev,
          email: data.email || '',
          firstName: nameParts[0] || data.companyName || '',
          lastName: nameParts.slice(1).join(' ') || 'Supplier',
        }));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to validate setup token:', err);
        setFetchError(err.response?.data?.message || err.message || 'Invalid or expired setup token.');
        setLoading(false);
      });
  }, [token]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address';

    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';

    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (!form.firstName.trim()) errs.firstName = 'First name is required';

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await vendorService.completeSetupAccount({
        token,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });

      const resData = response.data?.data || response.data;
      if (resData.user && resData.accessToken) {
        dispatch(setCredentials({
          user: resData.user,
          accessToken: resData.accessToken,
        }));
      }

      setSetupSuccess(true);
    } catch (err) {
      console.error('Account setup error:', err);
      setFormErrors({
        general: err.response?.data?.message || err.message || 'Failed to create login account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header Bar */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src={uwuLogo} alt="UWU" className="w-9 h-9 rounded-full bg-white p-0.5" />
            <div>
              <h1 className="text-base font-bold leading-tight">Uva Wellassa University</h1>
              <p className="text-xs text-emerald-400 font-medium">Smart Procurement Portal</p>
            </div>
          </Link>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">
            Supplies Division Approved
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl shadow-xl border border-slate-100 text-center">
            <FaSpinner className="animate-spin text-emerald-600 text-4xl mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-800">Validating Setup Token...</h2>
            <p className="text-sm text-slate-500 mt-1">Verifying your Supplies Division registration approval link.</p>
          </div>
        ) : fetchError ? (
          <div className="bg-white p-10 rounded-2xl shadow-xl border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaExclamationTriangle size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid or Expired Setup Link</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">{fetchError}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 text-left mb-6">
              <strong className="block font-semibold mb-1">What should I do?</strong>
              If your setup link has expired or reached its usage limit, please contact the <strong>UWU Supplies Division</strong> or submit a new vendor registration application.
            </div>
            <div className="flex justify-center space-x-4">
              <Link to="/vendor-register" className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors">
                Vendor Registration
              </Link>
              <Link to="/login" className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors">
                Back to Login
              </Link>
            </div>
          </div>
        ) : setupSuccess ? (
          <div className="bg-white p-10 rounded-2xl shadow-xl border border-emerald-100 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <FaCheckCircle size={36} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Vendor Account Created!</h2>
            <p className="text-sm text-slate-600 mb-6">
              Your login account for <strong className="text-slate-800">{vendorInfo?.companyName}</strong> has been created successfully. You can now log in to access your supplier dashboard and submit bids.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-slate-600 mb-6 space-y-1.5">
              <p><strong>Login Email:</strong> {form.email}</p>
              <p><strong>Role:</strong> Registered Supplier / Vendor</p>
              <p><strong>Status:</strong> Verified by Supplies Division</p>
            </div>

            <button
              onClick={() => navigate('/supplier-dashboard')}
              className="w-full py-3.5 px-6 bg-linear-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Go to Supplier Dashboard</span>
              <FaArrowRight />
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
            {/* Top Banner */}
            <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-8">
              <div className="flex items-center space-x-3 mb-2">
                <FaShieldAlt className="text-emerald-400 text-xl" />
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Account Activation</span>
              </div>
              <h2 className="text-2xl font-bold">Create Vendor Login Account</h2>
              <p className="text-sm text-slate-300 mt-1">
                Your application for <span className="font-semibold text-white">{vendorInfo?.companyName}</span> has been approved by Supplies Division.
              </p>
            </div>

            {/* Vendor Summary Card */}
            <div className="bg-emerald-50/60 border-b border-emerald-100 p-4 px-8 flex items-center justify-between text-xs text-emerald-900">
              <div>
                <span className="font-semibold text-slate-600 block">Registration No:</span>
                <span className="font-bold text-slate-900">{vendorInfo?.registrationNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 block">Contact Person:</span>
                <span className="font-medium text-slate-800">{vendorInfo?.contactPerson || 'N/A'}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-center space-x-2">
                  <FaExclamationTriangle size={14} className="shrink-0" />
                  <span>{formErrors.general}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-3.5 text-slate-400 text-xs" />
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
                      placeholder="First Name"
                    />
                  </div>
                  {formErrors.firstName && <p className="text-red-500 text-[11px] mt-1">{formErrors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Login Email Address</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-3.5 text-slate-400 text-xs" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
                    placeholder="supplier@company.com"
                  />
                </div>
                {formErrors.email && <p className="text-red-500 text-[11px] mt-1">{formErrors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Create Password</label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-3.5 text-slate-400 text-xs" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  {formErrors.password && <p className="text-red-500 text-[11px] mt-1">{formErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-3.5 text-slate-400 text-xs" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none"
                      placeholder="Repeat password"
                    />
                  </div>
                  {formErrors.confirmPassword && <p className="text-red-500 text-[11px] mt-1">{formErrors.confirmPassword}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPw}
                    onChange={(e) => setShowPw(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show Passwords</span>
                </label>
                <span className="text-slate-400">Role: Supplier / Vendor</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-linear-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Vendor Login Account</span>
                    <FaArrowRight />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
