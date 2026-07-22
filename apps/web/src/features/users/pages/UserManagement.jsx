import UserAuditPage from '../../reports/pages/UserAuditPage';

/**
 * User Management Page
 * Merged with User Audit & Directory to maintain a single unified interface.
 */
export default function UserManagement() {
  return <UserAuditPage defaultTab="users" />;
}

