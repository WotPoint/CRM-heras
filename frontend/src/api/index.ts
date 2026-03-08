import { apiFetch } from './client'
import type { User, Client, Deal, Activity, Task, DealStatusChange, EmailThread, EmailMessage } from '@/types'

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User & { mustChangePassword: boolean } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
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
  archived: () => apiFetch<Task[]>('/api/tasks/archived'),
  create: (data: Partial<Task>) =>
    apiFetch<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Task>) =>
    apiFetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archive: (id: string) => apiFetch<Task>(`/api/tasks/${id}/archive`, { method: 'PATCH' }),
  delete: (id: string) => apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
}

export const vkApi = {
  getLinkUrl: () => apiFetch<{ url: string }>('/api/vk/link-url'),
  unlink: () => apiFetch<{ ok: boolean }>('/api/vk/unlink', { method: 'DELETE' }),
}

export const emailApi = {
  status: () =>
    apiFetch<{ connected: boolean; gmailEmail: string | null; watchExpiresAt: string | null }>('/api/email/auth/status'),
  authUrl: () => apiFetch<{ url: string }>('/api/email/auth/url'),
  disconnect: () => apiFetch<{ ok: boolean }>('/api/email/auth/disconnect', { method: 'DELETE' }),
  threads: (params?: { clientId?: string; dealId?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return apiFetch<EmailThread[]>(`/api/email/threads${qs}`)
  },
  thread: (threadId: string) =>
    apiFetch<{ thread: EmailThread; messages: EmailMessage[] }>(`/api/email/threads/${threadId}`),
  send: (data: { to: string; subject: string; body: string; clientId?: string; dealId?: string }) =>
    apiFetch<{ thread: EmailThread; message: EmailMessage }>('/api/email/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reply: (threadId: string, data: { body: string }) =>
    apiFetch<EmailMessage>(`/api/email/threads/${threadId}/reply`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sync: () => apiFetch<{ synced: number }>('/api/email/sync', { method: 'POST' }),
}
