import { apiFetch } from './client'
import type { User, Client, Deal, Activity, Task, DealStatusChange } from '@/types'

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
}

export const usersApi = {
  list: () => apiFetch<User[]>('/api/users'),
  create: (data: Partial<User> & { password: string }) =>
    apiFetch<User>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<User>) =>
    apiFetch<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

export const clientsApi = {
  list: () => apiFetch<Client[]>('/api/clients'),
  create: (data: Partial<Client>) =>
    apiFetch<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Client>) =>
    apiFetch<Client>(`/api/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/api/clients/${id}`, { method: 'DELETE' }),
}

export const dealsApi = {
  list: () => apiFetch<Deal[]>('/api/deals'),
  create: (data: Partial<Deal>) =>
    apiFetch<Deal>('/api/deals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Deal>) =>
    apiFetch<Deal>(`/api/deals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/api/deals/${id}`, { method: 'DELETE' }),
  history: (id: string) => apiFetch<DealStatusChange[]>(`/api/deals/${id}/history`),
}

export const activitiesApi = {
  list: () => apiFetch<Activity[]>('/api/activities'),
  create: (data: Partial<Activity>) =>
    apiFetch<Activity>('/api/activities', { method: 'POST', body: JSON.stringify(data) }),
}

export const tasksApi = {
  list: () => apiFetch<Task[]>('/api/tasks'),
  create: (data: Partial<Task>) =>
    apiFetch<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Task>) =>
    apiFetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
}
