import { useState, useEffect } from 'react'
import {
  Card, Typography, Form, Input, Button, Tabs, Avatar,
  Switch, Select, Divider, Space, Tag, message, Row, Col,
  Alert, Spin,
} from 'antd'
import {
  UserOutlined, LockOutlined, BellOutlined,
  DragOutlined, PlusOutlined, CheckCircleOutlined,
  DisconnectOutlined, LinkOutlined,
} from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { DEAL_COLUMNS } from '@/pages/Deals/DealsList/DealsBoardView'
import { emailApi, vkApi } from '@/api'

const { Title, Text } = Typography
const { Option } = Select

export default function SettingsPage() {
  const { currentUser, hasRole } = useAuthStore()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [searchParams, setSearchParams] = useSearchParams()

  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean; gmailEmail: string | null; watchExpiresAt: string | null
  } | null>(null)
  const [gmailLoading, setGmailLoading] = useState(true)
  const [gmailConnecting, setGmailConnecting] = useState(false)
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false)

  const [vkLinked, setVkLinked] = useState<boolean>(!!currentUser?.vkId)
  const [vkLinking, setVkLinking] = useState(false)
  const [vkUnlinking, setVkUnlinking] = useState(false)

  useEffect(() => {
    const gmailParam = searchParams.get('gmail')
    if (gmailParam === 'connected') {
      message.success('Gmail успешно подключён!')
      setSearchParams({}, { replace: true })
    } else if (gmailParam === 'error') {
      const reason = searchParams.get('reason') ?? 'unknown'
      message.error(`Ошибка подключения Gmail: ${reason}`)
      setSearchParams({}, { replace: true })
    }

    const vkParam = searchParams.get('vk')
    if (vkParam === 'linked') {
      message.success('VK аккаунт успешно привязан!')
      setVkLinked(true)
      setSearchParams({}, { replace: true })
    } else if (vkParam === 'already_used') {
      message.error('Этот VK аккаунт уже привязан к другому пользователю.')
      setSearchParams({}, { replace: true })
    } else if (vkParam === 'expired') {
      message.error('Сессия привязки истекла. Попробуйте ещё раз.')
      setSearchParams({}, { replace: true })
    } else if (vkParam === 'error') {
      message.error('Ошибка при привязке VK. Попробуйте ещё раз.')
      setSearchParams({}, { replace: true })
    }

    emailApi.status()
      .then(setGmailStatus)
      .catch(() => setGmailStatus({ connected: false, gmailEmail: null, watchExpiresAt: null }))
      .finally(() => setGmailLoading(false))
  }, [])

  const handleGmailConnect = async () => {
    setGmailConnecting(true)
    try {
      const { url } = await emailApi.authUrl()
      window.location.href = url
    } catch {
      message.error('Не удалось получить ссылку для подключения')
      setGmailConnecting(false)
    }
  }

  const handleGmailDisconnect = async () => {
    setGmailDisconnecting(true)
    try {
      await emailApi.disconnect()
      setGmailStatus({ connected: false, gmailEmail: null, watchExpiresAt: null })
      message.success('Gmail отключён')
    } catch {
      message.error('Ошибка при отключении Gmail')
    } finally {
      setGmailDisconnecting(false)
    }
  }

  const handleVkLink = async () => {
    setVkLinking(true)
    try {
      const { url } = await vkApi.getLinkUrl()
      window.location.href = url
    } catch {
      message.error('Не удалось получить ссылку для привязки VK')
      setVkLinking(false)
    }
  }

  const handleVkUnlink = async () => {
    setVkUnlinking(true)
    try {
      await vkApi.unlink()
      setVkLinked(false)
      message.success('VK аккаунт отвязан')
    } catch {
      message.error('Ошибка при отвязке VK')
    } finally {
      setVkUnlinking(false)
    }
  }

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
          scrollToFirstError
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Полное имя"
                rules={[
                  { required: true, message: 'Введите имя' },
                  { min: 2, message: 'Минимум 2 символа' },
                  { whitespace: true, message: 'Имя не может состоять только из пробелов' },
                ]}
              >
                <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Телефон"
                rules={[
                  {
                    validator: (_, value: string) => {
                      if (!value) return Promise.resolve()
                      const digits = value.replace(/\D/g, '')
                      if (digits.length < 10 || digits.length > 12)
                        return Promise.reject(new Error('Введите корректный номер (10–11 цифр)'))
                      return Promise.resolve()
                    },
                  },
                ]}
              >
                <Input placeholder="+7 900 000-00-00" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Сохранить профиль</Button>
          </Form.Item>
        </Form>

        <Divider />

        <Title level={5}>Сменить пароль</Title>
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSave} scrollToFirstError>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="currentPassword"
                label="Текущий пароль"
                rules={[{ required: true, message: 'Введите текущий пароль' }]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="newPassword"
                label="Новый пароль"
                rules={[
                  { required: true, message: 'Введите новый пароль' },
                  { min: 6, message: 'Минимум 6 символов' },
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="confirm"
                label="Подтвердите пароль"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Подтвердите новый пароль' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                      return Promise.reject(new Error('Пароли не совпадают'))
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

  const gmailTab = (
    <div style={{ maxWidth: 520 }}>
      {gmailLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : gmailStatus?.connected ? (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Gmail подключён"
            description={
              <span>
                Аккаунт: <strong>{gmailStatus.gmailEmail}</strong>
                <br />
                Входящие письма синхронизируются автоматически через push-уведомления.
              </span>
            }
          />
          <Button
            danger
            icon={<DisconnectOutlined />}
            onClick={handleGmailDisconnect}
            loading={gmailDisconnecting}
          >
            Отключить Gmail
          </Button>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Alert
            type="info"
            showIcon
            message="Gmail не подключён"
            description="Подключите свой Google аккаунт чтобы отправлять и получать письма прямо из CRM."
          />
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={handleGmailConnect}
            loading={gmailConnecting}
          >
            Подключить Gmail
          </Button>
        </Space>
      )}
    </div>
  )

  const vkTab = (
    <div style={{ maxWidth: 520 }}>
      {vkLinked ? (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="VK аккаунт привязан"
            description={
              <span>
                Вы можете входить в CRM через кнопку «Войти через VK» на странице авторизации.
              </span>
            }
          />
          <Button
            danger
            icon={<DisconnectOutlined />}
            onClick={handleVkUnlink}
            loading={vkUnlinking}
          >
            Отвязать VK аккаунт
          </Button>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Alert
            type="info"
            showIcon
            message="VK аккаунт не привязан"
            description="Привяжите VK аккаунт, чтобы входить в CRM одним кликом без пароля."
          />
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={handleVkLink}
            loading={vkLinking}
            style={{ background: '#0077ff', borderColor: '#0077ff' }}
          >
            Привязать VK аккаунт
          </Button>
        </Space>
      )}
    </div>
  )

  const tabs = [
    { key: 'profile', label: <span><UserOutlined style={{ marginRight: 4 }} />Профиль</span>, children: profileTab },
    { key: 'notifications', label: <span><BellOutlined style={{ marginRight: 4 }} />Уведомления</span>, children: notificationsTab },
    { key: 'gmail', label: <span><LinkOutlined style={{ marginRight: 4 }} />Gmail</span>, children: gmailTab },
    { key: 'vk', label: <span style={{ color: '#0077ff', fontWeight: 500 }}>VK</span>, children: vkTab },
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
