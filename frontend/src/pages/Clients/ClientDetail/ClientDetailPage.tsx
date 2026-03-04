import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Row, Col, Card, Typography, Button, Tabs, Space, Tag, Descriptions,
  Select, Breadcrumb, Avatar, Popconfirm, message, Empty,
  Form, Input, Modal, Table,
} from 'antd'
import {
  PhoneOutlined, MailOutlined, EnvironmentOutlined, EditOutlined,
  PlusOutlined, ArrowLeftOutlined, DollarOutlined,
  CheckSquareOutlined, PaperClipOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import type { Client, ClientStatus, Activity, Deal } from '@/types'
import { ClientStatusBadge, DealStatusBadge, TaskStatusBadge, PriorityBadge } from '@/components/ui/StatusBadge'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { InteractionTimeline } from '@/components/ui/InteractionTimeline'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'lead',     label: 'Лид'        },
  { value: 'active',   label: 'Активный'   },
  { value: 'regular',  label: 'Постоянный' },
  { value: 'archived', label: 'Архивный'   },
]

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canViewManager } = useAuthStore()
  const { clients, deals, tasks, activities, updateClient, addActivity } = useDataStore()

  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()

  const client = clients.find((c) => c.id === id)

  // Права доступа
  if (!client || !canViewManager(client.managerId)) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <Title level={4} type="secondary">Клиент не найден</Title>
        <Button onClick={() => navigate('/clients')}>К списку клиентов</Button>
      </div>
    )
  }

  const clientActivities = activities.filter((a) => a.clientId === id)
  const clientDeals = deals.filter((d) => d.clientId === id)
  const clientTasks = tasks.filter((t) => t.clientId === id)

  const handleStatusChange = async (status: ClientStatus) => {
    try {
      await updateClient(client.id, { status })
      message.success('Статус обновлён')
    } catch (e) { message.error((e as Error).message) }
  }

  const handleActivityAdd = async (actData: Omit<Activity, 'id' | 'createdAt'>) => {
    try {
      await addActivity(actData)
      message.success('Активность добавлена')
    } catch (e) { message.error((e as Error).message) }
  }

  const handleEdit = () => {
    editForm.setFieldsValue({
      firstName: client.firstName,
      lastName: client.lastName,
      company: client.company,
      email: client.email,
      phone: client.phone,
      address: client.address,
      source: client.source,
      comment: client.comment,
      tags: client.tags,
    })
    setEditOpen(true)
  }

  const handleEditSave = () => {
    editForm.validateFields().then(async (values) => {
      try {
        await updateClient(client.id, values)
        setEditOpen(false)
        message.success('Данные сохранены')
      } catch (e) { message.error((e as Error).message) }
    })
  }

  const initials = `${client.firstName[0]}${client.lastName?.[0] ?? ''}`.toUpperCase()

  // ── Колонки сделок ────────────────────────────────────────
  const dealColumns: ColumnsType<Deal> = [
    {
      title: 'Сделка',
      dataIndex: 'title',
      key: 'title',
      render: (title, d) => (
        <Text style={{ color: '#1677ff', cursor: 'pointer' }} onClick={() => navigate(`/deals/${d.id}`)}>
          {title}
        </Text>
      ),
    },
    { title: 'Статус', dataIndex: 'status', key: 'status', render: (s) => <DealStatusBadge status={s} /> },
    {
      title: 'Сумма', dataIndex: 'amount', key: 'amount',
      render: (a) => a ? `${a.toLocaleString('ru-RU')} ₽` : '—',
    },
    {
      title: 'Дедлайн', dataIndex: 'deadline', key: 'deadline',
      render: (d) => d ? dayjs(d).format('D MMM YYYY') : '—',
    },
  ]

  return (
    <div>
      {/* Хлебные крошки */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/clients">Клиенты</Link> },
          { title: `${client.firstName} ${client.lastName}` },
        ]}
      />

      <Row gutter={[20, 20]}>
        {/* ── Левая панель ──────────────────────────────── */}
        <Col xs={24} lg={7}>
          {/* Профиль */}
          <Card style={{ borderRadius: 12, marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <Avatar
                size={72}
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  fontSize: 26, fontWeight: 700, marginBottom: 12,
                }}
              >
                {initials}
              </Avatar>
              <Title level={4} style={{ margin: 0 }}>
                {client.firstName} {client.lastName}
              </Title>
              {client.company && (
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {client.company}
                </Text>
              )}
              <ClientStatusBadge status={client.status} />
            </div>

            {/* Быстрые действия */}
            <Space style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }} size={8}>
              {client.phone && (
                <Button shape="circle" icon={<PhoneOutlined />} title="Позвонить"
                  onClick={() => window.open(`tel:${client.phone}`)} />
              )}
              {client.email && (
                <Button shape="circle" icon={<MailOutlined />} title="Написать"
                  onClick={() => window.open(`mailto:${client.email}`)} />
              )}
              <Button shape="circle" icon={<EditOutlined />} title="Редактировать" onClick={handleEdit} />
            </Space>

            {/* Смена статуса */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Изменить статус
              </Text>
              <Select value={client.status} onChange={handleStatusChange} style={{ width: '100%' }}>
                {STATUS_OPTIONS.map((o) => (
                  <Option key={o.value} value={o.value}>{o.label}</Option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Контактная информация */}
          <Card title="Информация" style={{ borderRadius: 12 }} size="small">
            <Descriptions column={1} size="small">
              {client.phone && (
                <Descriptions.Item label={<><PhoneOutlined /> Телефон</>}>
                  <a href={`tel:${client.phone}`}>{client.phone}</a>
                </Descriptions.Item>
              )}
              {client.email && (
                <Descriptions.Item label={<><MailOutlined /> Email</>}>
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                </Descriptions.Item>
              )}
              {client.address && (
                <Descriptions.Item label={<><EnvironmentOutlined /> Адрес</>}>
                  {client.address}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Менеджер">
                <UserAvatar userId={client.managerId} showName showTooltip={false} />
              </Descriptions.Item>
              {client.source && (
                <Descriptions.Item label="Источник">{client.source}</Descriptions.Item>
              )}
              <Descriptions.Item label="Добавлен">
                {dayjs(client.createdAt).format('D MMM YYYY')}
              </Descriptions.Item>
              {client.lastContactAt && (
                <Descriptions.Item label="Последний контакт">
                  {dayjs(client.lastContactAt).format('D MMM YYYY')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {client.tags.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Теги
                </Text>
                <Space wrap size={4}>
                  {client.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                </Space>
              </div>
            )}

            {client.comment && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Комментарий
                </Text>
                <Paragraph style={{ margin: 0, fontSize: 13 }}>{client.comment}</Paragraph>
              </div>
            )}
          </Card>
        </Col>

        {/* ── Правая часть — вкладки ────────────────────── */}
        <Col xs={24} lg={17}>
          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
            <Tabs
              defaultActiveKey="history"
              style={{ padding: '0 24px' }}
              items={[
                {
                  key: 'history',
                  label: (
                    <span>
                      История
                      {clientActivities.length > 0 && (
                        <Tag style={{ marginLeft: 6, fontSize: 11 }}>{clientActivities.length}</Tag>
                      )}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      <InteractionTimeline
                        activities={clientActivities}
                        onAdd={handleActivityAdd}
                        clientId={id}
                      />
                    </div>
                  ),
                },
                {
                  key: 'deals',
                  label: (
                    <span>
                      <DollarOutlined style={{ marginRight: 4 }} />
                      Сделки
                      {clientDeals.length > 0 && (
                        <Tag style={{ marginLeft: 6, fontSize: 11 }}>{clientDeals.length}</Tag>
                      )}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      <div style={{ marginBottom: 12 }}>
                        <Button
                          icon={<PlusOutlined />}
                          size="small"
                          onClick={() => navigate(`/deals?clientId=${id}&add=1`)}
                        >
                          Создать сделку
                        </Button>
                      </div>
                      {clientDeals.length === 0 ? (
                        <Empty description="Нет сделок" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <Table
                          dataSource={clientDeals}
                          columns={dealColumns}
                          rowKey="id"
                          size="small"
                          pagination={false}
                        />
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
                      {clientTasks.filter((t) => t.status !== 'done').length > 0 && (
                        <Tag color="orange" style={{ marginLeft: 6, fontSize: 11 }}>
                          {clientTasks.filter((t) => t.status !== 'done').length}
                        </Tag>
                      )}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      {clientTasks.length === 0 ? (
                        <Empty description="Нет задач" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                          {clientTasks.map((t) => (
                            <div
                              key={t.id}
                              style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', padding: '10px 12px',
                                background: t.status === 'done' ? '#fafafa' : '#fff',
                                borderRadius: 8, border: '1px solid #f0f0f0',
                              }}
                            >
                              <div>
                                <Text
                                  delete={t.status === 'done'}
                                  style={{ display: 'block', fontSize: 13 }}
                                >
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
                  label: (
                    <span>
                      <PaperClipOutlined style={{ marginRight: 4 }} />
                      Файлы
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      <Empty description="Файлы не прикреплены" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                        <Button icon={<PlusOutlined />} size="small">Прикрепить файл</Button>
                      </Empty>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Модалка редактирования */}
      <Modal
        title="Редактировать клиента"
        open={editOpen}
        onOk={handleEditSave}
        onCancel={() => setEditOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={600}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }} scrollToFirstError>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="Имя"
                rules={[
                  { required: true, message: 'Введите имя' },
                  { min: 2, message: 'Минимум 2 символа' },
                  { whitespace: true, message: 'Имя не может состоять только из пробелов' },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Фамилия"
                rules={[
                  { min: 2, message: 'Минимум 2 символа' },
                  { whitespace: true, message: 'Фамилия не может состоять только из пробелов' },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="company"
            label="Компания"
            rules={[{ whitespace: true, message: 'Поле не может состоять только из пробелов' }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Введите корректный email' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Телефон"
                rules={[
                  {
                    validator: (_, value: string) => {
                      if (!value) return Promise.resolve()
                      const digits = value.replace(/\D/g, '')
                      if (digits.length < 10 || digits.length > 12)
                        return Promise.reject(new Error('Введите корректный номер (10–11 цифр)'))
                      return Promise.resolve()
                    },
                  },
                ]}
              >
                <Input placeholder="+7 900 000-00-00" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="address"
            label="Адрес"
            rules={[{ whitespace: true, message: 'Поле не может состоять только из пробелов' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="source" label="Источник"><Input /></Form.Item>
          <Form.Item name="tags" label="Теги">
            <Select mode="tags" />
          </Form.Item>
          <Form.Item
            name="comment"
            label="Комментарий"
            rules={[{ max: 500, message: 'Максимум 500 символов' }]}
          >
            <Input.TextArea rows={3} showCount maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
