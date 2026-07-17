require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Role = require('./src/models/role.model');
const connectDB = require('./src/config/db');
const { ROLE_PERMISSIONS } = require('../../packages/types/rbac.config');

const ROLES = [
  {
    name: 'Super Admin', slug: 'super_admin', hierarchy: 100, isSystem: true,
    description: 'Unrestricted access to entire platform. SaaS Management Console, tenant onboarding, system configuration.',
    maxApprovalAmount: Infinity, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['create', 'read', 'update', 'delete', 'approve', 'reject'] },
      { resource: 'tenders',      actions: ['create', 'read', 'update', 'delete', 'publish'] },
      { resource: 'bids',         actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'evaluations',  actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { resource: 'awards',       actions: ['create', 'read', 'update', 'delete', 'approve', 'sign'] },
      { resource: 'contracts',    actions: ['create', 'read', 'update', 'delete', 'sign'] },
      { resource: 'payments',     actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { resource: 'vendors',      actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'users',        actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'reports',      actions: ['read', 'export'] },
      { resource: 'budget',       actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { resource: 'settings',     actions: ['read', 'update'] },
      { resource: 'audit_logs',   actions: ['read', 'export'] },
    ],
  },
  {
    name: 'Procurement Admin', slug: 'admin', hierarchy: 95, isSystem: true,
    description: 'University supplies division administrator. Master Data, SPD templates, DAPP management.',
    maxApprovalAmount: 25000000, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['create', 'read', 'update', 'delete', 'approve', 'reject'] },
      { resource: 'tenders',      actions: ['create', 'read', 'update', 'delete', 'publish'] },
      { resource: 'bids',         actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'evaluations',  actions: ['create', 'read', 'update', 'approve'] },
      { resource: 'awards',       actions: ['create', 'read', 'update', 'approve'] },
      { resource: 'contracts',    actions: ['create', 'read', 'update'] },
      { resource: 'payments',     actions: ['create', 'read', 'update', 'approve'] },
      { resource: 'vendors',      actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'users',        actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'reports',      actions: ['read', 'export'] },
      { resource: 'budget',       actions: ['create', 'read', 'update'] },
    ],
  },
  {
    name: 'Vice-Chancellor', slug: 'vc', hierarchy: 90, isSystem: true,
    description: 'Accounting Officer (AO). Executive Dashboards, digital signing.',
    maxApprovalAmount: 50000000, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['read', 'approve', 'reject'] },
      { resource: 'awards',       actions: ['read', 'approve', 'sign'] },
      { resource: 'contracts',    actions: ['read', 'sign'] },
      { resource: 'reports',      actions: ['read', 'export'] },
    ],
  },
  {
    name: 'Faculty Dean', slug: 'dean', hierarchy: 70, isSystem: false,
    description: 'Faculty-scoped approval authority. Requisition approval, Faculty Budget Utilization.',
    maxApprovalAmount: 5000000, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['read', 'approve', 'reject'] },
      { resource: 'reports',      actions: ['read'] },
    ],
  },
  {
    name: 'Chief Bursar', slug: 'bursar', hierarchy: 75, isSystem: true,
    description: 'Financial integrity. Financial Reconciliation, high-value budget commitments.',
    maxApprovalAmount: 10000000, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['read', 'approve', 'reject'] },
      { resource: 'budget',       actions: ['read', 'update', 'approve'] },
      { resource: 'payments',     actions: ['read', 'approve'] },
      { resource: 'reports',      actions: ['read', 'export'] },
    ],
  },
  {
    name: 'Finance Officer', slug: 'finance_officer', hierarchy: 60, isSystem: false,
    description: 'Daily AP operations. Budget codes, tax details, invoice processing.',
    maxApprovalAmount: 0, committeeType: 'none',
    permissions: [
      { resource: 'budget',   actions: ['read', 'update'] },
      { resource: 'payments', actions: ['create', 'read', 'update'] },
      { resource: 'reports',  actions: ['read'] },
    ],
  },
  {
    name: 'Procurement Officer (PMD)', slug: 'procurement_officer', hierarchy: 65, isSystem: true,
    description: 'Tendering lifecycle management. Draft SPN, manage Digital Bid Box.',
    maxApprovalAmount: 0, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['create', 'read', 'approve', 'reject'] },
      { resource: 'tenders',      actions: ['create', 'read', 'update', 'publish'] },
      { resource: 'bids',         actions: ['read'] },
      { resource: 'evaluations',  actions: ['create', 'read'] },
      { resource: 'awards',       actions: ['create', 'read'] },
      { resource: 'vendors',      actions: ['read', 'update'] },
      { resource: 'reports',      actions: ['read'] },
    ],
  },
  {
    name: 'Contract Manager', slug: 'contract_manager', hierarchy: 55, isSystem: false,
    description: 'Contract Lifecycle Management (CLM). Milestones, SLA compliance.',
    maxApprovalAmount: 0, committeeType: 'none',
    permissions: [
      { resource: 'contracts', actions: ['create', 'read', 'update'] },
      { resource: 'vendors',   actions: ['read'] },
      { resource: 'reports',   actions: ['read'] },
    ],
  },
  {
    name: 'TEC Member', slug: 'tec_member', hierarchy: 50, isSystem: false,
    description: 'Technical Evaluation Committee. Evaluate tenders on technical merit.',
    maxApprovalAmount: 0, committeeType: 'DPC',
    permissions: [
      { resource: 'evaluations', actions: ['create', 'read', 'update'] },
      { resource: 'reports',     actions: ['read'] },
    ],
  },
  {
    name: 'Department Head', slug: 'department_head', hierarchy: 40, isSystem: false,
    description: 'First level of institutional approval. Departmental Requisition Queue.',
    maxApprovalAmount: 500000, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['create', 'read', 'approve', 'reject'] },
      { resource: 'reports',      actions: ['read'] },
    ],
  },
  {
    name: 'Department User', slug: 'department_user', hierarchy: 20, isSystem: false,
    description: 'Staff/Lab coordinators. Draft requisitions, AI specification suggestions.',
    maxApprovalAmount: 0, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['create', 'read'] },
      { resource: 'ai_analysis',  actions: ['read'] },
    ],
  },
  {
    name: 'Store Manager', slug: 'store_manager', hierarchy: 35, isSystem: false,
    description: 'Inventory & Logistics. Record physical receipt, generate GRN.',
    maxApprovalAmount: 0, committeeType: 'none',
    permissions: [
      { resource: 'deliveries', actions: ['create', 'read', 'update'] },
      { resource: 'reports',    actions: ['read'] },
    ],
  },
  {
    name: 'Supplier', slug: 'supplier', hierarchy: 10, isSystem: false,
    description: 'External Vendor Portal. Manage registration, submit bids.',
    maxApprovalAmount: 0, committeeType: 'none',
    permissions: [
      { resource: 'bids',     actions: ['create', 'read'] },
      { resource: 'payments', actions: ['read'] },
    ],
  },
  {
    name: 'System Auditor', slug: 'auditor', hierarchy: 80, isSystem: true,
    description: 'Full read-only access. Export compliance reports, investigate anomalies.',
    maxApprovalAmount: 0, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['read'] },
      { resource: 'tenders',      actions: ['read'] },
      { resource: 'bids',         actions: ['read'] },
      { resource: 'evaluations',  actions: ['read'] },
      { resource: 'awards',       actions: ['read'] },
      { resource: 'contracts',    actions: ['read'] },
      { resource: 'payments',     actions: ['read'] },
      { resource: 'vendors',      actions: ['read'] },
      { resource: 'reports',      actions: ['read', 'export'] },
      { resource: 'audit_logs',   actions: ['read', 'export'] },
    ],
  },
  {
    name: 'Guest Viewer', slug: 'guest', hierarchy: 5, isSystem: false,
    description: 'Public Transparency Page. View active bid notices, archived awards.',
    maxApprovalAmount: 0, committeeType: 'none',
    permissions: [],
  },
  {
    name: 'Finance Committee', slug: 'finance_committee', hierarchy: 72, isSystem: true,
    description: 'High level financial oversight and approvals for large acquisitions.',
    maxApprovalAmount: 25000000, committeeType: 'none',
    permissions: [
      { resource: 'requisitions', actions: ['read', 'approve', 'reject'] },
      { resource: 'reports',      actions: ['read', 'export'] },
    ],
  },
  {
    name: 'Procurement Committee', slug: 'procurement_committee', hierarchy: 68, isSystem: true,
    description: 'Procurement Committee. Final authority for VC approved procurements.',
    maxApprovalAmount: Infinity, committeeType: 'DPC',
    permissions: [
      { resource: 'requisitions', actions: ['read', 'approve', 'reject'] },
      { resource: 'reports',      actions: ['read', 'export'] },
    ],
  },
];

const DEMO_USERS = [
  // ─── System & Administrative Roles (Cross-Tenant Access) ───
  {
    role: 'super_admin', firstName: 'System', lastName: 'Admin',
    email: 'superadmin@uwu.ac.lk', employeeId: 'UWU-SYS-001',
    department: 'Vice Chancellor Office',
    permissions: [
      'create_requisition', 'approve_requisition', 'reject_requisition',
      'create_tender', 'publish_tender', 'evaluate_bid',
      'open_bid_box', 'award_contract', 'sign_contract',
      'process_payment', 'manage_vendors', 'view_reports',
      'manage_users', 'manage_budget', 'ai_analysis',
      'manage_mpp', 'manage_dapp', 'delegate_authority',
    ],
  },
  {
    role: 'admin', firstName: 'Procurement', lastName: 'Admin',
    email: 'admin@uwu.ac.lk', employeeId: 'UWU-SYS-002',
    department: 'Supplies Division',
    permissions: [
      'create_requisition', 'approve_requisition', 'reject_requisition',
      'create_tender', 'publish_tender', 'evaluate_bid',
      'open_bid_box', 'award_contract', 'manage_vendors',
      'view_reports', 'manage_users', 'manage_budget',
      'manage_mpp', 'manage_dapp',
    ],
  },
  // ─── Executive Leadership Roles (High-Level Oversight) ───
  {
    role: 'vc', firstName: 'Vice', lastName: 'Chancellor',
    email: 'vc@uwu.ac.lk', employeeId: 'UWU-EXE-001',
    department: 'Vice Chancellor Office',
    permissions: [
      'approve_requisition', 'reject_requisition',
      'award_contract', 'sign_contract', 'view_reports',
      'delegate_authority',
    ],
  },
  {
    role: 'dean', firstName: 'Faculty', lastName: 'Dean',
    email: 'dean@uwu.ac.lk', employeeId: 'UWU-EXE-002',
    department: 'Medicine', faculty: 'Medicine',
    permissions: [
      'approve_requisition', 'reject_requisition', 'view_reports',
    ],
  },
  // ─── Finance & Budgetary Control Roles ───
  {
    role: 'bursar', firstName: 'Chief', lastName: 'Bursar',
    email: 'bursar@uwu.ac.lk', employeeId: 'UWU-FIN-001',
    department: 'Finance Division',
    permissions: [
      'approve_requisition', 'reject_requisition',
      'manage_budget', 'process_payment', 'view_reports',
    ],
  },
  {
    role: 'finance_officer', firstName: 'Finance', lastName: 'Officer',
    email: 'finance@uwu.ac.lk', employeeId: 'UWU-FIN-002',
    department: 'Finance Division',
    permissions: ROLE_PERMISSIONS['finance_officer'] || [
      'verify_budget', 'manage_budget', 'process_payment', 'view_reports',
    ],
  },
  {
    role: 'finance_committee', firstName: 'Finance', lastName: 'Committee',
    email: 'financecommittee@uwu.ac.lk', employeeId: 'UWU-FIN-003',
    department: 'Finance Division',
    permissions: [
      'approve_requisition', 'reject_requisition', 'view_reports',
    ],
  },
  {
    role: 'procurement_committee', firstName: 'Procurement', lastName: 'Committee',
    email: 'procurementcommittee@uwu.ac.lk', employeeId: 'UWU-PRO-004',
    department: 'Procurement Management Division',
    permissions: [
      'approve_requisition', 'reject_requisition', 'view_reports',
    ],
  },
  // ─── Procurement & Evaluation Roles ───
  {
    role: 'procurement_officer', firstName: 'Procurement', lastName: 'Officer',
    email: 'procurement@uwu.ac.lk', employeeId: 'UWU-PRO-001',
    department: 'Procurement Management Division (PMD)',
    permissions: [
      'create_requisition', 'approve_requisition', 'reject_requisition',
      'create_tender', 'publish_tender',
      'open_bid_box', 'evaluate_bid', 'award_contract',
      'manage_vendors', 'view_reports',
    ],
  },
  {
    role: 'contract_manager', firstName: 'Contract', lastName: 'Manager',
    email: 'contracts@uwu.ac.lk', employeeId: 'UWU-PRO-002',
    department: 'Procurement Management Division',
    permissions: [
      'award_contract', 'view_reports', 'manage_vendors',
    ],
  },
  {
    role: 'tec_member', firstName: 'TEC', lastName: 'Member',
    email: 'tec@uwu.ac.lk', employeeId: 'UWU-PRO-003',
    department: 'Applied Sciences', faculty: 'Applied Sciences',
    permissions: [
      'evaluate_bid', 'view_reports',
    ],
  },
  // ─── Departmental & User Roles ───
  {
    role: 'department_head', firstName: 'Department', lastName: 'Head',
    email: 'hod@uwu.ac.lk', employeeId: 'UWU-DEP-001',
    department: 'Applied Sciences', faculty: 'Applied Sciences',
    permissions: [
      'create_requisition', 'approve_requisition', 'reject_requisition',
      'view_reports',
    ],
  },
  {
    role: 'department_user', firstName: 'Department', lastName: 'User',
    email: 'staff@uwu.ac.lk', employeeId: 'UWU-DEP-002',
    department: 'Applied Sciences', faculty: 'Applied Sciences',
    permissions: [
      'create_requisition', 'ai_analysis',
    ],
  },
  // ─── Operations & Logistics Roles ───
  {
    role: 'store_manager', firstName: 'Store', lastName: 'Manager',
    email: 'stores@uwu.ac.lk', employeeId: 'UWU-OPS-001',
    department: 'Supplies Division',
    permissions: ROLE_PERMISSIONS['store_manager'] || [
      'record_grn', 'manage_inventory', 'view_reports',
    ],
  },
  // ─── External Roles ───
  {
    role: 'supplier', firstName: 'Demo', lastName: 'Supplier',
    email: 'supplier@vendor.lk', employeeId: 'UWU-EXT-001',
    department: 'Supplies Division',
    permissions: ROLE_PERMISSIONS['supplier'] || [
      'submit_bid', 'submit_appeal', 'request_debriefing',
    ],
  },
  // ─── Oversight Roles ───
  {
    role: 'auditor', firstName: 'System', lastName: 'Auditor',
    email: 'auditor@uwu.ac.lk', employeeId: 'UWU-OVR-001',
    department: 'Registrar Office',
    permissions: [
      'view_reports',
    ],
  },
  {
    role: 'guest', firstName: 'Guest', lastName: 'Viewer',
    email: 'guest@uwu.ac.lk', employeeId: 'UWU-OVR-002',
    permissions: [],
  },
];

const seed = async () => {
  try {
    await connectDB();

    // ── 1. Seed Roles ─────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║        UWU Smart Procurement System              ║');
    console.log('║        Database Seed Script                      ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    console.log('─── Phase 1: Seeding Roles ───────────────────────');
    await Role.deleteMany({});
    for (const role of ROLES) {
      await Role.create({ ...role, tenantId: 'uwu-main' });
      console.log(`  ✓ Role: ${role.name.padEnd(24)} (${role.slug}) — hierarchy: ${role.hierarchy}`);
    }
    console.log(`  → ${ROLES.length} roles seeded.\n`);

    // ── 2. Seed Users ─────────────────────────────────────────────
    console.log('─── Phase 2: Seeding Users ───────────────────────');
    await User.deleteMany({});
    for (const user of DEMO_USERS) {
      await User.create({
        ...user,
        password: 'Demo@1234',
        tenantId: 'uwu-main',
        isActive: true,
        isEmailVerified: true,
      });
      console.log(`  ✓ ${user.role.padEnd(22)} → ${user.email}`);
    }
    console.log(`  → ${DEMO_USERS.length} users seeded.\n`);

    // ── Summary ───────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════');
    console.log(`  ✅ ${ROLES.length} Roles + ${DEMO_USERS.length} Users seeded successfully!`);
    console.log('  🔑 Password for all demo accounts: Demo@1234');
    console.log('  🏢 Tenant: uwu-main');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('  Login credentials:');
    DEMO_USERS.forEach(u => {
      console.log(`    ${u.role.padEnd(22)} : ${u.email}`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seed();
