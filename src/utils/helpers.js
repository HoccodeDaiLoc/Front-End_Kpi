export const getScoreLabel = (score) => {
  const t = parseFloat(score) || 0;
  if (t >= 95) return 'A';
  if (t >= 86) return 'B';
  if (t >= 76) return 'C';
  if (t >= 66) return 'D';
  if (t > 0)   return 'E';
  return '—';
};

export const getScoreColor = (score) => {
  const t = parseFloat(score) || 0;
  if (t >= 95) return '#10b981'; // A — xanh lá
  if (t >= 86) return '#3b82f6'; // B — xanh dương
  if (t >= 76) return '#f59e0b'; // C — vàng
  if (t >= 66) return '#f97316'; // D — cam
  if (t > 0)   return '#ef4444'; // E — đỏ
  return '#94a3b8';
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
  const map = { admin: 'Quản trị viên', employee: 'Nhân viên', manager: 'Quản lý', director: 'Ban lãnh đạo' ,chairman: 'Ban kiểm soát' };
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
