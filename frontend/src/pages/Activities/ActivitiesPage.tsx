import { useMemo, useState } from 'react'
import { Card, Typography, Button, Select, Space, Tag, Tooltip, DatePicker, Divider, message } from 'antd'
import { PlusOutlined, PhoneOutlined, MailOutlined, TeamOutlined, FileTextOutlined, SwapOutlined, FilterOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'

import { MOCK_USERS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import type { Activity, ActivityType } from '@/types'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddActivityModal } from '@/components/forms/AddActivityModal'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ReactNode; color: string; label: string; bg: string }> = {
  call:          { icon: <PhoneOutlined />,    color: '#52c41a', bg: '#f6ffed', label: 'Звонок'        },
  email:         { icon: <MailOutlined />,     color: '#1677ff', bg: '#e6f4ff', label: 'Email'         },
  meeting:       { icon: <TeamOutlined />,     color: '#722ed1', bg: '#f9f0ff', label: 'Встреча'       },
  note:          { icon: <FileTextOutlined />, color: '#fa8c16', bg: '#fff7e6', label: 'Заметка'       },
  status_change: { icon: <SwapOutlined />,     color: '#13c2c2', bg: '#e6fffb', label: 'Смена статуса' },
}

const TYPE_FILTERS = [
  { value: '', label: 'Все типы' }, { value: 'call', label: 'Звонки' },
  { value: 'email', label: 'Email' }, { value: 'meeting', label: 'Встречи' }, { value: 'note', label: 'Заметки' },
]

export default function ActivitiesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { canViewManager, hasRole } = useAuthStore()
  const { activities, clients, deals, addActivity } = useDataStore()

  const [typeFilter, setTypeFilter] = useState<ActivityType | ''>('')
  const [managerFilter, setManagerFilter] = useState('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null])
  const [addOpen, setAddOpen] = useState(searchParams.get('add') === '1')
  const managers = MOCK_USERS.filter((u) => u.role === 'manager')

  const filtered = useMemo(() => {
    return activities
      .filter((a) => canViewManager(a.managerId))
      .filter((a) => !typeFilter || a.type === typeFilter)
      .filter((a) => !managerFilter || a.managerId === managerFilter)
      .filter((a) => {
        const [from, to] = dateRange
        if (!from && !to) return true
        const date = dayjs(a.date)
        if (from && date.isBefore(from, 'day')) return false
        if (to && date.isAfter(to, 'day')) return false
        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [activities, typeFilter, managerFilter, dateRange, canViewManager])

  const grouped = useMemo(() => {
    const groups: Record<string, Activity[]> = {}
    filtered.forEach((a) => { const key = dayjs(a.date).format('YYYY-MM-DD'); if (!groups[key]) groups[key] = []; groups[key].push(a) })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const handleAdd = async (data: Omit<Activity, 'id' | 'createdAt'>) => {
    try { await addActivity(data); message.success('Активность добавлена') }
    catch (e) { message.error((e as Error).message) }
  }

  const getDayLabel = (key: string) => {
    const d = dayjs(key)
    if (d.isToday()) return 'Сегодня'
    if (d.isYesterday()) return 'Вчера'
    return d.format('D MMMM YYYY')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Активности</Title>
          <Text type="secondary">{filtered.length} записей</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Добавить</Button>
      </div>
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '12px 16px' } }}>
        <Space wrap size={12} align="center">
          <FilterOutlined style={{ color: '#999' }} />
          <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 140 }}>
            {TYPE_FILTERS.map((f) => <Option key={f.value} value={f.value}>{f.label}</Option>)}
          </Select>
          {hasRole('supervisor', 'admin') && (
            <Select value={managerFilter || undefined} onChange={(v) => setManagerFilter(v ?? '')} style={{ width: 180 }} placeholder="Все менеджеры" allowClear>
              {managers.map((m) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
            </Select>
          )}
          <RangePicker format="DD.MM.YYYY" onChange={(vals) => setDateRange(vals ? [vals[0], vals[1]] : [null, null])} placeholder={['С', 'По']} style={{ width: 240 }} />
          {(typeFilter || managerFilter || dateRange[0]) && (
            <Button size="small" onClick={() => { setTypeFilter(''); setManagerFilter(''); setDateRange([null, null]) }}>Сбросить</Button>
          )}
        </Space>
      </Card>
      {grouped.length === 0 ? (
        <EmptyState description="Активностей не найдено" actionLabel="Добавить активность" onAction={() => setAddOpen(true)} />
      ) : (
        grouped.map(([dayKey, dayActivities]) => (
          <div key={dayKey} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Text strong style={{ fontSize: 14, color: '#333' }}>{getDayLabel(dayKey)}</Text>
              <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>{dayActivities.length} {dayActivities.length === 1 ? 'запись' : 'записей'}</Text>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {dayActivities.map((activity) => {
                const cfg = ACTIVITY_CONFIG[activity.type]
                const client = activity.clientId ? clients.find((c) => c.id === activity.clientId) : null
                const deal = activity.dealId ? deals.find((d) => d.id === activity.dealId) : null
                return (
                  <Card key={activity.id} size="small" style={{ borderRadius: 10, borderLeft: `3px solid ${cfg.color}` }} styles={{ body: { padding: '12px 16px' } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, fontSize: 16 }}>{cfg.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
                            <UserAvatar userId={activity.managerId} size={20} showName />
                            {client && <Text style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }} onClick={() => navigate(`/clients/${client.id}`)}>{client.firstName} {client.lastName}</Text>}
                            {deal && <><Text type="secondary" style={{ fontSize: 12 }}>·</Text><Text style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }} onClick={() => navigate(`/deals/${deal.id}`)}>{deal.title}</Text></>}
                          </div>
                          <Paragraph style={{ margin: 0, fontSize: 13 }}>{activity.description}</Paragraph>
                          {activity.result && (
                            <div style={{ marginTop: 6, padding: '4px 10px', background: '#f6ffed', borderRadius: 6, borderLeft: '3px solid #52c41a' }}>
                              <Text style={{ fontSize: 12, color: '#389e0d' }}>Результат: {activity.result}</Text>
                            </div>
                          )}
                        </div>
                      </div>
                      <Tooltip title={dayjs(activity.date).format('D MMMM YYYY, HH:mm')}>
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>{dayjs(activity.date).format('HH:mm')}</Text>
                      </Tooltip>
                    </div>
                  </Card>
                )
              })}
            </Space>
          </div>
        ))
      )}
      <AddActivityModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd} />
    </div>
  )
}
