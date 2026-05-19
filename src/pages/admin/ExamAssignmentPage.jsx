import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getAssignmentSubmissions } from '../../api/exams';
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';

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

export default function ExamAssignmentPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAssignmentSubmissions(assignmentId)
      .then(r => setSubmissions(r.data.data))
      .catch(() => toast.error('Không tải được danh sách'))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const filtered = submissions.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const graded = submissions.filter(s => s.status === 'graded').length;
  const passed = submissions.filter(s => s.passed).length;
  const avgPct = submissions.filter(s => s.percentage != null).length > 0
    ? submissions.filter(s => s.percentage != null).reduce((a, s) => a + parseFloat(s.percentage), 0) / submissions.filter(s => s.percentage != null).length
    : null;

  const dept = submissions[0]?.department_name || '';

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
      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Tổng nhân viên', value: submissions.length, color: '#3b82f6' },
            { label: 'Đã chấm', value: graded, color: '#8b5cf6' },
            { label: 'Đạt', value: passed, color: '#16a34a' },
            { label: 'Điểm TB', value: avgPct != null ? pct(avgPct) : '—', color: '#f59e0b' },
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
                        ? <span style={{ color: '#16a34a', fontWeight: 600 }}> Đạt</span>
                        : <span style={{ color: '#dc2626', fontWeight: 600 }}> Không đạt</span>
                      }
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/admin/exam-results/${assignmentId}/${s.submission_id}`)}
                      >
                        <ChevronRight size={13} /> Xem bài
                      </button>
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