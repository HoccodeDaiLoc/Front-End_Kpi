import api from './axios';
export const getTemplates = (params) => api.get('/kpi-templates', { params });
export const getTemplateById = (id) => api.get(`/kpi-templates/${id}`);
export const createTemplate = (data) => api.post('/kpi-templates', data);
export const updateTemplate = (id, data) => api.put(`/kpi-templates/${id}`, data);
export const deleteTemplate = (id) => api.delete(`/kpi-templates/${id}`);
