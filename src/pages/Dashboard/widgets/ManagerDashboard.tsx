import { Card, Typography, Checkbox, Space, Tag, Empty, Row, Col, Button, Tooltip } from 'antd'
import {
  CheckSquareOutlined, DollarOutlined, CalendarOutlined,
  TeamOutlined, RiseOutlined, TrophyOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

import { MOCK_TASKS, MOCK_DEALS, MOCK_ACTIVITIES, MOCK_CLIENTS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import { DealStatusBadge, PriorityBadge } from '@/components/ui/StatusBadge'
import { StatCard } from './StatCard'

const { Text, Title } = Typography

export function ManagerDashboard() {
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const uid = currentUser?.id ?? ''

  // Данные текущего менеджера
  const myClients = MOCK_CLIENTS.filter((c) => c.managerId === uid)
  const myDeals = MOCK_DEALS.filter((d) => d.managerId === uid)
  const myTasks = MOCK_TASKS.filter((t) => t.assigneeId === uid)

  const activeDeals = myDeals.filter((d) => !['won', 'lost'].includes(d.status))
  const wonThisMonth = myDeals.filter((d) =>
    d.status === 'won' && dayjs(d.updatedAt).isAfter(dayjs().startOf('month'))
  )
  const todayTasks = myTasks.filter((t) => {
    if (t.status === 'done') return false
    if (!t.deadline) return false
    return dayjs(t.deadline).isToday()
  })
  const overdueTasks = myTasks.filter((t) => {
    if (t.status === 'done') return false
    return t.deadline && dayjs(t.deadline).isBefore(dayjs(), 'minute')
  })

  // Ближайшие активности (запланированные — в будущем)
  const upcomingActivities = MOCK_ACTIVITIES
    .filter((a) => a.managerId === uid && dayjs(a.date).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
    .slice(0, 3)

  // Активные сделки топ-5 по сумме
  const topDeals = [...activeDeals]
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 5)

  const hour = dayjs().hour()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
  const firstName = currentUser?.name.split(' ')[0] ?? ''

  return (
    <div>
      {/* Приветствие */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 20, color: '#fff',
      }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          {greeting}, {firstName}! 👋
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
          {dayjs().format('dddd, D MMMM YYYY')}
        </Text>
      </div>

      {/* KPI-карточки */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Мои клиенты" value={myClients.length}
            color="#1677ff" icon={<TeamOutlined />}
            onClick={() => navigate('/clients')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Сделок в работе" value={activeDeals.length}
            color="#fa8c16" icon={<DollarOutlined />}
            onClick={() => navigate('/deals')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Закрыто в этом месяце" value={wonThisMonth.length}
            color="#52c41a" icon={<TrophyOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Просрочено задач"
            value={overdueTasks.length}
            color={overdueTasks.length > 0 ? '#ff4d4f' : '#52c41a'}
            icon={<CheckSquareOutlined />}
            onClick={() => navigate('/tasks')}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Задачи на сегодня */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <CheckSquareOutlined style={{ color: '#1677ff' }} />
                <span>Задачи на сегодня</span>
                {todayTasks.length > 0 && (
                  <Tag color="blue">{todayTasks.length}</Tag>
                )}
              </Space>
            }
            extra={<Button type="link" size="small" onClick={() => navigate('/tasks')}>Все задачи</Button>}
            style={{ borderRadius: 12, height: '100%' }}
          >
            {todayTasks.length === 0 ? (
              <Empty description="Задач на сегодня нет" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {todayTasks.map((t) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', borderBottom: '1px solid #f5f5f5',
                  }}>
                    <Checkbox checked={false} />
                    <div style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13 }}>{t.title}</Text>
                      {t.deadline && (
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          <CalendarOutlined style={{ marginRight: 3 }} />
                          {dayjs(t.deadline).format('HH:mm')}
                        </Text>
                      )}
                    </div>
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        {/* Активные сделки */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <DollarOutlined style={{ color: '#fa8c16' }} />
                <span>Мои сделки в работе</span>
              </Space>
            }
            extra={<Button type="link" size="small" onClick={() => navigate('/deals')}>Все сделки</Button>}
            style={{ borderRadius: 12 }}
          >
            {topDeals.length === 0 ? (
              <Empty description="Нет активных сделок" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {topDeals.map((d) => {
                  const client = MOCK_CLIENTS.find((c) => c.id === d.clientId)
                  const isOverdue = d.deadline && dayjs(d.deadline).isBefore(dayjs())
                  return (
                    <div
                      key={d.id}
                      onClick={() => navigate(`/deals/${d.id}`)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                        background: '#fafafa', border: '1px solid #f0f0f0',
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>{d.title}</Text>
                        {client && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {client.firstName} {client.lastName}
                          </Text>
                        )}
                      </div>
                      <Space direction="vertical" align="end" size={2}>
                        <DealStatusBadge status={d.status} />
                        {d.amount ? (
                          <Text strong style={{ fontSize: 13, color: '#1677ff' }}>
                            {d.amount.toLocaleString('ru-RU')} ₽
                          </Text>
                        ) : null}
                        {d.deadline && (
                          <Tooltip title={`Дедлайн: ${dayjs(d.deadline).format('D MMM YYYY')}`}>
                            <Text style={{ fontSize: 11, color: isOverdue ? '#ff4d4f' : '#999' }}>
                              <CalendarOutlined style={{ marginRight: 2 }} />
                              {dayjs(d.deadline).format('D MMM')}
                            </Text>
                          </Tooltip>
                        )}
                      </Space>
                    </div>
                  )
                })}
              </Space>
            )}
          </Card>
        </Col>

        {/* Ближайшие активности */}
        {upcomingActivities.length > 0 && (
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#722ed1' }} />
                  <span>Запланировано</span>
                </Space>
              }
              extra={<Button type="link" size="small" onClick={() => navigate('/activities')}>Все активности</Button>}
              style={{ borderRadius: 12 }}
            >
              <Row gutter={[12, 12]}>
                {upcomingActivities.map((a) => (
                  <Col key={a.id} xs={24} sm={8}>
                    <div style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: '#f9f0ff', border: '1px solid #d3adf7',
                    }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        {dayjs(a.date).format('D MMM, HH:mm')}
                      </Text>
                      <Text style={{ fontSize: 13, display: 'block', marginTop: 2 }}>
                        {a.description}
                      </Text>
                      {a.clientId && (() => {
                        const client = MOCK_CLIENTS.find((c) => c.id === a.clientId)
                        return client ? (
                          <Text
                            style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }}
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            {client.firstName} {client.lastName}
                          </Text>
                        ) : null
                      })()}
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  )
}
