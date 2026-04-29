import api from './axios';
export const getEvaluations = (params) => api.get('/kpi-evaluations', { params });
export const getEvaluationById = (id) => api.get(`/kpi-evaluations/${id}`);
export const createEvaluation = (data) => api.post('/kpi-evaluations', data);
export const updateEvaluation = (id, data) => api.put(`/kpi-evaluations/${id}`, data);
export const submitEvaluation = (id) => api.post(`/kpi-evaluations/${id}/submit`);
export const managerReview = (id, data) => api.post(`/kpi-evaluations/${id}/manager-review`, data);
export const directorApprove = (id, data) => api.post(`/kpi-evaluations/${id}/director-approve`, data);
export const deleteEvaluation = (id) => api.delete(`/kpi-evaluations/${id}`);