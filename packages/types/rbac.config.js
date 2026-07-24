/**
 * ═══════════════════════════════════════════════════════════════
 * RBAC / PBAC Configuration — Single Source of Truth
 * UWU AI-Based Smart Procurement System
 *
 * This module is consumed by BOTH the backend (CommonJS) and
 * the frontend (via re-export wrappers). Any change here
 * propagates everywhere.
 * ═══════════════════════════════════════════════════════════════
 */

// ─── 15 User Role Slugs ────────────────────────────────────────
const ROLES = {
  SUPER_ADMIN:         'super_admin',
  ADMIN:               'admin',
  VC:                  'vc',
  DEAN:                'dean',
  BURSAR:              'bursar',
  FINANCE_OFFICER:     'finance_officer',
  PROCUREMENT_OFFICER: 'procurement_officer',
  CONTRACT_MANAGER:    'contract_manager',
  TEC_MEMBER:          'tec_member',
  FINANCE_COMMITTEE:   'finance_committee',
  PROCUREMENT_COMMITTEE: 'procurement_committee',
  DEPARTMENT_HEAD:     'department_head',
  DEPARTMENT_USER:     'department_user',
  STORE_MANAGER:       'store_manager',
  SUPPLIER:            'supplier',
  AUDITOR:             'auditor',
  GUEST:               'guest',
};

const ALL_ROLE_SLUGS = Object.values(ROLES);

// ─── Expanded Permission Keys ──────────────────────────────────
const PERMISSIONS = {
  // Requisitions
  CREATE_REQUISITION:   'create_requisition',
  APPROVE_REQUISITION:  'approve_requisition',
  REJECT_REQUISITION:   'reject_requisition',

  // Budget & Finance
  VERIFY_BUDGET:        'verify_budget',
  MANAGE_BUDGET:        'manage_budget',
  THREE_WAY_MATCH:      'three_way_match',
  PROCESS_PAYMENT:      'process_payment',

  // Tendering
  CREATE_TENDER:        'create_tender',
  PUBLISH_TENDER:       'publish_tender',
  OPEN_BID_BOX:         'open_bid_box',
  SUBMIT_BID:           'submit_bid',
  EVALUATE_BID:         'evaluate_bid',

  // Awards & Contracts
  AWARD_CONTRACT:       'award_contract',
  SIGN_CONTRACT:        'sign_contract',
  SIGN_LOA:             'sign_loa',
  SUBMIT_APPEAL:        'submit_appeal',
  REQUEST_DEBRIEFING:   'request_debriefing',

  // Inventory & GRN
  RECORD_GRN:           'record_grn',
  MANAGE_INVENTORY:     'manage_inventory',

  // Vendors
  MANAGE_VENDORS:       'manage_vendors',

  // Reports & AI
  VIEW_REPORTS:         'view_reports',
  AI_ANALYSIS:          'ai_analysis',

  // Administration
  MANAGE_USERS:         'manage_users',
  MANAGE_MPP:           'manage_mpp',
  MANAGE_DAPP:          'manage_dapp',
  DELEGATE_AUTHORITY:   'delegate_authority',

  // Public
  VIEW_PUBLIC_NOTICES:  'view_public_notices',
};

// ─── Role Hierarchy (higher = more authority) ──────────────────
const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]:         100,
  [ROLES.ADMIN]:                95,
  [ROLES.VC]:                   90,
  [ROLES.AUDITOR]:              80,  // High read authority for oversight
  [ROLES.BURSAR]:               75,
  [ROLES.DEAN]:                 70,
  [ROLES.PROCUREMENT_COMMITTEE]: 72,
  [ROLES.PROCUREMENT_OFFICER]:  65,
  [ROLES.FINANCE_OFFICER]:      60,
  [ROLES.CONTRACT_MANAGER]:     55,
  [ROLES.FINANCE_COMMITTEE]:    52,
  [ROLES.TEC_MEMBER]:           50,
  [ROLES.DEPARTMENT_HEAD]:      40,
  [ROLES.STORE_MANAGER]:        35,
  [ROLES.DEPARTMENT_USER]:      20,
  [ROLES.SUPPLIER]:             10,
  [ROLES.GUEST]:                 5,
};

// ─── Role → Default Permissions ────────────────────────────────
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.APPROVE_REQUISITION, PERMISSIONS.REJECT_REQUISITION,
    PERMISSIONS.CREATE_TENDER, PERMISSIONS.PUBLISH_TENDER, PERMISSIONS.EVALUATE_BID,
    PERMISSIONS.OPEN_BID_BOX, PERMISSIONS.AWARD_CONTRACT, PERMISSIONS.MANAGE_VENDORS,
    PERMISSIONS.VIEW_REPORTS, PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_BUDGET,
    PERMISSIONS.MANAGE_MPP, PERMISSIONS.MANAGE_DAPP, PERMISSIONS.AI_ANALYSIS,
    PERMISSIONS.VERIFY_BUDGET, PERMISSIONS.THREE_WAY_MATCH,
  ],

  [ROLES.VC]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.APPROVE_REQUISITION, PERMISSIONS.REJECT_REQUISITION,
    PERMISSIONS.AWARD_CONTRACT, PERMISSIONS.SIGN_CONTRACT, PERMISSIONS.SIGN_LOA,
    PERMISSIONS.VIEW_REPORTS, PERMISSIONS.DELEGATE_AUTHORITY,
  ],

  [ROLES.DEAN]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.APPROVE_REQUISITION, PERMISSIONS.REJECT_REQUISITION,
    PERMISSIONS.VIEW_REPORTS,
  ],

  [ROLES.BURSAR]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.APPROVE_REQUISITION, PERMISSIONS.REJECT_REQUISITION,
    PERMISSIONS.MANAGE_BUDGET, PERMISSIONS.VERIFY_BUDGET,
    PERMISSIONS.THREE_WAY_MATCH, PERMISSIONS.PROCESS_PAYMENT,
    PERMISSIONS.VIEW_REPORTS,
  ],

  [ROLES.FINANCE_OFFICER]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.VERIFY_BUDGET, PERMISSIONS.MANAGE_BUDGET,
    PERMISSIONS.PROCESS_PAYMENT, PERMISSIONS.VIEW_REPORTS,
  ],

  [ROLES.PROCUREMENT_OFFICER]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.APPROVE_REQUISITION, PERMISSIONS.REJECT_REQUISITION,
    PERMISSIONS.CREATE_TENDER, PERMISSIONS.PUBLISH_TENDER,
    PERMISSIONS.OPEN_BID_BOX, PERMISSIONS.EVALUATE_BID, PERMISSIONS.AWARD_CONTRACT,
    PERMISSIONS.MANAGE_VENDORS, PERMISSIONS.VIEW_REPORTS, PERMISSIONS.AI_ANALYSIS,
  ],

  [ROLES.CONTRACT_MANAGER]: [
    PERMISSIONS.AWARD_CONTRACT, PERMISSIONS.VIEW_REPORTS, PERMISSIONS.MANAGE_VENDORS,
  ],

  [ROLES.TEC_MEMBER]: [
    PERMISSIONS.EVALUATE_BID, PERMISSIONS.VIEW_REPORTS,
  ],

  [ROLES.FINANCE_COMMITTEE]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.APPROVE_REQUISITION, PERMISSIONS.REJECT_REQUISITION,
    PERMISSIONS.VIEW_REPORTS,
  ],

  [ROLES.PROCUREMENT_COMMITTEE]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.APPROVE_REQUISITION, PERMISSIONS.REJECT_REQUISITION,
    PERMISSIONS.VIEW_REPORTS,
  ],

  [ROLES.DEPARTMENT_HEAD]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.APPROVE_REQUISITION,
    PERMISSIONS.REJECT_REQUISITION, PERMISSIONS.VIEW_REPORTS,
  ],

  [ROLES.DEPARTMENT_USER]: [
    PERMISSIONS.CREATE_REQUISITION, PERMISSIONS.AI_ANALYSIS,
  ],

  [ROLES.STORE_MANAGER]: [
    PERMISSIONS.RECORD_GRN, PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.VIEW_REPORTS,
  ],

  [ROLES.SUPPLIER]: [
    PERMISSIONS.SUBMIT_BID, PERMISSIONS.SUBMIT_APPEAL, PERMISSIONS.REQUEST_DEBRIEFING,
  ],

  [ROLES.AUDITOR]: [
    PERMISSIONS.VIEW_REPORTS,  // Read-only across all modules
  ],

  [ROLES.GUEST]: [
    PERMISSIONS.VIEW_PUBLIC_NOTICES,
  ],
};

// ─── Role → Accessible Modules ────────────────────────────────
const ROLE_ACCESS_MAP = {
  [ROLES.SUPER_ADMIN]: [
    'dashboard', 'saas_console', 'master_data', 'requisitions', 'approvals',
    'budget_lock', 'tenders', 'bid_box', 'bid_opening', 'evaluation',
    'awards', 'contracts', 'delivery', 'payments', 'vendors', 'reports',
    'archive', 'communications', 'documents', 'users', 'settings', 'audit_logs',
  ],
  [ROLES.ADMIN]: [
    'dashboard', 'master_data', 'requisitions', 'approvals', 'budget_lock',
    'tenders', 'bid_box', 'bid_opening', 'evaluation', 'awards', 'contracts',
    'delivery', 'payments', 'vendors', 'reports', 'archive', 'communications',
    'documents', 'users', 'settings', 'audit_logs',
  ],
  [ROLES.VC]: [
    'dashboard', 'executive_dashboard', 'requisitions', 'approvals',
    'tenders', 'evaluation', 'awards', 'contracts', 'payments',
    'reports', 'archive', 'communications', 'documents', 'legal_finalization', 'audit_logs',
  ],
  [ROLES.DEAN]: [
    'dashboard', 'requisitions', 'approvals', 'budget_utilization',
    'tenders', 'reports', 'communications', 'documents',
  ],
  [ROLES.BURSAR]: [
    'dashboard', 'financial_reconciliation', 'requisitions', 'approvals',
    'budget_lock', 'payments', 'delivery', 'reports', 'communications', 'documents',
  ],
  [ROLES.FINANCE_OFFICER]: [
    'dashboard', 'accounts_payable', 'requisitions', 'budget_lock',
    'payments', 'delivery', 'reports', 'communications', 'documents',
  ],
  [ROLES.PROCUREMENT_OFFICER]: [
    'dashboard', 'tendering_lifecycle', 'requisitions', 'tenders',
    'bid_box', 'bid_opening', 'evaluation', 'awards', 'contracts',
    'vendors', 'reports', 'communications', 'documents',
  ],
  [ROLES.CONTRACT_MANAGER]: [
    'dashboard', 'contract_lifecycle', 'contracts', 'delivery',
    'vendors', 'reports', 'communications', 'documents',
  ],
  [ROLES.TEC_MEMBER]: [
    'dashboard', 'evaluation_workspace', 'evaluation',
    'communications', 'documents',
  ],
  [ROLES.FINANCE_COMMITTEE]: [
    'dashboard', 'requisitions', 'approvals',
    'reports', 'communications', 'documents',
  ],
  [ROLES.PROCUREMENT_COMMITTEE]: [
    'dashboard', 'requisitions', 'approvals',
    'reports', 'communications', 'documents',
  ],
  [ROLES.DEPARTMENT_HEAD]: [
    'dashboard', 'departmental_queue', 'requisitions', 'approvals',
    'communications', 'documents',
  ],
  [ROLES.DEPARTMENT_USER]: [
    'dashboard', 'procurement_intake', 'requisitions',
    'communications', 'documents',
  ],
  [ROLES.STORE_MANAGER]: [
    'dashboard', 'inventory_logistics', 'delivery',
    'communications', 'documents',
  ],
  [ROLES.SUPPLIER]: [
    'vendor_portal', 'bid_box', 'payments',
  ],
  [ROLES.AUDITOR]: [
    'dashboard', 'requisitions', 'approvals', 'budget_lock', 'tenders',
    'bid_box', 'bid_opening', 'evaluation', 'awards', 'contracts',
    'delivery', 'payments', 'vendors', 'reports', 'archive',
    'communications', 'documents', 'audit_logs',
  ],
  [ROLES.GUEST]: [
    'public_transparency',
  ],
};

// ─── Cross-Tenant Roles (bypass faculty scoping) ──────────────
const CROSS_TENANT_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.VC,
  ROLES.BURSAR,
  ROLES.PROCUREMENT_OFFICER,
  ROLES.AUDITOR,
  ROLES.FINANCE_COMMITTEE,
  ROLES.PROCUREMENT_COMMITTEE,
];

// ─── Read-Only Roles (cannot POST/PUT/DELETE resources) ────────
const READ_ONLY_ROLES = [
  ROLES.AUDITOR,
  ROLES.GUEST,
];

// ─── Approval Thresholds (2024 GOSL Guidelines, LKR) ─────────
const APPROVAL_THRESHOLDS = {
  [ROLES.DEPARTMENT_HEAD]:      500000,       // Up to LKR 500K
  [ROLES.DEAN]:                 5000000,      // Up to LKR 5M
  [ROLES.BURSAR]:               10000000,     // Up to LKR 10M
  [ROLES.FINANCE_COMMITTEE]:    25000000,     // Up to LKR 25M
  [ROLES.ADMIN]:                25000000,     // Up to LKR 25M (Procurement Admin)
  [ROLES.VC]:                   50000000,     // Up to LKR 50M (then goes to RPC)
  [ROLES.SUPER_ADMIN]:          Infinity,
};

// ─── All Internal Roles (excludes supplier & guest) ────────────
const INTERNAL_ROLES = ALL_ROLE_SLUGS.filter(
  r => r !== ROLES.SUPPLIER && r !== ROLES.GUEST
);

// ─── Workflow Phase → Authorized Roles ─────────────────────────
// Maps each procurement lifecycle phase to the roles that can
// advance the procurement to the next stage.
const WORKFLOW_PHASE_ROLES = {
  // Phase 1: Needs Analysis & Requisition Initiation
  'draft':               [ROLES.DEPARTMENT_USER, ROLES.DEPARTMENT_HEAD, ROLES.PROCUREMENT_OFFICER, ROLES.VC, ROLES.DEAN, ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'submitted':           [ROLES.DEPARTMENT_USER, ROLES.DEPARTMENT_HEAD, ROLES.PROCUREMENT_OFFICER, ROLES.VC, ROLES.DEAN, ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 2: Departmental & Faculty Approval (legacy phase keys)
  'pending_hod':         [ROLES.DEPARTMENT_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'pending_dean':        [ROLES.DEAN, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 2 (approval stage slugs — used by approve/reject endpoints)
  'hod':                 [ROLES.DEPARTMENT_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'dean':                [ROLES.DEAN, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'pmd':                 [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'bursar':              [ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'finance_committee':   [ROLES.FINANCE_COMMITTEE, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'vice_chancellor':     [ROLES.VC, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'procurement_committee': [ROLES.PROCUREMENT_COMMITTEE, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Approval status phases
  'hod_approved':        [ROLES.DEAN, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'dean_approved':       [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'pmd_approved':        [ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'bursar_approved':     [ROLES.FINANCE_COMMITTEE, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'finance_committee_approved': [ROLES.VC, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'vc_approved':         [ROLES.PROCUREMENT_COMMITTEE, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 3: Budget Verification & Fund Allocation
  'pending_finance':     [ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'pending_budget_lock': [ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'pmd_review':          [ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 4: Sourcing Strategy & Tender Preparation
  'budget_locked':       [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'tender_preparation':  [ROLES.PROCUREMENT_OFFICER, ROLES.TEC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 5: Solicitation & Secure Bid Submission
  'published':           [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'bidding_open':        [ROLES.SUPPLIER],

  // Phase 6: Bid Opening & Preliminary Examination
  'bidding_closed':      [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'bid_opening':         [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 7: Detailed Technical & Financial Evaluation
  'technical_evaluation': [ROLES.TEC_MEMBER, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'financial_evaluation': [ROLES.TEC_MEMBER, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 8: Award Determination & Standstill Period
  'evaluation_complete': [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'intent_to_award':     [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'standstill':          [],  // System-managed timer — no manual advance

  // Phase 9: Appeal Handling & PAC Resolution
  'appeal_period':       [ROLES.SUPPLIER],  // Only suppliers can submit appeals
  'appeal_review':       [ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.VC, ROLES.SUPER_ADMIN],

  // Phase 10: Contract Finalization & Implementation
  'contract_award':      [ROLES.VC, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'contract_signing':    [ROLES.VC, ROLES.CONTRACT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 11: Goods Receipt, Verification & 3-Way Match
  'delivery_pending':    [ROLES.STORE_MANAGER, ROLES.CONTRACT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'grn_pending':         [ROLES.STORE_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'three_way_match':     [ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Phase 12: Final Payment & Audit Closure
  'payment_processing':  [ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'payment_approved':    [ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'completed':           [ROLES.AUDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'audit_closed':        [ROLES.AUDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
};

// ─── Helper Functions ──────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 * super_admin always returns true.
 */
function hasPermission(role, permission) {
  if (role === ROLES.SUPER_ADMIN) return true;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

/**
 * Check if a role has any of the given permissions.
 */
function hasAnyPermission(role, permissions) {
  if (role === ROLES.SUPER_ADMIN) return true;
  const perms = ROLE_PERMISSIONS[role] || [];
  return permissions.some(p => perms.includes(p));
}

/**
 * Check if a role is cross-tenant (bypasses faculty scoping).
 */
function isCrossTenantRole(role) {
  return CROSS_TENANT_ROLES.includes(role);
}

/**
 * Check if a role is read-only (auditor, guest).
 */
function isReadOnlyRole(role) {
  return READ_ONLY_ROLES.includes(role);
}

/**
 * Check if a role can advance the workflow at a given phase.
 */
function canAdvancePhase(role, phase) {
  if (role === ROLES.SUPER_ADMIN) return true;
  const allowed = WORKFLOW_PHASE_ROLES[phase] || [];
  return allowed.includes(role);
}

/**
 * Get the hierarchy level for a role.
 */
function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] || 0;
}

// ─── Module Exports ────────────────────────────────────────────
module.exports = {
  ROLES,
  ALL_ROLE_SLUGS,
  PERMISSIONS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  ROLE_ACCESS_MAP,
  CROSS_TENANT_ROLES,
  READ_ONLY_ROLES,
  INTERNAL_ROLES,
  APPROVAL_THRESHOLDS,
  WORKFLOW_PHASE_ROLES,
  hasPermission,
  hasAnyPermission,
  isCrossTenantRole,
  isReadOnlyRole,
  canAdvancePhase,
  getRoleLevel,
};
