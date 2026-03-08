import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PrivateRoute } from './PrivateRoute'

// Pages — lazy imports для быстрой загрузки
import { lazy, Suspense } from 'react'
import { Spin } from 'antd'

const LoginPage = lazy(() => import('@/pages/Login/LoginPage'))
const ChangePasswordPage = lazy(() => import('@/pages/ChangePassword/ChangePasswordPage'))
const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'))
const ClientsListPage = lazy(() => import('@/pages/Clients/ClientsList/ClientsListPage'))
const ClientDetailPage = lazy(() => import('@/pages/Clients/ClientDetail/ClientDetailPage'))
const DealsListPage = lazy(() => import('@/pages/Deals/DealsList/DealsListPage'))
const DealDetailPage = lazy(() => import('@/pages/Deals/DealDetail/DealDetailPage'))
const ActivitiesPage = lazy(() => import('@/pages/Activities/ActivitiesPage'))
const TasksPage = lazy(() => import('@/pages/Tasks/TasksPage'))
const ReportsPage = lazy(() => import('@/pages/Reports/ReportsPage'))
const AdminUsersPage = lazy(() => import('@/pages/Admin/Users/AdminUsersPage'))
const SettingsPage = lazy(() => import('@/pages/Settings/SettingsPage'))
const EmailPage = lazy(() => import('@/pages/Email/EmailPage'))
const VKCallbackPage = lazy(() => import('@/pages/Auth/VKCallbackPage'))

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <Spin size="large" />
  </div>
)

const withSuspense = (component: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{component}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/auth/vk',
    element: withSuspense(<VKCallbackPage />),
  },
  {
    // Change password — requires auth but bypasses mustChangePassword guard
    element: <PrivateRoute />,
    children: [
      { path: '/change-password', element: withSuspense(<ChangePasswordPage />) },
    ],
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
          { path: '/clients', element: withSuspense(<ClientsListPage />) },
          { path: '/clients/:id', element: withSuspense(<ClientDetailPage />) },
          { path: '/deals', element: withSuspense(<DealsListPage />) },
          { path: '/deals/:id', element: withSuspense(<DealDetailPage />) },
          { path: '/activities', element: withSuspense(<ActivitiesPage />) },
          { path: '/tasks', element: withSuspense(<TasksPage />) },
          // Только supervisor и admin
          {
            element: <PrivateRoute roles={['supervisor', 'admin']} />,
            children: [{ path: '/reports', element: withSuspense(<ReportsPage />) }],
          },
          // Только admin
          {
            element: <PrivateRoute roles={['admin']} />,
            children: [{ path: '/admin/users', element: withSuspense(<AdminUsersPage />) }],
          },
          { path: '/email', element: withSuspense(<EmailPage />) },
          { path: '/settings', element: withSuspense(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
