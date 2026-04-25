import api from './axios';
export const login = (data) => api.post('/auth/login', data);
export const activate = (data) => api.post('/auth/activate', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/change-password', data);
export const createAccount = (data) => api.post('/auth/create-account', data);
