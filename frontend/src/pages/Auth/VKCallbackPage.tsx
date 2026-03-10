import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Spin, Typography } from 'antd'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api'

const { Text } = Typography

export default function VKCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuthStore()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code = searchParams.get('code')
    if (!code) {
      navigate('/login?vk_error=no_token', { replace: true })
      return
    }

    authApi.exchangeVkCode(code)
      .then(({ token }) => loginWithToken(token))
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => navigate('/login?vk_error=auth_failed', { replace: true }))
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Spin size="large" />
      <Text style={{ color: '#fff', fontSize: 16 }}>Выполняется вход через VK...</Text>
    </div>
  )
}
