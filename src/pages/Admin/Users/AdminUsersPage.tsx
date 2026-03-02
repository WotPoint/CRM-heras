import { useState } from 'react'
import {
  Card, Typography, Table, Button, Space, Tag, Modal,
  Form, Input, Select, Switch, Tooltip, message, Popconfirm, Badge,
} from 'antd'
import {
  PlusOutlined, EditOutlined, StopOutlined, CheckOutlined,
  KeyOutlined, UserOutlined, MailOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { MOCK_USERS } from '@/mocks'
import type { User, UserRole } from '@/types'
import { UserAvatar } from '@/components/ui/UserAvatar'

const { Title, Text } = Typography
const { Option } = Select

const ROLE_LABELS: Record<UserRole, string> = {
  manager: 'Менеджер',
  supervisor: 'Руководитель',
  admin: 'Администратор',
}

const ROLE_COLORS: Record<UserRole, string> = {
  manager: 'blue',
  supervisor: 'purple',
  admin: 'red',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const supervisors = users.filter((u) => u.role === 'supervisor' || u.role === 'admin')

  // ── Действия ─────────────────────────────────────────────

  const handleToggleActive = (user: User) => {
    setUsers((prev) =>
      prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u)
    )
    message.success(user.isActive ? 'Пользователь заблокирован' : 'Пользователь активирован')
  }

  const handleResetPassword = (user: User) => {
    message.success(`Временный пароль для ${user.name} отправлен на ${user.email}`)
  }

  const handleAdd = () => {
    addForm.validateFields().then((values) => {
      const newUser: User = {
        id: `u${Date.now()}`,
        name: `${values.firstName} ${values.lastName}`,
        email: values.email,
        phone: values.phone,
        role: values.role,
        supervisorId: values.supervisorId,
        isActive: true,
        createdAt: new Date().toISOString(),
      }
      setUsers((prev) => [newUser, ...prev])
      addForm.resetFields()
      setAddOpen(false)
      message.success('Пользователь создан')
    })
  }

  const handleEditOpen = (user: User) => {
    const [firstName, ...rest] = user.name.split(' ')
    editForm.setFieldsValue({
      firstName,
      lastName: rest.join(' '),
      email: user.email,
      phone: user.phone,
      role: user.role,
      supervisorId: user.supervisorId,
      isActive: user.isActive,
    })
    setEditUser(user)
  }

  const handleEditSave = () => {
    editForm.validateFields().then((values) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser!.id
            ? {
                ...u,
                name: `${values.firstName} ${values.lastName}`,
                email: values.email,
                phone: values.phone,
                role: values.role,
                supervisorId: values.supervisorId,
                isActive: values.isActive,
              }
            : u
        )
      )
      setEditUser(null)
      message.success('Данные пользователя обновлены')
    })
  }

  // ── Колонки таблицы ───────────────────────────────────────

  const columns: ColumnsType<User> = [
    {
      title: 'Пользователь',
      key: 'user',
      render: (_, u) => <UserAvatar userId={u.id} showName showTooltip={false} />,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => (
        <Text style={{ fontSize: 13 }}>
          <MailOutlined style={{ marginRight: 6, color: '#bbb' }} />
          {email}
        </Text>
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
      ),
      filters: [
        { text: 'Менеджер', value: 'manager' },
        { text: 'Руководитель', value: 'supervisor' },
        { text: 'Администратор', value: 'admin' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'error'}
          text={isActive ? 'Активен' : 'Заблокирован'}
        />
      ),
      filters: [
        { text: 'Активен', value: true },
        { text: 'Заблокирован', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Регистрация',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(d).format('D MMM YYYY')}
        </Text>
      ),
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
    },
    {
      title: 'Последний вход',
      dataIndex: 'lastLoginAt',
      key: 'lastLogin',
      render: (d) =>
        d ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).fromNow()}</Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ),
      sorter: (a, b) => (a.lastLoginAt ?? '').localeCompare(b.lastLoginAt ?? ''),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Действия',
      key: 'actions',
      align: 'right',
      render: (_, u) => (
        <Space size={4}>
          <Tooltip title="Редактировать">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEditOpen(u)} />
          </Tooltip>
          <Tooltip title={u.isActive ? 'Заблокировать' : 'Активировать'}>
            <Popconfirm
              title={u.isActive ? 'Заблокировать пользователя?' : 'Активировать пользователя?'}
              onConfirm={() => handleToggleActive(u)}
              okText="Да"
              cancelText="Нет"
            >
              <Button
                size="small"
                icon={u.isActive ? <StopOutlined /> : <CheckOutlined />}
                danger={u.isActive}
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Сбросить пароль">
            <Popconfirm
              title={`Отправить временный пароль на ${u.email}?`}
              onConfirm={() => handleResetPassword(u)}
              okText="Отправить"
              cancelText="Отмена"
            >
              <Button size="small" icon={<KeyOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ── Форма пользователя (общая для добавления и редактирования) ──

  const phoneRule = {
    validator: (_: unknown, value: string) => {
      if (!value) return Promise.resolve()
      const digits = value.replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 12)
        return Promise.reject(new Error('Введите корректный номер (10–11 цифр)'))
      return Promise.resolve()
    },
  }

  const UserFormFields = ({ supervisors }: { supervisors: User[] }) => (
    <>
      <Form.Item style={{ marginBottom: 0 }}>
        <Space.Compact style={{ width: '100%', gap: 16, display: 'flex' }}>
          <Form.Item
            name="firstName"
            label="Имя"
            style={{ flex: 1 }}
            rules={[
              { required: true, message: 'Введите имя' },
              { min: 2, message: 'Минимум 2 символа' },
              { whitespace: true, message: 'Имя не может состоять только из пробелов' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder="Имя" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Фамилия"
            style={{ flex: 1 }}
            rules={[
              { min: 2, message: 'Минимум 2 символа' },
              { whitespace: true, message: 'Фамилия не может состоять только из пробелов' },
            ]}
          >
            <Input placeholder="Фамилия" />
          </Form.Item>
        </Space.Compact>
      </Form.Item>

      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Введите email' },
          { type: 'email', message: 'Введите корректный email' },
        ]}
      >
        <Input prefix={<MailOutlined style={{ color: '#bbb' }} />} placeholder="user@company.ru" />
      </Form.Item>

      <Form.Item name="phone" label="Телефон" rules={[phoneRule]}>
        <Input placeholder="+7 900 000-00-00" />
      </Form.Item>

      <Form.Item
        name="role"
        label="Роль"
        rules={[{ required: true, message: 'Выберите роль пользователя' }]}
      >
        <Select placeholder="Выберите роль">
          <Option value="manager">Менеджер</Option>
          <Option value="supervisor">Руководитель</Option>
          <Option value="admin">Администратор</Option>
        </Select>
      </Form.Item>

      <Form.Item name="supervisorId" label="Руководитель">
        <Select placeholder="Не назначен" allowClear>
          {supervisors.map((s) => (
            <Option key={s.id} value={s.id}>{s.name}</Option>
          ))}
        </Select>
      </Form.Item>
    </>
  )

  return (
    <div>
      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Пользователи</Title>
          <Text type="secondary">{users.length} пользователей в системе</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          Добавить пользователя
        </Button>
      </div>

      {/* Сводка по ролям */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => {
          const count = users.filter((u) => u.role === role).length
          return (
            <Card key={role} size="small" style={{ borderRadius: 10, flex: 1 }}
              styles={{ body: { padding: '10px 16px' } }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{label}</Text>
              <Text strong style={{ fontSize: 20, color: ROLE_COLORS[role] === 'blue' ? '#1677ff' : ROLE_COLORS[role] === 'purple' ? '#722ed1' : '#ff4d4f' }}>
                {count}
              </Text>
            </Card>
          )
        })}
        <Card size="small" style={{ borderRadius: 10, flex: 1 }}
          styles={{ body: { padding: '10px 16px' } }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Активных</Text>
          <Text strong style={{ fontSize: 20, color: '#52c41a' }}>
            {users.filter((u) => u.isActive).length}
          </Text>
        </Card>
      </div>

      {/* Таблица */}
      <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `Всего: ${t}` }}
          rowClassName={(u) => !u.isActive ? 'ant-table-row-disabled' : ''}
        />
      </Card>

      {/* Модалка: добавить пользователя */}
      <Modal
        title="Новый пользователь"
        open={addOpen}
        onOk={handleAdd}
        onCancel={() => { addForm.resetFields(); setAddOpen(false) }}
        okText="Создать"
        cancelText="Отмена"
        width={520}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }} scrollToFirstError>
          <UserFormFields supervisors={supervisors} />
          <Form.Item
            name="password"
            label="Временный пароль"
            rules={[
              { required: true, message: 'Введите пароль' },
              { min: 6, message: 'Минимум 6 символов' },
            ]}
          >
            <Input.Password placeholder="Минимум 6 символов" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка: редактировать пользователя */}
      <Modal
        title={`Редактировать: ${editUser?.name ?? ''}`}
        open={!!editUser}
        onOk={handleEditSave}
        onCancel={() => setEditUser(null)}
        okText="Сохранить"
        cancelText="Отмена"
        width={520}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }} scrollToFirstError>
          <UserFormFields supervisors={supervisors.filter((s) => s.id !== editUser?.id)} />
          <Form.Item name="isActive" label="Статус" valuePropName="checked">
            <Switch checkedChildren="Активен" unCheckedChildren="Заблокирован" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
