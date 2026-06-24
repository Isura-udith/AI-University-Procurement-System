import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBoxOpen, FaFileContract, FaClock, FaMoneyCheckAlt, FaBuilding,
  FaChevronRight, FaSearch, FaTimes,
  FaShieldAlt, FaDownload, FaList, FaFilePdf, FaFileWord, FaFileExcel,
  FaFileAlt
} from 'react-icons/fa';
import procurementService from '../../services/procurement.service';

const SupplierDashboard = () => {
  const [activeTenders, setActiveTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTender, setSelectedTender] = useState(null);

  const getDownloadUrl = (filePath) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
    const path = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${base}${path}`;
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FaFilePdf className="text-red-500 shrink-0" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-blue-500 shrink-0" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FaFileExcel className="text-emerald-500 shrink-0" />;
    return <FaFileAlt className="text-slate-400 shrink-0" />;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await procurementService.getPublic();
        setActiveTenders(res.data || []);
      } catch (err) {
        console.error('Failed to fetch active tenders', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenders();
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  };

  const filteredTenders = activeTenders.filter(t =>
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.tenderNumber || t.referenceNumber)?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <h2 className="text-2xl font-extrabold text-slate-900">Welcome to your Supplier Dashboard</h2>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Browse and bid on active procurement notices, track your submitted bids, and manage your ongoing contracts with Uva Wellassa University.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-blue-500 shrink-0">
            <FaBoxOpen size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{activeTenders.length}</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Active Tenders</p>
          </div>
        </div>
        <Link to="/bid-box" className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all flex items-center space-x-4 cursor-pointer">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-amber-500 shrink-0 group-hover:scale-105 transition-transform">
            <FaClock size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">0</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">My Active Bids</p>
          </div>
        </Link>
        <Link to="/contracts" className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all flex items-center space-x-4 cursor-pointer">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-emerald-500 shrink-0 group-hover:scale-105 transition-transform">
            <FaFileContract size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">0</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Active Contracts</p>
          </div>
        </Link>
        <Link to="/payments" className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all flex items-center space-x-4 cursor-pointer">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-purple-500 shrink-0 group-hover:scale-105 transition-transform">
            <FaMoneyCheckAlt size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">0</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Pending Payments</p>
          </div>
        </Link>
      </div>

      {/* Active Tenders Listing */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center"><FaBuilding className="text-emerald-500 mr-2" /> Public Procurement Notices</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Opportunities open for bidding</p>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search tenders..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <FaSearch className="absolute left-3 top-2.5 text-slate-400" size={14} />
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
              <p className="text-sm text-slate-500 font-medium">Loading opportunities...</p>
            </div>
          ) : filteredTenders.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FaBoxOpen className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-sm font-bold text-slate-600">No active procurement notices</p>
              <p className="text-xs text-slate-500 mt-1">Check back later for new opportunities.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTenders.map(t => (
                <div key={t._id} className="group p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-100 transition-all bg-white relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                      {t.tenderNumber || t.referenceNumber || t._id.substring(0, 8).toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${t.procurementMethod?.includes('ICB') ? 'bg-purple-100 text-purple-700' : t.procurementMethod?.includes('Shopping') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {(t.procurementMethod || 'NCB').split(' - ')[0]}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-lg leading-tight mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {t.title}
                  </h4>

                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 grow">
                    {t.description || 'No description provided.'}
                  </p>

                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Est. Value</span>
                      <span className="font-bold text-slate-800">LKR {(t.estimatedValue || t.tce || t.totalEstimatedCost || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Published</span>
                      <span className="font-semibold text-slate-700">{formatTime(t.publishedAt)}</span>
                    </div>
                  </div>

                  <button onClick={() => setSelectedTender(t)} className="w-full py-2.5 bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center border border-slate-200 group-hover:border-emerald-600">
                    View Full Details <FaChevronRight className="ml-2 text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Details Modal */}
      {selectedTender && (() => {
        const tenderDeadline = selectedTender.tenderId?.bidSubmissionDeadline;
        const isDeadlinePassed = tenderDeadline ? new Date(tenderDeadline) < new Date() : false;
        const canBid = selectedTender.tenderId && !isDeadlinePassed;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTender(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center">
                    <FaBuilding className="text-emerald-500 mr-2.5" size={20} />
                    Procurement Notice Details
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Ref No: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{selectedTender.referenceNumber || selectedTender.tenderNumber || selectedTender._id}</span>
                  </p>
                </div>
                <button onClick={() => setSelectedTender(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Title and Description */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-lg font-bold text-slate-800 leading-snug">{selectedTender.title}</h4>
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-line">{selectedTender.description || 'No description provided.'}</p>
                </div>

                {/* Key Timelines */}
                <div className="space-y-3">
                  <h5 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-wider">
                    <FaClock className="text-indigo-500 mr-2" /> Key Timeline & Dates
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Published Date</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1">{formatTime(selectedTender.publishedAt)}</p>
                    </div>
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Submission Deadline</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1">{formatDateTime(selectedTender.tenderId?.bidSubmissionDeadline)}</p>
                    </div>
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Clarification Deadline</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1">{formatDateTime(selectedTender.tenderId?.clarificationDeadline)}</p>
                    </div>
                    <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Pre-Bid Meeting</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1">{formatDateTime(selectedTender.tenderId?.preBidMeetingDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Scope & Requirements */}
                <div className="space-y-3">
                  <h5 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-wider">
                    <FaShieldAlt className="text-amber-500 mr-2" /> Requirements & Info
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Procurement Method</p>
                      <p className="text-sm font-bold text-slate-800">{selectedTender.procurementMethod || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Estimated Value</p>
                      <p className="text-sm font-bold text-emerald-600">LKR {(selectedTender.totalEstimatedCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Category</p>
                      <p className="text-sm font-bold text-slate-800">{selectedTender.category || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Document Fee</p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedTender.tenderId?.documentFee ? `LKR ${selectedTender.tenderId.documentFee.toLocaleString()}` : 'Free'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Bid Security Required</p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedTender.tenderId?.bidSecurityRequired
                          ? (selectedTender.tenderId.bidSecurityAmount
                            ? `LKR ${selectedTender.tenderId.bidSecurityAmount.toLocaleString()} (${selectedTender.tenderId.bidSecurityValidityDays || 180} days)`
                            : 'Yes')
                          : 'No'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Requesting Faculty/Dept</p>
                      <p className="text-sm font-bold text-slate-800 truncate" title={`${selectedTender.faculty || 'N/A'} - ${selectedTender.department || 'N/A'}`}>
                        {selectedTender.faculty ? `${selectedTender.faculty} (${selectedTender.department || 'N/A'})` : selectedTender.department || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <h5 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-wider">
                    <FaList className="text-emerald-500 mr-2" /> Items Specifications & Quantities ({selectedTender.items?.length || 0})
                  </h5>
                  <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-600 w-12 text-center">#</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Description</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Specifications</th>
                          <th className="px-4 py-3 font-bold text-slate-600 text-center w-24">Qty / Unit</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Timeline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTender.items?.map((item, index) => (
                          <tr key={item._id || index} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-500 text-center">{index + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{item.description}</td>
                            <td className="px-4 py-3 text-slate-600">{item.specifications || '—'}</td>
                            <td className="px-4 py-3 text-slate-800 font-bold text-center">{item.quantity} {item.unit}</td>
                            <td className="px-4 py-3 text-slate-600">{item.deliveryTimeline || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Documents & Attachments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Bidding Documents */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-wider">
                      <FaFileContract className="text-blue-500 mr-2" /> Bidding Documents
                    </h5>
                    {selectedTender.tenderId?.tenderDocuments?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTender.tenderId.tenderDocuments.map((doc, idx) => (
                          <a
                            key={idx}
                            href={getDownloadUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all group"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {getFileIcon(doc.name)}
                              <span className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-700">{doc.name}</span>
                            </div>
                            <FaDownload className="text-slate-400 group-hover:text-indigo-600 transition-colors" size={13} />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-center text-xs text-slate-400 italic">
                        No bidding documents uploaded.
                      </div>
                    )}
                  </div>

                  {/* Supporting Attachments */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-wider">
                      <FaFileContract className="text-emerald-500 mr-2" /> Supporting Attachments
                    </h5>
                    {selectedTender.attachments?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTender.attachments.map((doc, idx) => (
                          <a
                            key={idx}
                            href={getDownloadUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/40 hover:border-emerald-200 transition-all group"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {getFileIcon(doc.name)}
                              <span className="text-xs font-bold text-slate-700 truncate group-hover:text-emerald-700">{doc.name}</span>
                            </div>
                            <FaDownload className="text-slate-400 group-hover:text-emerald-600 transition-colors" size={13} />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-center text-xs text-slate-400 italic">
                        No supporting attachments uploaded.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl">
                <div>
                  {isDeadlinePassed && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-150 px-3 py-1.5 rounded-lg">
                      Bidding is closed for this procurement notice
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => setSelectedTender(null)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                    Close
                  </button>
                  {canBid ? (
                    <Link
                      to={`/bid-box?tenderId=${selectedTender.tenderId._id}`}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-bold rounded-xl flex items-center shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      Proceed to Bid Box <FaChevronRight className="ml-2 text-xs" />
                    </Link>
                  ) : selectedTender.tenderId ? (
                    <button
                      disabled
                      className="px-5 py-2.5 bg-slate-200 text-slate-400 text-sm font-bold rounded-xl cursor-not-allowed border border-slate-300"
                    >
                      Bid Box Closed
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-5 py-2.5 bg-slate-200 text-slate-400 text-sm font-bold rounded-xl cursor-not-allowed border border-slate-300"
                      title="Waiting for procurement officer to publish tender requirements"
                    >
                      Bidding Not Started
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SupplierDashboard;
