/**
 * Dynamic Email Template Engine
 * Mobile-optimized HTML templates for procurement workflow notifications.
 * Ingests JSON metadata (Contractor Name, Bid Value, Vote Code, etc.)
 */

const baseLayout = (content, footerText = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;background:#f1f5f9;color:#1e293b}
  .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07)}
  .header{background:linear-gradient(135deg,#059669,#0d9488);padding:28px 32px;text-align:center}
  .header h1{color:#fff;font-size:18px;margin:0;letter-spacing:.3px}
  .header .subtitle{color:rgba(255,255,255,.85);font-size:12px;margin-top:4px}
  .body{padding:32px}
  .body h2{font-size:16px;color:#0f172a;margin:0 0 16px}
  .body p{font-size:14px;line-height:1.7;color:#475569;margin:0 0 12px}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
  .badge-info{background:#dbeafe;color:#1d4ed8}.badge-success{background:#dcfce7;color:#15803d}
  .badge-warning{background:#fef3c7;color:#b45309}.badge-urgent{background:#fee2e2;color:#dc2626}
  .meta-table{width:100%;border-collapse:collapse;margin:16px 0}
  .meta-table td{padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9}
  .meta-table td:first-child{font-weight:600;color:#64748b;width:40%}
  .cta{display:inline-block;padding:12px 28px;background:#059669;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin:16px 0}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
  .footer p{font-size:11px;color:#94a3b8;margin:0}
</style>
</head>
<body>
<div style="padding:20px">
<div class="container">
  <div class="header">
    <h1>UWU Smart Procurement System</h1>
    <div class="subtitle">Uva Wellassa University — GOSL Compliant e-Procurement</div>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>${footerText || 'This is an automated notification from the UWU Smart Procurement System.'}</p>
    <p style="margin-top:6px">© ${new Date().getFullYear()} Uva Wellassa University. All rights reserved.</p>
  </div>
</div>
</div>
</body>
</html>`;

const severityBadge = (severity) => {
  const map = { info: 'badge-info', success: 'badge-success', warning: 'badge-warning', error: 'badge-urgent', urgent: 'badge-urgent' };
  return map[severity] || 'badge-info';
};

const metaTable = (pairs) => {
  if (!pairs || pairs.length === 0) return '';
  const rows = pairs.filter(([, v]) => v != null).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  return `<table class="meta-table">${rows}</table>`;
};

// ─── Template Definitions ──────────────────────────────────────
const templates = {
  // Stage 1
  requisition_submitted: (data) => baseLayout(`
    <h2>New Requisition Pending Departmental Approval</h2>
    <p>A new procurement requisition has been submitted and requires your review.</p>
    ${metaTable([['Reference', data.referenceNumber], ['Title', data.title], ['Category', data.category], ['Estimated Cost', `LKR ${Number(data.totalCost || 0).toLocaleString()}`], ['Department', data.department], ['Requested By', data.requestedBy], ['Submitted', new Date(data.submittedAt || Date.now()).toLocaleDateString()]])}
    <a href="${data.link}" class="cta">Review Requisition →</a>
  `),

  requisition_confirmed: (data) => baseLayout(`
    <h2>Requisition Successfully Submitted</h2>
    <p>Your procurement requisition has been submitted for review.</p>
    ${metaTable([['Reference', data.referenceNumber], ['Title', data.title], ['Status', 'Submitted for HOD Approval']])}
    <a href="${data.link}" class="cta">Track Status →</a>
  `),

  // Stage 2
  hod_approved: (data) => baseLayout(`
    <h2>Requisition Cleared by HOD — Awaiting Faculty Approval</h2>
    <p>The Head of Department has reviewed and granted departmental clearance.</p>
    ${metaTable([['Reference', data.referenceNumber], ['Title', data.title], ['HOD', data.approverName], ['Comments', data.comments || 'None']])}
    <a href="${data.link}" class="cta">Review Requisition →</a>
  `),

  // Stage 3
  dean_approved: (data) => baseLayout(`
    <h2>Approved Faculty Requisition — Awaiting Budgetary Verification</h2>
    <p>The Faculty Dean has applied a legally binding digital signature to this requisition.</p>
    ${metaTable([['Reference', data.referenceNumber], ['Dean', data.approverName], ['Budget Code', data.budgetCode || 'Pending'], ['Estimated Cost', `LKR ${Number(data.totalCost || 0).toLocaleString()}`]])}
    <a href="${data.link}" class="cta">Begin Budget Verification →</a>
  `),

  // Stage 4
  budget_locked: (data) => baseLayout(`
    <h2>Budget Verified and Locked — Ready for Bidding Preparation</h2>
    <p><span class="badge badge-success">URGENT</span></p>
    <p>Funds have been committed in the central ERP. The requisition is cleared for bidding document preparation.</p>
    ${metaTable([['Reference', data.referenceNumber], ['Vote Code', data.budgetCode], ['Locked Amount', `LKR ${Number(data.totalCost || 0).toLocaleString()}`], ['Locked By', data.approverName]])}
    <a href="${data.link}" class="cta">Prepare Bidding Documents →</a>
  `),

  // Stage 5
  tec_review_required: (data) => baseLayout(`
    <h2>Draft Bidding Documents Ready for Technical Review</h2>
    <p>You have been invited to review the Standard Procurement Document (SPD) for the following tender.</p>
    ${metaTable([['Tender', data.tenderNumber], ['Method', data.procurementMethod], ['Category', data.category]])}
    <a href="${data.link}" class="cta">Open TEC Workspace →</a>
  `),

  // Stage 6
  tender_published: (data) => baseLayout(`
    <h2>New Sourcing Opportunity Published</h2>
    <p>Uva Wellassa University has published a new tender opportunity matching your profile.</p>
    ${metaTable([['Tender No.', data.tenderNumber], ['Title', data.title], ['Category', data.category], ['Method', data.procurementMethod], ['Deadline', data.deadline]])}
    <a href="${data.link}" class="cta">View Tender Details →</a>
  `, 'You are receiving this because your UNSPSC profile matches this opportunity.'),

  // Stage 7
  bid_submission_confirmed: (data) => baseLayout(`
    <h2>Bid Submission Confirmed</h2>
    <p>Your bid has been encrypted and securely locked in the Digital Bid Box.</p>
    ${metaTable([['Tender', data.tenderNumber], ['Submission Hash', `<code>${data.submissionHash || 'N/A'}</code>`], ['Timestamp', new Date().toISOString()]])}
    <p style="font-size:12px;color:#94a3b8">Retain this hash as proof of submission integrity.</p>
  `),

  // Stage 8
  bid_opening_complete: (data) => baseLayout(`
    <h2>Bid Opening Completed — Technical Evaluation Active</h2>
    <p>The Bid Opening Committee has completed the decryption sequence. Your evaluation workspace is now active.</p>
    ${metaTable([['Tender', data.tenderNumber], ['Total Bids', data.totalBids], ['Opening Date', data.openingDate]])}
    <a href="${data.link}" class="cta">Open Evaluation Workspace →</a>
  `),

  // Stage 9
  technical_accepted: (data) => baseLayout(`
    <h2>Technical Proposal Accepted</h2>
    <p><span class="badge badge-success">QUALIFIED</span></p>
    <p>Your technical proposal has met the 70-point minimum threshold. Financial opening is scheduled.</p>
    ${metaTable([['Tender', data.tenderNumber], ['Financial Opening', data.financialOpeningDate || 'TBD']])}
  `),

  technical_rejected: (data) => baseLayout(`
    <h2>Technical Proposal Non-Responsive</h2>
    <p><span class="badge badge-warning">NON-RESPONSIVE</span></p>
    <p>Your technical proposal did not meet the minimum qualification threshold. Your financial bid will be returned unopened.</p>
    ${metaTable([['Tender', data.tenderNumber]])}
  `),

  // Stage 10
  intention_to_award: (data) => baseLayout(`
    <h2>Intention to Award — Standstill Period Notice</h2>
    <p>This is a legally mandatory notification regarding the Intention to Award determination.</p>
    ${metaTable([['Tender', data.tenderNumber], ['Selected Bidder', data.selectedBidder || 'See attached BER'], ['Standstill Period', `${data.standstillDays || 10} working days`], ['Standstill Ends', data.standstillEndDate]])}
    <p>You may request a debriefing within 3 working days of this notice.</p>
    <a href="${data.link}" class="cta">View Award Details →</a>
  `),

  // Stage 11
  debriefing_requested: (data) => baseLayout(`
    <h2>⚠️ Debriefing Requested — Action Required</h2>
    <p><span class="badge badge-warning">ACTION REQUIRED WITHIN 3 WORKING DAYS</span></p>
    ${metaTable([['Tender', data.tenderNumber], ['Requested By', data.bidderName], ['Request Date', data.requestDate]])}
    <a href="${data.link}" class="cta">Schedule Debriefing →</a>
  `),

  appeal_filed: (data) => baseLayout(`
    <h2>🚨 Formal Appeal Filed — Contract Execution Locked</h2>
    <p><span class="badge badge-urgent">HIGH PRIORITY</span></p>
    <p>Contract execution is locked pending PAC review.</p>
    ${metaTable([['Tender', data.tenderNumber], ['Appellant', data.bidderName], ['Filed Date', data.filedDate]])}
    <a href="${data.link}" class="cta">Review Appeal →</a>
  `),

  // Stage 12
  contract_awarded: (data) => baseLayout(`
    <h2>Contract Awarded — Letter of Acceptance</h2>
    <p>Congratulations! Please upload your Performance Security within 14 days and sign the Contract Agreement.</p>
    ${metaTable([['Contract No.', data.contractNumber], ['Tender', data.tenderNumber], ['Value', `LKR ${Number(data.contractValue || 0).toLocaleString()}`], ['Deadline', '14 days from receipt']])}
    <a href="${data.link}" class="cta">Upload Performance Security →</a>
  `),

  contract_active: (data) => baseLayout(`
    <h2>Contract Active — Delivery Expected</h2>
    <p>A new contract is active and delivery is expected at UWU Stores.</p>
    ${metaTable([['Contract No.', data.contractNumber], ['Supplier', data.supplierName], ['Expected Delivery', data.deliveryDate]])}
    <a href="${data.link}" class="cta">View Contract →</a>
  `),

  // Stage 13
  three_way_match: (data) => baseLayout(`
    <h2>3-Way Match Reconciled Successfully</h2>
    <p><span class="badge badge-success">RECONCILED</span></p>
    <p>The Purchase Order, Goods Receipt Note, and Supplier Invoice have been matched. Ready for payment release.</p>
    ${metaTable([['PO No.', data.poNumber], ['GRN No.', data.grnNumber], ['Invoice No.', data.invoiceNumber], ['Amount', `LKR ${Number(data.amount || 0).toLocaleString()}`]])}
    <a href="${data.link}" class="cta">Initiate Payment →</a>
  `),

  goods_accepted: (data) => baseLayout(`
    <h2>Goods Accepted — Payment Voucher Initialized</h2>
    <p>Your delivered goods have been accepted by the Acceptance Committee. Payment processing has begun.</p>
    ${metaTable([['PO No.', data.poNumber], ['GRN No.', data.grnNumber]])}
  `),

  // SLA Escalation
  sla_warning: (data) => baseLayout(`
    <h2>⏰ Pending Task Reminder</h2>
    <p>The following approval has been pending for over ${data.hoursElapsed || 48} hours.</p>
    ${metaTable([['Reference', data.referenceNumber], ['Stage', data.stage], ['Assigned To', data.assigneeName], ['Pending Since', data.pendingSince]])}
    <a href="${data.link}" class="cta">Take Action →</a>
  `),

  sla_escalation: (data) => baseLayout(`
    <h2>🚨 SLA Escalation — Approval Overdue</h2>
    <p><span class="badge badge-urgent">ESCALATED</span></p>
    <p>The ${data.stage} approval has exceeded the ${data.hoursElapsed || 72}-hour threshold and has been escalated.</p>
    ${metaTable([['Reference', data.referenceNumber], ['Original Approver', data.assigneeName], ['Escalated To', data.escalatedTo || 'You']])}
    <a href="${data.link}" class="cta">Review & Act →</a>
  `),

  // Daily Digest
  daily_digest: (data) => baseLayout(`
    <h2>📋 Daily Procurement Digest</h2>
    <p>Here is your summary for ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}:</p>
    ${(data.items || []).map(item => `<div style="padding:10px 12px;border-left:3px solid ${item.color || '#059669'};background:#f8fafc;margin:8px 0;border-radius:4px">
      <p style="font-size:13px;font-weight:600;margin:0">${item.title}</p>
      <p style="font-size:12px;color:#64748b;margin:4px 0 0">${item.message}</p>
    </div>`).join('')}
    <a href="${data.dashboardLink || '#'}" class="cta">Open Dashboard →</a>
  `),

  // Generic fallback
  default: (data) => baseLayout(`
    <h2>${data.title || 'Notification'}</h2>
    <p>${data.message || ''}</p>
    ${data.link ? `<a href="${data.link}" class="cta">View Details →</a>` : ''}
  `),
};

/**
 * Render an email template by notification type.
 * @param {string} type - Notification type
 * @param {object} data - Dynamic metadata
 * @returns {string} Rendered HTML
 */
const renderTemplate = (type, data = {}) => {
  const templateFn = templates[type] || templates.default;
  return templateFn(data);
};

module.exports = { renderTemplate, templates };
