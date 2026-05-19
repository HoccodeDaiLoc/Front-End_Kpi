import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startExam, saveAnswers, submitExam, logViolation, lockSubmission } from '../../api/exams';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle, Check, X } from 'lucide-react';

export default function TakeExamMobilePage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [violations, setViolations] = useState(0);
  const [done, setDone] = useState(false);

  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const violationTimerRef = useRef(null);

  const clearMobileSession = () => {
    sessionStorage.removeItem('exam_mobile_token');
    sessionStorage.removeItem('exam_mobile_submission');
    sessionStorage.removeItem('exam_mobile_user');
  };

  // Kiểm tra token mobile + load đề thi
  useEffect(() => {
    const token = sessionStorage.getItem('exam_mobile_token');
    if (!token) {
      toast.error('Phiên làm bài không hợp lệ');
      navigate('/login');
      return;
    }
    startExam(submissionId)
      .then(r => {
        const data = r.data.data;
        setExamData(data);
        setAnswers(data.saved_answers || {});
        if (data.time_limit) {
          const started = new Date(data.started_at).getTime();
          const limitMs = data.time_limit * 60 * 1000;
          const elapsed = Date.now() - started;
          const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
          setTimeLeft(remaining);
        }
      })
      .catch(() => {
        toast.error('Không tải được đề thi');
        navigate('/exam-done');
      })
      .finally(() => setLoading(false));
  }, [submissionId, navigate]);

  const handleAutoSubmit = useCallback(async () => {
    toast('Hết giờ! Đang nộp bài tự động...');
    await saveAnswers(submissionId, answers).catch(() => {});
    await submitExam(submissionId, answers).catch(() => {});
    clearMobileSession();
    setDone(true);
  }, [answers, submissionId]);

  // Đếm ngược
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleAutoSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, handleAutoSubmit]);

  // Auto save mỗi 30 giây
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        saveAnswers(submissionId, answers).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [answers, submissionId]);

  // Anti-cheat: rời màn hình quá 5 giây HOẶC quá 2 lần → khóa bài
  useEffect(() => {
    if (!examData) return;

    const handleVisibility = async () => {
      if (document.hidden) {
        // Đếm 5 giây — nếu không quay lại thì khóa ngay
        violationTimerRef.current = setTimeout(async () => {
          toast.error('Bài làm bị khóa do rời màn hình quá 5 giây!', { duration: 5000 });
          await lockSubmission(submissionId).catch(() => {});
          clearMobileSession();
          navigate('/exam-done');
        }, 5000);

        // Ghi nhận vi phạm
        const count = violations + 1;
        setViolations(count);
        await logViolation(submissionId, 'Left screen').catch(() => {});
        toast.error(`Vi phạm ${count}/2: Rời màn hình!`, { duration: 4000 });

        // Quá 2 lần → khóa ngay, không cần chờ 5 giây
        if (count >= 2) {
          clearTimeout(violationTimerRef.current);
          toast.error('Bài làm bị khóa do vi phạm quá 2 lần!', { duration: 5000 });
          await lockSubmission(submissionId).catch(() => {});
          clearMobileSession();
          navigate('/exam-done');
        }
      } else {
        // Quay lại trong 5 giây → hủy timer
        if (violationTimerRef.current) {
          clearTimeout(violationTimerRef.current);
          violationTimerRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(violationTimerRef.current);
    };
  }, [violations, examData, submissionId, navigate]);

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiSelect = (questionId, key) => {
    setAnswers(prev => {
      const current = prev[questionId] ? prev[questionId].split(',').filter(Boolean) : [];
      const updated = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      return { ...prev, [questionId]: updated.sort().join(',') };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitExam(submissionId, answers);
      clearMobileSession();
      setDone(true);
      toast.success('Nộp bài thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi nộp bài');
    } finally {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Màn hình đã nộp bài
  if (done) return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f8fafc', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'40px 28px', maxWidth:360, width:'100%', textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Check size={32} color="#16a34a" />
        </div>
        <div style={{ fontSize:22, fontWeight:700, color:'#16a34a', marginBottom:10 }}>Nộp bài thành công!</div>
        <div style={{ fontSize:14, color:'#64748b', lineHeight:1.6 }}>
          Kết quả sẽ được cập nhật vào tài khoản của bạn sau khi chấm xong.<br />Bạn có thể đóng trang này.
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!examData) return null;

  const questions = examData.questions || [];
  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== '' && answers[k] !== null).length;

  return (
    <div style={{ minHeight:'100dvh', background:'#f8fafc', padding:16 }}>
      {/* Header */}
      <div style={{ background:'#fff', borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>{examData.title}</div>
          <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
            Đã trả lời: {answeredCount}/{questions.length} câu
          </div>
        </div>
        {timeLeft !== null && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:18, fontWeight:700, color: timeLeft < 300 ? '#ef4444' : '#1d4ed8', background: timeLeft < 300 ? '#fef2f2' : '#eff6ff', padding:'6px 12px', borderRadius:10 }}>
            <Clock size={16} />{formatTime(timeLeft)}
          </div>
        )}
        <button
          style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:8, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}
          onClick={() => setConfirmSubmit(true)}
          disabled={submitting}
        >
          <Send size={13} /> Nộp bài
        </button>
      </div>

      {/* Câu hỏi */}
      {q && (
        <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', marginBottom:16 }}>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:8 }}>
            Câu {currentQ + 1}/{questions.length} · {q.points} điểm
          </div>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:20, lineHeight:1.5 }}>
            {q.content}
          </div>

          {/* Multiple choice */}
          {q.question_type === 'multiple_choice' && q.options?.map(opt => (
            <label key={opt.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:8, border:`1px solid ${answers[q.id] === opt.key ? '#3b82f6' : '#e2e8f0'}`, background: answers[q.id] === opt.key ? '#eff6ff' : '#fff', cursor:'pointer', marginBottom:8 }}>
              <input type="radio" name={`q_${q.id}`} value={opt.key} checked={answers[q.id] === opt.key} onChange={() => handleAnswer(q.id, opt.key)} />
              <span style={{ fontWeight:600, color:'#3b82f6', minWidth:20 }}>{opt.key}.</span>
              <span style={{ fontSize:14 }}>{opt.text}</span>
            </label>
          ))}

          {/* Multi select */}
          {q.question_type === 'multi_select' && q.options?.map(opt => {
            const selected = answers[q.id]?.split(',').includes(opt.key);
            return (
              <label key={opt.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:8, border:`1px solid ${selected ? '#3b82f6' : '#e2e8f0'}`, background: selected ? '#eff6ff' : '#fff', cursor:'pointer', marginBottom:8 }}>
                <input type="checkbox" checked={selected} onChange={() => handleMultiSelect(q.id, opt.key)} />
                <span style={{ fontWeight:600, color:'#3b82f6', minWidth:20 }}>{opt.key}.</span>
                <span style={{ fontSize:14 }}>{opt.text}</span>
              </label>
            );
          })}

          {/* True/False */}
          {q.question_type === 'true_false' && ['true', 'false'].map(val => (
            <label key={val} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:8, border:`1px solid ${answers[q.id] === val ? '#3b82f6' : '#e2e8f0'}`, background: answers[q.id] === val ? '#eff6ff' : '#fff', cursor:'pointer', marginBottom:8 }}>
              <input type="radio" name={`q_${q.id}`} value={val} checked={answers[q.id] === val} onChange={() => handleAnswer(q.id, val)} />
              {val === 'true' ? <Check size={14} color="#16a34a" /> : <X size={14} color="#ef4444" />}
              <span style={{ fontSize:14 }}>{val === 'true' ? 'Đúng' : 'Sai'}</span>
            </label>
          ))}

          {/* Short answer */}
          {q.question_type === 'short_answer' && (
            <textarea rows={4} value={answers[q.id] || ''} placeholder="Nhập câu trả lời..." onChange={e => handleAnswer(q.id, e.target.value)}
              style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #e2e8f0', fontSize:14, resize:'vertical', boxSizing:'border-box' }} />
          )}

          {/* Navigation */}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button onClick={() => setCurrentQ(i => i - 1)} disabled={currentQ === 0}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor: currentQ === 0 ? 'not-allowed' : 'pointer', opacity: currentQ === 0 ? 0.5 : 1, fontSize:13 }}>
              <ChevronLeft size={14} /> Câu trước
            </button>
            <button onClick={() => setCurrentQ(i => i + 1)} disabled={currentQ === questions.length - 1}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor: currentQ === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: currentQ === questions.length - 1 ? 0.5 : 1, fontSize:13 }}>
              Câu tiếp <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Panel câu hỏi */}
      <div style={{ background:'#fff', borderRadius:12, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:10 }}>Danh sách câu hỏi</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:6 }}>
          {questions.map((ques, i) => {
            const answered = answers[ques.id] !== undefined && answers[ques.id] !== '';
            return (
              <button key={i} onClick={() => setCurrentQ(i)}
                style={{ aspectRatio:'1', borderRadius:6, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', background: i === currentQ ? '#3b82f6' : answered ? '#dcfce7' : '#f1f5f9', color: i === currentQ ? '#fff' : answered ? '#16a34a' : '#475569' }}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {violations > 0 && (
        <div style={{ marginTop:10, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#dc2626', display:'flex', alignItems:'center', gap:6 }}>
          <AlertTriangle size={13} /> Vi phạm: {violations}/2
        </div>
      )}

      <ConfirmDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={handleSubmit}
        title="Nộp bài?"
        message={`Bạn đã trả lời ${answeredCount}/${questions.length} câu. Sau khi nộp không thể chỉnh sửa.`}
      />
    </div>
  );
}