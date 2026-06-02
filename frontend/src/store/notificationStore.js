import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  wsConnected: false,

  setUnreadCount: (n) => set({ unreadCount: n }),

  addNotification: (notif) => set((s) => ({
    notifications: [notif, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),

  setNotifications: (list) => set({ notifications: list }),

  markRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
    unreadCount: 0,
  })),

  setWsConnected: (v) => set({ wsConnected: v }),
}));
