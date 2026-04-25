import api from './axios';
export const getOverview = (params) => api.get('/dashboard/overview', { params });
export const getTrend = (params) => api.get('/dashboard/trend', { params });
export const getMyStats = () => api.get('/dashboard/my-stats');
export const getUserStats = (id) => api.get(`/dashboard/my-stats/${id}`);
