import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', department: '', role: 'department_user' });
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="flex items-center space-x-2 text-sm text-slate-500 hover:text-emerald-600 mb-6"><FaArrowLeft size={12} /><span>Back to Login</span></Link>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6"><h1 className="text-2xl font-bold text-slate-900">Create Account</h1><p className="text-sm text-slate-500 mt-1">UWU Smart Procurement System</p></div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label><input value={form.firstName} onChange={e => update('firstName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" /></div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label><input value={form.lastName} onChange={e => update('lastName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" /></div>
            </div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="your.name@uwu.ac.lk" /></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1">Department</label><select value={form.department} onChange={e => update('department', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"><option value="">Select Department</option><option>Medicine</option><option>Applied Sciences</option><option>Technological Studies</option><option>Management</option><option>Animal Science</option><option>Science & Technology</option></select></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1">Password</label><input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" /></div>
            <div><label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label><input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" /></div>
            <button className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors">Register</button>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">Already have an account? <Link to="/login" className="text-emerald-600 font-medium hover:underline">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
