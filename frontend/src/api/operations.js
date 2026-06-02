import { api } from './client';
export const getTasks       = (params) => api.get('/operations/tasks/', { params });
export const getTask        = (id)     => api.get(`/operations/tasks/${id}/`);
export const createTask     = (data)   => api.post('/operations/tasks/', data);
export const updateTask     = (id, d)  => api.patch(`/operations/tasks/${id}/`, d);
export const completeTask   = (id)     => api.post(`/operations/tasks/${id}/complete/`);
export const addComment     = (id, d)  => api.post(`/operations/tasks/${id}/comments/`, d);
export const getMyTasks     = ()       => api.get('/operations/tasks/my-tasks/');
export const getTaskSummary = ()       => api.get('/operations/tasks/summary/');
