import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="flex items-center space-x-2 text-sm text-slate-500 hover:text-emerald-600 mb-6"><FaArrowLeft size={12} /><span>Back to Login</span></Link>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6"><h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1><p className="text-sm text-slate-500 mt-1">Enter your email to receive a reset link</p></div>
          {sent ? (
            <div className="text-center py-4"><div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><FaEnvelope className="text-emerald-600" size={24} /></div><p className="text-sm text-slate-700">A reset link has been sent to <strong>{email}</strong></p><p className="text-xs text-slate-500 mt-2">Check your inbox and follow the instructions</p></div>
          ) : (
            <div className="space-y-4">
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="your.name@uwu.ac.lk" /></div>
              <button onClick={() => setSent(true)} className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors">Send Reset Link</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
