import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaArrowLeft, FaBuilding, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaShieldAlt, FaChartLine, FaCheck, FaTimes } from 'react-icons/fa';
import vendorService from '../../../services/vendor.service';

const ScoreBar = ({ label, value, max = 100 }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs"><span className="text-slate-600">{label}</span><span className="font-semibold text-slate-800">{value}{max === 5 ? '/5' : '%'}</span></div>
    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${(value / max * 100) >= 80 ? 'bg-emerald-500' : (value / max * 100) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${(value / max) * 100}%` }} /></div>
  </div>
);

export default function VendorDetails() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await vendorService.getById(id);
        setVendor(res.data?.data || res.data); // depending on how success response is structured
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id]);

  const handleApprove = async () => {
    try {
      await vendorService.verify(id);
      const res = await vendorService.getById(id);
      setVendor(res.data?.data || res.data);
    } catch (err) { console.error(err); }
  };

  const handleReject = async () => {
    try {
      await vendorService.reject(id, rejectReason || 'Rejected by admin');
      setShowRejectModal(false);
      const res = await vendorService.getById(id);
      setVendor(res.data?.data || res.data);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="p-8 text-center">Loading vendor...</div>;
  if (!vendor) return <div className="p-8 text-center text-slate-500">Vendor not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {user?.role !== 'supplier' && (
            <Link to="/vendors" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><FaArrowLeft size={16} /></Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{vendor.companyName}</h1>
            <p className="text-sm text-slate-500">Registration: {vendor.registrationNumber} • VAT: {vendor.vatNumber || 'N/A'}</p>
          </div>
        </div>
        {vendor.status === 'pending' && (
          <div className="flex space-x-3">
            <button onClick={() => setShowRejectModal(true)} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2">
              <FaTimes size={14} /> <span>Reject</span>
            </button>
            <button onClick={handleApprove} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center space-x-2">
              <FaCheck size={14} /> <span>Approve</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3"><FaBuilding className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">Business Type</p><p className="text-sm font-medium text-slate-800">{vendor.businessType}</p></div></div>
              <div className="flex items-start space-x-3"><FaShieldAlt className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">CIDA Grade</p><p className="text-sm font-medium text-slate-800">{vendor.cidaGrade}</p></div></div>
              <div className="flex items-start space-x-3"><FaEnvelope className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">Email</p><p className="text-sm font-medium text-slate-800">{vendor.email}</p></div></div>
              <div className="flex items-start space-x-3"><FaPhone className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">Phone</p><p className="text-sm font-medium text-slate-800">{vendor.phone}</p></div></div>
              <div className="flex items-start space-x-3"><FaGlobe className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">Website</p><p className="text-sm font-medium text-emerald-600">{vendor.website || 'N/A'}</p></div></div>
              <div className="flex items-start space-x-3"><FaMapMarkerAlt className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">Address</p><p className="text-sm font-medium text-slate-800">{vendor.address?.street}, {vendor.address?.city}</p></div></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2"><FaChartLine className="text-emerald-600" size={14} /><span>Performance Metrics</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ScoreBar label="Delivery Timeliness" value={vendor.metrics?.deliveryTimeliness || 0} />
              <ScoreBar label="Quality Rating" value={vendor.metrics?.qualityRating || 0} max={5} />
              <ScoreBar label="Price Competitiveness" value={vendor.metrics?.priceCompetitiveness || 0} />
              <ScoreBar label="Compliance Score" value={vendor.metrics?.complianceScore || 0} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white ${vendor.performanceScore >= 80 ? 'bg-emerald-500' : vendor.performanceScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}>{vendor.performanceScore}</div>
            <p className="text-sm font-semibold text-slate-800 mt-3">Overall Score</p>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full capitalize inline-block mt-2">{vendor.status}</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Contract Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total Contracts</span><span className="font-semibold text-slate-800">{vendor.metrics?.totalContracts || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Completed</span><span className="font-semibold text-emerald-600">{vendor.metrics?.completedContracts || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total Value</span><span className="font-semibold text-slate-800">LKR {((vendor.metrics?.totalContractValue || 0) / 1000000).toFixed(1)}M</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">{vendor.supplierCategories?.map((c, i) => (<span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200">{c}</span>))}</div>
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Reject Vendor</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Rejection</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" rows="3" placeholder="Please provide a reason..." />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-500">Reject Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
