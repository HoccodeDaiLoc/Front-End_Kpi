import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getMyResult } from '../../api/exams';
import { CheckCircle, XCircle, Clock, ChevronLeft, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExamResultPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyResult(submissionId)
      .then(r => setResult(r.data.data))
      .catch(() => { toast.error('Không tải được kết quả'); navigate('/my-exams'); })
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!result) return null;

  const isPassed = result.passed;
  const isGraded = result.status === 'graded';

  return (
    <>
      <Header
        title="Kết quả bài kiểm tra"
        subtitle={result.title}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/my-exams')}>
            <ChevronLeft size={14} /> Quay lại
          </button>
        }
      />

      <div className="page-content">
        {/* Score card */}
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px', marginBottom: 20 }}>
          {!isGraded ? (
            <>
              <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Đang chấm bài...</div>
              <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Kết quả sẽ có sau khi chấm xong</div>
            </>
          ) : isPassed ? (
            <>
              <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a' }}>{result.percentage}%</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>ĐẠT</div>
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                Điểm: {result.total_score}/{result.max_score} · Điểm đạt: {result.passing_score}%
              </div>
            </>
          ) : (
            <>
              <XCircle size={56} color="#ef4444" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>{result.percentage}%</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>KHÔNG ĐẠT</div>
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                Điểm: {result.total_score}/{result.max_score} · Cần đạt: {result.passing_score}%
              </div>
            </>
          )}

          {result.submitted_at && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Clock size={12} />
              Nộp lúc: {new Date(result.submitted_at).toLocaleString('vi-VN')}
            </div>
          )}
        </div>

        {/* Chi tiết từng câu */}
        {isGraded && result.answers?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 600 }}>Chi tiết từng câu</span>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              {result.answers.map((ans, i) => {
                const isCorrect = ans.is_correct;
                const isShortAnswer = ans.question_type === 'short_answer';
                return (
                  <div key={i} style={{
                    border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: 8, padding: 14, marginBottom: 10,
                    background: isCorrect ? '#f0fdf4' : '#fef2f2'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Câu {i + 1}: {ans.content}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: isCorrect ? '#16a34a' : '#dc2626'
                      }}>
                        {isCorrect
                          ? <><CheckCircle size={13} style={{ display: 'inline', marginRight: 3 }} />{ans.score}/{ans.points}</>
                          : <><XCircle size={13} style={{ display: 'inline', marginRight: 3 }} />{ans.score || 0}/{ans.points}</>
                        }
                      </span>
                    </div>

         <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
  {/* Hiện tất cả options nếu là trắc nghiệm */}
  {ans.options?.length > 0 && (
    <div style={{ marginBottom: 8 }}>
      {ans.options.map(opt => {
        const isChosen = ans.answer === opt.key || ans.answer?.split(',').includes(opt.key);
        const isCorrectOpt = ans.correct_answer === opt.key || ans.correct_answer?.split(',').includes(opt.key);
        return (
          <div key={opt.key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', borderRadius: 6, marginBottom: 4,
            background: isCorrectOpt ? '#dcfce7' : isChosen ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${isCorrectOpt ? '#86efac' : isChosen ? '#fca5a5' : '#e2e8f0'}`,
          }}>
            <span style={{ fontWeight: 700, color: isCorrectOpt ? '#16a34a' : isChosen ? '#dc2626' : 'var(--text-3)', minWidth: 18 }}>
              {opt.key}.
            </span>
            <span style={{ flex: 1, color: isCorrectOpt ? '#15803d' : isChosen ? '#b91c1c' : 'var(--text-2)' }}>
              {opt.text}
            </span>
            {isCorrectOpt && <CheckCircle size={13} color="#16a34a" />}
            {isChosen && !isCorrectOpt && <XCircle size={13} color="#dc2626" />}
          </div>
        );
      })}
    </div>
  )}

  {/* True/False */}
  {ans.question_type === 'true_false' && (
    <div style={{ marginBottom: 8 }}>
      {['true', 'false'].map(val => {
        const isChosen = ans.answer === val;
        const isCorrectOpt = ans.correct_answer === val;
        return (
          <div key={val} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', borderRadius: 6, marginBottom: 4,
            background: isCorrectOpt ? '#dcfce7' : isChosen ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${isCorrectOpt ? '#86efac' : isChosen ? '#fca5a5' : '#e2e8f0'}`,
          }}>
            <span style={{ flex: 1, color: isCorrectOpt ? '#15803d' : isChosen ? '#b91c1c' : 'var(--text-2)' }}>
              {val === 'true' ? 'Đúng' : 'Sai'}
            </span>
            {isCorrectOpt && <CheckCircle size={13} color="#16a34a" />}
            {isChosen && !isCorrectOpt && <XCircle size={13} color="#dc2626" />}
          </div>
        );
      })}
    </div>
  )}

  {/* Short answer */}
  {ans.question_type === 'short_answer' && (
    <div style={{ marginBottom: 6 }}>
      <div>Câu trả lời của bạn: <strong>{ans.answer || '(Chưa trả lời)'}</strong></div>
    </div>
  )}

  {ans.ai_feedback && (
    <div style={{ marginTop: 6, padding: '6px 10px', background: '#f0f9ff', borderRadius: 6, borderLeft: '3px solid #3b82f6', fontSize: 11, color: '#1e40af' }}>
      💡 {ans.ai_feedback}
    </div>
  )}
</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}