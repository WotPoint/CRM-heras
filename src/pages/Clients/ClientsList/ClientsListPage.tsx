import { useState, useMemo } from 'react'
import {
  Button, Input, Select, Space, Table, Card, Row, Col,
  Typography, Tooltip, Segmented, Tag, message,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, AppstoreOutlined,
  UnorderedListOutlined, PhoneOutlined, MailOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { MOCK_CLIENTS, MOCK_USERS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import type { Client, ClientStatus } from '@/types'
import { ClientStatusBadge } from '@/components/ui/StatusBadge'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddClientModal } from '@/components/forms/AddClientModal'

dayjs.extend(relativeTime)

const { Text } = Typography
const { Option } = Select

type ViewMode = 'table' | 'grid'

const CLIENT_STATUS_FILTER: { value: ClientStatus | ''; label: string }[] = [
  { value: '',         label: 'Все статусы' },
  { value: 'lead',     label: 'Лид'         },
  { value: 'active',   label: 'Активный'    },
  { value: 'regular',  label: 'Постоянный'  },
  { value: 'archived', label: 'Архивный'    },
]

export default function ClientsListPage() {
  const navigate = useNavigate()
  const { canViewManager, hasRole, currentUser } = useAuthStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('')
  const [managerFilter, setManagerFilter] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [addOpen, setAddOpen] = useState(false)
  const [clients, setClients] = useState(MOCK_CLIENTS)

  const managers = MOCK_USERS.filter((u) => u.role === 'manager')

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (!canViewManager(c.managerId)) return false
      if (statusFilter && c.status !== statusFilter) return false
      if (managerFilter && c.managerId !== managerFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
        if (
          !fullName.includes(q) &&
          !c.company?.toLowerCase().includes(q) &&
          !c.email?.toLowerCase().includes(q) &&
          !c.phone?.includes(q)
        ) return false
      }
      return true
    })
  }, [clients, search, statusFilter, managerFilter, canViewManager])

  const ownCount = clients.filter((c) => canViewManager(c.managerId)).length

  const handleAdd = (data: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...data,
      id: `c${Date.now()}`,
      createdAt: new Date().toISOString(),
      managerId: data.managerId || currentUser?.id || '',
    }
    setClients((prev) => [newClient, ...prev])
    message.success('Клиент добавлен')
  }

  // ── Колонки таблицы ──────────────────────────────────────
  const columns: ColumnsType<Client> = [
    {
      title: 'Клиент',
      key: 'name',
      render: (_, c) => (
        <div>
          <Text strong style={{ display: 'block', color: '#1677ff', cursor: 'pointer' }}>
            {c.firstName} {c.lastName}
          </Text>
          {c.company && (
            <Text type="secondary" style={{ fontSize: 12 }}>{c.company}</Text>
          )}
        </div>
      ),
      sorter: (a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    },
    {
      title: 'Контакты',
      key: 'contacts',
      render: (_, c) => (
        <Space direction="vertical" size={2}>
          {c.phone && (
            <Text style={{ fontSize: 13 }}>
              <PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              {c.phone}
            </Text>
          )}
          {c.email && (
            <Text style={{ fontSize: 13 }}>
              <MailOutlined style={{ marginRight: 4, color: '#1677ff' }} />
              {c.email}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: ClientStatus) => <ClientStatusBadge status={status} />,
      filters: CLIENT_STATUS_FILTER.slice(1).map((s) => ({
        text: s.label,
        value: s.value,
      })),
      onFilter: (value, c) => c.status === value,
    },
    {
      title: 'Менеджер',
      dataIndex: 'managerId',
      key: 'manager',
      render: (id: string) => <UserAvatar userId={id} showName />,
    },
    {
      title: 'Последний контакт',
      dataIndex: 'lastContactAt',
      key: 'lastContact',
      render: (date?: string) =>
        date ? (
          <Tooltip title={dayjs(date).format('D MMMM YYYY, HH:mm')}>
            <Text style={{ fontSize: 13 }}>{dayjs(date).fromNow()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>—</Text>
        ),
      sorter: (a, b) =>
        (a.lastContactAt ?? '').localeCompare(b.lastContactAt ?? ''),
    },
    {
      title: 'Теги',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space wrap size={4}>
          {tags.map((t) => (
            <Tag key={t} style={{ fontSize: 11, margin: 0 }}>
              {t}
            </Tag>
          ))}
        </Space>
      ),
    },
  ]

  // ── Карточный вид ────────────────────────────────────────
  const GridView = () => (
    <Row gutter={[16, 16]}>
      {filtered.length === 0 ? (
        <Col span={24}>
          <EmptyState
            description="Клиенты не найдены"
            actionLabel="Добавить клиента"
            onAction={() => setAddOpen(true)}
          />
        </Col>
      ) : (
        filtered.map((c) => (
          <Col key={c.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              size="small"
              onClick={() => navigate(`/clients/${c.id}`)}
              style={{ borderRadius: 12 }}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
                  }}
                >
                  {c.firstName[0]}{c.lastName?.[0] ?? ''}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <Text strong ellipsis style={{ display: 'block' }}>
                    {c.firstName} {c.lastName}
                  </Text>
                  {c.company && (
                    <Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block' }}>
                      {c.company}
                    </Text>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ClientStatusBadge status={c.status} />
                <UserAvatar userId={c.managerId} size={24} />
              </div>
              {c.phone && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  <PhoneOutlined style={{ marginRight: 4 }} />
                  {c.phone}
                </Text>
              )}
            </Card>
          </Col>
        ))
      )}
    </Row>
  )

  return (
    <div>
      {/* Заголовок */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 20,
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Клиенты
          </Typography.Title>
          <Text type="secondary">
            {filtered.length} из {ownCount}
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          Добавить клиента
        </Button>
      </div>

      {/* Фильтры */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '12px 16px' } }}>
        <Space wrap size={12}>
          <Input
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder="Поиск по имени, email, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
          >
            {CLIENT_STATUS_FILTER.map((s) => (
              <Option key={s.value} value={s.value}>
                {s.label}
              </Option>
            ))}
          </Select>
          {hasRole('supervisor', 'admin') && (
            <Select
              value={managerFilter || undefined}
              onChange={(v) => setManagerFilter(v ?? '')}
              style={{ width: 180 }}
              placeholder="Все менеджеры"
              allowClear
            >
              {managers.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.name}
                </Option>
              ))}
            </Select>
          )}
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              { value: 'table', icon: <UnorderedListOutlined /> },
              { value: 'grid',  icon: <AppstoreOutlined />      },
            ]}
          />
        </Space>
      </Card>

      {/* Контент */}
      {viewMode === 'table' ? (
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="middle"
            pagination={{
              pageSize: 15,
              showSizeChanger: false,
              showTotal: (total) => `Всего: ${total}`,
            }}
            onRow={(record) => ({
              onClick: () => navigate(`/clients/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            locale={{ emptyText: <EmptyState description="Клиенты не найдены" /> }}
          />
        </Card>
      ) : (
        <GridView />
      )}

      <AddClientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
      />
    </div>
  )
}
