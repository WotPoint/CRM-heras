import { useState } from 'react'
import { Layout, Menu, Avatar, Typography, Tooltip } from 'antd'
import {
  DashboardOutlined, TeamOutlined, DollarOutlined,
  CalendarOutlined, CheckSquareOutlined, BarChartOutlined,
  UserOutlined, SettingOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const { Sider } = Layout
const { Text } = Typography

const ICON_SIZE = 18

const NAV_ITEMS = [
  { key: '/dashboard',   Icon: DashboardOutlined,  label: 'Рабочий стол', roles: ['manager', 'supervisor', 'admin'] },
  { key: '/clients',     Icon: TeamOutlined,        label: 'Клиенты',      roles: ['manager', 'supervisor', 'admin'] },
  { key: '/deals',       Icon: DollarOutlined,      label: 'Сделки',       roles: ['manager', 'supervisor', 'admin'] },
  { key: '/activities',  Icon: CalendarOutlined,    label: 'Активности',   roles: ['manager', 'supervisor', 'admin'] },
  { key: '/tasks',       Icon: CheckSquareOutlined, label: 'Задачи',       roles: ['manager', 'supervisor', 'admin'] },
  { key: '/reports',     Icon: BarChartOutlined,    label: 'Отчёты',       roles: ['supervisor', 'admin'] },
  { key: '/admin/users', Icon: UserOutlined,        label: 'Пользователи', roles: ['admin'] },
  { key: '/settings',    Icon: SettingOutlined,     label: 'Настройки',    roles: ['manager', 'supervisor', 'admin'] },
]

const ROLE_LABEL: Record<string, string> = {
  manager: 'Менеджер',
  supervisor: 'Руководитель',
  admin: 'Администратор',
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, logout, hasRole } = useAuthStore()

  const visibleItems = NAV_ITEMS
    .filter((item) => item.roles.some((role) => hasRole(role as 'manager' | 'supervisor' | 'admin')))
    .map(({ key, Icon, label }) => ({
      key,
      icon: <Icon style={{ fontSize: ICON_SIZE }} />,
      label,
    }))

  const selectedKey = '/' + location.pathname.split('/')[1]

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = currentUser?.name
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

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
        overflow: 'hidden',
        background: '#001529',
      }}
    >
      {/* Flex-обёртка на всю высоту */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Логотип + кнопка сворачивания */}
        <div style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {!collapsed && (
            <Text strong style={{ color: '#fff', fontSize: 15, letterSpacing: 0.5 }}>
              CRM Heras
            </Text>
          )}
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: ICON_SIZE, lineHeight: 1 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </div>

        {/* Меню — занимает всё оставшееся место */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={visibleItems}
            onClick={({ key }) => navigate(key)}
            inlineIndent={16}
            style={{ borderRight: 0, background: 'transparent', paddingTop: 4 }}
          />
        </div>

        {/* Пользователь внизу — flex child, без position:absolute */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 16px',
        }}>
          {!collapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar size={32} style={{ background: '#667eea', flexShrink: 0 }}>
                  {initials}
                </Avatar>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <Text ellipsis style={{ color: '#fff', display: 'block', fontSize: 13, lineHeight: '18px' }}>
                    {currentUser?.name}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: '16px' }}>
                    {ROLE_LABEL[currentUser?.role ?? 'manager']}
                  </Text>
                </div>
              </div>
              <div
                onClick={handleLogout}
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
              >
                <LogoutOutlined style={{ fontSize: 15 }} />
                Выйти
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Tooltip title={currentUser?.name} placement="right">
                <Avatar size={32} style={{ background: '#667eea' }}>
                  {initials}
                </Avatar>
              </Tooltip>
              <Tooltip title="Выйти" placement="right">
                <LogoutOutlined
                  onClick={handleLogout}
                  style={{ color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 16 }}
                />
              </Tooltip>
            </div>
          )}
        </div>

      </div>
    </Sider>
  )
}
