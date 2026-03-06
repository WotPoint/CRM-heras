import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

interface PrivateRouteProps {
  roles?: UserRole[]
}

export function PrivateRoute({ roles }: PrivateRouteProps) {
  const { isAuthenticated, hasRole, mustChangePassword } = useAuthStore()
  const { pathname } = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Force password change before accessing any other page
  if (mustChangePassword && pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (roles && !hasRole(...roles)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
