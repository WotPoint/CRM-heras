import { Layout, Input, Badge, Button, Dropdown, Avatar, Space } from 'antd'
import {
  BellOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { MenuProps } from 'antd'

const { Header: AntHeader } = Layout

export function Header() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuthStore()

  const initials = currentUser?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const profileMenu: MenuProps = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: currentUser?.name,
        disabled: true,
        style: { cursor: 'default', color: '#666' },
      },
      { type: 'divider' },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Настройки',
        onClick: () => navigate('/settings'),
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Выйти',
        danger: true,
        onClick: () => {
          logout()
          navigate('/login')
        },
      },
    ],
  }

  const addMenu: MenuProps = {
    items: [
      { key: 'client', label: 'Добавить клиента', onClick: () => navigate('/clients?add=1') },
      { key: 'deal', label: 'Создать сделку', onClick: () => navigate('/deals?add=1') },
      { key: 'task', label: 'Добавить задачу', onClick: () => navigate('/tasks?add=1') },
      { key: 'activity', label: 'Записать активность', onClick: () => navigate('/activities?add=1') },
    ],
  }

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 56,
      }}
    >
      {/* Поиск */}
      <Input
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
        placeholder="Поиск клиентов, сделок..."
        style={{ width: 320, borderRadius: 8 }}
        variant="filled"
      />

      {/* Правая часть */}
      <Space size={16}>
        <Dropdown menu={addMenu} trigger={['click']} placement="bottomRight">
          <Button type="primary" icon={<PlusOutlined />}>
            Добавить
          </Button>
        </Dropdown>

        <Badge count={3} size="small">
          <Button
            shape="circle"
            icon={<BellOutlined />}
            style={{ border: 'none', background: '#f5f5f5' }}
          />
        </Badge>

        <Dropdown menu={profileMenu} trigger={['click']} placement="bottomRight">
          <Avatar
            size={34}
            style={{ background: '#1677ff', cursor: 'pointer' }}
          >
            {initials}
          </Avatar>
        </Dropdown>
      </Space>
    </AntHeader>
  )
}
