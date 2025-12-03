import { Navigate } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';
import type { UserRole } from '../utils/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, userRole, isLoading } = useUserStore();

  const hasTokenInStorage = typeof window !== 'undefined' && !!localStorage.getItem('authToken');

  if (isLoading || (hasTokenInStorage && !userRole)) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#F4F8FB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#098289] mx-auto mb-4"></div>
          <p className="text-gray-600 font-sf">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    console.log('🚫 User not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log(`🚫 User role "${userRole}" not allowed. Allowed roles: ${allowedRoles.join(', ')}. Redirecting to /login`);
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

