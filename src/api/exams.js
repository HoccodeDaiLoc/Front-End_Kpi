import api from './axios';

// ── Admin ──────────────────────────────────────────────────────
export const getExams = (params) => api.get('/exams', { params });
export const getExamById = (id) => api.get(`/exams/${id}`);
export const createExam = (data) => api.post('/exams', data);
export const updateExam = (id, data) => api.put(`/exams/${id}`, data);
export const deleteExam = (id) => api.delete(`/exams/${id}`);
export const sendExam = (id, data) => api.post(`/exams/${id}/send`, data);
export const getAssignments = () => api.get('/exam-assignments');
export const getAssignmentResults = (id) => api.get(`/exam-assignments/${id}/results`);
export const getSubmissionDetail = (id) => api.get(`/exam-submissions/${id}/detail`);
export const exportResults = (id) => api.get(`/exam-assignments/${id}/results/export`, { responseType: 'blob' });

// ── Employee ───────────────────────────────────────────────────
export const getMyExams = () => api.get('/my-exams');
export const startExam = (submissionId) => api.get(`/my-exams/${submissionId}/start`);
export const saveAnswers = (submissionId, answers) => api.post(`/my-exams/${submissionId}/save`, { answers });
export const submitExam = (submissionId, answers) => api.post(`/my-exams/${submissionId}/submit`, { answers });
export const getMyResult = (submissionId) => api.get(`/my-exams/${submissionId}/result`);
export const logViolation = (submissionId, reason) => api.post(`/my-exams/${submissionId}/violations`, { reason });
export const lockSubmission = (submissionId) => api.post(`/my-exams/${submissionId}/lock`);
export const revokeAssignment = (assignmentId) => api.delete(`/exams/assignments/${assignmentId}`);
export const getAssignmentSubmissions = (id) => api.get(`/exam-assignments/${id}/submissions`);
export const getExamQR        = (subId) => api.get(`/my-exams/${subId}/qr`);
export const getSessionStatus = (subId) => api.get(`/my-exams/${subId}/session-status`);
export const verifySession    = (token) => api.get(`/verify-session?token=${token}`);
// Thêm vào src/api/exams.js
export const getAuthHeaders = () => {
  const mobileToken = sessionStorage.getItem('exam_mobile_token');
  const normalToken = localStorage.getItem('token'); // hoặc tên key bạn đang dùng
  const token = mobileToken || normalToken;
  return { Authorization: `Bearer ${token}` };
};