import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'

const { Title, Text } = Typography

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { clearMustChangePassword, mustChangePassword } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFinish = async (values: { currentPassword?: string; newPassword: string }) => {
    setLoading(true)
    setError(null)
    try {
      await authApi.changePassword(values.currentPassword ?? '', values.newPassword)
      clearMustChangePassword()
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
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
      }}
    >
      <Card style={{ width: 400, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <LockOutlined style={{ fontSize: 40, color: '#667eea', marginBottom: 12 }} />
          <Title level={3} style={{ margin: 0 }}>
            Смена пароля
          </Title>
          {mustChangePassword && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Для продолжения работы необходимо сменить пароль, заданный администратором
            </Text>
          )}
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          {!mustChangePassword && (
            <Form.Item
              name="currentPassword"
              label="Текущий пароль"
              rules={[{ required: true, message: 'Введите текущий пароль' }]}
            >
              <Input.Password placeholder="Текущий пароль" />
            </Form.Item>
          )}

          <Form.Item
            name="newPassword"
            label="Новый пароль"
            rules={[
              { required: true, message: 'Введите новый пароль' },
              { min: 8, message: 'Минимум 8 символов' },
            ]}
          >
            <Input.Password placeholder="Минимум 8 символов" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
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
            <Input.Password placeholder="Повторите новый пароль" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block style={{ marginTop: 8 }}>
            Сменить пароль
          </Button>
        </Form>
      </Card>
    </div>
  )
}
