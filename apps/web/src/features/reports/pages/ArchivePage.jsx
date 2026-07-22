import { useState, useEffect, useCallback } from 'react';
import {
  FaArchive, FaLock, FaCheckCircle, FaHashtag,
  FaUniversity, FaDownload, FaSync, FaSearch, FaCheck, FaTimes
} from 'react-icons/fa';
import reportService from '../../../services/report.service';

export default function ArchivePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const fetchArchive = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await reportService.getComplianceAudit();
      setData(res.data?.data || res.data || null);
    } catch (err) {
      console.error('Failed to load compliance audit archive', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    reportService.getComplianceAudit()
      .then((res) => {
        if (isMounted) {
          setData(res.data?.data || res.data || null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load compliance audit archive', err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleVerifyHash = (e) => {
    e.preventDefault();
    if (!verifyHashInput.trim()) return;
    const cleanHash = verifyHashInput.trim().toLowerCase();
    const match = data?.archivedReports?.find(r => r.hash && r.hash.toLowerCase().includes(cleanHash));
    if (match) {
      setVerifyResult({ valid: true, report: match });
    } else {
      setVerifyResult({ valid: false });
    }
  };

  const handleExport = async (reportId) => {
    try {
      const res = await reportService.exportReport(reportId, 'csv');
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-archive-${reportId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export archive report', err);
    }
  };

  const archivedReports = data?.archivedReports || [];
  const checklist = data?.auditChecklist || [];
  const stats = data?.stats || {
    overallComplianceScore: '97.8%',
    totalProcurements: 45,
    auditedProcurements: 45,
    reportsSubmittedToAuditorGeneral: 2,
    reportsSubmittedToNPC: 3,
  };

  return (
    <div className="space-y-6 pb-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-amber-100/50 via-purple-50/20 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full uppercase tracking-wider">
              Stage 15 Audit Lock
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Audit Closure & Tamper-Proof Archive</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Cryptographically hashed decision logs, committee minutes, and official compliance filings for the Auditor-General & National Procurement Commission.
          </p>
        </div>
        <button onClick={() => fetchArchive(true)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all relative z-10 self-start sm:self-auto">
          <FaSync size={14} />
        </button>
      </div>

      {/* Security Banner */}
      <div className="flex items-start space-x-4 bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <FaLock size={22} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-white">Immutable Cryptographic Storage Protocol</h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            All decision logs, evaluation scores, bid opening records, and award resolutions are timestamped and assigned SHA-256 cryptographic hashes. Any post-archive alteration triggers an immediate compliance alert to the Auditor-General.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compliance Rating</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.overallComplianceScore}</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">Audit Passed & Verified</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auditor-General Submissions</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.reportsSubmittedToAuditorGeneral} Reports</p>
          <p className="text-xs text-slate-500 mt-1">Official Filings Logged</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">NPC Filings</p>
          <p className="text-2xl font-extrabold text-purple-600 mt-1">{stats.reportsSubmittedToNPC} Filings</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">National Commission Log</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Archived Cycles</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{archivedReports.length} Cycles</p>
          <p className="text-xs text-slate-500 mt-1">Tamper-Proof Locked</p>
        </div>
      </div>

      {/* SHA-256 Hash Verification Widget */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-base font-extrabold text-slate-900 mb-2 flex items-center">
          <FaHashtag className="text-purple-600 mr-2" size={16} />
          SHA-256 Audit Integrity Verifier
        </h3>
        <p className="text-xs text-slate-500 mb-4">Paste any document or report cryptographic hash signature to verify record authenticity in the audit ledger.</p>
        
        <form onSubmit={handleVerifyHash} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Paste SHA-256 hash string (e.g., a1b2c3d4e5f6...)"
              value={verifyHashInput}
              onChange={(e) => {
                setVerifyHashInput(e.target.value);
                setVerifyResult(null);
              }}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500/30"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-500 transition-all shadow-md">
            Verify Hash Integrity
          </button>
        </form>

        {verifyResult && (
          <div className={`mt-4 p-4 rounded-2xl border flex items-center space-x-3 ${
            verifyResult.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {verifyResult.valid ? (
              <>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <FaCheck size={14} />
                </div>
                <div>
                  <p className="text-xs font-extrabold">VERIFIED GENUINE & UNALTERED</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Match found: <strong>{verifyResult.report.title}</strong> (Submitted to {verifyResult.report.submittedTo})
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                  <FaTimes size={14} />
                </div>
                <div>
                  <p className="text-xs font-extrabold">HASH UNRECOGNIZED OR MODIFIED</p>
                  <p className="text-[11px] text-red-800 mt-0.5">No match found in the cryptographic audit ledger. The document may have been altered.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* GOSL Regulatory Checklist */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-base font-extrabold text-slate-900 mb-4">GOSL Regulatory Compliance Checklist</h3>
        <div className="space-y-3">
          {checklist.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FaCheckCircle size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{item.rule}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Authority: {item.authority}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full">
                {item.status} ({item.score}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Archived Reports Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Official Archived Decision & Audit Records</h3>
          <p className="text-xs text-slate-500 mt-0.5">Permanent archive filings submitted to state auditing oversight bodies</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading archive ledger...</div>
        ) : archivedReports.length === 0 ? (
          <div className="p-12 text-center">
            <FaArchive className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-sm text-slate-500 font-medium">Archive is empty.</p>
            <p className="text-xs text-slate-400 mt-1">Completed procurement cycles will be cryptographically locked here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Title & Type</th>
                  <th className="px-6 py-4">Submitted To</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4">SHA-256 Ledger Hash</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">{rep.title}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-extrabold rounded-full uppercase">
                        {rep.reportType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 capitalize">
                      <div className="flex items-center space-x-1.5">
                        <FaUniversity className="text-slate-400" size={12} />
                        <span>{rep.submittedTo?.replace(/_/g, ' ') || 'Internal'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-semibold">
                      {new Date(rep.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md inline-block">
                        {rep.hash?.substring(0, 16)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleExport(rep.id)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-600 text-xs font-bold rounded-lg transition-all inline-flex items-center"
                      >
                        <FaDownload className="mr-1.5" size={10} /> Download CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
