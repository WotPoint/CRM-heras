import { useState } from 'react'
import { Form, Input, Button, Checkbox, Typography, Alert, Card, Space, Divider, theme } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const VK_BACKEND_URL = 'http://localhost:3001'

const VkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C5.098 10.8 4.694 8.86 4.694 8.436c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.803c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.743c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.15-3.574 2.15-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .643.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.745-.576.745z"/>
  </svg>
)

const { Title, Text, Link } = Typography

interface LoginFormValues {
  email: string
  password: string
  remember: boolean
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated } = useAuthStore()
  const { token: themeToken } = theme.useToken()
  const [error, setError] = useState<string | null>(() => {
    const vkError = searchParams.get('vk_error')
    if (vkError === 'not_linked') return 'VK аккаунт не привязан. Войдите через email и привяжите VK в настройках профиля.'
    if (vkError === 'blocked') return 'Учётная запись заблокирована.'
    if (vkError === 'token_failed' || vkError === 'server_error' || vkError === 'auth_failed') return 'Ошибка авторизации через VK. Попробуйте ещё раз.'
    return null
  })
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    const from = (location.state as { from?: string })?.from || '/dashboard'
    navigate(from, { replace: true })
    return null
  }

  const handleSubmit = async (values: LoginFormValues) => {
    setError(null)
    setLoading(true)
    const result = await login(values.email, values.password)
    setLoading(false)
    if (result.success) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.error ?? 'Ошибка входа')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        styles={{ body: { padding: '40px 40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>H</Text>
          </div>
          <Title level={3} style={{ margin: 0, marginBottom: 4 }}>
            CRM Heras
          </Title>
          <Text type="secondary">Войдите в систему</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bbb' }} />}
              placeholder="Email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bbb' }} />}
              placeholder="Пароль"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Запомнить меня</Checkbox>
              </Form.Item>
              <Link style={{ fontSize: 13 }}>Забыли пароль?</Link>
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 44,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              Войти
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '20px 0 16px' }}>или</Divider>
        <Button
          block
          size="large"
          icon={<VkIcon />}
          href={`${VK_BACKEND_URL}/api/auth/vk`}
          style={{
            height: 44,
            borderRadius: 8,
            background: '#0077ff',
            borderColor: '#0077ff',
            color: '#fff',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          Войти через VK
        </Button>

        <Divider style={{ margin: '16px 0' }} />
        <div style={{ background: themeToken.colorFillSecondary, borderRadius: 8, padding: '12px 16px' }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Тестовые аккаунты (пароль: 123456)
          </Text>
          <Space direction="vertical" size={2}>
            {[
              { email: 'manager@crm.ru', label: 'Менеджер' },
              { email: 'supervisor@crm.ru', label: 'Руководитель' },
              { email: 'admin@crm.ru', label: 'Администратор' },
            ].map(({ email, label }) => (
              <Text key={email} type="secondary" style={{ fontSize: 12 }}>
                <Text code style={{ fontSize: 11 }}>{email}</Text>
                {' — '}
                {label}
              </Text>
            ))}
          </Space>
        </div>
      </Card>
    </div>
  )
}
