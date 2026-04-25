import api from './axios'
export const authAPI = {
  login: d => api.post('/auth/login', d),
  activate: d => api.post('/auth/activate', d),
  forgotPassword: d => api.post('/auth/forgot-password', d),
  resetPassword: d => api.post('/auth/reset-password', d),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: d => api.put('/auth/profile', d),
  changePassword: d => api.put('/auth/change-password', d),
  createAccount: d => api.post('/auth/create-account', d),
}
export const userAPI = {
  getUsers: p => api.get('/users', { params: p }),
  getUserById: id => api.get(`/users/${id}`),
  updateUser: (id, d) => api.put(`/users/${id}`, d),
  deleteUser: id => api.delete(`/users/${id}`),
  getManagers: () => api.get('/users/managers'),
  getSubordinates: () => api.get('/users/subordinates'),
  resendActivation: id => api.post(`/users/${id}/resend-activation`),
  bulkCreate: d => api.post('/users/bulk', d),
}
export const deptAPI = {
  getDepartments: () => api.get('/departments'),
  createDepartment: d => api.post('/departments', d),
  updateDepartment: (id, d) => api.put(`/departments/${id}`, d),
  deleteDepartment: id => api.delete(`/departments/${id}`),
  getOrgChart: () => api.get('/departments/org-chart'),
}
export const templateAPI = {
  getTemplates: p => api.get('/kpi-templates', { params: p }),
  getTemplateById: id => api.get(`/kpi-templates/${id}`),
  createTemplate: d => api.post('/kpi-templates', d),
  updateTemplate: (id, d) => api.put(`/kpi-templates/${id}`, d),
  deleteTemplate: id => api.delete(`/kpi-templates/${id}`),
}
export const evalAPI = {
  getEvaluations: p => api.get('/kpi-evaluations', { params: p }),
  getEvaluationById: id => api.get(`/kpi-evaluations/${id}`),
  createEvaluation: d => api.post('/kpi-evaluations', d),
  updateEvaluation: (id, d) => api.put(`/kpi-evaluations/${id}`, d),
  submitEvaluation: id => api.post(`/kpi-evaluations/${id}/submit`),
  managerReview: (id, d) => api.post(`/kpi-evaluations/${id}/manager-review`, d),
  directorApprove: (id, d) => api.post(`/kpi-evaluations/${id}/director-approve`, d),
}
export const dashAPI = {
  getOverview: p => api.get('/dashboard/overview', { params: p }),
  getTrend: p => api.get('/dashboard/trend', { params: p }),
  getMyStats: () => api.get('/dashboard/my-stats'),
  getUserStats: id => api.get(`/dashboard/my-stats/${id}`),
}
export const notifAPI = {
  getNotifications: p => api.get('/notifications', { params: p }),
  markAsRead: id => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: id => api.delete(`/notifications/${id}`),
}
