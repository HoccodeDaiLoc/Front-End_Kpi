// TakeProposalPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getProposalQuestions, submitProposal } from '../../api/proposals';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

export default function TakeProposalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProposalQuestions(id)
      .then(r => setProposal(r.data.data))
      .catch(() => toast.error('Không tải được khảo sát'))
      .finally(() => setLoading(false));
  }, [id]);

  const setAnswer = (questionId, value) =>
    setAnswers(prev => ({ ...prev, [questionId]: value }));

  const handleSubmit = async () => {
    if (!proposal) return;
    const unanswered = proposal.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Còn ${unanswered.length} câu chưa trả lời`);
      return;
    }
    setSubmitting(true);
    try {
      await submitProposal(id, { answers });
      toast.success('Đã gửi câu trả lời!');
      navigate('/my-proposals');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi câu trả lời');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>;
  if (!proposal) return null;

  const answeredCount = Object.keys(answers).length;
  const total = proposal.questions.length;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header title={proposal.title} subtitle={proposal.description || 'Khảo sát'} />
      <div className="page-content" style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Progress */}
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: 'var(--text-3)' }}>Đã trả lời</span>
            <span style={{ fontWeight: 600 }}>{answeredCount}/{total}</span>
          </div>
          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(answeredCount / total) * 100}%`, background: 'var(--primary)', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Questions */}
        {proposal.questions.map((q, i) => (
          <div key={q.id} className="card" style={{ padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', background: '#eff6ff', padding: '2px 8px', borderRadius: 10 }}>
                Câu {i + 1}/{total}
              </span>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>{q.content}</div>
            </div>

{q.question_type === 'multiple_choice' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {(typeof q.options === 'string' ? JSON.parse(q.options) : q.options || []).map((opt, oi) => {
      const key = String.fromCharCode(65 + oi); // A, B, C...
      const label = typeof opt === 'string' ? opt : opt.label; // hỗ trợ cả 2 format
      return (
        <label key={oi} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          border: `1.5px solid ${answers[q.id] === label ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 8, cursor: 'pointer',
          background: answers[q.id] === label ? '#eff6ff' : '#fff',
        }}>
          <input type="radio" name={`q_${q.id}`} value={label}
            checked={answers[q.id] === label}
            onChange={() => setAnswer(q.id, label)} />
          <span style={{ fontSize: 13 }}>
            <strong style={{ marginRight: 6 }}>{key}.</strong>{label}
          </span>
        </label>
      );
    })}
  </div>
)}

            {q.question_type === 'rating' && (
              <div style={{ display: 'flex', gap: 10 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setAnswer(q.id, String(n))}
                    style={{
                      width: 44, height: 44, borderRadius: 8, border: '1.5px solid',
                      borderColor: answers[q.id] === String(n) ? 'var(--primary)' : 'var(--border)',
                      background: answers[q.id] === String(n) ? 'var(--primary)' : '#fff',
                      color: answers[q.id] === String(n) ? '#fff' : 'var(--text-2)',
                      fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    }}>{n}</button>
                ))}
              </div>
            )}

            {q.question_type === 'text' && (
              <textarea className="form-input" rows={3} placeholder="Nhập câu trả lời của bạn..."
                value={answers[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                style={{ resize: 'vertical' }} />
            )}
          </div>
        ))}

        {/* Submit */}
        <div style={{ textAlign: 'right', paddingBottom: 40 }}>
          <button className="btn btn-primary" onClick={handleSubmit}
            disabled={submitting || answeredCount < total}
            style={{ padding: '10px 28px', fontSize: 14 }}>
            <Send size={14} /> {submitting ? 'Đang gửi...' : 'Gửi câu trả lời'}
          </button>
        </div>
      </div>
    </div>
  );
}