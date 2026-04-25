export const getScoreColor = (score) => {
  if (score >= 9) return '#10b981';
  if (score >= 7) return '#3b82f6';
  if (score >= 5) return '#f59e0b';
  if (score >= 3) return '#f97316';
  return '#ef4444';
};

export const getScoreLabel = (score) => {
  if (score >= 9) return 'Xuất sắc';
  if (score >= 7) return 'Tốt';
  if (score >= 5) return 'Khá';
  if (score >= 3) return 'Trung bình';
  return 'Kém';
};

export const getStatusColor = (status) => {
  const map = {
    draft: '#94a3b8',
    submitted: '#3b82f6',
    manager_reviewed: '#f59e0b',
    director_approved: '#10b981',
    rejected: '#ef4444'
  };
  return map[status] || '#94a3b8';
};

export const getStatusLabel = (status) => {
  const map = {
    draft: 'Bản nháp',
    submitted: 'Đã nộp',
    manager_reviewed: 'Quản lý đã duyệt',
    director_approved: 'Đã phê duyệt',
    rejected: 'Bị từ chối'
  };
  return map[status] || status;
};

export const getRoleLabel = (role) => {
  const map = { admin: 'Quản trị viên', employee: 'Nhân viên', manager: 'Quản lý', director: 'Ban lãnh đạo' };
  return map[role] || role;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
};
