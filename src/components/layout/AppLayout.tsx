import { Layout, theme } from 'antd'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const { Content } = Layout

export function AppLayout() {
  const { token } = theme.useToken()

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Sidebar />
      <Layout style={{ background: token.colorBgLayout }}>
        <Header />
        <Content
          style={{
            padding: 24,
            background: token.colorBgLayout,
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
