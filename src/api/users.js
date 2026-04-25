import api from './axios';
export const getUsers = (params) => api.get('/users', { params });
export const getUserById = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const getManagers = () => api.get('/users/managers');
export const getSubordinates = () => api.get('/users/subordinates');
export const resendActivation = (id) => api.post(`/users/${id}/resend-activation`);
export const bulkCreateUsers = (data) => api.post('/users/bulk', data);
