// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'manager' | 'supervisor' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
  supervisorId?: string
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export type ClientStatus = 'lead' | 'active' | 'regular' | 'archived'

export interface Client {
  id: string
  firstName: string
  lastName: string
  company?: string
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

// ─── Deals ───────────────────────────────────────────────────────────────────

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

// ─── Activities ───────────────────────────────────────────────────────────────

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

// ─── Tasks ────────────────────────────────────────────────────────────────────

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

// ─── JWT payload ─────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string
  role: UserRole
  iat?: number
  exp?: number
}

// Express req.user extension
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}
