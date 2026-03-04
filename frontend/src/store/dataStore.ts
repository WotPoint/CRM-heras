import { create } from 'zustand'
import { clientsApi, dealsApi, activitiesApi, tasksApi } from '@/api'
import type { Client, Deal, Activity, Task } from '@/types'

interface DataState {
  clients: Client[]
  deals: Deal[]
  activities: Activity[]
  tasks: Task[]
  loaded: boolean
  loading: boolean
  loadError: string | null

  loadAll: () => Promise<void>
  reload: () => Promise<void>

  addClient: (data: Partial<Client>) => Promise<Client>
  updateClient: (id: string, data: Partial<Client>) => Promise<Client>

  addDeal: (data: Partial<Deal>) => Promise<Deal>
  updateDeal: (id: string, data: Partial<Deal>) => Promise<Deal>

  addActivity: (data: Partial<Activity>) => Promise<Activity>

  addTask: (data: Partial<Task>) => Promise<Task>
  updateTask: (id: string, data: Partial<Task>) => Promise<Task>
}

export const useDataStore = create<DataState>()((set, get) => ({
  clients: [],
  deals: [],
  activities: [],
  tasks: [],
  loaded: false,
  loading: false,
  loadError: null,

  loadAll: async () => {
    if (get().loading) return
    set({ loading: true, loadError: null })
    try {
      const [clients, deals, activities, tasks] = await Promise.all([
        clientsApi.list(),
        dealsApi.list(),
        activitiesApi.list(),
        tasksApi.list(),
      ])
      set({ clients, deals, activities, tasks, loaded: true })
    } catch (e) {
      set({ loadError: (e as Error).message || 'Не удалось загрузить данные' })
    } finally {
      set({ loading: false })
    }
  },

  reload: async () => {
    set({ loaded: false, loadError: null })
    await get().loadAll()
  },

  addClient: async (data) => {
    const client = await clientsApi.create(data)
    set((s) => ({ clients: [client, ...s.clients] }))
    return client
  },

  updateClient: async (id, data) => {
    const client = await clientsApi.update(id, data)
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? client : c)) }))
    return client
  },

  addDeal: async (data) => {
    const deal = await dealsApi.create(data)
    set((s) => ({ deals: [deal, ...s.deals] }))
    return deal
  },

  updateDeal: async (id, data) => {
    const deal = await dealsApi.update(id, data)
    set((s) => ({ deals: s.deals.map((d) => (d.id === id ? deal : d)) }))
    return deal
  },

  addActivity: async (data) => {
    const activity = await activitiesApi.create(data)
    set((s) => ({ activities: [activity, ...s.activities] }))
    return activity
  },

  addTask: async (data) => {
    const task = await tasksApi.create(data)
    set((s) => ({ tasks: [task, ...s.tasks] }))
    return task
  },

  updateTask: async (id, data) => {
    const task = await tasksApi.update(id, data)
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? task : t)) }))
    return task
  },
}))
