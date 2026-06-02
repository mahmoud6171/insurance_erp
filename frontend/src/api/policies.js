import { api } from './client';
export const getPolicies     = (params) => api.get('/policies/', { params });
export const getPolicy       = (id)     => api.get(`/policies/${id}/`);
export const createPolicy    = (data)   => api.post('/policies/', data);
export const updatePolicy    = (id, d)  => api.patch(`/policies/${id}/`, d);
export const submitPolicy    = (id)     => api.post(`/policies/${id}/submit/`);
export const takePolicy      = (id)     => api.post(`/policies/${id}/take/`);
export const reviewPolicy    = (id, d)  => api.post(`/policies/${id}/review/`, d);
export const getPolicySummary= ()       => api.get('/policies/summary/');

export const uploadDocument  = (id, formData) => api.post(`/policies/${id}/documents/upload/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const listDocuments   = (id)            => api.get(`/policies/${id}/documents/`);
export const deleteDocument  = (policyId, docId) => api.delete(`/policies/${policyId}/documents/${docId}/delete/`);
