import type { User } from '@/types'

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Анна Менеджерова',
    email: 'manager@crm.ru',
    phone: '+7 900 111-22-33',
    role: 'manager',
    isActive: true,
    createdAt: '2024-01-10T09:00:00',
    lastLoginAt: '2026-03-02T08:30:00',
    supervisorId: 'u3',
  },
  {
    id: 'u2',
    name: 'Дмитрий Продажников',
    email: 'manager2@crm.ru',
    phone: '+7 900 444-55-66',
    role: 'manager',
    isActive: true,
    createdAt: '2024-02-15T09:00:00',
    lastLoginAt: '2026-03-01T17:45:00',
    supervisorId: 'u3',
  },
  {
    id: 'u3',
    name: 'Сергей Руководов',
    email: 'supervisor@crm.ru',
    phone: '+7 900 777-88-99',
    role: 'supervisor',
    isActive: true,
    createdAt: '2023-11-01T09:00:00',
    lastLoginAt: '2026-03-02T09:00:00',
  },
  {
    id: 'u4',
    name: 'Елена Администратова',
    email: 'admin@crm.ru',
    phone: '+7 900 000-11-22',
    role: 'admin',
    isActive: true,
    createdAt: '2023-10-01T09:00:00',
    lastLoginAt: '2026-03-02T08:00:00',
  },
]

/** Для быстрого входа в разработке: email → пользователь */
export const MOCK_CREDENTIALS: Record<string, string> = {
  'manager@crm.ru': 'u1',
  'manager2@crm.ru': 'u2',
  'supervisor@crm.ru': 'u3',
  'admin@crm.ru': 'u4',
}

export const MOCK_PASSWORD = '123456'
