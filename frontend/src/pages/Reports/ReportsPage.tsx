import { useState, useMemo } from 'react'
import { Card, Typography, Row, Col, Table, Select, Space, Progress, Tabs, Tag, Divider } from 'antd'
import { BarChartOutlined, TeamOutlined, UserOutlined, CalendarOutlined, TrophyOutlined, RiseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

import { MOCK_USERS } from '@/mocks'
import { useDataStore } from '@/store/dataStore'
import type { DealStatus } from '@/types'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { DEAL_COLUMNS } from '@/pages/Deals/DealsList/DealsBoardView'

const { Title, Text } = Typography
const { Option } = Select

const MONTH_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const m = dayjs().subtract(i, 'month')
  return { value: m.format('YYYY-MM'), label: m.format('MMMM YYYY') }
})

interface ManagerRow {
  id: string; name: string; clients: number; activeDeals: number;
  wonDeals: number; lostDeals: number; wonAmount: number; convRate: number; activitiesCount: number
}

export default function ReportsPage() {
  const [period, setPeriod] = useState(MONTH_OPTIONS[0].value)
  const [managerFilter, setManagerFilter] = useState('')
  const { deals, clients, activities } = useDataStore()

  const managers = MOCK_USERS.filter((u) => u.role === 'manager')
  const periodStart = dayjs(period + '-01').startOf('month')
  const periodEnd = dayjs(period + '-01').endOf('month')
  const inPeriod = (date: string) => dayjs(date).isAfter(periodStart) && dayjs(date).isBefore(periodEnd)

  const managerRows: ManagerRow[] = managers
    .filter((m) => !managerFilter || m.id === managerFilter)
    .map((m) => {
      const mDeals = deals.filter((d) => d.managerId === m.id)
      const won = mDeals.filter((d) => d.status === 'won' && inPeriod(d.updatedAt))
      const lost = mDeals.filter((d) => d.status === 'lost' && inPeriod(d.updatedAt))
      const active = mDeals.filter((d) => !['won', 'lost'].includes(d.status))
      const closed = [...won, ...lost]
      const acts = activities.filter((a) => a.managerId === m.id && inPeriod(a.date))
      return {
        id: m.id, name: m.name,
        clients: clients.filter((c) => c.managerId === m.id).length,
        activeDeals: active.length, wonDeals: won.length, lostDeals: lost.length,
        wonAmount: won.reduce((s, d) => s + (d.amount ?? 0), 0),
        convRate: closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0,
        activitiesCount: acts.length,
      }
    })

  const funnelDeals = deals.filter((d) => !managerFilter || d.managerId === managerFilter)
  const funnelData = DEAL_COLUMNS.map((col) => {
    const colDeals = funnelDeals.filter((d) => d.status === col.status)
    return { ...col, count: colDeals.length, amount: colDeals.reduce((s, d) => s + (d.amount ?? 0), 0) }
  })
  const maxFunnel = Math.max(...funnelData.map((f) => f.count), 1)

  const clientsData = [
    { label: 'Лиды',      value: clients.filter((c) => c.status === 'lead').length,     color: '#1677ff' },
    { label: 'Активные',  value: clients.filter((c) => c.status === 'active').length,   color: '#52c41a' },
    { label: 'Постоянные',value: clients.filter((c) => c.status === 'regular').length,  color: '#722ed1' },
    { label: 'Архивные',  value: clients.filter((c) => c.status === 'archived').length, color: '#d9d9d9' },
  ]
  const totalClients = clientsData.reduce((s, c) => s + c.value, 0)

  const activitiesInPeriod = activities.filter((a) => inPeriod(a.date) && (!managerFilter || a.managerId === managerFilter))
  const actByType = [
    { label: 'Звонки',  value: activitiesInPeriod.filter((a) => a.type === 'call').length,    color: '#52c41a' },
    { label: 'Email',   value: activitiesInPeriod.filter((a) => a.type === 'email').length,   color: '#1677ff' },
    { label: 'Встречи', value: activitiesInPeriod.filter((a) => a.type === 'meeting').length, color: '#722ed1' },
    { label: 'Заметки', value: activitiesInPeriod.filter((a) => a.type === 'note').length,    color: '#fa8c16' },
  ]

  const managerColumns: ColumnsType<ManagerRow> = [
    { title: 'Менеджер', key: 'name', render: (_, r) => <UserAvatar userId={r.id} showName showTooltip={false} /> },
    { title: 'Клиентов', dataIndex: 'clients', key: 'clients', align: 'center' },
    { title: 'Сделок', dataIndex: 'activeDeals', key: 'active', align: 'center' },
    { title: 'Закрыто', key: 'closed', align: 'center', render: (_, r) => <Space size={4}><Tag color="green">{r.wonDeals} ✓</Tag>{r.lostDeals > 0 && <Tag color="red">{r.lostDeals} ✗</Tag>}</Space> },
    { title: 'Выручка', dataIndex: 'wonAmount', key: 'amount', align: 'right', render: (v) => v ? <Text strong style={{ color: '#52c41a' }}>{v.toLocaleString('ru-RU')} ₽</Text> : '—', sorter: (a, b) => a.wonAmount - b.wonAmount, defaultSortOrder: 'descend' },
    { title: 'Конверсия', dataIndex: 'convRate', key: 'conv', align: 'center', render: (v) => <Space><Progress percent={v} size="small" style={{ width: 64 }} showInfo={false} strokeColor={v >= 50 ? '#52c41a' : v >= 25 ? '#faad14' : '#ff4d4f'} /><Text style={{ fontSize: 12 }}>{v}%</Text></Space> },
    { title: 'Активностей', dataIndex: 'activitiesCount', key: 'acts', align: 'center' },
  ]

  const totalWon = managerRows.reduce((s, r) => s + r.wonAmount, 0)
  const totalWonDeals = managerRows.reduce((s, r) => s + r.wonDeals, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Отчёты</Title>
        <Space>
          <Select value={period} onChange={setPeriod} style={{ width: 160 }}>
            {MONTH_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
          <Select value={managerFilter || undefined} onChange={(v) => setManagerFilter(v ?? '')} style={{ width: 180 }} placeholder="Все менеджеры" allowClear>
            {managers.map((m) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
          </Select>
        </Space>
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Выручка за период', value: `${totalWon.toLocaleString('ru-RU')} ₽`, color: '#52c41a', icon: <TrophyOutlined /> },
          { label: 'Закрытых сделок', value: totalWonDeals, color: '#1677ff', icon: <RiseOutlined /> },
          { label: 'Активностей', value: activitiesInPeriod.length, color: '#722ed1', icon: <CalendarOutlined /> },
          { label: 'Всего клиентов', value: totalClients, color: '#fa8c16', icon: <TeamOutlined /> },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={6}>
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '16px 20px' } }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{s.label}</Text>
                  <Text strong style={{ fontSize: 22, color: s.color }}>{s.value}</Text>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 18 }}>{s.icon}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      <Tabs items={[
        {
          key: 'managers', label: <span><UserOutlined style={{ marginRight: 4 }} />Менеджеры</span>,
          children: <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}><Table dataSource={managerRows} columns={managerColumns} rowKey="id" size="middle" pagination={false} /></Card>,
        },
        {
          key: 'funnel', label: <span><BarChartOutlined style={{ marginRight: 4 }} />Воронка</span>,
          children: (
            <Card style={{ borderRadius: 12 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                {funnelData.map((f) => (
                  <div key={f.status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Space><div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color }} /><Text strong style={{ fontSize: 14 }}>{f.label}</Text></Space>
                      <Space size={16}><Text type="secondary">{f.count} сделок</Text><Text strong>{f.amount.toLocaleString('ru-RU')} ₽</Text></Space>
                    </div>
                    <Progress percent={Math.round((f.count / maxFunnel) * 100)} showInfo={false} strokeColor={f.color} size={['100%', 14]} style={{ borderRadius: 8 }} />
                  </div>
                ))}
              </Space>
            </Card>
          ),
        },
        {
          key: 'clients', label: <span><TeamOutlined style={{ marginRight: 4 }} />Клиенты</span>,
          children: (
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="По статусам" style={{ borderRadius: 12 }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {clientsData.map((c) => (
                      <div key={c.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text>{c.label}</Text>
                          <Space><Text strong>{c.value}</Text><Text type="secondary" style={{ fontSize: 12 }}>({totalClients > 0 ? Math.round((c.value / totalClients) * 100) : 0}%)</Text></Space>
                        </div>
                        <Progress percent={totalClients > 0 ? Math.round((c.value / totalClients) * 100) : 0} showInfo={false} strokeColor={c.color} size="small" />
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="По источникам" style={{ borderRadius: 12 }}>
                  {(() => {
                    const sources: Record<string, number> = {}
                    clients.forEach((c) => { const s = c.source ?? 'Не указан'; sources[s] = (sources[s] ?? 0) + 1 })
                    const entries = Object.entries(sources).sort((a, b) => b[1] - a[1])
                    const max = entries[0]?.[1] ?? 1
                    return (
                      <Space direction="vertical" style={{ width: '100%' }} size={10}>
                        {entries.map(([src, cnt]) => (
                          <div key={src}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><Text>{src}</Text><Text strong>{cnt}</Text></div>
                            <Progress percent={Math.round((cnt / max) * 100)} showInfo={false} strokeColor="#667eea" size="small" />
                          </div>
                        ))}
                      </Space>
                    )
                  })()}
                </Card>
              </Col>
            </Row>
          ),
        },
        {
          key: 'activities', label: <span><CalendarOutlined style={{ marginRight: 4 }} />Активности</span>,
          children: (
            <Card title={`Активности за ${dayjs(period + '-01').format('MMMM YYYY')}`} style={{ borderRadius: 12 }}>
              <Row gutter={[16, 16]}>
                {actByType.map((a) => (
                  <Col key={a.label} xs={12} sm={6}>
                    <div style={{ textAlign: 'center', padding: '20px 12px', background: a.color + '10', borderRadius: 12, border: `1px solid ${a.color}30` }}>
                      <div style={{ fontSize: 32, fontWeight: 700, color: a.color }}>{a.value}</div>
                      <Text type="secondary" style={{ fontSize: 13 }}>{a.label}</Text>
                    </div>
                  </Col>
                ))}
                <Col span={24}>
                  <Divider style={{ margin: '16px 0' }} />
                  <Text type="secondary" style={{ fontSize: 13 }}>Итого активностей за период: <Text strong>{activitiesInPeriod.length}</Text></Text>
                </Col>
              </Row>
            </Card>
          ),
        },
      ]} />
    </div>
  )
}
