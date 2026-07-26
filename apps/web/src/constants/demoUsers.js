// ─────────────────────────────────────────────────────────────
// Demo / Seed Users — 15 RBAC Roles
// Password for ALL demo accounts: Demo@1234
// ─────────────────────────────────────────────────────────────
import { ROLE_CONFIG } from './roles';

const DEMO_USERS = [
  // ─── System & Administrative (Cross-Tenant) ──────────────────
  { role: 'super_admin',         firstName: 'System',      lastName: 'Admin',       email: 'superadmin@uwu.ac.lk',    employeeId: 'UWU-SYS-001', jobTitle: 'System Super Admin',        category: 'System',      color: 'rose',    accessArea: 'SaaS Management Console' },
  { role: 'admin',               firstName: 'Procurement', lastName: 'Admin',       email: 'admin@uwu.ac.lk',         employeeId: 'UWU-SYS-002', jobTitle: 'Procurement Administrator', category: 'System',      color: 'rose',    accessArea: 'Master Data Management' },
  // ─── Executive Leadership ─────────────────────────────────────
  { role: 'vc',                  firstName: 'Vice',        lastName: 'Chancellor',  email: 'vc@uwu.ac.lk',            employeeId: 'UWU-EXE-001', jobTitle: 'Vice Chancellor (AO)',      category: 'Executive',   color: 'purple',  accessArea: 'Executive Dashboard & Legal Finalization' },
  { role: 'dean',                firstName: 'Faculty',     lastName: 'Dean',        email: 'dean@uwu.ac.lk',          employeeId: 'UWU-EXE-002', jobTitle: 'Faculty Dean (Medicine)',    category: 'Executive',   color: 'purple',  accessArea: 'Faculty Approvals & Budget Utilization', faculty: 'Medicine' },
  { role: 'council',             firstName: 'University',  lastName: 'Council',     email: 'council@uwu.ac.lk',       employeeId: 'UWU-EXE-003', jobTitle: 'University Council',        category: 'Executive',   color: 'purple',  accessArea: 'Council Master Plan Approvals' },
  // ─── Finance & Budgetary Control ──────────────────────────────
  { role: 'bursar',              firstName: 'Chief',       lastName: 'Bursar',      email: 'bursar@uwu.ac.lk',        employeeId: 'UWU-FIN-001', jobTitle: 'Chief Bursar',              category: 'Finance',     color: 'blue',    accessArea: 'Financial Reconciliation Module' },
  { role: 'finance_officer',     firstName: 'Finance',     lastName: 'Officer',     email: 'finance@uwu.ac.lk',       employeeId: 'UWU-FIN-002', jobTitle: 'Finance Officer',           category: 'Finance',     color: 'blue',    accessArea: 'Accounts Payable' },
  { role: 'finance_committee',   firstName: 'Finance',     lastName: 'Committee',   email: 'financecommittee@uwu.ac.lk', employeeId: 'UWU-FIN-003', jobTitle: 'Finance Committee Member', category: 'Finance',     color: 'blue',    accessArea: 'Financial Approvals' },
  { role: 'procurement_committee', firstName: 'Procurement', lastName: 'Committee', email: 'procurementcommittee@uwu.ac.lk', employeeId: 'UWU-PRO-004', jobTitle: 'Procurement Committee Member', category: 'Procurement', color: 'emerald', accessArea: 'Procurement Approvals' },
  // ─── Procurement & Evaluation ─────────────────────────────────
  { role: 'procurement_officer', firstName: 'Procurement', lastName: 'Officer',     email: 'procurement@uwu.ac.lk',   employeeId: 'UWU-PRO-001', jobTitle: 'Procurement Officer (PMD)',       category: 'Procurement', color: 'emerald', accessArea: 'Tendering Lifecycle' },
  { role: 'contract_manager',    firstName: 'Contract',    lastName: 'Manager',     email: 'contracts@uwu.ac.lk',     employeeId: 'UWU-PRO-002', jobTitle: 'Contract Manager',          category: 'Procurement', color: 'emerald', accessArea: 'Contract Lifecycle Management' },
  { role: 'tec_member',          firstName: 'TEC',         lastName: 'Member',      email: 'tec@uwu.ac.lk',           employeeId: 'UWU-PRO-003', jobTitle: 'TEC Member',                category: 'Procurement', color: 'emerald', accessArea: 'Technical Evaluation Workspace' },
  // ─── Departmental & User ──────────────────────────────────────
  { role: 'department_head',     firstName: 'Department',  lastName: 'Head',        email: 'hod@uwu.ac.lk',           employeeId: 'UWU-DEP-001', jobTitle: 'Head of Department',        category: 'Department',  color: 'amber',   accessArea: 'Departmental Requisition Queue' },
  { role: 'department_user',     firstName: 'Department',  lastName: 'User',        email: 'staff@uwu.ac.lk',         employeeId: 'UWU-DEP-002', jobTitle: 'Lab Coordinator',            category: 'Department',  color: 'amber',   accessArea: 'Procurement Intake Portal' },
  // ─── Operations & Logistics ───────────────────────────────────
  { role: 'store_manager',       firstName: 'Store',       lastName: 'Manager',     email: 'stores@uwu.ac.lk',        employeeId: 'UWU-OPS-001', jobTitle: 'University Store Manager',   category: 'Operations',  color: 'teal',    accessArea: 'Inventory & Logistics' },
  // ─── External ─────────────────────────────────────────────────
  { role: 'supplier',            firstName: 'Demo',        lastName: 'Supplier',    email: 'supplier@vendor.lk',       employeeId: 'UWU-EXT-001', jobTitle: 'Vendor Representative',      category: 'External',    color: 'indigo',  accessArea: 'External Vendor Portal' },
  // ─── Oversight ────────────────────────────────────────────────
  { role: 'auditor',             firstName: 'System',      lastName: 'Auditor',     email: 'auditor@uwu.ac.lk',       employeeId: 'UWU-OVR-001', jobTitle: 'System Auditor',             category: 'Oversight',   color: 'slate',   accessArea: 'Audit & Compliance (Read-Only)' },
  { role: 'guest',               firstName: 'Guest',       lastName: 'Viewer',      email: 'guest@uwu.ac.lk',         employeeId: 'UWU-OVR-002', jobTitle: 'Public Viewer',              category: 'Oversight',   color: 'slate',   accessArea: 'Public Transparency Page' },
];

export const DEMO_PASSWORD = 'Demo@1234';

/** Look up a demo user by email (case-insensitive) */
export function findDemoUser(email) {
  return DEMO_USERS.find(u => u.email.toLowerCase() === email?.toLowerCase()) || null;
}

/** Group demo users by their category */
export function groupedDemoUsers() {
  return DEMO_USERS.reduce((acc, user) => {
    if (!acc[user.category]) acc[user.category] = [];
    acc[user.category].push(user);
    return acc;
  }, {});
}

/** Format a role slug to a human-readable label */
export function formatRole(role) {
  if (ROLE_CONFIG[role]) return ROLE_CONFIG[role].label;
  return role
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default DEMO_USERS;
