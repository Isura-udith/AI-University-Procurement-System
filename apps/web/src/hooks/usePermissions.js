/**
 * ─────────────────────────────────────────────────────────────
 * usePermissions Hook — RBAC/PBAC utility for UWU Smart Procurement System
 *
 * Provides role-check and permission-check helpers using the
 * correct 15-role enum. Replaces the legacy role names
 * (vice_chancellor, registrar, hod, deputy_bursar) with the
 * canonical role slugs from the shared rbac.config.
 * ─────────────────────────────────────────────────────────────
 */
import { useSelector } from 'react-redux';
import { ROLE_PERMISSIONS, PERMISSIONS } from '../constants/permissions';

export function usePermissions() {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role;

  /** Check if the user has one of the given roles */
  const hasRole = (...roles) => roles.includes(role);

  /**
   * Check if the user has a specific permission.
   * Merges user-specific permissions with role defaults.
   * super_admin always returns true.
   */
  const hasPermission = (...perms) => {
    if (role === 'super_admin') return true;
    const userPerms = user?.permissions || [];
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    const effectivePerms = [...new Set([...userPerms, ...rolePerms])];
    return perms.some(p => effectivePerms.includes(p));
  };

  // ─── Role-based convenience checks ──────────────────────────

  /** System administrators (super_admin, admin) */
  const isAdmin = () => hasRole('super_admin', 'admin');

  /** Roles in the approval chain */
  const canApprove = () => hasRole(
    'department_head', 'dean', 'procurement_officer',
    'bursar', 'admin', 'vc', 'super_admin'
  );

  /** Read-only roles (auditor, guest) — cannot perform write actions */
  const isReadOnly = () => hasRole('auditor', 'guest');

  /** Cross-tenant roles (see all faculties) */
  const isCrossTenant = () => hasRole(
    'super_admin', 'admin', 'vc', 'bursar',
    'procurement_officer', 'auditor'
  );

  // ─── Permission-based convenience checks ────────────────────

  const canCreateRequisition = () => hasPermission(PERMISSIONS.CREATE_REQUISITION);
  const canManageVendors = () => hasPermission(PERMISSIONS.MANAGE_VENDORS);
  const canManageFinance = () => hasPermission(PERMISSIONS.MANAGE_BUDGET, PERMISSIONS.PROCESS_PAYMENT);
  const canRecordGRN = () => hasPermission(PERMISSIONS.RECORD_GRN);
  const canSubmitBid = () => hasPermission(PERMISSIONS.SUBMIT_BID);
  const canSignContract = () => hasPermission(PERMISSIONS.SIGN_CONTRACT, PERMISSIONS.SIGN_LOA);
  const canEvaluateBid = () => hasPermission(PERMISSIONS.EVALUATE_BID);
  const canManageUsers = () => hasPermission(PERMISSIONS.MANAGE_USERS);
  const canUseAI = () => hasPermission(PERMISSIONS.AI_ANALYSIS);
  const canDelegateAuthority = () => hasPermission(PERMISSIONS.DELEGATE_AUTHORITY);

  return {
    user,
    role,
    hasRole,
    hasPermission,
    isAdmin,
    canApprove,
    isReadOnly,
    isCrossTenant,
    canCreateRequisition,
    canManageVendors,
    canManageFinance,
    canRecordGRN,
    canSubmitBid,
    canSignContract,
    canEvaluateBid,
    canManageUsers,
    canUseAI,
    canDelegateAuthority,
  };
}

export default usePermissions;
