import { Tag } from 'antd'
import type { ClientStatus, DealStatus, TaskStatus, TaskPriority } from '@/types'

// ── Клиенты ──────────────────────────────────────────────────
const CLIENT_STATUS_MAP: Record<ClientStatus, { label: string; color: string }> = {
  lead:     { label: 'Лид',       color: 'blue'    },
  active:   { label: 'Активный',  color: 'green'   },
  regular:  { label: 'Постоянный', color: 'purple' },
  archived: { label: 'Архивный',  color: 'default' },
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { label, color } = CLIENT_STATUS_MAP[status]
  return <Tag color={color}>{label}</Tag>
}

// ── Сделки ────────────────────────────────────────────────────
const DEAL_STATUS_MAP: Record<DealStatus, { label: string; color: string }> = {
  new:              { label: 'Новая',             color: 'blue'    },
  negotiation:      { label: 'Переговоры',        color: 'orange'  },
  proposal_sent:    { label: 'КП отправлено',     color: 'cyan'    },
  awaiting_payment: { label: 'Ожидает оплаты',   color: 'gold'    },
  won:              { label: 'Закрыта / Выиграна', color: 'green'  },
  lost:             { label: 'Закрыта / Проиграна', color: 'red'   },
}

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const { label, color } = DEAL_STATUS_MAP[status]
  return <Tag color={color}>{label}</Tag>
}

export { DEAL_STATUS_MAP }

// ── Задачи ────────────────────────────────────────────────────
const TASK_STATUS_MAP: Record<TaskStatus, { label: string; color: string }> = {
  new:         { label: 'Новая',     color: 'blue'    },
  in_progress: { label: 'В работе',  color: 'orange'  },
  done:        { label: 'Выполнена', color: 'green'   },
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { label, color } = TASK_STATUS_MAP[status]
  return <Tag color={color}>{label}</Tag>
}

// ── Приоритет ─────────────────────────────────────────────────
const PRIORITY_MAP: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: 'Низкий',   color: 'default' },
  medium: { label: 'Средний',  color: 'orange'  },
  high:   { label: 'Высокий',  color: 'red'     },
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, color } = PRIORITY_MAP[priority]
  return <Tag color={color}>{label}</Tag>
}
