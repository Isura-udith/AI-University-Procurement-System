import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaEdit, FaPrint, FaClock, FaCheckCircle, FaRobot, FaShieldAlt, FaTrash, FaPaperPlane, FaSpinner, FaBullhorn, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import WorkflowTracker from '../../../components/WorkflowTracker';
import StatusBadge from '../../../components/StatusBadge';
import ConfirmModal from '../../../components/ConfirmModal';
import procurementService from '../../../services/procurement.service';



export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const userRole = user?.role || 'department_user';
  const canPublish = ['procurement_officer', 'admin', 'super_admin'].includes(userRole);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);
  const [publishModal, setPublishModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await procurementService.getById(id);
        setData(res.data || null);
      } catch {
        setData(null);
        toast.error('Failed to load procurement request');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    try { await procurementService.delete(id); } catch { toast.error('Failed to delete'); }
    toast.success('Procurement request deleted.');
    setDeleteModal(false);
    navigate('/procurements');
  };

  const handleSubmitForApproval = async () => {
    try {
      await procurementService.submit(id);
      // Re-fetch the procurement to get the updated approval chain from backend
      const res = await procurementService.getById(id);
      setData(res.data || res);
      toast.success('📝 Request submitted for multi-level approval (HOD → Dean → Bursar → Finance Committee → VC).');
    } catch (err) {
      const errMsg = err?.message || err?.error || 'Submission failed';
      toast.error(`❌ ${errMsg}`);
    }
    setSubmitModal(false);
  };

  const handlePrint = () => {
    window.print();
    toast.info('Print dialog opened.');
  };

  const handlePublishToSuppliers = async () => {
    try {
      await procurementService.publish(id);
      const res = await procurementService.getById(id);
      setData(res.data || res);
      toast.success('🚀 Procurement published to suppliers! It is now visible on the public portal.');
    } catch (err) {
      const errMsg = err?.message || err?.error || 'Publishing failed';
      toast.error(`❌ ${errMsg}`);
    }
    setPublishModal(false);
  };

  const getMappedApprovals = (procurement) => {
    if (!procurement) return [];
    if (procurement.approvals) return procurement.approvals;
    return (procurement.approvalChain || []).map(a => {
      let roleLabel = 'Approver';
      if (a.stage === 'hod') roleLabel = `HOD - ${procurement.department || procurement.faculty || ''}`;
      else if (a.stage === 'dean') roleLabel = `Dean - ${procurement.faculty || ''}`;
      else if (a.stage === 'pmd') roleLabel = 'Procurement Officer (PMD)';
      else if (a.stage === 'bursar') roleLabel = 'Bursar';
      else if (a.stage === 'finance_committee') roleLabel = 'Finance Committee';
      else if (a.stage === 'vice_chancellor') roleLabel = 'Vice-Chancellor';

      const approverName = a.approver
        ? `${a.approver.firstName} ${a.approver.lastName}`
        : (a.stage === 'hod' ? 'Head of Department' : a.stage === 'dean' ? 'Faculty Dean' : a.stage === 'pmd' ? 'Procurement Officer (PMD)' : a.stage === 'bursar' ? 'Bursar' : a.stage === 'finance_committee' ? 'Finance Committee' : a.stage === 'vice_chancellor' ? 'Vice-Chancellor' : 'Approver');

      return {
        role: roleLabel,
        name: approverName,
        status: a.status,
        date: a.actionDate ? new Date(a.actionDate).toISOString().split('T')[0] : null,
        comments: a.comments
      };
    });
  };

  const getMappedAiInsights = (procurement) => {
    if (!procurement) return [];
    if (procurement.aiInsights) return procurement.aiInsights;
    
    const insights = [];
    const analysis = procurement.aiAnalysis;
    if (analysis) {
      if (analysis.anomalyFlags && analysis.anomalyFlags.length > 0) {
        analysis.anomalyFlags.forEach(a => insights.push(`⚠️ Anomaly: ${a.description}`));
      } else {
        insights.push('✓ Specifications are generic — no brand names detected.');
      }
      
      if (analysis.budgetGuardResult) {
        insights.push(`${analysis.budgetGuardResult.passed ? '✓' : '⚠️'} Budget Guard: ${analysis.budgetGuardResult.message}`);
      }

      if (analysis.riskLevel) {
        insights.push(`Risk Level: ${analysis.riskLevel} (${analysis.riskScore || 0}% risk score)`);
      }
      
      if (analysis.recommendedMethod) {
        insights.push(`Recommended Method: ${analysis.recommendedMethod}`);
      }
    }
    
    if (insights.length === 0) {
      insights.push('AI Analysis is pending or has not run on this requisition.');
    }
    return insights;
  };

  const mappedApprovals = getMappedApprovals(data);
  const mappedAiInsights = getMappedAiInsights(data);
  const boqList = data?.items && data.items.length > 0 ? data.items : (data?.boq || []);
  const baseAmt = data?.items ? data.items.reduce((s, it) => s + (it.estimatedTotalPrice || (it.quantity * it.estimatedUnitPrice)), 0) : (data?.baseAmount || 0);

  if (loading) return <div className="flex items-center justify-center py-24"><FaSpinner className="animate-spin text-emerald-600 mr-2" size={20} /><span className="text-slate-500">Loading...</span></div>;
  if (!data) return <div className="text-center py-24 text-slate-400">Request not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/procurements" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600 mb-2 transition-colors">
            <FaArrowLeft className="mr-1.5" size={11} /> Back to Procurements
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{data.title}</h1>
          <div className="flex items-center flex-wrap gap-3 mt-2">
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{data.referenceNumber || data.id}</span>
            <StatusBadge status={data.status} />
            <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold">{(data.procurementMethod || data.method || '').split(' - ')[0]}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(data.status === 'draft' || data.status === 'rejected') && (
            <button onClick={() => setSubmitModal(true)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 transition-colors flex items-center space-x-1.5 shadow-sm"><FaPaperPlane size={10} /><span>{data.status === 'rejected' ? 'Re-Submit' : 'Submit'}</span></button>
          )}
          {canPublish && ['pmd_review', 'budget_locked'].includes(data.status) && (
            <button onClick={() => setPublishModal(true)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors flex items-center space-x-1.5 shadow-sm"><FaBullhorn size={10} /><span>Publish to Suppliers</span></button>
          )}
          <button onClick={() => navigate(`/procurements/${id}/edit`)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"><FaEdit size={11} /><span>Edit</span></button>
          <button onClick={handlePrint} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center space-x-1.5"><FaPrint size={11} /><span>Print</span></button>
          {data.status === 'draft' && (
            <button onClick={() => setDeleteModal(true)} className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center space-x-1.5"><FaTrash size={10} /><span>Delete</span></button>
          )}
        </div>
      </div>

      {/* Workflow Tracker */}
      <WorkflowTracker currentStage={data.stage || data.currentStage || 1} compact />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identification */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Identification & Context</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Faculty / Department', value: data.faculty },
                { label: 'Requisitioning Officer', value: data.requestedBy ? `${data.requestedBy.firstName} ${data.requestedBy.lastName}` : (data.officer || 'Officer') },
                { label: 'Employee ID', value: data.requestedBy?.employeeId || data.empId || 'N/A' },
                { label: 'DAPP Linkage', value: data.dappReference || data.dappRef || 'N/A' },
                { label: 'MPP Reference', value: data.mppReference || data.mppRef || 'N/A' },
                { label: 'Funding Source', value: data.fundingSource || 'N/A' },
                { label: 'Category', value: data.category },
                { label: 'Method', value: data.procurementMethod || data.method },
                { label: 'Committee', value: data.assignedCommittee || data.committee },
                { label: 'Priority', value: data.priority },
              ].map((f, i) => (
                <div key={i}>
                  <p className="text-xs text-slate-500 font-medium">{f.label}</p>
                  <p className="text-sm text-slate-800 font-medium mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Financial */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Total Cost Estimate (TCE)</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Base Amount', value: baseAmt },
                  { label: 'Provisional Sums', value: data.provisionalSums || 0 },
                  { label: 'Contingencies', value: data.contingencies || 0 },
                  { label: 'VAT (18%)', value: data.vatAmount || data.vat || 0 },
                ].map((f, i) => (
                  <div key={i}>
                    <p className="text-xs text-slate-500">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-800">LKR {f.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-3">
                <span className="text-sm font-bold text-slate-700">Total Cost Estimate</span>
                <span className="text-xl font-bold text-emerald-700">LKR {(data.totalEstimatedCost || data.tce || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Tech Specs & BOQ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Technical Description</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed mb-6">{data.description || data.techDescription}</p>
              <h4 className="text-sm font-bold text-slate-700 mb-3">Bill of Quantities</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-2.5 font-semibold text-slate-600">#</th>
                      <th className="px-4 py-2.5 font-semibold text-slate-600">Description</th>
                      <th className="px-4 py-2.5 font-semibold text-slate-600">Unit</th>
                      <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Qty</th>
                      <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boqList.map((r, i) => {
                      const qty = r.quantity !== undefined ? r.quantity : r.qty;
                      const unitPrice = r.estimatedUnitPrice !== undefined ? r.estimatedUnitPrice : r.unitPrice;
                      const totalVal = r.estimatedTotalPrice !== undefined ? r.estimatedTotalPrice : r.amount;
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2.5 text-slate-700">{r.description || r.desc}</td>
                          <td className="px-4 py-2.5 text-slate-500">{r.unit}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{qty}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{(unitPrice || 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-800">{(totalVal || (qty * unitPrice) || 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={5} className="px-4 py-2.5 text-right font-bold text-slate-700">BOQ Total</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                        {boqList.reduce((s, r) => s + (r.estimatedTotalPrice || r.amount || ((r.quantity || r.qty) * (r.estimatedUnitPrice || r.unitPrice)) || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Procurement Time Schedule</h3>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Created', value: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : data.dates?.created },
                { label: 'Expected Invitation', value: data.invitationDate ? new Date(data.invitationDate).toISOString().split('T')[0] : data.dates?.invitation },
                { label: 'Bid Closing', value: data.bidClosingDate ? new Date(data.bidClosingDate).toISOString().split('T')[0] : (data.dates?.closing ? data.dates.closing.split('T')[0] : '') },
                { label: 'Delivery Date', value: data.deliveryDate ? new Date(data.deliveryDate).toISOString().split('T')[0] : data.dates?.delivery },
              ].map((d, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <FaClock className="text-slate-400 mt-0.5 shrink-0" size={12} />
                  <div>
                    <p className="text-xs text-slate-500">{d.label}</p>
                    <p className="text-sm font-medium text-slate-800">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">

          {/* ── Budget Compliance Card (Step 27) ─────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`px-5 py-3.5 border-b flex items-center space-x-2 ${
              data.status === 'flagged_special_approval' ? 'bg-amber-50 border-amber-200'
              : data.budgetComplianceCheck?.passed ? 'bg-emerald-50 border-emerald-200'
              : data.budgetComplianceCheck ? 'bg-red-50 border-red-200'
              : 'bg-slate-50 border-slate-200'
            }`}>
              <FaShieldAlt className={
                data.status === 'flagged_special_approval' ? 'text-amber-600'
                : data.budgetComplianceCheck?.passed ? 'text-emerald-600'
                : data.budgetComplianceCheck ? 'text-red-500'
                : 'text-slate-400'
              } size={13} />
              <h3 className="text-sm font-bold text-slate-800">Step 27: Budget Compliance</h3>
            </div>
            <div className="p-5 space-y-3">
              {data.budgetComplianceCheck ? (
                <>
                  {/* Special Approval Banner */}
                  {data.status === 'flagged_special_approval' && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5">
                      <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" size={12} />
                      <div>
                        <p className="text-xs font-bold text-amber-800">⚠ Flagged — Special Approval Required</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Exceeds budget by {data.budgetComplianceCheck.overBudgetPercent}% — within 10% grace threshold.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* All clear banner */}
                  {data.budgetComplianceCheck.passed && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <FaCheckCircle className="text-emerald-500" size={11} />
                      <p className="text-xs font-bold text-emerald-800">All compliance checks passed</p>
                    </div>
                  )}

                  {/* DAPP Check */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Annual Plan (DAPP)</span>
                    <span className={`font-semibold flex items-center gap-1 ${data.budgetComplianceCheck.annualPlanPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                      {data.budgetComplianceCheck.annualPlanPassed
                        ? <><FaCheckCircle size={9} /> {data.budgetComplianceCheck.annualPlanRef || 'Approved'}</>
                        : <><FaTimesCircle size={9} />
                            {data.budgetComplianceCheck.failureReason === 'no_annual_plan_linked' ? ' Not Linked'
                            : data.budgetComplianceCheck.failureReason === 'plan_not_approved' ? ` Not Approved`
                            : ' Item Not Found'}
                          </>
                      }
                    </span>
                  </div>

                  {/* DAPP Item Description */}
                  {data.budgetComplianceCheck.annualItemDesc && (
                    <p className="text-[10px] text-slate-400 pl-1 italic">{data.budgetComplianceCheck.annualItemDesc}</p>
                  )}

                  {/* Budget Check */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Dept. Budget</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      data.budgetComplianceCheck.budgetPassed ? 'text-emerald-700'
                      : data.budgetComplianceCheck.requiresSpecialApproval ? 'text-amber-700'
                      : 'text-red-700'
                    }`}>
                      {data.budgetComplianceCheck.budgetPassed
                        ? <><FaCheckCircle size={9} /> Sufficient</>
                        : data.budgetComplianceCheck.failureReason === 'no_budget_allocated'
                          ? <><FaTimesCircle size={9} /> No Allocation</>
                          : <><FaExclamationTriangle size={9} /> Insufficient</>
                      }
                    </span>
                  </div>

                  {/* Budget Waterfall */}
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Remaining Budget</span>
                      <span className="font-mono font-semibold">LKR {(data.budgetComplianceCheck.remainingBudget || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Required (TCE)</span>
                      <span className="font-mono font-semibold text-slate-800">LKR {(data.budgetComplianceCheck.requiredBudget || 0).toLocaleString()}</span>
                    </div>
                    {data.budgetComplianceCheck.overBudgetPercent > 0 && (
                      <div className="flex justify-between text-amber-700 border-t border-slate-200 pt-1 mt-1">
                        <span>Over Budget By</span>
                        <span className="font-semibold">{data.budgetComplianceCheck.overBudgetPercent}%</span>
                      </div>
                    )}
                  </div>

                  {/* Check timestamp */}
                  {data.budgetComplianceCheck.checkedAt && (
                    <p className="text-[10px] text-slate-400">
                      Checked: {new Date(data.budgetComplianceCheck.checkedAt).toLocaleString()}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <FaExclamationTriangle size={10} className="text-slate-300" />
                  Compliance check will run automatically when the requisition is submitted.
                </div>
              )}
            </div>
          </div>

          {/* Approval Chain */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
              <FaCheckCircle className="text-emerald-600" size={14} />
              <h3 className="text-sm font-bold text-slate-800">Approval Chain</h3>
            </div>
            <div className="p-5 space-y-3">
              {mappedApprovals.map((a, i) => (
                <div key={i} className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  a.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    a.status === 'approved' ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {a.status === 'approved' ? <FaCheckCircle size={11} /> : i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{a.role}</p>
                    <p className="text-[10px] text-slate-500">{a.name}</p>
                    {a.date && <p className="text-[10px] text-emerald-600">{a.date}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
              <FaRobot className="text-emerald-600" size={14} />
              <h3 className="text-sm font-bold text-slate-800">AI Insights</h3>
            </div>
            <div className="p-5 space-y-3">
              {mappedAiInsights.map((insight, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <FaCheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={10} />
                  <p className="text-xs text-slate-600 leading-relaxed">{insight}</p>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Launch AI Tools</p>
                <Link to="/ai/market-price" className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg px-2 py-1.5 transition-colors">
                  <FaRobot size={10} /><span>Market Price Intelligence</span>
                </Link>
                <Link to={`/ai/risk-assessment/${data._id || id}`} className="flex items-center space-x-2 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg px-2 py-1.5 transition-colors">
                  <FaShieldAlt size={10} /><span>Run Risk Assessment</span>
                </Link>
                <Link to={`/ai/historical-match/${data._id || id}`} className="flex items-center space-x-2 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg px-2 py-1.5 transition-colors">
                  <FaRobot size={10} /><span>Historical Match Analysis</span>
                </Link>
                <Link to="/ai" className="flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors">
                  <FaRobot size={10} /><span>AI Intelligence Hub →</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <div className="flex items-center space-x-2 mb-3">
              <FaShieldAlt className="text-emerald-600" size={14} />
              <p className="text-sm font-bold text-slate-700">Compliance Status</p>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <p>✓ Conflict of Interest declared</p>
              <p>✓ Ethics & Integrity affirmed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal isOpen={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={handleDelete} title="Delete Request" message={`Delete "${data.title}"? This cannot be undone.`} confirmText="Delete" variant="danger" />
      <ConfirmModal isOpen={submitModal} onClose={() => setSubmitModal(false)} onConfirm={handleSubmitForApproval} title="Submit for Approval" confirmText="Submit" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{data.status === 'rejected' ? 'Re-submit' : 'Submit'} <span className="font-bold">"{data.title}"</span> for multi-level approval?</p>
          {data.status === 'rejected' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700">⚠ This requisition was previously rejected. The approval chain will be reset and it will go through HOD → Dean → Bursar → Finance Committee → VC again.</p>
            </div>
          )}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">TCE</span><span className="font-bold">LKR {(data.totalEstimatedCost || data.tce || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Approval Chain</span><span className="font-medium">HOD → Dean → Bursar → Finance Com. → VC</span></div>
          </div>
        </div>
      </ConfirmModal>
      <ConfirmModal isOpen={publishModal} onClose={() => setPublishModal(false)} onConfirm={handlePublishToSuppliers} title="Publish to Suppliers" confirmText="Publish Now" variant="success">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Publish <span className="font-bold">"{data.title}"</span> to the supplier portal?</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-medium">{data.referenceNumber || data.id}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">TCE</span><span className="font-bold">LKR {(data.totalEstimatedCost || data.tce || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium">{data.category}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="font-medium">{data.procurementMethod || data.method}</span></div>
          </div>
          <p className="text-xs text-slate-400">This will make the procurement visible to all registered suppliers and on the public portal.</p>
        </div>
      </ConfirmModal>
    </div>
  );
}
