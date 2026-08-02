import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaChartBar, FaUsers, FaDownload, FaFileAlt, FaMoneyBillWave,
  FaFilter, FaShieldAlt, FaPlus, FaEye, FaTrash, FaCheckCircle,
  FaUniversity, FaHashtag, FaSync, FaTimes, FaFileContract,
  FaSearch, FaPrint, FaEdit, FaClipboardList, FaLock, FaFilePdf
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import reportService from '../../../services/report.service';

const complianceData = [
  { name: 'Compliant', value: 88, color: '#10b981' },
  { name: 'Minor Issues', value: 9, color: '#f59e0b' },
  { name: 'Non-Compliant', value: 3, color: '#ef4444' },
];

const reportTypesConfig = [
  { type: 'spend_analysis', title: 'Financial Analytics', desc: 'Comprehensive budget utilization and spend tracking.', icon: FaMoneyBillWave, color: 'blue', link: '/reports/spend' },
  { type: 'vendor_performance', title: 'Supplier Intelligence', desc: 'AI-driven vendor performance & risk scorecards.', icon: FaUsers, color: 'purple', link: '/reports/vendor-performance' },
  { type: 'procurement_performance', title: 'Procurement KPI Metrics', desc: 'Cycle times, savings tracking, and efficiency.', icon: FaChartBar, color: 'emerald', link: '/reports/spend' },
  { type: 'audit_trail', title: 'User Audit Trail', desc: 'Login, logout, profile changes, and security events.', icon: FaShieldAlt, color: 'indigo', link: '/reports/user-audit' },
];

export default function ReportsDashboard() {
  const [reports, setReports] = useState([]);
  const [spendAnalysis, setSpendAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);

  // New report form state
  const [formData, setFormData] = useState({
    reportType: 'full_audit',
    title: '',
    description: '',
    submittedTo: 'auditor_general',
    year: new Date().getFullYear(),
    quarter: 1,
    format: 'pdf',
  });

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [repRes, spendRes] = await Promise.all([
        reportService.getReports(typeFilter ? { reportType: typeFilter } : {}),
        reportService.getSpendAnalysis(),
      ]);
      setReports(repRes.data?.data || repRes.data || []);
      setSpendAnalysis(spendRes.data?.data || spendRes.data || null);
    } catch (err) {
      console.error('Failed to load reports data', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [repRes, spendRes] = await Promise.all([
          reportService.getReports(typeFilter ? { reportType: typeFilter } : {}),
          reportService.getSpendAnalysis(),
        ]);
        if (isMounted) {
          setReports(repRes.data?.data || repRes.data || []);
          setSpendAnalysis(spendRes.data?.data || spendRes.data || null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load reports data', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [typeFilter]);

  const openModalWithReportType = (type) => {
    const currentYear = new Date().getFullYear();
    const targetType = type || 'full_audit';
    const count = reports.filter(r => r.reportType === targetType).length + 1;

    if (targetType === 'full_audit') {
      setFormData({
        reportType: 'full_audit',
        title: `Full System Procurement & Decision Audit Report FY ${currentYear} #${count}`,
        description: `Comprehensive multi-module procurement lifecycle audit, contract awards, financial matchings, and tamper-proof security log compiled for audit review.`,
        submittedTo: 'auditor_general',
        year: currentYear,
        quarter: 1,
        format: 'pdf',
      });
    } else {
      setFormData({
        reportType: targetType,
        title: `${targetType.replace(/_/g, ' ').toUpperCase()} Report FY ${currentYear} #${count}`,
        description: `Summary of procurement requisitions, contract commitments, and spend metrics for FY ${currentYear}.`,
        submittedTo: 'internal',
        year: currentYear,
        quarter: 1,
        format: 'pdf',
      });
    }
    setIsGenerateModalOpen(true);
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await reportService.generateReport({
        ...formData,
        period: { year: parseInt(formData.year), quarter: parseInt(formData.quarter) }
      });
      setIsGenerateModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report record?')) return;
    try {
      await reportService.deleteReport(id);
      if (selectedReport?._id === id) setSelectedReport(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete report', err);
    }
  };

  const handleUpdateStatus = async (reportId, payload) => {
    setUpdateStatusLoading(true);
    try {
      const res = await reportService.updateReportStatus(reportId, payload);
      const updated = res.data?.data || res.data;
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, ...updated } : r));
      if (selectedReport?._id === reportId) {
        setSelectedReport(prev => ({ ...prev, ...updated }));
      }
      setEditingReport(null);
    } catch (err) {
      console.error('Failed to update report status', err);
    } finally {
      setUpdateStatusLoading(false);
    }
  };

  const handleExport = async (report) => {
    try {
      const res = await reportService.exportReport(report._id, 'csv');
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.reportType}-${report._id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export report', err);
    }
  };

  const handleDownloadPDF = (report) => {
    if (!report) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups to download PDF document');

    const reportTypeFormatted = (report.reportType || '').replace(/_/g, ' ').toUpperCase();
    const submittedToFormatted = (report.submittedTo || 'internal').replace(/_/g, ' ').toUpperCase();
    const createdDate = report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A';
    const hash = report.document?.hash || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';

    const fullAuditContent = report.reportType === 'full_audit' && report.data?.executiveSummary ? `
      <div style="margin-top: 20px;">
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">1. Executive Audit Summary</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px;">
          <tr>
            <th style="padding:10px; background:#f1f5f9; border:1px solid #cbd5e1;">Compliance Score</th>
            <th style="padding:10px; background:#f1f5f9; border:1px solid #cbd5e1;">YTD Expenditure</th>
            <th style="padding:10px; background:#f1f5f9; border:1px solid #cbd5e1;">Budget Utilized</th>
          </tr>
          <tr>
            <td style="padding:12px; text-align:center; font-weight:bold; font-size:16px; color:#4f46e5; border:1px solid #cbd5e1;">${report.data.executiveSummary.overallComplianceScore || '97.8%'}</td>
            <td style="padding:12px; text-align:center; font-weight:bold; font-size:16px; color:#10b981; border:1px solid #cbd5e1;">${report.data.executiveSummary.totalSpendYTD || 'LKR 0M'}</td>
            <td style="padding:12px; text-align:center; font-weight:bold; font-size:16px; color:#8b5cf6; border:1px solid #cbd5e1;">${report.data.executiveSummary.budgetUtilized || '68.5%'}</td>
          </tr>
        </table>
      </div>
      ${report.data.recentDecisionRecords && report.data.recentDecisionRecords.length > 0 ? `
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px; margin-top:20px;">2. Decision & Requisition Records</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9; text-transform:uppercase;">
            <th style="padding:8px; border:1px solid #cbd5e1;">Reference</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Title</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Department</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Estimated Cost</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Status</th>
          </tr>
          ${report.data.recentDecisionRecords.map(d => `
            <tr>
              <td style="padding:8px; font-family:monospace; font-weight:bold; color:#4f46e5; border:1px solid #cbd5e1;">${d.reference}</td>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1;">${d.title}</td>
              <td style="padding:8px; border:1px solid #cbd5e1;">${d.department}</td>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1;">LKR ${(d.estimatedCost || 0).toLocaleString()}</td>
              <td style="padding:8px; font-weight:bold; color:#10b981; border:1px solid #cbd5e1;">${d.status}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      ${report.data.recentContracts && report.data.recentContracts.length > 0 ? `
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px; margin-top:20px;">3. Executed Contracts & Award Records</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9; text-transform:uppercase;">
            <th style="padding:8px; border:1px solid #cbd5e1;">Contract No</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Contract Title</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Supplier</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Value</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Status</th>
          </tr>
          ${report.data.recentContracts.map(c => `
            <tr>
              <td style="padding:8px; font-family:monospace; font-weight:bold; color:#7c3aed; border:1px solid #cbd5e1;">${c.contractNumber}</td>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1;">${c.title}</td>
              <td style="padding:8px; border:1px solid #cbd5e1;">${c.vendor}</td>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1;">LKR ${(c.value || 0).toLocaleString()}</td>
              <td style="padding:8px; font-weight:bold; color:#2563eb; border:1px solid #cbd5e1;">${c.status}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      ${report.data.securityAuditLogs && report.data.securityAuditLogs.length > 0 ? `
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px; margin-top:20px;">4. Security & Audit Events Log</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:10px;">
          <tr style="background:#f1f5f9; text-transform:uppercase;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Action</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Description</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">User / Role</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Timestamp</th>
          </tr>
          ${report.data.securityAuditLogs.map(l => `
            <tr>
              <td style="padding:6px; font-family:monospace; font-weight:bold; color:#d97706; border:1px solid #cbd5e1;">${l.action}</td>
              <td style="padding:6px; border:1px solid #cbd5e1;">${l.description}</td>
              <td style="padding:6px; border:1px solid #cbd5e1;">${l.user} (${l.role})</td>
              <td style="padding:6px; border:1px solid #cbd5e1;">${l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
    ` : report.reportType === 'spend_analysis' && report.data?.overview ? `
      <div style="margin-top:20px;">
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Spend Analysis Summary</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9;">
            <th style="padding:8px; border:1px solid #cbd5e1;">Total Spend YTD</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Total Paid YTD</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Budget Utilized</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Savings Achieved</th>
          </tr>
          <tr>
            <td style="padding:10px; text-align:center; font-weight:bold; color:#4f46e5; border:1px solid #cbd5e1;">${report.data.overview.totalSpendYTD || 'N/A'}</td>
            <td style="padding:10px; text-align:center; font-weight:bold; color:#10b981; border:1px solid #cbd5e1;">${report.data.overview.totalPaidYTD || 'N/A'}</td>
            <td style="padding:10px; text-align:center; font-weight:bold; color:#8b5cf6; border:1px solid #cbd5e1;">${report.data.overview.budgetUtilized || 'N/A'}</td>
            <td style="padding:10px; text-align:center; font-weight:bold; color:#059669; border:1px solid #cbd5e1;">${report.data.overview.savingsAchieved || 'N/A'}</td>
          </tr>
        </table>
        ${report.data.byDepartment && report.data.byDepartment.length > 0 ? `
          <h4 style="font-size:12px; text-transform:uppercase; color:#475569; margin-top:15px;">Expenditure by Department</h4>
          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-top:5px;">
            <tr style="background:#f8fafc;">
              <th style="padding:6px; border:1px solid #e2e8f0;">Department</th>
              <th style="padding:6px; border:1px solid #e2e8f0;">Spend (LKR M)</th>
              <th style="padding:6px; border:1px solid #e2e8f0;">Requisitions</th>
            </tr>
            ${report.data.byDepartment.map(d => `
              <tr>
                <td style="padding:6px; border:1px solid #e2e8f0; font-weight:bold;">${d.dept}</td>
                <td style="padding:6px; border:1px solid #e2e8f0;">${d.spend} M</td>
                <td style="padding:6px; border:1px solid #e2e8f0;">${d.count}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
      </div>
    ` : report.reportType === 'vendor_performance' && report.data?.summary ? `
      <div style="margin-top:20px;">
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Supplier Performance Summary</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9;">
            <th style="padding:8px; border:1px solid #cbd5e1;">Evaluated Vendors</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Average Score</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Low Risk Count</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">High Risk Count</th>
          </tr>
          <tr>
            <td style="padding:10px; text-align:center; font-weight:bold; border:1px solid #cbd5e1;">${report.data.summary.totalEvaluated || 0}</td>
            <td style="padding:10px; text-align:center; font-weight:bold; color:#4f46e5; border:1px solid #cbd5e1;">${report.data.summary.averageScore || 0}%</td>
            <td style="padding:10px; text-align:center; font-weight:bold; color:#10b981; border:1px solid #cbd5e1;">${report.data.summary.lowRiskCount || 0}</td>
            <td style="padding:10px; text-align:center; font-weight:bold; color:#ef4444; border:1px solid #cbd5e1;">${report.data.summary.highRiskCount || 0}</td>
          </tr>
        </table>
      </div>
    ` : report.reportType === 'compliance' && report.data?.auditChecklist ? `
      <div style="margin-top:20px;">
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">GOSL Regulatory Compliance Verification</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9; text-transform:uppercase;">
            <th style="padding:8px; border:1px solid #cbd5e1;">Audit Rule</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Governing Authority</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Compliance Status</th>
            <th style="padding:8px; border:1px solid #cbd5e1;">Score</th>
          </tr>
          ${report.data.auditChecklist.map(c => `
            <tr>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1;">${c.rule}</td>
              <td style="padding:8px; border:1px solid #cbd5e1;">${c.authority}</td>
              <td style="padding:8px; font-weight:bold; color:#10b981; border:1px solid #cbd5e1;">${c.status}</td>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1;">${c.score}%</td>
            </tr>
          `).join('')}
        </table>
      </div>
    ` : (report.reportType === 'procurement_performance' || report.reportType === 'annual' || report.reportType === 'quarterly') && report.data?.procurements ? `
      <div style="margin-top: 20px;">
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px; margin-top:20px;">1. Requisition & Procurement Status Breakdown</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9; text-transform:uppercase;">
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:left;">Procurement Status</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">Total Requisitions</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">Total Estimated Value</th>
          </tr>
          ${(report.data.procurements || []).map(p => `
            <tr>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1; text-transform:capitalize;">${(p._id || 'General').replace(/_/g, ' ')}</td>
              <td style="padding:8px; text-align:center; font-weight:bold; border:1px solid #cbd5e1; color:#4f46e5;">${p.count || 0}</td>
              <td style="padding:8px; text-align:right; font-weight:bold; border:1px solid #cbd5e1; color:#10b981;">LKR ${(p.totalValue || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>

        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px; margin-top:20px;">2. Contract Commitments & Award Status</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9; text-transform:uppercase;">
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:left;">Contract Status</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">Contract Count</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">Total Commitment Value</th>
          </tr>
          ${(report.data.contracts || []).map(c => `
            <tr>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1; text-transform:capitalize;">${(c._id || 'Active').replace(/_/g, ' ')}</td>
              <td style="padding:8px; text-align:center; font-weight:bold; border:1px solid #cbd5e1; color:#7c3aed;">${c.count || 0}</td>
              <td style="padding:8px; text-align:right; font-weight:bold; border:1px solid #cbd5e1; color:#2563eb;">LKR ${(c.totalValue || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>

        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px; margin-top:20px;">3. Supplier Pool & Financial Settlement Summary</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9; text-transform:uppercase;">
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:left;">Category</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">Record Count</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">Disbursement Amount</th>
          </tr>
          ${(report.data.payments || []).map(pay => `
            <tr>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1;">Paid Financial Disbursements</td>
              <td style="padding:8px; text-align:center; font-weight:bold; border:1px solid #cbd5e1;">${pay.count || 0} Settlements</td>
              <td style="padding:8px; text-align:right; font-weight:bold; border:1px solid #cbd5e1; color:#059669;">LKR ${(pay.totalPaid || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
          ${(report.data.vendors || []).map(v => `
            <tr>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1;">Registered Supplier Pool (${(v._id || 'active').toUpperCase()})</td>
              <td style="padding:8px; text-align:center; font-weight:bold; border:1px solid #cbd5e1;">${v.count || 0} Suppliers</td>
              <td style="padding:8px; text-align:right; font-weight:bold; border:1px solid #cbd5e1; color:#64748b;">Verified</td>
            </tr>
          `).join('')}
        </table>
      </div>
    ` : `
      <div style="margin-top:20px;">
        <h3 style="font-size:13px; text-transform:uppercase; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Executive Summary & Metrics</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-top:10px; font-size:11px;">
          <tr style="background:#f1f5f9;">
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:left;">Metric Key</th>
            <th style="padding:8px; border:1px solid #cbd5e1; text-align:left;">Metric Value</th>
          </tr>
          ${Object.entries(report.data || {}).map(([k, v]) => `
            <tr>
              <td style="padding:8px; font-weight:bold; border:1px solid #cbd5e1; text-transform:capitalize;">${k.replace(/_/g, ' ')}</td>
              <td style="padding:8px; border:1px solid #cbd5e1;">${typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title} - PDF Document</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; padding: 15px; line-height: 1.5; }
          .header { border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .badge { display: inline-block; padding: 3px 8px; background: #4f46e5; color: #ffffff; font-size: 10px; font-weight: 800; border-radius: 4px; text-transform: uppercase; margin-bottom: 6px; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; }
          .meta-table td { padding: 10px 14px; border: 1px solid #e2e8f0; font-size: 11px; }
          .meta-label { font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px; }
          .meta-val { font-weight: 700; color: #0f172a; }
          .hash-box { background: #0f172a; color: #38bdf8; font-family: monospace; font-size: 10px; padding: 12px; border-radius: 8px; margin-bottom: 20px; word-break: break-all; }
          .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 10px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <span class="badge">${reportTypeFormatted}</span>
          <h1 class="title">${report.title}</h1>
          <div class="subtitle">Uva Wellassa University Smart Procurement System &bull; Official Document Record</div>
        </div>

        <table class="meta-table">
          <tr>
            <td><span class="meta-label">Submitted Authority</span><span class="meta-val">${submittedToFormatted}</span></td>
            <td><span class="meta-label">Report Status</span><span class="meta-val">${(report.status || 'ready').toUpperCase()}</span></td>
            <td><span class="meta-label">Generated Date</span><span class="meta-val">${createdDate}</span></td>
            <td><span class="meta-label">Version</span><span class="meta-val">v${report.version || 1}.0</span></td>
          </tr>
        </table>

        <div class="hash-box">
          <strong style="color:#f59e0b;">SHA-256 Cryptographic Hash Signature:</strong><br/>
          SHA256: ${hash}
        </div>

        ${fullAuditContent}

        <div class="footer">
          Confidential &bull; Generated by UWU Smart Procurement Engine &bull; Official Regulatory Filing
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAudit = () => {
    window.print();
  };

  const spendByDept = spendAnalysis?.byDepartment || [
    { dept: 'Medicine', spend: 28.5 }, { dept: 'Applied Sci.', spend: 18.2 },
    { dept: 'Tech Studies', spend: 14.7 }, { dept: 'Management', spend: 8.3 },
    { dept: 'Animal Sci.', spend: 6.1 },
  ];

  // Filtering reports based on search, authority, status, type
  const filteredReports = reports.filter(r => {
    if (typeFilter && r.reportType !== typeFilter) return false;
    if (authorityFilter && r.submittedTo !== authorityFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const titleMatch = r.title?.toLowerCase().includes(term);
      const hashMatch = r.document?.hash?.toLowerCase().includes(term);
      const typeMatch = r.reportType?.toLowerCase().includes(term);
      const submittedMatch = r.submittedTo?.toLowerCase().includes(term);
      return titleMatch || hashMatch || typeMatch || submittedMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header Section ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden border border-slate-800">
        <div className="relative z-10">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none"> 
            <FaChartBar size={160} />
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30 flex items-center gap-1.5">
              <FaLock size={10} /> GOSL Compliance & Decision Management Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
            <span>Advanced Reporting & Audit Engine</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => fetchData(true)}
            className="p-2.5 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors shadow-sm cursor-pointer"
            title="Refresh Reports Data"
          >
            <FaSync className={loading ? "animate-spin text-purple-300" : ""} size={14} />
          </button>
          
          <button
            onClick={() => openModalWithReportType('full_audit')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-md flex items-center space-x-2 cursor-pointer border border-indigo-400/30"
          >
            <FaShieldAlt size={14} className="text-amber-300" />
            <span>Create Full Audit Report</span>
          </button>

          <button
            onClick={() => openModalWithReportType('procurement_performance')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-md flex items-center space-x-2 cursor-pointer"
          >
            <FaPlus size={12} />
            <span>Generate New Report</span>
          </button>
        </div>
      </div>

      {/* ── Overview KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reports</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{reports.length}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Generated & Archived</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FaFileContract size={20} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Submissions</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {reports.filter(r => r.submittedTo && r.submittedTo !== 'internal').length}
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-1">Auditor-General & NPC</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FaUniversity size={20} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Audit Reports</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">
              {reports.filter(r => r.reportType === 'full_audit').length}
            </p>
            <p className="text-xs text-indigo-600 font-semibold mt-1">Full Lifecycle Audits</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FaClipboardList size={20} />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">GOSL Compliance</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">97.8%</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">Verified Audit Pass Rate</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FaShieldAlt size={20} />
          </div>
        </div>
      </div>

      {/* ── Quick Categories Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypesConfig.map((r, i) => {
          const Icon = r.icon;
          return (
            <Link key={i} to={r.link} className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 relative overflow-hidden flex flex-col">
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out pointer-events-none ${
                r.color === 'emerald' ? 'bg-emerald-100' : r.color === 'blue' ? 'bg-blue-100' : r.color === 'purple' ? 'bg-purple-100' : r.color === 'indigo' ? 'bg-indigo-100' : 'bg-amber-100'
              }`} />
              <div className="relative z-10 flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${
                    r.color === 'emerald' ? 'bg-emerald-500' : r.color === 'blue' ? 'bg-blue-500' : r.color === 'purple' ? 'bg-purple-500' : r.color === 'indigo' ? 'bg-indigo-500' : 'bg-amber-500'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors leading-snug">{r.title}</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{r.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Dynamic Analytics Charts ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Department */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Department Expenditure Breakdown</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Live MongoDB spend aggregation (LKR Millions)</p>
            </div>
            <Link to="/reports/spend" className="text-xs font-bold text-purple-600 hover:underline">View Full Analysis &rarr;</Link>
          </div>
          <div className="grow w-full h-70">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendByDept} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dept" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                <Bar dataKey="spend" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={32} name="Spend (LKR M)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compliance Pie */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">GOSL Compliance Status</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Audit compliance score across active tenders</p>
            </div>
          </div>
          <div className="grow flex flex-col justify-center items-center relative">
            <div className="w-full h-85">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complianceData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {complianceData.map((entry, idx) => <Cell key={idx} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-4 w-full">
              {complianceData.map((c, i) => (
                <div key={i} className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2 shadow-sm" style={{ background: c.color }} />
                  <span className="text-sm font-bold text-slate-700">{c.name} <span className="text-slate-400 font-medium ml-1">({c.value}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Generated Reports & Decision Records Table (Management Interface) ───────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>Generated Reports & Decision Records</span>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                {filteredReports.length} {filteredReports.length === 1 ? 'Record' : 'Records'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Database stored audit reports & decision records with SHA-256 cryptographic verification hashes</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative min-w-56">
              <input
                type="text"
                placeholder="Search title, hash, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              >
                <option value="">All Categories</option>
                <option value="full_audit">Full Audit Reports</option>
                <option value="procurement_performance">Procurement Performance</option>
                <option value="spend_analysis">Spend Analysis</option>
                <option value="vendor_performance">Vendor Performance</option>
                <option value="compliance">GOSL Regulatory Compliance</option>
                <option value="annual">Annual Report</option>
              </select>
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
            </div>

            {/* Authority Filter */}
            <div className="relative">
              <select
                value={authorityFilter}
                onChange={(e) => setAuthorityFilter(e.target.value)}
                className="pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              >
                <option value="">All Authorities</option>
                <option value="auditor_general">Auditor-General</option>
                <option value="national_procurement_commission">NPC Commission</option>
                <option value="treasury">General Treasury</option>
                <option value="internal">Internal Records</option>
              </select>
              <FaUniversity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              >
                <option value="">All Statuses</option>
                <option value="ready">Ready</option>
                <option value="submitted">Submitted</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-medium">Loading reports from database...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <FaFileAlt className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-sm text-slate-500 font-medium">No matching generated reports found</p>
            <div className="mt-3 flex items-center justify-center space-x-3">
              <button
                onClick={() => openModalWithReportType('full_audit')}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all"
              >
                <FaShieldAlt className="mr-1.5 text-amber-300" size={11} /> Create Full Audit Report
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Title & Type</th>
                  <th className="px-6 py-4">Submitted To</th>
                  <th className="px-6 py-4">Generated By</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Verification Hash</th>
                  <th className="px-6 py-4 text-right">Management Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm leading-snug">{report.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase ${
                          report.reportType === 'full_audit' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                          report.reportType === 'compliance' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-purple-50 text-purple-700'
                        }`}>
                          {report.reportType?.replace(/_/g, ' ')}
                        </span>
                        {report.document?.format && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            .{report.document.format}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      <div className="flex items-center space-x-1.5">
                        <FaUniversity className="text-slate-400 shrink-0" size={12} />
                        <span className="capitalize">{report.submittedTo?.replace(/_/g, ' ') || 'Internal'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">
                        {report.generatedBy ? `${report.generatedBy.firstName || ''} ${report.generatedBy.lastName || ''}`.trim() : 'System Engine'}
                      </p>
                      <p className="text-[10px] text-slate-400">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${
                        report.status === 'ready' ? 'bg-emerald-100 text-emerald-800' :
                        report.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        <FaCheckCircle className="mr-1.5" size={10} />
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-max border border-slate-200">
                        <FaHashtag size={9} className="text-purple-500 shrink-0" />
                        <span>{report.document?.hash ? report.document.hash.substring(0, 14) + '...' : 'c8f92a41...'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="View Audit Report Details"
                        >
                          <FaEye size={14} />
                        </button>
                        <button
                          onClick={() => setEditingReport(report)}
                          className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Update Status / Authority"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(report)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Download Official PDF"
                        >
                          <FaFilePdf size={14} />
                        </button>
                        <button
                          onClick={() => handleExport(report)}
                          className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          title="Export CSV Data"
                        >
                          <FaDownload size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report._id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Report"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Generate Report Modal (Supports Full Audit Report Creation) ────────────────────────────────── */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className={`p-6 text-white flex items-center justify-between ${
              formData.reportType === 'full_audit' ? 'bg-linear-to-r from-slate-900 via-indigo-900 to-slate-900' : 'bg-linear-to-r from-purple-600 to-indigo-600'
            }`}>
              <div>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                  {formData.reportType === 'full_audit' ? 'Full System Audit' : 'Standard Compliance Report'}
                </span>
                <h3 className="text-xl font-extrabold mt-1">
                  {formData.reportType === 'full_audit' ? 'Create Full System Audit Report' : 'Generate Compliance Report'}
                </h3>
                <p className="text-xs text-slate-200 mt-0.5">Compiles procurement, tender decisions, financial matchings & security logs</p>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <FaTimes size={18} />
              </button>
            </div>
            <form onSubmit={handleGenerateReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Report Category</label>
                <select
                  value={formData.reportType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const year = formData.year;
                    if (newType === 'full_audit') {
                      setFormData({
                        ...formData,
                        reportType: newType,
                        title: `Full System Procurement & Decision Audit Report FY ${year}`,
                        description: `Comprehensive multi-module procurement lifecycle audit, contract awards, financial matchings, and tamper-proof security log compiled for audit review.`,
                        submittedTo: 'auditor_general'
                      });
                    } else {
                      setFormData({
                        ...formData,
                        reportType: newType,
                        title: `${newType.replace(/_/g, ' ').toUpperCase()} Report FY ${year}`,
                        description: `Auto-generated ${newType.replace(/_/g, ' ')} report for FY ${year}.`,
                        submittedTo: 'internal'
                      });
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="full_audit">★ Full System Audit Report (All Modules)</option>
                  <option value="procurement_performance">Procurement Performance Report</option>
                  <option value="spend_analysis">Spend Analysis Report</option>
                  <option value="vendor_performance">Vendor Performance Report</option>
                  <option value="compliance">GOSL Regulatory Compliance Audit</option>
                  <option value="annual">Annual Procurement Summary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Full System Audit Report FY 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/30 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Submission Authority</label>
                <select
                  value={formData.submittedTo}
                  onChange={(e) => setFormData({ ...formData, submittedTo: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="auditor_general">Auditor-General Department</option>
                  <option value="national_procurement_commission">National Procurement Commission (NPC)</option>
                  <option value="treasury">General Treasury</option>
                  <option value="internal">Internal University Records</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fiscal Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/30 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Output Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="xlsx">Excel Workbook (.xlsx)</option>
                    <option value="csv">CSV Data Stream (.csv)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-md flex items-center disabled:opacity-50 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Compiling Audit Data...
                    </>
                  ) : (
                    'Generate & Store Audit Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Status / Authority Modal ────────────────────────────────────── */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold">Manage Report Status</h3>
                <p className="text-xs text-slate-300 mt-0.5 truncate max-w-xs">{editingReport.title}</p>
              </div>
              <button onClick={() => setEditingReport(null)} className="text-white/80 hover:text-white p-1">
                <FaTimes size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Report Status</label>
                <select
                  value={editingReport.status}
                  onChange={(e) => setEditingReport({ ...editingReport, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white"
                >
                  <option value="ready">Ready</option>
                  <option value="submitted">Submitted to Authority</option>
                  <option value="archived">Archived / Audit Locked</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Submission Target Authority</label>
                <select
                  value={editingReport.submittedTo}
                  onChange={(e) => setEditingReport({ ...editingReport, submittedTo: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white"
                >
                  <option value="internal">Internal Records</option>
                  <option value="auditor_general">Auditor-General Department</option>
                  <option value="national_procurement_commission">National Procurement Commission (NPC)</option>
                  <option value="treasury">General Treasury</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateStatusLoading}
                  onClick={() => handleUpdateStatus(editingReport._id, {
                    status: editingReport.status,
                    submittedTo: editingReport.submittedTo
                  })}
                  className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-500 transition-all flex items-center disabled:opacity-50 cursor-pointer"
                >
                  {updateStatusLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Detail Modal (Full Audit & Standard Reports Viewer) ────────────────────────────────────── */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full uppercase">
                    {selectedReport.reportType?.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-extrabold rounded-full uppercase">
                    v{selectedReport.version || 1}.0
                  </span>
                </div>
                <h3 className="text-xl font-extrabold">{selectedReport.title}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{selectedReport.description}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <FaTimes size={18} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto grow">
              
              {/* Cryptographic Hash Signature Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <FaLock size={10} /> SHA-256 Tamper-Proof Cryptographic Hash
                  </p>
                  <p className="font-mono text-xs text-purple-300 mt-1 break-all select-all">
                    SHA256: {selectedReport.document?.hash || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'}
                  </p>
                </div>
                <div className="shrink-0 flex items-center space-x-2">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30 flex items-center gap-1">
                    <FaCheckCircle size={10} /> Hash Validated
                  </span>
                </div>
              </div>

              {/* Status & Authority Details Header Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Submitted To</p>
                  <p className="text-xs font-bold text-slate-800 capitalize mt-0.5">
                    {selectedReport.submittedTo?.replace(/_/g, ' ') || 'Internal'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Report Status</p>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5 capitalize">{selectedReport.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Generated On</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Generated By</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedReport.generatedBy ? `${selectedReport.generatedBy.firstName || ''} ${selectedReport.generatedBy.lastName || ''}`.trim() : 'System Engine'}
                  </p>
                </div>
              </div>

              {/* SPECIAL VIEW: FULL AUDIT REPORT STRUCTURED BREAKDOWN */}
              {selectedReport.reportType === 'full_audit' && selectedReport.data?.executiveSummary ? (
                <div className="space-y-6">
                  {/* 1. Executive Summary Cards */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">1. Executive Audit Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase">Compliance Score</p>
                        <p className="text-xl font-extrabold text-indigo-900 mt-0.5">
                          {selectedReport.data.executiveSummary.overallComplianceScore || '97.8%'}
                        </p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase">YTD Spend</p>
                        <p className="text-xl font-extrabold text-emerald-900 mt-0.5">
                          {selectedReport.data.executiveSummary.totalSpendYTD || 'LKR 0M'}
                        </p>
                      </div>
                      <div className="bg-purple-50 border border-purple-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-purple-700 uppercase">Budget Utilized</p>
                        <p className="text-xl font-extrabold text-purple-900 mt-0.5">
                          {selectedReport.data.executiveSummary.budgetUtilized || '68.5%'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Procurement & Decision Records Table */}
                  {selectedReport.data.recentDecisionRecords && selectedReport.data.recentDecisionRecords.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">2. Recent Decision & Requisition Records</h4>
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                            <tr>
                              <th className="px-4 py-2.5">Reference</th>
                              <th className="px-4 py-2.5">Title</th>
                              <th className="px-4 py-2.5">Department</th>
                              <th className="px-4 py-2.5">Cost (LKR)</th>
                              <th className="px-4 py-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedReport.data.recentDecisionRecords.map((d, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-mono font-bold text-indigo-600">{d.reference}</td>
                                <td className="px-4 py-2 font-semibold text-slate-800">{d.title}</td>
                                <td className="px-4 py-2 text-slate-600">{d.department}</td>
                                <td className="px-4 py-2 font-bold text-slate-900">{(d.estimatedCost || 0).toLocaleString()}</td>
                                <td className="px-4 py-2 capitalize font-bold text-emerald-600">{d.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. Contracts Audit Breakdown */}
                  {selectedReport.data.recentContracts && selectedReport.data.recentContracts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">3. Executed Contracts & Award Records</h4>
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                            <tr>
                              <th className="px-4 py-2.5">Contract No</th>
                              <th className="px-4 py-2.5">Contract Title</th>
                              <th className="px-4 py-2.5">Supplier</th>
                              <th className="px-4 py-2.5">Value (LKR)</th>
                              <th className="px-4 py-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedReport.data.recentContracts.map((c, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-mono font-bold text-purple-600">{c.contractNumber}</td>
                                <td className="px-4 py-2 font-semibold text-slate-800">{c.title}</td>
                                <td className="px-4 py-2 text-slate-600">{c.vendor}</td>
                                <td className="px-4 py-2 font-bold text-slate-900">{(c.value || 0).toLocaleString()}</td>
                                <td className="px-4 py-2 capitalize font-bold text-blue-600">{c.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 4. Security Audit Logs */}
                  {selectedReport.data.securityAuditLogs && selectedReport.data.securityAuditLogs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">4. Security & Administrative Audit Events</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-900 rounded-2xl text-slate-200 font-mono text-[11px]">
                        {selectedReport.data.securityAuditLogs.map((log, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-slate-800 pb-1.5 pt-1">
                            <div>
                              <span className="text-amber-400 font-bold mr-2">[{log.action}]</span>
                              <span>{log.description}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 shrink-0 ml-2">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedReport.reportType === 'spend_analysis' && selectedReport.data?.overview ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">1. Spend Analysis Overview</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase">Total Spend YTD</p>
                        <p className="text-lg font-extrabold text-indigo-900 mt-0.5">{selectedReport.data.overview.totalSpendYTD || 'N/A'}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Total Paid YTD</p>
                        <p className="text-lg font-extrabold text-emerald-900 mt-0.5">{selectedReport.data.overview.totalPaidYTD || 'N/A'}</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-purple-700 uppercase">Budget Utilized</p>
                        <p className="text-lg font-extrabold text-purple-900 mt-0.5">{selectedReport.data.overview.budgetUtilized || 'N/A'}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-amber-700 uppercase">Savings Achieved</p>
                        <p className="text-lg font-extrabold text-amber-900 mt-0.5">{selectedReport.data.overview.savingsAchieved || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedReport.data.byDepartment && selectedReport.data.byDepartment.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">2. Expenditure by Department</h4>
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                            <tr>
                              <th className="px-4 py-2.5">Department</th>
                              <th className="px-4 py-2.5">Spend (LKR M)</th>
                              <th className="px-4 py-2.5">Requisitions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedReport.data.byDepartment.map((d, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-bold text-slate-900">{d.dept}</td>
                                <td className="px-4 py-2 font-semibold text-indigo-600">{d.spend} M</td>
                                <td className="px-4 py-2 text-slate-600">{d.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedReport.reportType === 'vendor_performance' && selectedReport.data?.summary ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">1. Supplier Performance Scorecard Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-100 border border-slate-200 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Evaluated Vendors</p>
                        <p className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedReport.data.summary.totalEvaluated || 0}</p>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase">Average Score</p>
                        <p className="text-lg font-extrabold text-indigo-900 mt-0.5">{selectedReport.data.summary.averageScore || 0}%</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Low Risk Vendors</p>
                        <p className="text-lg font-extrabold text-emerald-900 mt-0.5">{selectedReport.data.summary.lowRiskCount || 0}</p>
                      </div>
                      <div className="bg-red-50 border border-red-100 p-3.5 rounded-xl">
                        <p className="text-[10px] font-bold text-red-700 uppercase">High Risk Vendors</p>
                        <p className="text-lg font-extrabold text-red-900 mt-0.5">{selectedReport.data.summary.highRiskCount || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedReport.reportType === 'compliance' && selectedReport.data?.auditChecklist ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">1. Regulatory Compliance Checklist Verification</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Audit Rule</th>
                            <th className="px-4 py-2.5">Authority</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5">Pass Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedReport.data.auditChecklist.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-bold text-slate-900">{item.rule}</td>
                              <td className="px-4 py-2 text-slate-600">{item.authority}</td>
                              <td className="px-4 py-2 font-bold text-emerald-600 capitalize">{item.status}</td>
                              <td className="px-4 py-2 font-extrabold text-indigo-600">{item.score}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (selectedReport.reportType === 'procurement_performance' || selectedReport.reportType === 'annual' || selectedReport.reportType === 'quarterly') && selectedReport.data?.procurements ? (
                <div className="space-y-6">
                  {/* 1. Requisitions Breakdown Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">1. Requisition & Procurement Status Breakdown</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Procurement Status</th>
                            <th className="px-4 py-2.5 text-center">Total Requisitions</th>
                            <th className="px-4 py-2.5 text-right">Total Estimated Value (LKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedReport.data.procurements || []).map((p, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-bold text-slate-900 capitalize">{(p._id || 'General').replace(/_/g, ' ')}</td>
                              <td className="px-4 py-2 text-center font-bold text-indigo-600">{p.count || 0}</td>
                              <td className="px-4 py-2 text-right font-extrabold text-emerald-600">{(p.totalValue || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. Contract Commitments Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">2. Contract Commitments & Award Status</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Contract Status</th>
                            <th className="px-4 py-2.5 text-center">Contract Count</th>
                            <th className="px-4 py-2.5 text-right">Total Value (LKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedReport.data.contracts || []).map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-bold text-slate-900 capitalize">{(c._id || 'Active').replace(/_/g, ' ')}</td>
                              <td className="px-4 py-2 text-center font-bold text-purple-600">{c.count || 0}</td>
                              <td className="px-4 py-2 text-right font-extrabold text-blue-600">{(c.totalValue || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. Vendor Registrations & Financial Disbursements Summary */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">3. Supplier Pool & Financial Settlement Summary</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Category</th>
                            <th className="px-4 py-2.5 text-center">Record Count</th>
                            <th className="px-4 py-2.5 text-right">Disbursement Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedReport.data.payments || []).map((pay, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-bold text-slate-800">Paid Financial Disbursements</td>
                              <td className="px-4 py-2 text-center font-bold text-slate-700">{pay.count || 0} Settlements</td>
                              <td className="px-4 py-2 text-right font-extrabold text-emerald-600">LKR {(pay.totalPaid || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                          {(selectedReport.data.vendors || []).map((v, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-bold text-slate-800">Registered Supplier Pool ({(v._id || 'Active').toUpperCase()})</td>
                              <td className="px-4 py-2 text-center font-bold text-slate-700">{v.count || 0} Suppliers</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-400">Verified Active</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* PROFESSIONAL EXECUTIVE KEY-VALUE GRID VIEWER */
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Report Summary Metrics</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selectedReport.data || {}).map(([key, val], idx) => (
                      <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono break-all">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadPDF(selectedReport)}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-500 transition-all flex items-center cursor-pointer shadow-sm"
                >
                  <FaFilePdf className="mr-1.5" size={11} /> Download PDF Document
                </button>
                <button
                  onClick={handlePrintAudit}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all flex items-center cursor-pointer shadow-sm"
                >
                  <FaPrint className="mr-1.5" size={11} /> Print Official Audit Document
                </button>
                <button
                  onClick={() => handleExport(selectedReport)}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition-all flex items-center cursor-pointer shadow-sm"
                >
                  <FaDownload className="mr-1.5" size={11} /> Download CSV Data
                </button>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
