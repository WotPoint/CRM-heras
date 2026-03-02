import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'
import { MOCK_USERS, MOCK_CREDENTIALS, MOCK_PASSWORD } from '@/mocks'

interface AuthState {
  currentUser: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  hasRole: (...roles: UserRole[]) => boolean
  /** Может ли текущий пользователь видеть данные другого менеджера */
  canViewManager: (managerId: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,

      login: (email, password) => {
        if (password !== MOCK_PASSWORD) {
          return { success: false, error: 'Неверный пароль' }
        }
        const userId = MOCK_CREDENTIALS[email.toLowerCase()]
        if (!userId) {
          return { success: false, error: 'Пользователь не найден' }
        }
        const user = MOCK_USERS.find((u) => u.id === userId)
        if (!user) {
          return { success: false, error: 'Пользователь не найден' }
        }
        if (!user.isActive) {
          return { success: false, error: 'Учётная запись заблокирована' }
        }
        set({ currentUser: user, isAuthenticated: true })
        return { success: true }
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false })
      },

      hasRole: (...roles) => {
        const { currentUser } = get()
        if (!currentUser) return false
        return roles.includes(currentUser.role)
      },

      canViewManager: (managerId) => {
        const { currentUser } = get()
        if (!currentUser) return false
        if (currentUser.role === 'admin' || currentUser.role === 'supervisor') return true
        return currentUser.id === managerId
      },
    }),
    {
      name: 'crm-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
