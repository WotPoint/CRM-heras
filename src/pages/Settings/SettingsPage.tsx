import { useState } from 'react'
import {
  Card, Typography, Form, Input, Button, Tabs, Avatar,
  Switch, Select, Divider, Space, Tag, message, Row, Col,
} from 'antd'
import {
  UserOutlined, LockOutlined, BellOutlined,
  DragOutlined, PlusOutlined, DeleteOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { DEAL_COLUMNS } from '@/pages/Deals/DealsList/DealsBoardView'

const { Title, Text } = Typography
const { Option } = Select

export default function SettingsPage() {
  const { currentUser, hasRole } = useAuthStore()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()

  const initials = currentUser?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleProfileSave = (values: Record<string, string>) => {
    message.success('Профиль сохранён')
  }

  const handlePasswordSave = () => {
    passwordForm.validateFields().then(() => {
      message.success('Пароль изменён')
      passwordForm.resetFields()
    })
  }

  const profileTab = (
    <Row gutter={[24, 0]}>
      <Col xs={24} md={6}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Avatar size={80} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', fontSize: 28, fontWeight: 700 }}>
            {initials}
          </Avatar>
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{currentUser?.email}</Text>
            <Tag color="purple" style={{ marginTop: 6 }}>
              {currentUser?.role === 'manager' ? 'Менеджер' : currentUser?.role === 'supervisor' ? 'Руководитель' : 'Администратор'}
            </Tag>
          </div>
        </div>
      </Col>
      <Col xs={24} md={18}>
        <Form
          form={profileForm}
          layout="vertical"
          initialValues={{ name: currentUser?.name, email: currentUser?.email, phone: currentUser?.phone }}
          onFinish={handleProfileSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Полное имя" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Телефон">
                <Input placeholder="+7 900 000-00-00" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Сохранить профиль</Button>
          </Form.Item>
        </Form>

        <Divider />

        <Title level={5}>Сменить пароль</Title>
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSave}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="currentPassword" label="Текущий пароль" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="newPassword" label="Новый пароль" rules={[{ required: true, min: 6 }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="confirm"
                label="Подтвердите пароль"
                dependencies={['newPassword']}
                rules={[
                  { required: true },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                      return Promise.reject('Пароли не совпадают')
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button htmlType="submit">Изменить пароль</Button>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  )

  const notificationsTab = (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {[
        { label: 'Новый клиент назначен мне', key: 'newClient', default: true },
        { label: 'Задача просрочена', key: 'taskOverdue', default: true },
        { label: 'Сделка перешла в новый статус', key: 'dealStatus', default: true },
        { label: 'Новая активность по моему клиенту', key: 'activity', default: false },
        { label: 'Еженедельный отчёт (пятница, 18:00)', key: 'weeklyReport', default: false },
      ].map((item) => (
        <div key={item.key} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: '#fafafa', borderRadius: 8,
        }}>
          <Text>{item.label}</Text>
          <Switch defaultChecked={item.default} />
        </div>
      ))}
      <Button type="primary" onClick={() => message.success('Настройки уведомлений сохранены')}>
        Сохранить
      </Button>
    </Space>
  )

  const dealStatusesTab = hasRole('admin') ? (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Этапы воронки продаж (перетащите для изменения порядка)
      </Text>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {DEAL_COLUMNS.map((col) => (
          <div key={col.status} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: '#fafafa', borderRadius: 8,
            border: '1px solid #f0f0f0',
          }}>
            <DragOutlined style={{ color: '#bbb', cursor: 'grab' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
            <Text style={{ flex: 1 }}>{col.label}</Text>
            <Tag color={col.color}>{col.status}</Tag>
          </div>
        ))}
        <Button icon={<PlusOutlined />} style={{ marginTop: 4 }}
          onClick={() => message.info('Добавление этапов будет доступно после подключения бэкенда')}>
          Добавить этап
        </Button>
      </Space>
    </div>
  ) : null

  const tabs = [
    { key: 'profile', label: <span><UserOutlined style={{ marginRight: 4 }} />Профиль</span>, children: profileTab },
    { key: 'notifications', label: <span><BellOutlined style={{ marginRight: 4 }} />Уведомления</span>, children: notificationsTab },
    ...(hasRole('admin') ? [{ key: 'dealStatuses', label: 'Этапы сделок', children: dealStatusesTab }] : []),
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0, marginBottom: 20 }}>Настройки</Title>
      <Card style={{ borderRadius: 12 }}>
        <Tabs items={tabs} />
      </Card>
    </div>
  )
}
