import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaSearch, FaEye } from 'react-icons/fa';
import vendorService from '../../../services/vendor.service';

const statusColors = { verified: 'bg-emerald-100 text-emerald-700', preferred: 'bg-blue-100 text-blue-700', pending: 'bg-amber-100 text-amber-700', blacklisted: 'bg-red-100 text-red-700', suspended: 'bg-slate-100 text-slate-700', rejected: 'bg-red-100 text-red-700', inactive: 'bg-slate-100 text-slate-700' };

export default function VendorList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    if (user?.role === 'supplier') return; // Skip fetching if supplier
    
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const res = await vendorService.getAll();
        setVendors(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, [user?.role]);

  const filteredVendors = vendors.filter(v => (!search || v.companyName.toLowerCase().includes(search.toLowerCase())) && (!statusFilter || v.status === statusFilter));

  if (user?.role === 'supplier') {
    return <Navigate to="/vendors/me" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage registered vendors and supplier performance</p>
        </div>
        <Link to="/vendor-register" className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm">+ Register Vendor</Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="preferred">Preferred</option>
            <option value="rejected">Rejected</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Categories</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Contracts</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading vendors...</td></tr>
              ) : filteredVendors.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No vendors found.</td></tr>
              ) : (
                filteredVendors.map(v => (
                  <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">{v.companyName}</p>
                      <p className="text-xs text-slate-400">{v.contactPerson} • {v.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">{v.supplierCategories?.map((c, i) => (<span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c}</span>))}</div>
                    </td>
                    <td className="px-6 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[v.status] || statusColors.pending}`}>{v.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${v.performanceScore >= 80 ? 'bg-emerald-500' : v.performanceScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${v.performanceScore || 0}%` }} /></div>
                        <span className="text-xs font-semibold text-slate-700">{v.performanceScore || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm text-slate-600">{v.metrics?.completedContracts || 0}/{v.metrics?.totalContracts || 0}</span></td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/vendors/${v._id}`} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors inline-block"><FaEye size={14} /></Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
