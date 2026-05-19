import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getMyExams } from '../../api/exams';
import { Clock, CheckCircle, BookOpen, AlertCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: { label: 'Chưa làm', color: '#f59e0b', bg: '#fef9c3', icon: BookOpen },
  in_progress: { label: 'Đang làm', color: '#3b82f6', bg: '#eff6ff', icon: Clock },
  submitted: { label: 'Đã nộp', color: '#8b5cf6', bg: '#f5f3ff', icon: AlertCircle },
  graded: { label: 'Đã chấm', color: '#10b981', bg: '#f0fdf4', icon: CheckCircle },
};

export default function MyExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyExams()
      .then(r => setExams(r.data.data))
      .catch(() => toast.error('Không tải được danh sách bài thi'))
      .finally(() => setLoading(false));
  }, []);

  const pending = exams.filter(e => ['pending', 'in_progress'].includes(e.status));
  const done = exams.filter(e => ['submitted', 'graded'].includes(e.status));

  const handleClick = (exam) => {
    if (['submitted', 'graded'].includes(exam.status)) {
      navigate(`/exams/${exam.submission_id}/result`);
    } else {
      navigate(`/exams/${exam.submission_id}/take`);
    }
  };

  const ExamCard = ({ exam }) => {
    const cfg = STATUS_CONFIG[exam.status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    const isOverdue = exam.deadline && new Date(exam.deadline) < new Date() && exam.status === 'pending';

    return (
      <div
        onClick={() => handleClick(exam)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
          cursor: 'pointer',
          transition: 'all 0.15s',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      >
        {/* Icon status */}
        <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={cfg.color} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{exam.title}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={11} /> {exam.time_limit ? `${exam.time_limit} phút` : 'Không giới hạn'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Phòng ban: {exam.department_name}
            </span>
            {exam.deadline && (
              <span style={{ fontSize: 11, color: isOverdue ? '#ef4444' : 'var(--text-3)' }}>
                Hạn: {new Date(exam.deadline).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        </div>

        {/* Score nếu đã chấm */}
        {exam.status === 'graded' && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: exam.passed ? '#16a34a' : '#ef4444' }}>
              {exam.percentage}%
            </div>
            <div style={{ fontSize: 11, color: exam.passed ? '#16a34a' : '#ef4444' }}>
              {exam.passed ? 'Đạt' : 'Không đạt'}
            </div>
          </div>
        )}

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '3px 8px', borderRadius: 20 }}>
            {cfg.label}
          </span>
          <ChevronRight size={14} color="var(--text-3)" />
        </div>
      </div>
    );
  };

  return (
    <>
      <Header title="Bài kiểm tra của tôi" subtitle={`${exams.length} bài thi`} />

      <div className="page-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>Đang tải...</div>
        ) : !exams.length ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 0' }}>
            <BookOpen size={40} color="var(--text-3)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Bạn chưa có bài kiểm tra nào</div>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cần làm ({pending.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pending.map(e => <ExamCard key={e.submission_id} exam={e} />)}
                </div>
              </div>
            )}

            {done.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Đã hoàn thành ({done.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {done.map(e => <ExamCard key={e.submission_id} exam={e} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}