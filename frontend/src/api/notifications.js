import { api } from './client';
export const getNotifications = (params) => api.get('/notifications/', { params });
export const getUnreadCount   = ()       => api.get('/notifications/unread-count/');
export const markRead         = (id)     => api.post(`/notifications/${id}/read/`);
export const markAllRead      = ()       => api.post('/notifications/mark-all-read/');
