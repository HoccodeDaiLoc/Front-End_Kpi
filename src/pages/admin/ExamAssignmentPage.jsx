import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getAssignmentSubmissions } from '../../api/exams';
import { ChevronLeft, ChevronRight, Search, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const pct = (v) => (v != null ? `${parseFloat(v).toFixed(1)}%` : '—');

const StatusBadge = ({ status }) => {
  const cfg = {
    pending:     { label: 'Chưa làm',   color: '#f59e0b', bg: '#fef9c3' },
    in_progress: { label: 'Đang làm',   color: '#3b82f6', bg: '#eff6ff' },
    submitted:   { label: 'Đã nộp',     color: '#8b5cf6', bg: '#f5f3ff' },
    graded:      { label: 'Đã chấm',    color: '#10b981', bg: '#f0fdf4' },
  }[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 20 }}>
      {cfg.label}
    </span>
  );
};

// Modal xác nhận
const ConfirmModal = ({ open, title, message, confirmLabel, confirmColor, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Hủy</button>
          <button className="btn btn-sm" style={{ background: confirmColor, color: '#fff', border: 'none' }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ExamAssignmentPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { type: 'reset'|'delete', submissionId, name }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getAssignmentSubmissions(assignmentId)
      .then(r => setSubmissions(r.data.data))
      .catch(() => toast.error('Không tải được danh sách'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [assignmentId]);

  const filtered = submissions.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const graded  = submissions.filter(s => s.status === 'graded').length;
  const passed  = submissions.filter(s => s.passed).length;
  const hasPct  = submissions.filter(s => s.percentage != null);
  const avgPct  = hasPct.length > 0
    ? hasPct.reduce((a, s) => a + parseFloat(s.percentage), 0) / hasPct.length
    : null;
  const dept = submissions[0]?.department_name || '';

const handleReset = async (submissionId) => {
    setActionLoading(true);
    try {
      await api.post(`/exam-submissions/${submissionId}/reset`);
      toast.success('Đã reset bài làm');
      fetchData();
    } catch {
      toast.error('Reset thất bại');
    } finally {
      setActionLoading(false);
      setModal(null);
    }
};

  // Gọi API xóa
  const handleDelete = async (submissionId) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
const res = await fetch(
  `/api/exam-submissions/${submissionId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      toast.success('Đã xóa bài làm');
      fetchData();
    } catch {
      toast.error('Xóa thất bại');
    } finally {
      setActionLoading(false);
      setModal(null);
    }
  };

  return (
    <>
      <Header
        title={dept}
        subtitle={submissions[0]?.exam_title || ''}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/exam-results')}>
            <ChevronLeft size={14} /> Quay lại
          </button>
        }
      />

      {/* Modal xác nhận */}
      <ConfirmModal
        open={!!modal}
        title={modal?.type === 'reset' ? 'Reset bài làm?' : 'Xóa bài làm?'}
        message={
          modal?.type === 'reset'
            ? `Bài làm của "${modal?.name}" sẽ được đặt lại về trạng thái chưa làm. Hành động này không thể hoàn tác.`
            : `Bài làm của "${modal?.name}" sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`
        }
        confirmLabel={actionLoading ? 'Đang xử lý...' : modal?.type === 'reset' ? 'Reset' : 'Xóa'}
        confirmColor={modal?.type === 'reset' ? '#f59e0b' : '#dc2626'}
        onConfirm={() => {
          if (modal?.type === 'reset') handleReset(modal.submissionId);
          else handleDelete(modal.submissionId);
        }}
        onCancel={() => setModal(null)}
      />

      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Tổng nhân viên', value: submissions.length, color: '#3b82f6' },
            { label: 'Đã chấm',        value: graded,             color: '#8b5cf6' },
            { label: 'Đạt',            value: passed,             color: '#16a34a' },
            { label: 'Điểm TB',        value: avgPct != null ? pct(avgPct) : '—', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ position: 'relative', maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input className="form-input" placeholder="Tìm nhân viên..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34 }} />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
          ) : !filtered.length ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>Không có dữ liệu</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Trạng thái</th>
                  <th>Điểm</th>
                  <th>Kết quả</th>
                  <th>Nộp lúc</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.submission_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {s.full_name?.split(' ').slice(-1)[0]?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14, color: s.passed ? '#16a34a' : s.status === 'graded' ? '#dc2626' : 'var(--text-3)' }}>
                        {s.percentage != null ? pct(s.percentage) : '—'}
                      </span>
                    </td>
                    <td>
                      {s.passed == null ? '—' : s.passed
                        ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Đạt</span>
                        : <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ Không đạt</span>
                      }
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/admin/exam-results/${assignmentId}/${s.submission_id}`)}
                        >
                          <ChevronRight size={13} /> Xem bài
                        </button>
                        <button
                          className="btn btn-sm"
                          title="Reset bài làm"
                          style={{ background: '#fef9c3', color: '#b45309', border: '1px solid #fde68a', padding: '4px 8px' }}
                          onClick={() => setModal({ type: 'reset', submissionId: s.submission_id, name: s.full_name })}
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          className="btn btn-sm"
                          title="Xóa bài làm"
                          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 8px' }}
                          onClick={() => setModal({ type: 'delete', submissionId: s.submission_id, name: s.full_name })}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}