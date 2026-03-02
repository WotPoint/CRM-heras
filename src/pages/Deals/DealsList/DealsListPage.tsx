import { useState, useMemo } from 'react'
import {
  Button, Input, Select, Space, Table, Card,
  Typography, Tooltip, Segmented, message,
} from 'antd'
import {
  PlusOutlined, SearchOutlined,
  TableOutlined, ProjectOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { MOCK_DEALS, MOCK_USERS, MOCK_CLIENTS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import type { Deal, DealStatus } from '@/types'
import { DealStatusBadge } from '@/components/ui/StatusBadge'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddDealModal } from '@/components/forms/AddDealModal'
import { DealsBoardView } from './DealsBoardView'

const { Text } = Typography
const { Option } = Select

type ViewMode = 'board' | 'table'

const STATUS_FILTERS: { value: DealStatus | ''; label: string }[] = [
  { value: '',                label: 'Все статусы'          },
  { value: 'new',             label: 'Новая'                },
  { value: 'negotiation',     label: 'Переговоры'           },
  { value: 'proposal_sent',   label: 'КП отправлено'        },
  { value: 'awaiting_payment',label: 'Ожидает оплаты'       },
  { value: 'won',             label: 'Выиграна'             },
  { value: 'lost',            label: 'Проиграна'            },
]

export default function DealsListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { canViewManager, hasRole, currentUser } = useAuthStore()

  const [deals, setDeals] = useState(MOCK_DEALS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DealStatus | ''>('')
  const [managerFilter, setManagerFilter] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [addOpen, setAddOpen] = useState(searchParams.get('add') === '1')

  const initialClientId = searchParams.get('clientId') ?? undefined
  const managers = MOCK_USERS.filter((u) => u.role === 'manager')

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (!canViewManager(d.managerId)) return false
      if (statusFilter && d.status !== statusFilter) return false
      if (managerFilter && d.managerId !== managerFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const client = MOCK_CLIENTS.find((c) => c.id === d.clientId)
        const clientName = client ? `${client.firstName} ${client.lastName}`.toLowerCase() : ''
        if (!d.title.toLowerCase().includes(q) && !clientName.includes(q)) return false
      }
      return true
    })
  }, [deals, search, statusFilter, managerFilter, canViewManager])

  const ownCount = deals.filter((d) => canViewManager(d.managerId)).length

  // Статистика по суммам
  const totalAmount = filtered.reduce((s, d) => s + (d.amount ?? 0), 0)
  const wonAmount = filtered.filter((d) => d.status === 'won').reduce((s, d) => s + (d.amount ?? 0), 0)

  const handleAdd = (data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newDeal: Deal = {
      ...data,
      id: `d${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      managerId: data.managerId || currentUser?.id || '',
    }
    setDeals((prev) => [newDeal, ...prev])
    message.success('Сделка создана')
  }

  const handleStatusChange = (dealId: string, newStatus: DealStatus) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
      )
    )
    message.success('Статус сделки обновлён')
  }

  // ── Колонки таблицы ──────────────────────────────────────
  const columns: ColumnsType<Deal> = [
    {
      title: 'Сделка',
      key: 'title',
      render: (_, d) => (
        <Text strong style={{ color: '#1677ff', cursor: 'pointer' }}
          onClick={() => navigate(`/deals/${d.id}`)}>
          {d.title}
        </Text>
      ),
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: 'Клиент',
      key: 'client',
      render: (_, d) => {
        const c = MOCK_CLIENTS.find((cl) => cl.id === d.clientId)
        return c ? (
          <Text style={{ cursor: 'pointer', color: '#1677ff' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c.id}`) }}>
            {c.firstName} {c.lastName}
          </Text>
        ) : '—'
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s: DealStatus) => <DealStatusBadge status={s} />,
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (a) => a ? `${a.toLocaleString('ru-RU')} ₽` : '—',
      sorter: (a, b) => (a.amount ?? 0) - (b.amount ?? 0),
      align: 'right',
    },
    {
      title: 'Менеджер',
      dataIndex: 'managerId',
      key: 'manager',
      render: (id) => <UserAvatar userId={id} showName />,
    },
    {
      title: 'Дедлайн',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (d) => {
        if (!d) return <Text type="secondary">—</Text>
        const isOver = dayjs(d).isBefore(dayjs())
        return (
          <Text style={{ color: isOver ? '#ff4d4f' : undefined, fontSize: 13 }}>
            {dayjs(d).format('D MMM YYYY')}
          </Text>
        )
      },
      sorter: (a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''),
    },
    {
      title: 'Обновлено',
      dataIndex: 'updatedAt',
      key: 'updated',
      render: (d) => (
        <Tooltip title={dayjs(d).format('D MMMM YYYY, HH:mm')}>
          <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).fromNow()}</Text>
        </Tooltip>
      ),
      sorter: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    },
  ]

  return (
    <div>
      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Сделки</Typography.Title>
          <Text type="secondary">{filtered.length} из {ownCount}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
          Создать сделку
        </Button>
      </div>

      {/* Статистика */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Всего в воронке', value: `${totalAmount.toLocaleString('ru-RU')} ₽`, color: '#1677ff' },
          { label: 'Закрыто / выиграно', value: `${wonAmount.toLocaleString('ru-RU')} ₽`, color: '#52c41a' },
          { label: 'Сделок', value: filtered.length, color: '#722ed1' },
        ].map((s) => (
          <Card key={s.label} size="small" style={{ borderRadius: 10, flex: 1 }}
            styles={{ body: { padding: '10px 16px' } }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{s.label}</Text>
            <Text strong style={{ fontSize: 18, color: s.color }}>{s.value}</Text>
          </Card>
        ))}
      </div>

      {/* Фильтры */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '12px 16px' } }}>
        <Space wrap size={12}>
          <Input
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder="Поиск по названию или клиенту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 180 }}>
            {STATUS_FILTERS.map((s) => <Option key={s.value} value={s.value}>{s.label}</Option>)}
          </Select>
          {hasRole('supervisor', 'admin') && (
            <Select value={managerFilter || undefined} onChange={(v) => setManagerFilter(v ?? '')}
              style={{ width: 180 }} placeholder="Все менеджеры" allowClear>
              {managers.map((m) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
            </Select>
          )}
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              { value: 'board', icon: <ProjectOutlined />, label: 'Канбан' },
              { value: 'table', icon: <TableOutlined />,   label: 'Список' },
            ]}
          />
        </Space>
      </Card>

      {/* Контент */}
      {viewMode === 'board' ? (
        <DealsBoardView deals={filtered} onStatusChange={handleStatusChange} />
      ) : (
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="middle"
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (t) => `Всего: ${t}`,
            }}
            onRow={(r) => ({ onClick: () => navigate(`/deals/${r.id}`), style: { cursor: 'pointer' } })}
            locale={{ emptyText: <EmptyState description="Сделки не найдены" /> }}
            summary={() => filtered.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Итого</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>{totalAmount.toLocaleString('ru-RU')} ₽</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} colSpan={3} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null}
          />
        </Card>
      )}

      <AddDealModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
        initialClientId={initialClientId}
      />
    </div>
  )
}
