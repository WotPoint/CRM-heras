import { useEffect } from 'react'
import { Layout, Spin, Result, Button, theme } from 'antd'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'

const { Content } = Layout

export function AppLayout() {
  const { token: themeToken } = theme.useToken()
  const { loadAll, reload, loaded, loading, loadError } = useDataStore()
  const { token: authToken, logout } = useAuthStore()

  useEffect(() => {
    if (!authToken) {
      logout()
      return
    }
    if (!loaded) loadAll()
  }, [authToken])

  if (loading && !loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Result
          status="error"
          title="Не удалось загрузить данные"
          subTitle={loadError}
          extra={
            <Button type="primary" loading={loading} onClick={reload}>
              Повторить
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', background: themeToken.colorBgLayout }}>
      <Sidebar />
      <Layout style={{ background: themeToken.colorBgLayout }}>
        <Header />
        <Content
          style={{
            padding: 24,
            background: themeToken.colorBgLayout,
            minHeight: 'calc(100vh - 56px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
