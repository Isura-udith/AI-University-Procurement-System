import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  FaHistory, FaDownload, FaUpload, FaSearch,
  FaFilePdf, FaFileWord, FaFileExcel, FaFileAlt, FaFileImage,
  FaCheckCircle, FaLock, FaTimes, FaSpinner, FaExchangeAlt, FaLink,
  FaFolderOpen, FaFolder, FaPlus, FaEdit, FaCloudUploadAlt,
} from 'react-icons/fa';
import documentService from '../../../services/document.service';
import procurementService from '../../../services/procurement.service';
import tenderService from '../../../services/tender.service';
import contractService from '../../../services/contract.service';

// ─── Helpers ──────────────────────────────────────────────────────────────
const getFileIcon = (type) => {
  const cls = 'shrink-0';
  if (type === 'pdf') return <FaFilePdf className={`${cls} text-red-500`} size={20} />;
  if (type === 'word') return <FaFileWord className={`${cls} text-blue-500`} size={20} />;
  if (type === 'excel') return <FaFileExcel className={`${cls} text-emerald-500`} size={20} />;
  if (type === 'image') return <FaFileImage className={`${cls} text-purple-500`} size={20} />;
  return <FaFileAlt className={`${cls} text-slate-400`} size={20} />;
};

const STATUS_META = {
  Draft: { bg: 'bg-amber-100', text: 'text-amber-700', icon: FaEdit },
  Approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: FaCheckCircle },
  Signed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FaCheckCircle },
  Locked: { bg: 'bg-slate-200', text: 'text-slate-700', icon: FaLock },
  Active: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: FaCheckCircle },
};

const CATEGORIES = ['All Documents', 'Specifications', 'Evaluation', 'Contracts', 'Financial', 'Templates', 'General'];

const CATEGORY_ICONS = {
  'All Documents': FaFolderOpen,
  'Specifications': FaFileAlt,
  'Evaluation': FaCheckCircle,
  'Contracts': FaFileWord,
  'Financial': FaFileExcel,
  'Templates': FaFilePdf,
  'General': FaFolder,
};

export default function DocumentRepository() {
  const { user } = useSelector((state) => state.auth);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All Documents');
  const [searchQuery, setSearchQuery] = useState('');

  const [dragOver, setDragOver] = useState(false);

  // Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isUpdateVersionOpen, setIsUpdateVersionOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Related entity loaders
  const [relatedType, setRelatedType] = useState('');
  const [relatedItems, setRelatedItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Upload form state
  const [file, setFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState('General');
  const [docStatus, setDocStatus] = useState('Draft');
  const [relatedId, setRelatedId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Version update form
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [newVersionStatus, setNewVersionStatus] = useState('');

  const fileInputRef = useRef(null);

  // ─── API base for downloads ────────────────────────────────────────────
  const getDownloadUrl = (filePath) => {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');
    return `${base}${filePath}`;
  };

  // ─── Fetch documents ───────────────────────────────────────────────────
  const fetchDocuments = useCallback(async (showLoading = false, cat, search) => {
    if (showLoading) setLoading(true);
    try {
      const res = await documentService.getDocuments({
        category: cat && cat !== 'All Documents' ? cat : undefined,
        search: search || undefined,
      });
      if (res?.success) setDocuments(res.data?.data || []);
    } catch { /* fetch errors leave the list empty – no toast needed */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchDocuments(true, 'All Documents', '');
    };
    init();
  }, [fetchDocuments]);

  useEffect(() => {
    const t = setTimeout(() => fetchDocuments(false, activeCategory, searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery, activeCategory, fetchDocuments]);

  // ─── Load related entities ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!relatedType) { setRelatedItems([]); return; }
      setItemsLoading(true);
      try {
        let res;
        if (relatedType === 'procurement') res = await procurementService.getAll({ limit: 100 });
        else if (relatedType === 'tender') res = await tenderService.getAll({ limit: 100 });
        else if (relatedType === 'contract') res = await contractService.getAll({ limit: 100 });
        if (res?.success) setRelatedItems(res.data?.data || []);
      } catch { /* related entity load failure is silent */ }
      finally { setItemsLoading(false); }
    };
    load();
  }, [relatedType]);

  // ─── File handling ─────────────────────────────────────────────────────
  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    if (!docName) setDocName(selectedFile.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChange(dropped);
  };

  // ─── Upload submit ─────────────────────────────────────────────────────
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setErrorMsg('Please select a file.'); return; }
    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', docName || file.name);
      formData.append('category', category);
      formData.append('status', docStatus);
      if (relatedType && relatedId) {
        formData.append('relatedEntityType', relatedType);
        formData.append('relatedEntityId', relatedId);
      }
      const res = await documentService.uploadDocument(formData);
      if (res?.success) {
        setSuccessMsg('Document uploaded successfully!');
        setFile(null); setDocName(''); setRelatedType(''); setRelatedId('');
        fetchDocuments(false, activeCategory, searchQuery);
        setTimeout(() => { setIsUploadOpen(false); setSuccessMsg(''); }, 1400);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload.');
    }
    finally { setUploading(false); }
  };

  // ─── Open version update ───────────────────────────────────────────────
  const openUpdateVersion = (doc) => {
    setSelectedDoc(doc);
    setNewVersionFile(null);
    setNewVersionNumber(((parseFloat(doc.version) || 1.0) + 1.0).toFixed(1));
    setNewVersionStatus(doc.status);
    setErrorMsg(''); setSuccessMsg('');
    setIsUpdateVersionOpen(true);
  };

  // ─── Version update submit ─────────────────────────────────────────────
  const handleVersionUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!newVersionFile) { setErrorMsg('Please select a file.'); return; }
    setUploading(true);
    setErrorMsg(''); setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('file', newVersionFile);
      formData.append('version', newVersionNumber);
      formData.append('status', newVersionStatus);
      const res = await documentService.updateDocument(selectedDoc._id, formData);
      if (res?.success) {
        setSuccessMsg('Version updated!');
        fetchDocuments(false, activeCategory, searchQuery);
        setTimeout(() => { setIsUpdateVersionOpen(false); setSuccessMsg(''); }, 1400);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update version.');
    }
    finally { setUploading(false); }
  };

  // ─── Status change ─────────────────────────────────────────────────────
  const handleStatusChange = async (docId, newStatus) => {
    try {
      const res = await documentService.updateStatus(docId, newStatus);
      if (res?.success) {
        setDocuments((prev) => prev.map((d) => d._id === docId ? { ...d, status: newStatus } : d));
      }
    } catch { /* status update failure is silent */ }
  };

  // ─── Stats ────────────────────────────────────────────────────────────
  const stats = {
    total: documents.length,
    byStatus: Object.fromEntries(Object.keys(STATUS_META).map((s) => [s, documents.filter((d) => d.status === s).length])),
    byType: {
      pdf: documents.filter((d) => d.type === 'pdf').length,
      word: documents.filter((d) => d.type === 'word').length,
      excel: documents.filter((d) => d.type === 'excel').length,
    },
  };

  return (
    <div className="space-y-5 pb-10">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-6 overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-96 bg-linear-to-l from-indigo-50 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Document Repository</h1>
            <p className="text-slate-500 text-sm mt-1">Secure, version-controlled repository for all procurement documents</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsUploadOpen(true); setErrorMsg(''); setSuccessMsg(''); setFile(null); setDocName(''); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <FaUpload size={13} />
              Upload Document
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5">
          {[
            { label: 'Total Docs', value: stats.total, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Draft', value: stats.byStatus.Draft || 0, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Approved', value: stats.byStatus.Approved || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Signed', value: stats.byStatus.Signed || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Locked', value: stats.byStatus.Locked || 0, color: 'text-slate-600', bg: 'bg-slate-100' },
            { label: 'Active', value: stats.byStatus.Active || 0, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-4 py-3 text-center`}>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              <p className="text-xs font-bold text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Filters & Search ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-slate-100">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat] || FaFolder;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon size={11} />
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative shrink-0">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <FaSpinner className="animate-spin text-indigo-600" size={28} />
              <span className="text-sm font-semibold">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center">
                <FaFolderOpen size={32} className="text-indigo-200" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-500">No documents found</p>
                <p className="text-sm text-slate-400 mt-1">
                  {searchQuery ? 'No documents match your search.' : 'Upload a document to get started.'}
                </p>
              </div>
              <button
                onClick={() => { setIsUploadOpen(true); setErrorMsg(''); setSuccessMsg(''); setFile(null); setDocName(''); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-md transition-all"
              >
                <FaPlus size={12} />
                Upload First Document
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  {['Document', 'Category', 'Version', 'Status', 'Author', 'Linked To', 'Updated', 'Actions'].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {documents.map((doc) => {
                  const statusMeta = STATUS_META[doc.status] || STATUS_META.Draft;
                  const StatusIcon = statusMeta.icon;

                  return (
                    <tr key={doc._id} className="hover:bg-indigo-50/30 transition-colors group">
                      {/* Document Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.type)}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[180px]">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.size}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {doc.category}
                        </span>
                      </td>

                      {/* Version */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => { setSelectedDoc(doc); setIsVersionHistoryOpen(true); }}
                          className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors"
                          title="View version history"
                        >
                          v{doc.version}
                          {doc.versionHistory?.length > 0 && <FaHistory size={9} className="text-slate-400" />}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {(user?.role === 'super_admin' || user?.role === 'admin') && doc.status === 'Draft' ? (
                          <select
                            value={doc.status}
                            onChange={(e) => handleStatusChange(doc._id, e.target.value)}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ${statusMeta.bg} ${statusMeta.text} border-transparent`}
                          >
                            {Object.keys(STATUS_META).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${statusMeta.bg} ${statusMeta.text}`}>
                            <StatusIcon size={9} />
                            {doc.status}
                          </span>
                        )}
                      </td>

                      {/* Author */}
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-700">
                          {doc.author ? `${doc.author.firstName || ''} ${doc.author.lastName || ''}`.trim() : 'System'}
                        </p>
                      </td>

                      {/* Linked */}
                      <td className="px-5 py-4">
                        {doc.relatedEntity?.entityType ? (
                          <a
                            href={`/${doc.relatedEntity.entityType}s/${doc.relatedEntity.entityId}`}
                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline capitalize"
                          >
                            <FaLink size={9} />
                            {doc.relatedEntity.entityType}
                          </a>
                        ) : (
                          <span className="text-slate-300 text-lg">—</span>
                        )}
                      </td>

                      {/* Updated */}
                      <td className="px-5 py-4">
                        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
                          {new Date(doc.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(doc.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={getDownloadUrl(doc.filePath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <FaDownload size={13} />
                          </a>
                          <button
                            onClick={() => openUpdateVersion(doc)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Upload new version"
                          >
                            <FaExchangeAlt size={13} />
                          </button>
                          {(user?.role === 'super_admin' || user?.role === 'admin') && doc.status === 'Draft' && (
                            <button
                              onClick={() => handleStatusChange(doc._id, 'Approved')}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Approve document"
                            >
                              <FaCheckCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer */}
        {documents.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">
              Showing <strong>{documents.length}</strong> document{documents.length !== 1 ? 's' : ''}
              {activeCategory !== 'All Documents' && ` in ${activeCategory}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
        )}
      </div>

      {/* ─── Upload Modal ───────────────────────────────────────────────────── */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-linear-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaUpload size={14} />
                Upload New Document
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl">
                  <FaTimes size={12} className="shrink-0" /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl">
                  <FaCheckCircle size={12} className="shrink-0" /> {successMsg}
                </div>
              )}

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-400 bg-indigo-50'
                    : file
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  className="hidden"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    {getFileIcon(file.name.split('.').pop())}
                    <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setDocName(''); }}
                      className="text-xs text-red-500 hover:text-red-700 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FaCloudUploadAlt size={32} className={dragOver ? 'text-indigo-500' : 'text-slate-300'} />
                    <p className="text-sm font-bold text-slate-600">Drop a file or click to browse</p>
                    <p className="text-xs text-slate-400">PDF, DOCX, XLSX, Images — up to 25MB</p>
                  </div>
                )}
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Document Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Leave empty to use file name"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {['General', 'Specifications', 'Evaluation', 'Contracts', 'Financial', 'Templates'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Initial Status</label>
                  <select
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {['Draft', 'Approved', 'Signed', 'Active', 'Locked'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Link to entity */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                  <FaLink size={10} />
                  Link to Procurement Entity (Optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Entity Type</label>
                    <select
                      value={relatedType}
                      onChange={(e) => { setRelatedType(e.target.value); setRelatedId(''); }}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      <option value="">None</option>
                      <option value="procurement">Requisition</option>
                      <option value="tender">Tender</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Item</label>
                    {itemsLoading ? (
                      <div className="flex items-center gap-1.5 py-2 text-xs text-slate-400">
                        <FaSpinner className="animate-spin text-indigo-600" size={11} />
                        Loading...
                      </div>
                    ) : (
                      <select
                        value={relatedId}
                        onChange={(e) => setRelatedId(e.target.value)}
                        disabled={!relatedType}
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none disabled:opacity-50"
                      >
                        <option value="">-- Select --</option>
                        {relatedItems.map((item) => {
                          const label = item.title || item.name || item.contractNo || item.tenderNo || item.requisitionNo || `ID: ${item._id.toString().slice(-6)}`;
                          return <option key={item._id} value={item._id}>{String(label).substring(0, 40)}</option>;
                        })}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all"
                >
                  {uploading ? <FaSpinner className="animate-spin" size={13} /> : <FaUpload size={13} />}
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Version History Modal ─────────────────────────────────────────── */}
      {isVersionHistoryOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-linear-to-r from-slate-700 to-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaHistory size={14} />
                Version History: {selectedDoc.name}
              </h3>
              <button onClick={() => setIsVersionHistoryOpen(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100" />

                {/* Current version */}
                <div className="relative flex gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 z-10 ring-4 ring-indigo-100">
                    v{selectedDoc.version}
                  </div>
                  <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-200 px-2 py-0.5 rounded">
                          v{selectedDoc.version} (Current)
                        </span>
                        <span className="ml-2 text-[10px] text-slate-400">{selectedDoc.size}</span>
                      </div>
                      <a
                        href={getDownloadUrl(selectedDoc.filePath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                      >
                        <FaDownload size={10} /> Download
                      </a>
                    </div>
                    <p className="text-xs text-slate-500">
                      Updated: {new Date(selectedDoc.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {selectedDoc.author && (
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        By: {selectedDoc.author.firstName} {selectedDoc.author.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Historical versions */}
                {selectedDoc.versionHistory?.length > 0 ? (
                  [...selectedDoc.versionHistory].reverse().map((hist, i) => (
                    <div key={i} className="relative flex gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0 z-10 ring-4 ring-white">
                        v{hist.version}
                      </div>
                      <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                              v{hist.version}
                            </span>
                            <span className="ml-2 text-[10px] text-slate-400">{hist.size}</span>
                          </div>
                          <a
                            href={getDownloadUrl(hist.filePath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-bold text-xs"
                          >
                            <FaDownload size={10} /> Download
                          </a>
                        </div>
                        <p className="text-xs text-slate-500">
                          Updated: {new Date(hist.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic ml-14">No previous versions exist.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Update Version Modal ──────────────────────────────────────────── */}
      {isUpdateVersionOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-linear-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaExchangeAlt size={14} />
                Upload New Version
              </h3>
              <button onClick={() => setIsUpdateVersionOpen(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleVersionUpdateSubmit} className="p-6 space-y-5">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl">
                  {successMsg}
                </div>
              )}

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">{selectedDoc.name}</p>
                <span className="font-mono font-bold text-xs text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                  Current: v{selectedDoc.version}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Version File</label>
                <input
                  type="file"
                  onChange={(e) => setNewVersionFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 file:cursor-pointer hover:file:bg-indigo-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Version Number</label>
                  <input
                    type="text"
                    value={newVersionNumber}
                    onChange={(e) => setNewVersionNumber(e.target.value)}
                    placeholder="e.g. 2.0"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Status</label>
                  <select
                    value={newVersionStatus}
                    onChange={(e) => setNewVersionStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {['Draft', 'Approved', 'Signed', 'Active', 'Locked'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsUpdateVersionOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !newVersionFile}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all"
                >
                  {uploading ? <FaSpinner className="animate-spin" size={13} /> : <FaUpload size={13} />}
                  {uploading ? 'Uploading...' : 'Upload Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
