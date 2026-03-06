import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'
import { authApi } from '@/api'

interface AuthState {
  currentUser: User | null
  token: string | null
  isAuthenticated: boolean
  mustChangePassword: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  clearMustChangePassword: () => void
  hasRole: (...roles: UserRole[]) => boolean
  canViewManager: (managerId: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      token: null,
      isAuthenticated: false,
      mustChangePassword: false,

      login: async (email, password) => {
        try {
          const { token, user } = await authApi.login(email, password)
          set({
            currentUser: user,
            token,
            isAuthenticated: true,
            mustChangePassword: user.mustChangePassword ?? false,
          })
          return { success: true }
        } catch (e) {
          return { success: false, error: (e as Error).message }
        }
      },

      logout: () => {
        set({ currentUser: null, token: null, isAuthenticated: false, mustChangePassword: false })
      },

      clearMustChangePassword: () => {
        set((s) => ({
          mustChangePassword: false,
          currentUser: s.currentUser ? { ...s.currentUser, mustChangePassword: false } : null,
        }))
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
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
)
