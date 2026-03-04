import { Card, Typography, Row, Col, Table, Space, Tag, Progress, Button, Alert } from 'antd'
import { TeamOutlined, DollarOutlined, RiseOutlined, WarningOutlined, BarChartOutlined, TrophyOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

import { MOCK_USERS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { DealStatusBadge } from '@/components/ui/StatusBadge'
import { StatCard } from './StatCard'
import { DEAL_COLUMNS } from '@/pages/Deals/DealsList/DealsBoardView'

const { Text, Title } = Typography

interface ManagerStat { managerId: string; name: string; clients: number; activeDeals: number; wonDeals: number; wonAmount: number; convRate: number }

export function SupervisorDashboard() {
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const { clients, deals, tasks, activities } = useDataStore()

  const managers = MOCK_USERS.filter((u) => u.role === 'manager')

  const managerStats: ManagerStat[] = managers.map((m) => {
    const mDeals = deals.filter((d) => d.managerId === m.id)
    const active = mDeals.filter((d) => !['won', 'lost'].includes(d.status))
    const won = mDeals.filter((d) => d.status === 'won')
    const closed = mDeals.filter((d) => ['won', 'lost'].includes(d.status))
    return {
      managerId: m.id, name: m.name,
      clients: clients.filter((c) => c.managerId === m.id).length,
      activeDeals: active.length, wonDeals: won.length,
      wonAmount: won.reduce((s, d) => s + (d.amount ?? 0), 0),
      convRate: closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0,
    }
  })

  const allActiveDeals = deals.filter((d) => !['won', 'lost'].includes(d.status))
  const allWonMonth = deals.filter((d) => d.status === 'won' && dayjs(d.updatedAt).isAfter(dayjs().startOf('month')))
  const totalPipeline = allActiveDeals.reduce((s, d) => s + (d.amount ?? 0), 0)
  const totalWonMonth = allWonMonth.reduce((s, d) => s + (d.amount ?? 0), 0)
  const overdueTasks = tasks.filter((t) => t.status !== 'done' && t.deadline && dayjs(t.deadline).isBefore(dayjs(), 'minute'))
  const staleDeals = allActiveDeals.filter((d) => dayjs(d.updatedAt).isBefore(dayjs().subtract(7, 'day')))

  const funnelData = DEAL_COLUMNS.filter((c) => !['won', 'lost'].includes(c.status)).map((col) => {
    const colDeals = allActiveDeals.filter((d) => d.status === col.status)
    return { ...col, count: colDeals.length, amount: colDeals.reduce((s, d) => s + (d.amount ?? 0), 0) }
  })
  const maxCount = Math.max(...funnelData.map((f) => f.count), 1)
  const recentActivities = [...activities].sort((a, b) => dayjs(b.date).diff(dayjs(a.date))).slice(0, 5)

  const managerColumns: ColumnsType<ManagerStat> = [
    { title: 'Менеджер', key: 'name', render: (_, r) => <UserAvatar userId={r.managerId} showName showTooltip={false} /> },
    { title: 'Клиентов', dataIndex: 'clients', key: 'clients', align: 'center' },
    { title: 'Сделок', dataIndex: 'activeDeals', key: 'activeDeals', align: 'center' },
    { title: 'Закрыто', dataIndex: 'wonDeals', key: 'wonDeals', align: 'center' },
    { title: 'Выручка', dataIndex: 'wonAmount', key: 'wonAmount', align: 'right', render: (v) => v ? `${v.toLocaleString('ru-RU')} ₽` : '—', sorter: (a, b) => a.wonAmount - b.wonAmount, defaultSortOrder: 'descend' },
    { title: 'Конверсия', dataIndex: 'convRate', key: 'convRate', align: 'center', render: (v) => <Space><Progress percent={v} size="small" style={{ width: 60 }} showInfo={false} strokeColor={v >= 50 ? '#52c41a' : v >= 25 ? '#faad14' : '#ff4d4f'} /><Text style={{ fontSize: 12 }}>{v}%</Text></Space> },
  ]

  const firstName = currentUser?.name.split(' ')[0] ?? ''
  const hour = dayjs().hour()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #434343 0%, #000 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 20, color: '#fff' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>{greeting}, {firstName}! 👋</Title>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{dayjs().format('dddd, D MMMM YYYY')} · Обзор команды</Text>
      </div>
      {(overdueTasks.length > 0 || staleDeals.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          {overdueTasks.length > 0 && <Alert type="error" showIcon icon={<WarningOutlined />} message={`${overdueTasks.length} просроченных задач в команде`} action={<Button size="small" danger onClick={() => navigate('/tasks')}>Посмотреть</Button>} style={{ borderRadius: 10, marginBottom: 8 }} />}
          {staleDeals.length > 0 && <Alert type="warning" showIcon message={`${staleDeals.length} сделок без активности более 7 дней`} action={<Button size="small" onClick={() => navigate('/deals')}>Посмотреть</Button>} style={{ borderRadius: 10 }} />}
        </div>
      )}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Клиентов всего" value={clients.length} color="#1677ff" icon={<TeamOutlined />} onClick={() => navigate('/clients')} /></Col>
        <Col xs={12} sm={6}><StatCard label="Сделок в воронке" value={allActiveDeals.length} color="#fa8c16" icon={<DollarOutlined />} onClick={() => navigate('/deals')} /></Col>
        <Col xs={12} sm={6}><StatCard label="Конвейер (₽)" value={`${(totalPipeline / 1000).toFixed(0)}K`} color="#722ed1" icon={<RiseOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Закрыто в месяце (₽)" value={`${(totalWonMonth / 1000).toFixed(0)}K`} color="#52c41a" icon={<TrophyOutlined />} /></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<Space><BarChartOutlined style={{ color: '#722ed1' }} /><span>Воронка продаж</span></Space>} extra={<Button type="link" size="small" onClick={() => navigate('/reports')}>Отчёты</Button>} style={{ borderRadius: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              {funnelData.map((f) => (
                <div key={f.status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13 }}>{f.label}</Text>
                    <Space size={12}><Tag color={f.color}>{f.count} сделок</Tag><Text type="secondary" style={{ fontSize: 12 }}>{f.amount.toLocaleString('ru-RU')} ₽</Text></Space>
                  </div>
                  <Progress percent={Math.round((f.count / maxCount) * 100)} showInfo={false} strokeColor={f.color} size="small" />
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<Space><TeamOutlined style={{ color: '#1677ff' }} /><span>Активности команды</span></Space>} extra={<Button type="link" size="small" onClick={() => navigate('/activities')}>Все</Button>} style={{ borderRadius: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {recentActivities.map((a) => {
                const client = a.clientId ? clients.find((c) => c.id === a.clientId) : null
                return (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 8, borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                        <UserAvatar userId={a.managerId} size={20} />
                        {client && <Text type="secondary" style={{ fontSize: 12 }}>→ {client.firstName} {client.lastName}</Text>}
                      </div>
                      <Text style={{ fontSize: 13 }}>{a.description}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap', marginLeft: 8 }}>{dayjs(a.date).fromNow()}</Text>
                  </div>
                )
              })}
            </Space>
          </Card>
        </Col>
        <Col xs={24}>
          <Card title={<Space><TrophyOutlined style={{ color: '#faad14' }} /><span>Эффективность менеджеров</span></Space>} style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
            <Table dataSource={managerStats} columns={managerColumns} rowKey="managerId" size="small" pagination={false} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
