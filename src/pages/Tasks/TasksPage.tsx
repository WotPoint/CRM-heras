import { useState, useMemo } from 'react'
import {
  Card, Typography, Button, Select, Space, Tooltip,
  Checkbox, message, Badge, Segmented,
} from 'antd'
import {
  PlusOutlined, FilterOutlined, CheckCircleFilled,
  ExclamationCircleOutlined, ClockCircleOutlined, CalendarOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'

import { MOCK_TASKS, MOCK_USERS, MOCK_CLIENTS, MOCK_DEALS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import { PriorityBadge, TaskStatusBadge } from '@/components/ui/StatusBadge'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddTaskModal } from '@/components/forms/AddTaskModal'

const { Title, Text } = Typography
const { Option } = Select

type GroupKey = 'overdue' | 'today' | 'week' | 'later' | 'done'

const GROUP_CONFIG: Record<GroupKey, { label: string; color: string; icon: React.ReactNode }> = {
  overdue: { label: 'Просрочено',     color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  today:   { label: 'Сегодня',        color: '#1677ff', icon: <CalendarOutlined />          },
  week:    { label: 'На этой неделе', color: '#722ed1', icon: <ClockCircleOutlined />       },
  later:   { label: 'Позже',          color: '#13c2c2', icon: <ClockCircleOutlined />       },
  done:    { label: 'Выполнено',      color: '#52c41a', icon: <CheckCircleFilled />         },
}

function getGroup(task: Task): GroupKey {
  if (task.status === 'done') return 'done'
  if (!task.deadline) return 'later'
  const d = dayjs(task.deadline)
  if (d.isBefore(dayjs(), 'minute')) return 'overdue'
  if (d.isToday()) return 'today'
  if (d.isBefore(dayjs().endOf('week'))) return 'week'
  return 'later'
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }
const GROUP_ORDER: GroupKey[] = ['overdue', 'today', 'week', 'later', 'done']

export default function TasksPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { canViewManager, hasRole } = useAuthStore()

  const [tasks, setTasks] = useState(MOCK_TASKS)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [addOpen, setAddOpen] = useState(searchParams.get('add') === '1')

  const managers = MOCK_USERS.filter((u) => u.role === 'manager')

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => canViewManager(t.assigneeId))
      .filter((t) => !statusFilter || t.status === statusFilter)
      .filter((t) => !priorityFilter || t.priority === priorityFilter)
      .filter((t) => !assigneeFilter || t.assigneeId === assigneeFilter)
      .filter((t) => showDone || t.status !== 'done')
      .sort((a, b) => {
        const ga = GROUP_ORDER.indexOf(getGroup(a))
        const gb = GROUP_ORDER.indexOf(getGroup(b))
        if (ga !== gb) return ga - gb
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      })
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, showDone, canViewManager])

  const grouped = useMemo(() => {
    const groups: Partial<Record<GroupKey, Task[]>> = {}
    filtered.forEach((t) => {
      const g = getGroup(t)
      if (!groups[g]) groups[g] = []
      groups[g]!.push(t)
    })
    return groups
  }, [filtered])

  const handleAdd = (data: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = { ...data, id: `t${Date.now()}`, createdAt: new Date().toISOString() }
    setTasks((prev) => [newTask, ...prev])
    message.success('Задача создана')
  }

  const toggleDone = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t
        const isDone = t.status === 'done'
        return {
          ...t,
          status: (isDone ? 'new' : 'done') as TaskStatus,
          completedAt: isDone ? undefined : new Date().toISOString(),
        }
      })
    )
  }

  const totalOpen = tasks.filter((t) => canViewManager(t.assigneeId) && t.status !== 'done').length
  const totalOverdue = tasks.filter((t) => canViewManager(t.assigneeId) && getGroup(t) === 'overdue').length

  return (
    <div>
      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>Задачи</Title>
            {totalOverdue > 0 && <Badge count={totalOverdue} style={{ background: '#ff4d4f' }} />}
          </Space>
          <Text type="secondary">{totalOpen} активных задач</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          Добавить задачу
        </Button>
      </div>

      {/* Фильтры */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '12px 16px' } }}>
        <Space wrap size={12} align="center">
          <FilterOutlined style={{ color: '#999' }} />
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }}>
            <Option value="">Все статусы</Option>
            <Option value="new">Новые</Option>
            <Option value="in_progress">В работе</Option>
          </Select>
          <Select value={priorityFilter} onChange={setPriorityFilter} style={{ width: 140 }}>
            <Option value="">Все приоритеты</Option>
            <Option value="high">Высокий</Option>
            <Option value="medium">Средний</Option>
            <Option value="low">Низкий</Option>
          </Select>
          {hasRole('supervisor', 'admin') && (
            <Select
              value={assigneeFilter || undefined}
              onChange={(v) => setAssigneeFilter(v ?? '')}
              style={{ width: 180 }}
              placeholder="Все исполнители"
              allowClear
            >
              {managers.map((m) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
            </Select>
          )}
          <Segmented
            value={showDone ? 'all' : 'active'}
            onChange={(v) => setShowDone(v === 'all')}
            options={[
              { value: 'active', label: 'Активные' },
              { value: 'all',    label: 'Все'       },
            ]}
          />
        </Space>
      </Card>

      {/* Список задач */}
      {filtered.length === 0 ? (
        <EmptyState
          description="Задач не найдено"
          actionLabel="Создать задачу"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        GROUP_ORDER.filter((g) => grouped[g]?.length).map((groupKey) => {
          const cfg = GROUP_CONFIG[groupKey]
          const groupTasks = grouped[groupKey]!

          return (
            <div key={groupKey} style={{ marginBottom: 24 }}>
              {/* Заголовок группы */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: cfg.color, fontSize: 16 }}>{cfg.icon}</span>
                <Text strong style={{ color: cfg.color, fontSize: 14 }}>{cfg.label}</Text>
                <Badge count={groupTasks.length} color={cfg.color} />
                <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
              </div>

              <Space direction="vertical" style={{ width: '100%' }} size={6}>
                {groupTasks.map((task) => {
                  const client = task.clientId ? MOCK_CLIENTS.find((c) => c.id === task.clientId) : null
                  const deal = task.dealId ? MOCK_DEALS.find((d) => d.id === task.dealId) : null
                  const isDone = task.status === 'done'
                  const isOverdue = getGroup(task) === 'overdue'

                  return (
                    <Card
                      key={task.id}
                      size="small"
                      style={{
                        borderRadius: 10,
                        opacity: isDone ? 0.65 : 1,
                        borderLeft: isOverdue
                          ? '3px solid #ff4d4f'
                          : isDone
                          ? '3px solid #52c41a'
                          : undefined,
                      }}
                      styles={{ body: { padding: '10px 14px' } }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <Checkbox
                          checked={isDone}
                          onChange={() => toggleDone(task.id)}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Строка 1: название + бейджи */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'flex-start', gap: 8,
                          }}>
                            <Text delete={isDone} strong={!isDone} style={{ fontSize: 13 }}>
                              {task.title}
                            </Text>
                            <Space size={6} style={{ flexShrink: 0 }}>
                              <PriorityBadge priority={task.priority} />
                              <TaskStatusBadge status={task.status} />
                            </Space>
                          </div>

                          {/* Строка 2: мета */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            marginTop: 4, flexWrap: 'wrap',
                          }}>
                            <UserAvatar userId={task.assigneeId} size={18} showName />
                            {client && (
                              <Text
                                style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }}
                                onClick={() => navigate(`/clients/${client.id}`)}
                              >
                                {client.firstName} {client.lastName}
                              </Text>
                            )}
                            {deal && (
                              <Text
                                style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }}
                                onClick={() => navigate(`/deals/${deal.id}`)}
                              >
                                {deal.title}
                              </Text>
                            )}
                            {task.deadline && (
                              <Tooltip title={dayjs(task.deadline).format('D MMMM YYYY, HH:mm')}>
                                <Text style={{ fontSize: 12, color: isOverdue ? '#ff4d4f' : '#999' }}>
                                  <CalendarOutlined style={{ marginRight: 3 }} />
                                  {dayjs(task.deadline).format('D MMM, HH:mm')}
                                </Text>
                              </Tooltip>
                            )}
                          </div>

                          {task.description && (
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                              {task.description}
                            </Text>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </Space>
            </div>
          )
        })
      )}

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
      />
    </div>
  )
}
