import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';

export default function ResetPassword() {
  const [form, setForm] = useState({ password: '', confirm: '' });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6"><div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><FaLock className="text-emerald-600" size={20} /></div><h1 className="text-2xl font-bold text-slate-900">Reset Password</h1><p className="text-sm text-slate-500 mt-1">Enter your new password</p></div>
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label><input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" /></div>
          <button className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors">Reset Password</button>
        </div>
        <p className="text-center text-xs text-slate-500 mt-4"><Link to="/login" className="text-emerald-600 font-medium hover:underline">Back to Login</Link></p>
      </div>
    </div>
  );
}
