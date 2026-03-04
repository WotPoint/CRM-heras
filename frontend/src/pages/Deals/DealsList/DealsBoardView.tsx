import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { Card, Typography, Tag, Tooltip, Badge, theme } from 'antd'
import { CalendarOutlined, WarningOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

import type { Deal, DealStatus } from '@/types'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { useDataStore } from '@/store/dataStore'

const { Text } = Typography

export const DEAL_COLUMNS: { status: DealStatus; label: string; color: string }[] = [
  { status: 'new',              label: 'Новые',             color: '#1677ff' },
  { status: 'negotiation',      label: 'Переговоры',        color: '#fa8c16' },
  { status: 'proposal_sent',    label: 'КП отправлено',     color: '#13c2c2' },
  { status: 'awaiting_payment', label: 'Ожидает оплаты',   color: '#faad14' },
  { status: 'won',              label: 'Выиграно',          color: '#52c41a' },
  { status: 'lost',             label: 'Проиграно',         color: '#ff4d4f' },
]

// ── Карточка сделки ────────────────────────────────────────
interface DealCardProps {
  deal: Deal
  isDragging?: boolean
}

function DealCardContent({ deal }: DealCardProps) {
  const navigate = useNavigate()
  const clients = useDataStore((s) => s.clients)
  const client = clients.find((c) => c.id === deal.clientId)
  const isOverdue = deal.deadline && dayjs(deal.deadline).isBefore(dayjs()) && deal.status !== 'won' && deal.status !== 'lost'

  return (
    <Card
      size="small"
      hoverable
      onClick={() => navigate(`/deals/${deal.id}`)}
      style={{
        borderRadius: 10,
        marginBottom: 8,
        cursor: 'pointer',
        borderLeft: isOverdue ? '3px solid #ff4d4f' : undefined,
      }}
      styles={{ body: { padding: '10px 12px' } }}
    >
      <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
        {deal.title}
      </Text>
      {client && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
          {client.firstName} {client.lastName}
          {client.company ? ` · ${client.company}` : ''}
        </Text>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 13, color: '#1677ff' }}>
          {deal.amount ? `${deal.amount.toLocaleString('ru-RU')} ₽` : '—'}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {deal.deadline && (
            <Tooltip title={`Дедлайн: ${dayjs(deal.deadline).format('D MMM YYYY')}`}>
              <Text style={{ fontSize: 11, color: isOverdue ? '#ff4d4f' : '#999' }}>
                {isOverdue && <WarningOutlined style={{ marginRight: 2 }} />}
                <CalendarOutlined style={{ marginRight: 2 }} />
                {dayjs(deal.deadline).format('D MMM')}
              </Text>
            </Tooltip>
          )}
          <UserAvatar userId={deal.managerId} size={20} />
        </div>
      </div>
    </Card>
  )
}

// ── Перетаскиваемая карточка ───────────────────────────────
function SortableDealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { deal },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <DealCardContent deal={deal} isDragging={isDragging} />
    </div>
  )
}

// ── Колонка канбана ────────────────────────────────────────
function KanbanColumn({
  status, label, color, deals,
}: {
  status: DealStatus
  label: string
  color: string
  deals: Deal[]
}) {
  const { setNodeRef, isOver } = useSortable({ id: status })
  const { token: t } = theme.useToken()
  const totalAmount = deals.reduce((s, d) => s + (d.amount ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: 230,
        maxWidth: 260,
        flex: '0 0 240px',
        background: isOver ? t.colorPrimaryBg : t.colorFillSecondary,
        borderRadius: 12,
        padding: '12px 10px',
        border: isOver ? `2px dashed ${color}` : '2px solid transparent',
        transition: 'border 0.15s, background 0.15s',
      }}
    >
      {/* Заголовок колонки */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <Text strong style={{ fontSize: 13 }}>{label}</Text>
          <Badge count={deals.length} color={color} style={{ fontSize: 10 }} />
        </div>
        {totalAmount > 0 && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {totalAmount.toLocaleString('ru-RU')} ₽
          </Text>
        )}
      </div>

      {/* Карточки */}
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        {deals.map((deal) => (
          <SortableDealCard key={deal.id} deal={deal} />
        ))}
      </SortableContext>

      {deals.length === 0 && (
        <div style={{
          height: 60, border: `1.5px dashed ${t.colorBorder}`, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Перетащите сюда</Text>
        </div>
      )}
    </div>
  )
}

// ── Главный компонент доски ────────────────────────────────
interface Props {
  deals: Deal[]
  onStatusChange: (dealId: string, newStatus: DealStatus) => void
}

export function DealsBoardView({ deals, onStatusChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeDeal = deals.find((d) => d.id === activeId)

  const dealsByStatus = (status: DealStatus) => deals.filter((d) => d.status === status)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const draggedDeal = deals.find((d) => d.id === String(active.id))
    if (!draggedDeal) return

    // over может быть колонкой (DealStatus) или другой карточкой
    const overId = String(over.id)
    const targetStatus = DEAL_COLUMNS.find((c) => c.status === overId)?.status
    if (targetStatus && targetStatus !== draggedDeal.status) {
      onStatusChange(draggedDeal.id, targetStatus)
      return
    }

    // Если отпустили на карточку — берём статус этой карточки
    const targetDeal = deals.find((d) => d.id === overId)
    if (targetDeal && targetDeal.status !== draggedDeal.status) {
      onStatusChange(draggedDeal.id, targetDeal.status)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {DEAL_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            deals={dealsByStatus(col.status)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div style={{ transform: 'rotate(2deg)', opacity: 0.95, width: 240 }}>
            <DealCardContent deal={activeDeal} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
