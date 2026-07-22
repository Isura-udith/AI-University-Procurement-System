/**
 * ─────────────────────────────────────────────────────────────
 * Route Access Configuration for UWU Smart Procurement System
 * Maps each frontend route to the roles that can access it.
 * ─────────────────────────────────────────────────────────────
 */
import { ROLES } from './roles';

// ─── Internal roles (all except supplier & guest) ──────────────
const INTERNAL_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.VC, ROLES.DEAN,
  ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.PROCUREMENT_OFFICER,
  ROLES.CONTRACT_MANAGER, ROLES.TEC_MEMBER, ROLES.DEPARTMENT_HEAD,
  ROLES.DEPARTMENT_USER, ROLES.STORE_MANAGER, ROLES.AUDITOR, ROLES.FINANCE_COMMITTEE,
];

// ─── Approval chain roles ──────────────────────────────────────
const APPROVAL_ROLES = [
  ROLES.DEPARTMENT_HEAD, ROLES.DEAN, ROLES.PROCUREMENT_OFFICER,
  ROLES.BURSAR, ROLES.FINANCE_COMMITTEE, ROLES.FINANCE_OFFICER, ROLES.ADMIN, ROLES.VC, ROLES.SUPER_ADMIN,
];

// ─── Route → Allowed Roles ─────────────────────────────────────
export const ROUTE_ACCESS = {
  // Dashboard (all internal roles and supplier)
  '/dashboard': [...INTERNAL_ROLES, ROLES.SUPPLIER],

  // ── Procurement Lifecycle ────────────────────────────────────
  '/procurements': [
    ROLES.DEPARTMENT_USER, ROLES.DEPARTMENT_HEAD, ROLES.DEAN,
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.VC,
    ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.FINANCE_COMMITTEE, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/procurements/new': [
    ROLES.DEPARTMENT_USER, ROLES.DEPARTMENT_HEAD,
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/approvals': APPROVAL_ROLES,
  '/budget-lock': [
    ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],

  // ── Tendering ────────────────────────────────────────────────
  '/tenders': [
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.VC, ROLES.DEAN,
    ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.CONTRACT_MANAGER,
    ROLES.TEC_MEMBER, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/tenders/new': [
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/bid-box': [
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPPLIER,
    ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/bid-opening': [
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN,
    ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/evaluation': [
    ROLES.TEC_MEMBER, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN,
    ROLES.VC, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],

  // ── Awards & Contracts ───────────────────────────────────────
  '/awards': [
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.VC,
    ROLES.AUDITOR, ROLES.SUPER_ADMIN, ROLES.SUPPLIER,
  ],
  '/contracts': [
    ROLES.CONTRACT_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN,
    ROLES.VC, ROLES.DEAN, ROLES.BURSAR, ROLES.FINANCE_OFFICER,
    ROLES.AUDITOR, ROLES.SUPPLIER, ROLES.SUPER_ADMIN,
  ],
  '/contracts/new': [
    ROLES.PROCUREMENT_OFFICER, ROLES.CONTRACT_MANAGER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],

  // ── Delivery & Finance ───────────────────────────────────────
  '/delivery': [
    ROLES.STORE_MANAGER, ROLES.FINANCE_OFFICER, ROLES.BURSAR,
    ROLES.CONTRACT_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN,
    ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/payments': [
    ROLES.FINANCE_OFFICER, ROLES.BURSAR, ROLES.PROCUREMENT_OFFICER,
    ROLES.CONTRACT_MANAGER, ROLES.ADMIN, ROLES.VC,
    ROLES.STORE_MANAGER, ROLES.SUPPLIER, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],

  // ── Vendors ──────────────────────────────────────────────────
  '/vendors': [
    ROLES.PROCUREMENT_OFFICER, ROLES.CONTRACT_MANAGER, ROLES.ADMIN,
    ROLES.VC, ROLES.BURSAR, ROLES.FINANCE_OFFICER,
    ROLES.AUDITOR, ROLES.SUPER_ADMIN, ROLES.SUPPLIER
  ],

  // ── User Management ───────────────────────────────────────────
  '/users': [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.VC, ROLES.AUDITOR,
  ],

  // ── Reports & Audit ──────────────────────────────────────────
  '/reports': [
    ROLES.PROCUREMENT_OFFICER, ROLES.CONTRACT_MANAGER, ROLES.ADMIN,
    ROLES.VC, ROLES.DEAN, ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.FINANCE_COMMITTEE,
    ROLES.DEPARTMENT_HEAD, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/reports/spend': [
    ROLES.PROCUREMENT_OFFICER, ROLES.CONTRACT_MANAGER, ROLES.ADMIN,
    ROLES.VC, ROLES.DEAN, ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.FINANCE_COMMITTEE,
    ROLES.DEPARTMENT_HEAD, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/reports/vendor-performance': [
    ROLES.PROCUREMENT_OFFICER, ROLES.CONTRACT_MANAGER, ROLES.ADMIN,
    ROLES.VC, ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/reports/user-audit': [
    ROLES.ADMIN, ROLES.VC, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/archive': [
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.VC,
    ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],


  // ── Hubs ─────────────────────────────────────────────────────
  '/communications': INTERNAL_ROLES,
  '/documents': INTERNAL_ROLES,

  // ── AI Intelligence ───────────────────────────────────────────
  '/ai': [
    ROLES.DEPARTMENT_USER, ROLES.DEPARTMENT_HEAD, ROLES.DEAN,
    ROLES.PROCUREMENT_OFFICER, ROLES.TEC_MEMBER,
    ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.FINANCE_COMMITTEE, ROLES.CONTRACT_MANAGER,
    ROLES.ADMIN, ROLES.VC, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],
  '/ai/chat': [
    ROLES.DEPARTMENT_USER, ROLES.DEPARTMENT_HEAD, ROLES.DEAN,
    ROLES.PROCUREMENT_OFFICER, ROLES.TEC_MEMBER,
    ROLES.BURSAR, ROLES.FINANCE_OFFICER, ROLES.FINANCE_COMMITTEE, ROLES.CONTRACT_MANAGER,
    ROLES.ADMIN, ROLES.VC, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
  ],

  // ── Supplier Dashboard (top-level staff can view) ──────────────
  '/supplier-dashboard': [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.VC, ROLES.PROCUREMENT_OFFICER,
    ROLES.BURSAR, ROLES.DEAN, ROLES.AUDITOR,
  ],
  '/ai/market-price': [
    ROLES.DEPARTMENT_USER, ROLES.DEPARTMENT_HEAD,
    ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/ai/market-monitoring': [
    ROLES.PROCUREMENT_OFFICER, ROLES.BURSAR, ROLES.FINANCE_OFFICER,
    ROLES.ADMIN, ROLES.VC, ROLES.SUPER_ADMIN,
  ],
  '/ai/bid-verification': [
    ROLES.PROCUREMENT_OFFICER, ROLES.TEC_MEMBER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/ai/recommendations': [
    ROLES.PROCUREMENT_OFFICER, ROLES.TEC_MEMBER,
    ROLES.ADMIN, ROLES.VC, ROLES.DEAN, ROLES.SUPER_ADMIN,
  ],
  '/ai/risk-assessment': [
    ROLES.PROCUREMENT_OFFICER, ROLES.BURSAR, ROLES.FINANCE_OFFICER,
    ROLES.ADMIN, ROLES.VC, ROLES.DEAN, ROLES.SUPER_ADMIN,
  ],
  '/ai/comparative-analysis': [
    ROLES.PROCUREMENT_OFFICER, ROLES.TEC_MEMBER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/ai/historical-match': [
    ROLES.PROCUREMENT_OFFICER, ROLES.BURSAR, ROLES.FINANCE_OFFICER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/ai/explainability': [
    ROLES.AUDITOR, ROLES.ADMIN, ROLES.VC, ROLES.SUPER_ADMIN,
    ROLES.PROCUREMENT_OFFICER,
  ],

  // ── Strategic Planning (Phases 1–4) ──────────────────────────
  '/planning': APPROVAL_ROLES,
  '/planning/master-plans': APPROVAL_ROLES,
  '/planning/master-plans/new': [
    ROLES.DEPARTMENT_HEAD, ROLES.PROCUREMENT_OFFICER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/planning/annual-plans': APPROVAL_ROLES,
  '/planning/annual-plans/new': [
    ROLES.DEPARTMENT_HEAD, ROLES.PROCUREMENT_OFFICER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/planning/budget-distribution': [
    ROLES.VC, ROLES.BURSAR, ROLES.FINANCE_COMMITTEE, ROLES.FINANCE_OFFICER,
    ROLES.DEAN, ROLES.DEPARTMENT_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.AUDITOR,
  ],

  // ── Workflow Dashboard (All 45 Steps Overview) ────────────
  '/workflow': INTERNAL_ROLES,

  // ── Store & Inventory (Phases 7–8) ───────────────────────────
  '/store': [
    ROLES.STORE_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN,
    ROLES.VC, ROLES.BURSAR, ROLES.AUDITOR, ROLES.SUPER_ADMIN,
    ROLES.DEPARTMENT_HEAD, ROLES.DEPARTMENT_USER,
  ],
  '/store/grn': [
    ROLES.STORE_MANAGER, ROLES.PROCUREMENT_OFFICER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/store/grn/new': [
    ROLES.STORE_MANAGER, ROLES.PROCUREMENT_OFFICER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
  '/store/issue': [
    ROLES.STORE_MANAGER, ROLES.DEPARTMENT_HEAD, ROLES.DEPARTMENT_USER,
    ROLES.ADMIN, ROLES.SUPER_ADMIN,
  ],
};


// ─── Default landing page per role ─────────────────────────────
export const ROLE_LANDING_PAGE = {
  [ROLES.SUPER_ADMIN]:         '/dashboard',
  [ROLES.ADMIN]:               '/dashboard',
  [ROLES.VC]:                  '/dashboard',
  [ROLES.DEAN]:                '/dashboard',
  [ROLES.BURSAR]:              '/dashboard',
  [ROLES.FINANCE_COMMITTEE]:   '/dashboard',
  [ROLES.FINANCE_OFFICER]:     '/dashboard',
  [ROLES.PROCUREMENT_OFFICER]: '/dashboard',
  [ROLES.CONTRACT_MANAGER]:    '/contracts',
  [ROLES.TEC_MEMBER]:          '/evaluation',
  [ROLES.DEPARTMENT_HEAD]:     '/approvals',
  [ROLES.DEPARTMENT_USER]:     '/procurements',
  [ROLES.STORE_MANAGER]:       '/delivery',
  [ROLES.SUPPLIER]:            '/dashboard',   // Supplier dashboard with active tenders
  [ROLES.AUDITOR]:             '/reports',
  [ROLES.GUEST]:               '/',            // Public transparency page
};

// ─── Helper: Check if a role can access a given route ──────────
export function canAccessRoute(role, path) {
  if (role === ROLES.SUPER_ADMIN) return true;
  const matchingRoute = Object.keys(ROUTE_ACCESS)
    .sort((a, b) => b.length - a.length)
    .find(route => path === route || path.startsWith(`${route}/`));
  if (matchingRoute) return ROUTE_ACCESS[matchingRoute].includes(role);
  return false;
}

// ─── Helper: Get landing page for a role ───────────────────────
export function getLandingPage(role) {
  return ROLE_LANDING_PAGE[role] || '/dashboard';
}

export default ROUTE_ACCESS;
