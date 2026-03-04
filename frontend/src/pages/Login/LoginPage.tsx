import { useState } from 'react'
import { Form, Input, Button, Checkbox, Typography, Alert, Card, Space, Divider, theme } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const { Title, Text, Link } = Typography

interface LoginFormValues {
  email: string
  password: string
  remember: boolean
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuthStore()
  const { token: themeToken } = theme.useToken()
  const [error, setError] = useState<string | null>(null)
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

        <Divider style={{ marginTop: 24, marginBottom: 16 }} />
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
