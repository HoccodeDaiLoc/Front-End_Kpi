import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getSubmissionDetail } from '../../api/exams';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
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
    <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 20 }}>
      {cfg.label}
    </span>
  );
};

export default function ExamSubmissionPage() {
  const { assignmentId, submissionId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubmissionDetail(submissionId)
      .then(r => setDetail(r.data.data))
      .catch(() => { toast.error('Không tải được chi tiết'); navigate(-1); })
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  );
  if (!detail) return null;

  return (
    <>
      <Header
        title={detail.full_name}
        subtitle={detail.exam_title}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/exam-results/${assignmentId}`)}>
            <ChevronLeft size={14} /> Quay lại
          </button>
        }
      />
      <div className="page-content">
        {/* Score card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ padding: '20px 24px', display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: detail.passed ? '#16a34a' : detail.status === 'graded' ? '#dc2626' : '#f59e0b' }}>
                {detail.percentage != null ? pct(detail.percentage) : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Điểm %</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {detail.total_score != null ? `${detail.total_score}/${detail.max_score}` : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Điểm số</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <StatusBadge status={detail.status} />
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>Trạng thái</div>
            </div>
            {detail.submitted_at && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {new Date(detail.submitted_at).toLocaleString('vi-VN')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Nộp lúc</div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13 }}>{detail.email}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Email</div>
            </div>
          </div>
        </div>

        {/* Answers */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Chi tiết từng câu ({detail.answers?.length || 0} câu)</span>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            {!detail.answers?.length ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-3)' }}>Chưa có câu trả lời</div>
            ) : detail.answers.map((ans, i) => {
              const isCorrect = ans.is_correct;
              const isShort = ans.question_type === 'short_answer';
              return (
                <div key={i} style={{
                  border: `1px solid ${isCorrect ? '#bbf7d0' : isShort ? '#e2e8f0' : '#fecaca'}`,
                  borderRadius: 8, padding: 14, marginBottom: 10,
                  background: isCorrect ? '#f0fdf4' : isShort ? '#fafafa' : '#fef2f2',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, flex: 1, paddingRight: 12 }}>
                      Câu {i + 1}: {ans.content}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: isCorrect ? '#16a34a' : '#dc2626' }}>
                      {ans.score != null ? ans.score : '—'}/{ans.points} đ
                    </span>
                  </div>
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Trả lời: </span>
                      <strong style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>
                        {ans.answer || '(Chưa trả lời)'}
                      </strong>
                    </div>
                    {!isShort && (
                      <div>
                        <span style={{ color: 'var(--text-3)' }}>Đáp án đúng: </span>
                        <strong style={{ color: '#16a34a' }}>{ans.correct_answer}</strong>
                      </div>
                    )}
                    {ans.ai_feedback && (
                      <div style={{ marginTop: 6, padding: '6px 12px', background: '#f0f9ff', borderRadius: 6, borderLeft: '3px solid #3b82f6', fontSize: 12, color: '#1e40af' }}>
                        💡 {ans.ai_feedback}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}