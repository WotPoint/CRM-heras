import { useAuthStore } from '@/store/authStore'
import { ManagerDashboard } from './widgets/ManagerDashboard'
import { SupervisorDashboard } from './widgets/SupervisorDashboard'

export default function DashboardPage() {
  const { hasRole } = useAuthStore()

  if (hasRole('supervisor', 'admin')) {
    return <SupervisorDashboard />
  }

  return <ManagerDashboard />
}
