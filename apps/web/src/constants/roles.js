/**
 * ─────────────────────────────────────────────────────────────
 * RBAC Role Configuration for UWU Smart Procurement System
 * 15 User Roles – Role metadata, hierarchy, and labels
 * ─────────────────────────────────────────────────────────────
 */

// ─── All Roles Enum ────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:         'super_admin',
  ADMIN:               'admin',
  VC:                  'vc',
  DEAN:                'dean',
  BURSAR:              'bursar',
  FINANCE_COMMITTEE:   'finance_committee',
  PROCUREMENT_COMMITTEE: 'procurement_committee',
  FINANCE_OFFICER:     'finance_officer',
  PROCUREMENT_OFFICER: 'procurement_officer',
  CONTRACT_MANAGER:    'contract_manager',
  TEC_MEMBER:          'tec_member',
  DEPARTMENT_HEAD:     'department_head',
  DEPARTMENT_USER:     'department_user',
  STORE_MANAGER:       'store_manager',
  SUPPLIER:            'supplier',
  AUDITOR:             'auditor',
  COUNCIL:             'council',
  GUEST:               'guest',
};

// ─── Role Categories ───────────────────────────────────────────
export const ROLE_CATEGORIES = {
  SYSTEM:       'System & Administrative',
  EXECUTIVE:    'Executive Leadership',
  FINANCE:      'Finance & Budgetary Control',
  PROCUREMENT:  'Procurement & Evaluation',
  DEPARTMENT:   'Departmental & User',
  OPERATIONS:   'Operations & Logistics',
  EXTERNAL:     'External',
  OVERSIGHT:    'Oversight',
};

// ─── Role Metadata (label, description, category, color, icon) ─
export const ROLE_CONFIG = {
  [ROLES.SUPER_ADMIN]: {
    label: 'Super Admin',
    description: 'Unrestricted access to entire platform. SaaS Management Console, tenant onboarding, system configuration.',
    category: ROLE_CATEGORIES.SYSTEM,
    color: 'rose',
    hierarchy: 100,
    isCrossTenant: true,
    primaryArea: 'SaaS Management Console',
  },
  [ROLES.ADMIN]: {
    label: 'Procurement Admin',
    description: 'University supplies division administrator. Master Data, SPD templates, DAPP management, workflow routing.',
    category: ROLE_CATEGORIES.SYSTEM,
    color: 'rose',
    hierarchy: 95,
    isCrossTenant: true,
    primaryArea: 'Master Data Management',
  },
  [ROLES.VC]: {
    label: 'Vice-Chancellor',
    description: 'Accounting Officer (AO). Full read-access, Executive Dashboards, digital signing of high-value contracts & LOA.',
    category: ROLE_CATEGORIES.EXECUTIVE,
    color: 'purple',
    hierarchy: 90,
    isCrossTenant: true,
    primaryArea: 'Executive Dashboard & Legal Finalization',
  },
  [ROLES.DEAN]: {
    label: 'Faculty Dean',
    description: 'Faculty-scoped approval authority. Requisition approval, Faculty Budget Utilization monitoring.',
    category: ROLE_CATEGORIES.EXECUTIVE,
    color: 'purple',
    hierarchy: 70,
    isCrossTenant: false,
    primaryArea: 'Faculty Approvals & Budget Utilization',
  },
  [ROLES.COUNCIL]: {
    label: 'University Council',
    description: 'Highest university governing body for final Master Procurement Plan approvals.',
    category: ROLE_CATEGORIES.EXECUTIVE,
    color: 'rose',
    hierarchy: 95,
    isCrossTenant: true,
    primaryArea: 'Council Master Plan Approvals',
  },
  [ROLES.BURSAR]: {
    label: 'Chief Bursar',
    description: 'Global financial integrity. Financial Reconciliation, high-value budget commitments, 3-way match (PO/Invoice/GRN).',
    category: ROLE_CATEGORIES.FINANCE,
    color: 'blue',
    hierarchy: 75,
    isCrossTenant: true,
    primaryArea: 'Financial Reconciliation Module',
  },
  [ROLES.FINANCE_COMMITTEE]: {
    label: 'Finance Committee',
    description: 'High level financial oversight and approvals for large acquisitions.',
    category: ROLE_CATEGORIES.FINANCE,
    color: 'blue',
    hierarchy: 72,
    isCrossTenant: true,
    primaryArea: 'Financial Approvals',
  },
  [ROLES.PROCUREMENT_COMMITTEE]: {
    label: 'Procurement Committee',
    description: 'High level procurement oversight and approvals for acquisitions.',
    category: ROLE_CATEGORIES.PROCUREMENT,
    color: 'emerald',
    hierarchy: 68,
    isCrossTenant: true,
    primaryArea: 'Procurement Approvals',
  },
  [ROLES.FINANCE_OFFICER]: {
    label: 'Finance Officer',
    description: 'Daily AP operations. Verify budget codes (Vote Particulars), tax details, invoice processing, payment disbursement.',
    category: ROLE_CATEGORIES.FINANCE,
    color: 'blue',
    hierarchy: 60,
    isCrossTenant: false,
    primaryArea: 'Accounts Payable',
  },
  [ROLES.PROCUREMENT_OFFICER]: {
    label: 'Procurement Officer (PMD)',
    description: 'Tendering lifecycle management. Draft SPN, manage Digital Bid Box, coordinate BOC activities.',
    category: ROLE_CATEGORIES.PROCUREMENT,
    color: 'emerald',
    hierarchy: 65,
    isCrossTenant: true,
    primaryArea: 'Tendering Lifecycle',
  },
  [ROLES.CONTRACT_MANAGER]: {
    label: 'Contract Manager',
    description: 'Contract Lifecycle Management (CLM). Milestones, SLA compliance, performance security expiration alerts.',
    category: ROLE_CATEGORIES.PROCUREMENT,
    color: 'emerald',
    hierarchy: 55,
    isCrossTenant: false,
    primaryArea: 'Contract Lifecycle Management',
  },
  [ROLES.TEC_MEMBER]: {
    label: 'TEC Member',
    description: 'Technical Evaluation Committee. Technical Evaluation Workspace for assigned tenders. No financial data access until proper stage.',
    category: ROLE_CATEGORIES.PROCUREMENT,
    color: 'emerald',
    hierarchy: 50,
    isCrossTenant: false,
    primaryArea: 'Technical Evaluation Workspace',
  },
  [ROLES.DEPARTMENT_HEAD]: {
    label: 'Department Head',
    description: 'First level of institutional approval. Departmental Requisition Queue, verify necessity and technical validity.',
    category: ROLE_CATEGORIES.DEPARTMENT,
    color: 'amber',
    hierarchy: 40,
    isCrossTenant: false,
    primaryArea: 'Departmental Requisition Queue',
  },
  [ROLES.DEPARTMENT_USER]: {
    label: 'Department User',
    description: 'Staff/Lab coordinators. Procurement Intake Portal, draft requisitions, Gemini AI specification suggestions, upload BOQs.',
    category: ROLE_CATEGORIES.DEPARTMENT,
    color: 'amber',
    hierarchy: 20,
    isCrossTenant: false,
    primaryArea: 'Procurement Intake Portal',
  },
  [ROLES.STORE_MANAGER]: {
    label: 'Store Manager',
    description: 'Inventory & Logistics. Record physical receipt, generate GRN, update asset inventory.',
    category: ROLE_CATEGORIES.OPERATIONS,
    color: 'teal',
    hierarchy: 35,
    isCrossTenant: false,
    primaryArea: 'Inventory & Logistics',
  },
  [ROLES.SUPPLIER]: {
    label: 'Supplier',
    description: 'External Vendor Portal. Manage registration, KYC/CIDA certs, submit bids to Digital Bid Box, track payment status.',
    category: ROLE_CATEGORIES.EXTERNAL,
    color: 'indigo',
    hierarchy: 10,
    isCrossTenant: false,
    primaryArea: 'External Vendor Portal',
  },
  [ROLES.AUDITOR]: {
    label: 'System Auditor',
    description: 'Full read-only access to every module, decision log, audit trail. Export compliance reports, investigate AI-flagged anomalies.',
    category: ROLE_CATEGORIES.OVERSIGHT,
    color: 'slate',
    hierarchy: 80,
    isCrossTenant: true,
    primaryArea: 'Audit & Compliance',
  },
  [ROLES.GUEST]: {
    label: 'Guest Viewer',
    description: 'Public Transparency Page. View active bid notices, archived awards, procurement policies. No secure login required.',
    category: ROLE_CATEGORIES.OVERSIGHT,
    color: 'slate',
    hierarchy: 5,
    isCrossTenant: false,
    primaryArea: 'Public Transparency Page',
  },
};

/** Get role label from slug */
export function getRoleLabel(role) {
  return ROLE_CONFIG[role]?.label || role?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown';
}

/** Get role color */
export function getRoleColor(role) {
  return ROLE_CONFIG[role]?.color || 'slate';
}

/** Check if a role is cross-tenant */
export function isCrossTenantRole(role) {
  return ROLE_CONFIG[role]?.isCrossTenant || false;
}

export default ROLES;
