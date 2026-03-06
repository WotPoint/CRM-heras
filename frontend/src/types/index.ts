// ============================================================
// AUTH
// ============================================================
export type UserRole = 'manager' | 'supervisor' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  mustChangePassword?: boolean
  createdAt: string
  lastLoginAt?: string
  /** Для менеджера — id руководителя */
  supervisorId?: string
}

// ============================================================
// COMPANIES
// ============================================================
export interface Company {
  id: string
  name: string
  inn?: string
  address?: string
  phone?: string
  createdAt: string
}

// ============================================================
// CLIENTS (Contact + Lead unified by status)
// ============================================================
export type ClientStatus = 'lead' | 'active' | 'regular' | 'archived'

export interface Client {
  id: string
  firstName: string
  lastName: string
  middleName?: string
  position?: string
  /** Plain text company name (legacy) */
  company?: string
  /** FK → Company */
  companyId?: string
  email?: string
  phone?: string
  address?: string
  status: ClientStatus
  managerId: string
  tags: string[]
  source?: string
  comment?: string
  createdAt: string
  lastContactAt?: string
}

// ============================================================
// DEALS
// ============================================================
export type DealStatus =
  | 'new'
  | 'negotiation'
  | 'proposal_sent'
  | 'awaiting_payment'
  | 'won'
  | 'lost'

export interface Deal {
  id: string
  title: string
  clientId: string
  /** FK → Company (опционально) */
  companyId?: string
  managerId: string
  status: DealStatus
  amount: number
  deadline?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface DealStatusChange {
  id: string
  dealId: string
  fromStatus: DealStatus | null
  toStatus: DealStatus
  changedBy: string
  changedAt: string
}

// ============================================================
// ACTIVITIES (Взаимодействия)
// ============================================================
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'status_change'

export interface Activity {
  id: string
  type: ActivityType
  managerId: string
  clientId?: string
  dealId?: string
  date: string
  description: string
  result?: string
  createdAt: string
}

// ============================================================
// REQUESTS (входящие запросы от клиентов)
// ============================================================
export type RequestStatus = 'new' | 'in_progress' | 'resolved' | 'closed'

export interface Request {
  id: string
  title: string
  description?: string
  status: RequestStatus
  contactId?: string
  dealId?: string
  assigneeId?: string
  createdAt: string
  closedAt?: string
}

// ============================================================
// TASKS
// ============================================================
export type TaskStatus = 'new' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  clientId?: string
  dealId?: string
  deadline?: string
  createdAt: string
  completedAt?: string
}
