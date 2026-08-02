/**
 * Role Middleware - Dynamic role checking for 15 UWU RBAC roles
 * Aligned with the 2024 GOSL Procurement Guidelines and UWU multi-tenant SaaS architecture.
 *
 * All role constants, permissions, and access maps are imported from the shared
 * `packages/types/rbac.config.js` — the single source of truth for RBAC/PBAC rules.
 */
const { forbidden } = require('../utils/response');
const {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_ACCESS_MAP,
  ROLE_PERMISSIONS,
  CROSS_TENANT_ROLES,
  READ_ONLY_ROLES,
  APPROVAL_THRESHOLDS,
  WORKFLOW_PHASE_ROLES,
  isReadOnlyRole,
  isCrossTenantRole,
  canAdvancePhase,
} = require('../../../../packages/types/rbac.config');

// ─── Middleware: Require Minimum Role Level ─────────────────────
const requireMinRole = (minRole) => (req, res, next) => {
  const userLevel = ROLE_HIERARCHY[req.user?.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
  if (userLevel < requiredLevel) {
    return forbidden(res, 'Insufficient authority level for this action.');
  }
  next();
};

// ─── Middleware: Check Module Access ────────────────────────────
const requireModuleAccess = (moduleName) => (req, res, next) => {
  const role = req.user?.role;
  if (!role) return forbidden(res, 'No role assigned.');
  if (role === ROLES.SUPER_ADMIN) return next(); // Super admin bypasses all checks
  const accessibleModules = ROLE_ACCESS_MAP[role] || [];
  if (!accessibleModules.includes(moduleName)) {
    return forbidden(res, `Your role '${role}' does not have access to the '${moduleName}' module.`);
  }
  next();
};

// ─── Middleware: Approval Threshold (2024 GOSL Guidelines) ──────
const checkApprovalThreshold = (req, res, next) => {
  const amount = req.body.totalEstimatedCost || req.body.amount || 0;
  const role = req.user?.role;

  const maxAmount = APPROVAL_THRESHOLDS[role] || 0;
  if (amount > maxAmount && role !== ROLES.SUPER_ADMIN) {
    return forbidden(res, `Amount exceeds your approval authority (max: LKR ${maxAmount.toLocaleString()}). Requires committee approval.`);
  }
  next();
};

// ─── Middleware: Tenant-Scoped Faculty Check ────────────────────
// Normalizes faculty names so that "Faculty of Medicine", "Medicine", and "fom" all match.
const FACULTY_CODE_MAP = {
  fom: 'medicine',
  fots: 'technological studies',
  foas: 'applied sciences',
  foahs: 'animal science',
  'fom-mgt': 'management',
  supplies: 'supplies division',
  works: 'works division',
  'vc-office': 'vice chancellor',
};
const normalizeFaculty = (val) => {
  if (!val) return '';
  const lower = val.trim().toLowerCase();
  // If it's a known code (e.g., "fom"), map it
  if (FACULTY_CODE_MAP[lower]) return FACULTY_CODE_MAP[lower];
  // Strip common prefixes like "Faculty of "
  return lower
    .replace(/^faculty of\s+/i, '')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/[''\u2019]s\s+/g, 's ')
    .trim();
};

const requireSameFaculty = (req, res, next) => {
  const role = req.user?.role;
  // Cross-tenant roles bypass faculty checks
  if (isCrossTenantRole(role)) return next();

  // For faculty-scoped roles, ensure request is within their faculty
  const targetFaculty = req.body?.faculty || req.query?.faculty || req.params?.faculty;
  if (targetFaculty && req.user?.faculty) {
    const normalizedTarget = normalizeFaculty(targetFaculty);
    const normalizedUser = normalizeFaculty(req.user.faculty);
    // Check if either contains the other (handles "Medicine" vs "Faculty of Medicine" etc.)
    if (normalizedTarget !== normalizedUser && !normalizedTarget.includes(normalizedUser) && !normalizedUser.includes(normalizedTarget)) {
      return forbidden(res, 'You can only access resources within your own faculty.');
    }
  }
  next();
};

// ─── Middleware: Read-Only Guard (auditor, guest) ───────────────
// Blocks non-GET (write) requests for read-only roles.
const readOnlyGuard = (req, res, next) => {
  const role = req.user?.role;
  if (isReadOnlyRole(role) && req.method !== 'GET') {
    return forbidden(res, `Your role '${role}' has read-only access and cannot perform write operations.`);
  }
  next();
};

// ─── Middleware: Workflow Phase Authorization ───────────────────
// Checks that the current user's role is authorized to act at the
// given procurement workflow phase. The phase is read from the
// resource being acted upon (req.resource.status or req.body.stage).
const requireWorkflowPhase = (req, res, next) => {
  const role = req.user?.role;
  // Determine the current phase from the resource or request body
  const phase = req.resource?.status || req.body?.currentPhase || req.body?.stage;

  if (!phase) {
    // If no phase is available, skip (let the service layer validate)
    return next();
  }

  if (!canAdvancePhase(role, phase)) {
    return forbidden(res, `Your role '${role}' is not authorized to act at the '${phase}' workflow stage.`);
  }
  next();
};

// ─── Middleware: Owner or Roles Guard ───────────────────────────
// Allows access if the user is the owner of the resource OR has one
// of the specified roles. Useful for supplier-scoped endpoints.
const requireOwnerOrRoles = (ownerField, ...roles) => (req, res, next) => {
  const role = req.user?.role;
  if (role === ROLES.SUPER_ADMIN) return next();

  // Check if user has one of the allowed roles
  if (roles.includes(role)) return next();

  // Check if user is the owner of the resource
  const ownerId = req.resource?.[ownerField]?.toString?.() || req.resource?.[ownerField];
  if (ownerId && ownerId === req.user._id.toString()) return next();

  return forbidden(res, 'You can only access your own resources or require a higher role.');
};

module.exports = {
  requireMinRole,
  requireModuleAccess,
  checkApprovalThreshold,
  requireSameFaculty,
  readOnlyGuard,
  requireWorkflowPhase,
  requireOwnerOrRoles,
  ROLE_HIERARCHY,
  ROLE_ACCESS_MAP,
  ROLE_PERMISSIONS,
};
