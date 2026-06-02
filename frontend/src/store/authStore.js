import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: ({ user, access, refresh }) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        set({ user, accessToken: access, refreshToken: refresh });
      },

      setUser: (user) => set({ user }),

      clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isAuthenticated: () => !!get().accessToken,

      // Role helpers
      isEmployee:    () => get().user?.role === 'employee',
      isUnderwriter: () => get().user?.role === 'underwriter',
      isOpsManager:  () => get().user?.role === 'ops_manager',
      isAdmin:       () => get().user?.role === 'admin',
      canReview:     () => ['underwriter', 'admin'].includes(get().user?.role),
      canManageTasks:() => ['ops_manager', 'admin'].includes(get().user?.role),
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) }
  )
);
