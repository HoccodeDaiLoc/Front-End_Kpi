import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  // Ưu tiên mobile exam token, fallback về token đăng nhập thường
  const token = sessionStorage.getItem('exam_mobile_token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Nếu là mobile session thì KHÔNG redirect về login
      if (sessionStorage.getItem('exam_mobile_token')) {
        sessionStorage.removeItem('exam_mobile_token');
        sessionStorage.removeItem('exam_mobile_submission');
        sessionStorage.removeItem('exam_mobile_user');
        window.location.href = '/exam-done';
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;