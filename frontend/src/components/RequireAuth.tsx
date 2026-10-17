import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { EmailListSkeleton } from './ui';

/**
 * Wraps routes that require authentication.
 * Shows skeleton while session loads; redirects to /login if unauthenticated.
 */
export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-bg flex flex-col">
        <div className="flex flex-1">
          <div className="w-64 bg-white border-r border-surface-border animate-pulse" />
          <div className="flex-1 p-6">
            <EmailListSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
