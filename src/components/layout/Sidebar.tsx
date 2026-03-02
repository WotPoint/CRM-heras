import { useState } from 'react'
import { Layout, Menu, Avatar, Typography, Divider } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  BarChartOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const { Sider } = Layout
const { Text } = Typography

const NAV_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Рабочий стол', roles: ['manager', 'supervisor', 'admin'] },
  { key: '/clients', icon: <TeamOutlined />, label: 'Клиенты', roles: ['manager', 'supervisor', 'admin'] },
  { key: '/deals', icon: <DollarOutlined />, label: 'Сделки', roles: ['manager', 'supervisor', 'admin'] },
  { key: '/activities', icon: <CalendarOutlined />, label: 'Активности', roles: ['manager', 'supervisor', 'admin'] },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Задачи', roles: ['manager', 'supervisor', 'admin'] },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Отчёты', roles: ['supervisor', 'admin'] },
  { key: '/admin/users', icon: <UserOutlined />, label: 'Пользователи', roles: ['admin'] },
  { key: '/settings', icon: <SettingOutlined />, label: 'Настройки', roles: ['manager', 'supervisor', 'admin'] },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, logout, hasRole } = useAuthStore()

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.some((role) => hasRole(role as 'manager' | 'supervisor' | 'admin'))
  ).map(({ key, icon, label }) => ({ key, icon, label }))

  const selectedKey = '/' + location.pathname.split('/')[1]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = currentUser?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={220}
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        overflow: 'auto',
        background: '#001529',
      }}
    >
      {/* Логотип */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 12px' : '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {!collapsed && (
          <Text strong style={{ color: '#fff', fontSize: 16, letterSpacing: 0.5 }}>
            CRM Heras
          </Text>
        )}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{ color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: 18 }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
      </div>

      {/* Навигация */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={visibleItems}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 0, flex: 1, marginTop: 4 }}
      />

      {/* Нижняя часть — пользователь */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: collapsed ? '12px 8px' : '12px 16px',
        }}
      >
        {!collapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Avatar size={32} style={{ background: '#1677ff', flexShrink: 0 }}>
                {initials}
              </Avatar>
              <div style={{ overflow: 'hidden' }}>
                <Text ellipsis style={{ color: '#fff', display: 'block', fontSize: 13 }}>
                  {currentUser?.name}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                  {currentUser?.role === 'manager'
                    ? 'Менеджер'
                    : currentUser?.role === 'supervisor'
                    ? 'Руководитель'
                    : 'Администратор'}
                </Text>
              </div>
            </div>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
            <div
              onClick={handleLogout}
              style={{
                color: 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                padding: '4px 0',
              }}
            >
              <LogoutOutlined />
              Выйти
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar size={32} style={{ background: '#1677ff' }}>
              {initials}
            </Avatar>
            <LogoutOutlined
              onClick={handleLogout}
              style={{ color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: 16 }}
            />
          </div>
        )}
      </div>
    </Sider>
  )
}
