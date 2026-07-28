import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import vendorService from '../../../services/vendor.service';
import {
  FaArrowLeft, FaCheck, FaTimes, FaBuilding, FaShieldAlt, FaEnvelope,
  FaPhone, FaGlobe, FaMapMarkerAlt, FaChartLine, FaEnvelopeOpenText, FaCopy, FaExternalLinkAlt
} from 'react-icons/fa';

function ScoreBar({ label, value, max = 100 }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-800 font-bold">{value}{max === 100 ? '%' : ''}</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function VendorDetails() {
  const { id } = useParams();
  const { user } = useSelector(state => state.auth);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [setupUrlModal, setSetupUrlModal] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await vendorService.getById(id);
        setVendor(res.data?.data || res.data);
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
      const res = await vendorService.approveAndSendSetupLink(id);
      const data = res.data?.data || res.data;
      if (data.setupUrl) {
        setSetupUrlModal(data.setupUrl);
      }
      const updatedVendor = await vendorService.getById(id);
      setVendor(updatedVendor.data?.data || updatedVendor.data);
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleReject = async () => {
    try {
      await vendorService.reject(id, rejectReason || 'Rejected by Supplies Division');
      setShowRejectModal(false);
      const res = await vendorService.getById(id);
      setVendor(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading vendor details...</div>;
  if (!vendor) return <div className="p-8 text-center text-slate-500">Vendor not found</div>;

  const canManage = ['supplies_division', 'procurement_officer', 'admin', 'super_admin'].includes(user?.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {user?.role !== 'supplier' && (
            <Link to="/vendors" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <FaArrowLeft size={16} />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{vendor.companyName}</h1>
            <p className="text-sm text-slate-500">Registration: {vendor.registrationNumber} • VAT: {vendor.vatNumber || 'N/A'}</p>
          </div>
        </div>

        {vendor.status === 'pending' && canManage && (
          <div className="flex space-x-3">
            <button onClick={() => setShowRejectModal(true)} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2">
              <FaTimes size={14} /> <span>Reject</span>
            </button>
            <button onClick={handleApprove} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center space-x-2">
              <FaCheck size={14} /> <span>Approve & Send Setup Link</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3"><FaBuilding className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">Business Type</p><p className="text-sm font-medium text-slate-800">{vendor.businessType || 'N/A'}</p></div></div>
              <div className="flex items-start space-x-3"><FaShieldAlt className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">CIDA Grade</p><p className="text-sm font-medium text-slate-800">{vendor.cidaGrade || 'N/A'}</p></div></div>
              <div className="flex items-start space-x-3"><FaEnvelope className="text-slate-400 mt-0.5" size={14} /><div><p className="text-xs text-slate-500">Registered Email</p><p className="text-sm font-medium text-slate-800">{vendor.email}</p></div></div>
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

      {/* Setup URL Modal */}
      {setupUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-emerald-100">
            <div className="bg-emerald-900 text-white px-6 py-5">
              <div className="flex items-center space-x-3">
                <FaEnvelopeOpenText className="text-emerald-400 text-2xl" />
                <div>
                  <h3 className="text-lg font-bold">Approved & Account Setup Link Sent!</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">Supplies Division Verification Complete</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                An email notification has been dispatched to <strong>{vendor.email}</strong>. The vendor can click the link in their email to create their login email and password.
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Direct Account Setup Link (Dev / Testing)</label>
                <div className="flex items-center space-x-2">
                  <input type="text" readOnly value={setupUrlModal} className="flex-1 bg-white border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 select-all font-mono" />
                  <button onClick={() => copyToClipboard(setupUrlModal)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 flex items-center space-x-1">
                    <FaCopy size={12} /> <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <a href={setupUrlModal} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 flex items-center space-x-1.5">
                  <span>Open Setup Link</span> <FaExternalLinkAlt size={11} />
                </a>
                <button onClick={() => setSetupUrlModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
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
