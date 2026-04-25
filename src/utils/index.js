export const statusMap = {
  draft: { label: 'Nháp', badge: 'badge-gray' },
  submitted: { label: 'Đã nộp', badge: 'badge-blue' },
  manager_reviewed: { label: 'Quản lý đã duyệt', badge: 'badge-purple' },
  director_approved: { label: 'Đã phê duyệt', badge: 'badge-green' },
  rejected: { label: 'Bị từ chối', badge: 'badge-red' },
}
export const roleMap = {
  admin: { label: 'Quản trị viên', badge: 'badge-purple' },
  director: { label: 'Ban lãnh đạo', badge: 'badge-red' },
  manager: { label: 'Quản lý', badge: 'badge-blue' },
  employee: { label: 'Nhân viên', badge: 'badge-gray' },
}
export const scoreRating = s => {
  if (s >= 9) return { label: 'Xuất sắc', color: '#059669', bg: '#d1fae5' }
  if (s >= 7) return { label: 'Tốt', color: '#2563eb', bg: '#dbeafe' }
  if (s >= 5) return { label: 'Khá', color: '#d97706', bg: '#fef3c7' }
  if (s >= 3) return { label: 'Trung bình', color: '#ea580c', bg: '#ffedd5' }
  return { label: 'Kém', color: '#dc2626', bg: '#fee2e2' }
}
export const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '--'
export const fmtDateTime = d => d ? new Date(d).toLocaleString('vi-VN') : '--'
