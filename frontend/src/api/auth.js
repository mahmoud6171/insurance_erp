import { api } from './client';
export const login          = (data)    => api.post('/auth/login/', data);
export const logout         = (refresh) => api.post('/auth/logout/', { refresh });
export const getMe          = ()        => api.get('/auth/me/');
export const changePassword = (data)    => api.post('/auth/change-password/', data);
export const getUsers       = ()        => api.get('/auth/users/');
export const getUnderwriters= ()        => api.get('/auth/users/underwriters/');
export const createUser     = (data)    => api.post('/auth/register/', data);

export const updateUser  = (id, data) => api.patch(`/auth/users/${id}/`, data);
export const deleteUser  = (id)       => api.delete(`/auth/users/${id}/`);
