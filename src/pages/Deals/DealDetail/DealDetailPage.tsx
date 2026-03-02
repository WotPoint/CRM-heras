import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Row, Col, Card, Typography, Button, Tabs, Space, Descriptions,
  Select, Breadcrumb, Steps, Popover, message, Empty, Tag, Form,
  Input, InputNumber, DatePicker, Modal,
} from 'antd'
import {
  EditOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined,
  CheckSquareOutlined, PaperClipOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

import { MOCK_DEALS, MOCK_CLIENTS, MOCK_ACTIVITIES, MOCK_TASKS, MOCK_DEAL_STATUS_CHANGES } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import type { Deal, DealStatus, Activity, DealStatusChange } from '@/types'
import { DealStatusBadge, TaskStatusBadge, PriorityBadge } from '@/components/ui/StatusBadge'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { InteractionTimeline } from '@/components/ui/InteractionTimeline'
import { DEAL_COLUMNS } from '../DealsList/DealsBoardView'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

// Статусы, которые считаются «финальными» (нет следующего шага)
const ACTIVE_STATUSES: DealStatus[] = ['new', 'negotiation', 'proposal_sent', 'awaiting_payment']

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canViewManager, currentUser } = useAuthStore()

  const [deals, setDeals] = useState(MOCK_DEALS)
  const [activities, setActivities] = useState(MOCK_ACTIVITIES)
  const [statusHistory, setStatusHistory] = useState(MOCK_DEAL_STATUS_CHANGES)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()

  const deal = deals.find((d) => d.id === id)

  if (!deal || !canViewManager(deal.managerId)) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <Title level={4} type="secondary">Сделка не найдена</Title>
        <Button onClick={() => navigate('/deals')}>К списку сделок</Button>
      </div>
    )
  }

  const client = MOCK_CLIENTS.find((c) => c.id === deal.clientId)
  const dealActivities = activities.filter((a) => a.dealId === id)
  const dealTasks = MOCK_TASKS.filter((t) => t.dealId === id)
  const dealHistory = statusHistory.filter((h) => h.dealId === id)

  const isActive = ACTIVE_STATUSES.includes(deal.status)
  const isOverdue = deal.deadline && dayjs(deal.deadline).isBefore(dayjs()) && isActive

  const updateDeal = (updates: Partial<Deal>) => {
    setDeals((prev) => prev.map((d) => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d))
  }

  const handleStatusChange = (newStatus: DealStatus) => {
    const change: DealStatusChange = {
      id: `sc${Date.now()}`,
      dealId: id!,
      fromStatus: deal.status,
      toStatus: newStatus,
      changedBy: currentUser?.id ?? '',
      changedAt: new Date().toISOString(),
    }
    setStatusHistory((prev) => [...prev, change])
    updateDeal({ status: newStatus })
    message.success('Статус сделки обновлён')
  }

  const handleActivityAdd = (actData: Omit<Activity, 'id' | 'createdAt'>) => {
    const newAct: Activity = { ...actData, id: `a${Date.now()}`, createdAt: new Date().toISOString() }
    setActivities((prev) => [newAct, ...prev])
    message.success('Активность добавлена')
  }

  const handleClose = (won: boolean) => {
    handleStatusChange(won ? 'won' : 'lost')
    message.success(won ? 'Сделка закрыта как выигранная!' : 'Сделка закрыта как проигранная')
  }

  const handleEdit = () => {
    editForm.setFieldsValue({
      title: deal.title,
      amount: deal.amount,
      deadline: deal.deadline ? dayjs(deal.deadline) : null,
      description: deal.description,
    })
    setEditOpen(true)
  }

  const handleEditSave = () => {
    editForm.validateFields().then((values) => {
      updateDeal({
        title: values.title,
        amount: values.amount,
        deadline: values.deadline ? values.deadline.toISOString() : undefined,
        description: values.description,
      })
      setEditOpen(false)
      message.success('Сделка обновлена')
    })
  }

  // ── Прогресс воронки (только активные статусы) ────────────
  const stepStatuses: DealStatus[] = ['new', 'negotiation', 'proposal_sent', 'awaiting_payment']
  const currentStepIndex = stepStatuses.indexOf(deal.status)
  const progressSteps = stepStatuses.map((s, i) => {
    const col = DEAL_COLUMNS.find((c) => c.status === s)!
    let stepStatus: 'finish' | 'process' | 'wait' = 'wait'
    if (deal.status === 'won' || i < currentStepIndex) stepStatus = 'finish'
    else if (i === currentStepIndex) stepStatus = 'process'
    return { title: col.label, status: stepStatus }
  })

  return (
    <div>
      {/* Хлебные крошки */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/deals">Сделки</Link> },
          { title: deal.title },
        ]}
      />

      <Row gutter={[20, 20]}>
        {/* ── Левая панель ──────────────────────────────── */}
        <Col xs={24} lg={7}>
          <Card style={{ borderRadius: 12, marginBottom: 16 }}>
            {/* Заголовок сделки */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <Title level={4} style={{ margin: 0, flex: 1 }}>{deal.title}</Title>
                <Button size="small" icon={<EditOutlined />} onClick={handleEdit} />
              </div>
              <div style={{ marginTop: 8 }}>
                <DealStatusBadge status={deal.status} />
                {isOverdue && <Tag color="red" style={{ marginLeft: 6 }}>Просрочена</Tag>}
              </div>
            </div>

            {/* Сумма */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea15, #764ba215)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Сумма сделки</Text>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>
                {deal.amount ? `${deal.amount.toLocaleString('ru-RU')} ₽` : '—'}
              </div>
            </div>

            {/* Кнопки закрытия — только для активных сделок */}
            {isActive && (
              <Space style={{ width: '100%', marginBottom: 16 }} direction="vertical" size={8}>
                <Button block type="primary" icon={<CheckCircleOutlined />}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => handleClose(true)}>
                  Закрыть как выигранную
                </Button>
                <Button block danger icon={<CloseCircleOutlined />}
                  onClick={() => handleClose(false)}>
                  Закрыть как проигранную
                </Button>
              </Space>
            )}

            {/* Смена статуса */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Изменить статус
              </Text>
              <Select value={deal.status} onChange={handleStatusChange} style={{ width: '100%' }}>
                {DEAL_COLUMNS.map((c) => (
                  <Option key={c.status} value={c.status}>{c.label}</Option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Детали */}
          <Card title="Детали" size="small" style={{ borderRadius: 12 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={<><UserOutlined /> Клиент</>}>
                {client ? (
                  <Link to={`/clients/${client.id}`}>
                    {client.firstName} {client.lastName}
                  </Link>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Менеджер">
                <UserAvatar userId={deal.managerId} showName showTooltip={false} />
              </Descriptions.Item>
              {deal.deadline && (
                <Descriptions.Item label={<><CalendarOutlined /> Дедлайн</>}>
                  <Text style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
                    {dayjs(deal.deadline).format('D MMMM YYYY')}
                  </Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Создана">
                {dayjs(deal.createdAt).format('D MMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Обновлена">
                {dayjs(deal.updatedAt).fromNow()}
              </Descriptions.Item>
            </Descriptions>
            {deal.description && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Описание
                </Text>
                <Paragraph style={{ margin: 0, fontSize: 13 }}>{deal.description}</Paragraph>
              </div>
            )}
          </Card>
        </Col>

        {/* ── Правая часть ──────────────────────────────── */}
        <Col xs={24} lg={17}>
          {/* Прогресс воронки */}
          {isActive && (
            <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: '16px 24px' } }}>
              <Steps
                size="small"
                current={currentStepIndex}
                items={progressSteps}
              />
            </Card>
          )}

          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
            <Tabs
              defaultActiveKey="activities"
              style={{ padding: '0 24px' }}
              items={[
                {
                  key: 'activities',
                  label: (
                    <span>
                      Активности
                      {dealActivities.length > 0 && (
                        <Tag style={{ marginLeft: 6, fontSize: 11 }}>{dealActivities.length}</Tag>
                      )}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      <InteractionTimeline
                        activities={dealActivities}
                        onAdd={handleActivityAdd}
                        dealId={id}
                      />
                    </div>
                  ),
                },
                {
                  key: 'history',
                  label: 'История статусов',
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      {dealHistory.length === 0 ? (
                        <Text type="secondary">История изменений пуста</Text>
                      ) : (
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                          {[...dealHistory].reverse().map((h) => {
                            const fromCol = DEAL_COLUMNS.find((c) => c.status === h.fromStatus)
                            const toCol = DEAL_COLUMNS.find((c) => c.status === h.toStatus)!
                            return (
                              <div key={h.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', background: '#fafafa', borderRadius: 8,
                                border: '1px solid #f0f0f0',
                              }}>
                                <Space size={8}>
                                  {h.fromStatus ? (
                                    <Tag color={fromCol?.color}>{fromCol?.label}</Tag>
                                  ) : (
                                    <Tag>Создана</Tag>
                                  )}
                                  <Text type="secondary">→</Text>
                                  <Tag color={toCol.color}>{toCol.label}</Tag>
                                  <UserAvatar userId={h.changedBy} size={20} />
                                </Space>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {dayjs(h.changedAt).format('D MMM YYYY, HH:mm')}
                                </Text>
                              </div>
                            )
                          })}
                        </Space>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'tasks',
                  label: (
                    <span>
                      <CheckSquareOutlined style={{ marginRight: 4 }} />
                      Задачи
                      {dealTasks.filter((t) => t.status !== 'done').length > 0 && (
                        <Tag color="orange" style={{ marginLeft: 6, fontSize: 11 }}>
                          {dealTasks.filter((t) => t.status !== 'done').length}
                        </Tag>
                      )}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      {dealTasks.length === 0 ? (
                        <Empty description="Нет задач" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                          {dealTasks.map((t) => (
                            <div key={t.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '10px 12px', background: t.status === 'done' ? '#fafafa' : '#fff',
                              borderRadius: 8, border: '1px solid #f0f0f0',
                            }}>
                              <div>
                                <Text delete={t.status === 'done'} style={{ display: 'block', fontSize: 13 }}>
                                  {t.title}
                                </Text>
                                {t.deadline && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    до {dayjs(t.deadline).format('D MMM YYYY')}
                                  </Text>
                                )}
                              </div>
                              <Space size={6}>
                                <PriorityBadge priority={t.priority} />
                                <TaskStatusBadge status={t.status} />
                              </Space>
                            </div>
                          ))}
                        </Space>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'files',
                  label: <span><PaperClipOutlined style={{ marginRight: 4 }} />Файлы</span>,
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      <Empty description="Файлы не прикреплены" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Модалка редактирования */}
      <Modal title="Редактировать сделку" open={editOpen}
        onOk={handleEditSave} onCancel={() => setEditOpen(false)}
        okText="Сохранить" cancelText="Отмена">
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Сумма (₽)">
                <InputNumber min={0} style={{ width: '100%' }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deadline" label="Дедлайн">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Описание">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
