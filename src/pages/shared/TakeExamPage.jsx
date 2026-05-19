import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startExam, saveAnswers, submitExam, logViolation, lockSubmission, getExamQR, getSessionStatus } from '../../api/exams';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';
export default function TakeExamPage() {
  const [phase, setPhase] = useState('qr'); // 'qr' | 'exam'
const [qrData, setQrData] = useState(null);
const [qrLoading, setQrLoading] = useState(true);
const [countdown, setCountdown] = useState(300);
const pollingRef = useRef(null);
const countdownRef = useRef(null);
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState(null);
const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [violations, setViolations] = useState(0);
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
// Fetch QR
useEffect(() => {
  getExamQR(submissionId)
    .then(r => { setQrData(r.data.data); setCountdown(r.data.data.expiresIn || 300); })
    .catch(() => toast.error('Không tải được mã QR'))
    .finally(() => setQrLoading(false));
}, [submissionId]);

// Polling check điện thoại đã quét chưa
useEffect(() => {
  if (phase !== 'qr' || !qrData) return;
  pollingRef.current = setInterval(async () => {
    try {
      const res = await getSessionStatus(submissionId);
      if (res.data.data.verified) {
        clearInterval(pollingRef.current);
        clearInterval(countdownRef.current);
        setPhase('exam');
      }
    } catch {}
  }, 2000);
  return () => clearInterval(pollingRef.current);
}, [phase, qrData, submissionId]);

// Đếm ngược QR
useEffect(() => {
  if (phase !== 'qr' || !qrData) return;
  countdownRef.current = setInterval(() => {
    setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current); return 0; } return c - 1; });
  }, 1000);
  return () => clearInterval(countdownRef.current);
}, [phase, qrData]);
  // Load đề thi
  useEffect(() => {
  if (phase !== 'exam') return;
    startExam(submissionId)
      .then(r => {
        const data = r.data.data;
        setExamData(data);
        setAnswers(data.saved_answers || {});
        // Tính thời gian còn lại
        if (data.time_limit) {
          const started = new Date(data.started_at).getTime();
          const limitMs = data.time_limit * 60 * 1000;
          const elapsed = Date.now() - started;
          const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
          setTimeLeft(remaining);
        }
      })
      .catch(() => { toast.error('Không tải được đề thi'); navigate('/my-exams'); })
      .finally(() => setLoading(false));
  }, [submissionId,phase]);

  // Đếm ngược
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleAutoSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  // Auto save mỗi 30 giây
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        saveAnswers(submissionId, answers).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [answers, submissionId]);

  // Anti-cheat: phát hiện chuyển tab
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.hidden && examData) {
        const count = violations + 1;
        setViolations(count);
        await logViolation(submissionId, 'Tab switching detected').catch(() => {});
        toast.error(`⚠️ Vi phạm ${count}/3: Không được chuyển tab khi làm bài!`, { duration: 4000 });
        if (count >= 3) {
          toast.error('Bài làm bị khóa do vi phạm quá 3 lần!', { duration: 5000 });
          await lockSubmission(submissionId).catch(() => {});
          navigate('/my-exams');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [violations, examData, submissionId]);

  const handleAutoSubmit = useCallback(async () => {
    toast(' Hết giờ! Đang nộp bài tự động...');
    await saveAnswers(submissionId, answers).catch(() => {});
    await submitExam(submissionId, answers).catch(() => {});
    navigate(`/exams/${submissionId}/result`);
  }, [answers, submissionId, navigate]);

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
      toast.success('Nộp bài thành công!');
      navigate(`/exams/${submissionId}/result`);
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

  const answeredCount = Object.keys(answers).filter(k => answers[k] !== '' && answers[k] !== null).length;
const refreshQR = async () => {
  setQrLoading(true);
  setCountdown(300);
  try {
    const r = await getExamQR(submissionId);
    setQrData(r.data.data);
    setCountdown(r.data.data.expiresIn || 300);
  } catch { toast.error('Không tải được mã QR'); }
  finally { setQrLoading(false); }
};

const formatCountdown = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
// Màn hình QR — chờ điện thoại quét
if (phase === 'qr') return (
  <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
    <div style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:400, width:'100%', textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,0.06)', border:'1px solid var(--border)' }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#eff6ff', color:'#3b82f6', padding:'4px 12px', borderRadius:999, fontSize:12, fontWeight:600, marginBottom:16 }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', animation:'pulse 1.5s infinite', display:'inline-block' }} />
        Chờ xác thực
      </div>
      <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Quét mã QR để bắt đầu</div>
      <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:24, lineHeight:1.6 }}>
        Dùng điện thoại <strong>đã đăng nhập tài khoản của bạn</strong> để quét mã bên dưới
      </div>

      {/* QR Image */}
      <div style={{ margin:'0 auto 16px', width:200, height:200 }}>
        {qrLoading ? (
          <div style={{ width:200, height:200, background:'#f1f5f9', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)', fontSize:13 }}>Đang tải...</div>
        ) : countdown === 0 ? (
          <div style={{ width:200, height:200, background:'#fef2f2', borderRadius:12, border:'1px solid #fecaca', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Clock size={28} color="#ef4444" />
            <span style={{ fontSize:12, color:'#ef4444', fontWeight:600 }}>Mã đã hết hạn</span>
          </div>
        ) : qrData ? (
          <img src={qrData.qrDataUrl} alt="QR Code" style={{ width:200, height:200, borderRadius:12, border:'1px solid #e2e8f0' }} />
        ) : null}
      </div>

      {/* Countdown */}
      {!qrLoading && countdown > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:13, color: countdown < 60 ? '#ef4444' : 'var(--text-3)', marginBottom:16 }}>
          <Clock size={13} /> Mã hết hạn sau {formatCountdown(countdown)}
        </div>
      )}

      {countdown === 0 && (
        <button className="btn btn-primary" style={{ width:'100%', marginBottom:16 }} onClick={refreshQR}>
          Tạo mã QR mới
        </button>
      )}

      <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 16px', textAlign:'left' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>Hướng dẫn:</div>
        {['1. Mở camera điện thoại hoặc app quét QR','2. Trỏ vào mã QR trên màn hình','3. Nhấn vào link — đảm bảo đã đăng nhập tài khoản','4. Quay lại màn hình này — bài thi tự động mở'].map((s,i) => (
          <div key={i} style={{ fontSize:12, color:'var(--text-3)', marginBottom:3 }}>{s}</div>
        ))}
      </div>
    </div>
    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
  </div>
);
if (phase === 'exam' && loading) return (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <div className="spinner spinner-lg" />
  </div>
);

  if (!examData) return null;

  const questions = examData.questions || [];
  const q = questions[currentQ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '16px' }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '14px 20px',
        marginBottom: 16, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{examData.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            Đã trả lời: {answeredCount}/{questions.length} câu
          </div>
        </div>

        {/* Timer */}
        {timeLeft !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 20, fontWeight: 700,
            color: timeLeft < 300 ? '#ef4444' : '#1d4ed8',
            background: timeLeft < 300 ? '#fef2f2' : '#eff6ff',
            padding: '8px 16px', borderRadius: 10,
          }}>
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>
        )}

        <button
          className="btn btn-primary btn-sm"
          onClick={() => setConfirmSubmit(true)}
          disabled={submitting}
        >
          <Send size={14} /> Nộp bài
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
        {/* Câu hỏi */}
        <div style={{ flex: 1 }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
          }}>
            {q && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                  Câu {currentQ + 1}/{questions.length} · {q.points} điểm
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>
                  {q.content}
                </div>

                {/* Multiple choice */}
                {q.question_type === 'multiple_choice' && q.options?.map(opt => (
                  <label key={opt.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 8, border: `1px solid ${answers[q.id] === opt.key ? 'var(--primary)' : 'var(--border)'}`,
                    background: answers[q.id] === opt.key ? '#eff6ff' : '#fff',
                    cursor: 'pointer', marginBottom: 8, transition: 'all 0.1s'
                  }}>
                    <input type="radio" name={`q_${q.id}`} value={opt.key}
                      checked={answers[q.id] === opt.key}
                      onChange={() => handleAnswer(q.id, opt.key)} />
                    <span style={{ fontWeight: 600, color: 'var(--primary)', minWidth: 20 }}>{opt.key}.</span>
                    <span style={{ fontSize: 14 }}>{opt.text}</span>
                  </label>
                ))}

                {/* Multi select */}
                {q.question_type === 'multi_select' && q.options?.map(opt => {
                  const selected = answers[q.id]?.split(',').includes(opt.key);
                  return (
                    <label key={opt.key} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 8, border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                      background: selected ? '#eff6ff' : '#fff',
                      cursor: 'pointer', marginBottom: 8, transition: 'all 0.1s'
                    }}>
                      <input type="checkbox" checked={selected}
                        onChange={() => handleMultiSelect(q.id, opt.key)} />
                      <span style={{ fontWeight: 600, color: 'var(--primary)', minWidth: 20 }}>{opt.key}.</span>
                      <span style={{ fontSize: 14 }}>{opt.text}</span>
                    </label>
                  );
                })}

                {/* True/False */}
                {q.question_type === 'true_false' && ['true', 'false'].map(val => (
                  <label key={val} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 8, border: `1px solid ${answers[q.id] === val ? 'var(--primary)' : 'var(--border)'}`,
                    background: answers[q.id] === val ? '#eff6ff' : '#fff',
                    cursor: 'pointer', marginBottom: 8, transition: 'all 0.1s'
                  }}>
                    <input type="radio" name={`q_${q.id}`} value={val}
                      checked={answers[q.id] === val}
                      onChange={() => handleAnswer(q.id, val)} />
                    <span style={{ fontSize: 14 }}>{val === 'true' ? 'Đúng' : 'Sai'}</span>
                  </label>
                ))}

                {/* Short answer */}
                {q.question_type === 'short_answer' && (
                  <textarea className="form-input" rows={4}
                    value={answers[q.id] || ''}
                    placeholder="Nhập câu trả lời của bạn..."
                    onChange={e => handleAnswer(q.id, e.target.value)}
                    style={{ fontSize: 14 }} />
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button className="btn btn-secondary" onClick={() => setCurrentQ(q => q - 1)} disabled={currentQ === 0}>
                    <ChevronLeft size={14} /> Câu trước
                  </button>
                  <button className="btn btn-secondary" onClick={() => setCurrentQ(q => q + 1)} disabled={currentQ === questions.length - 1}>
                    Câu tiếp <ChevronRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Panel câu hỏi */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
              Danh sách câu hỏi
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {questions.map((q, i) => {
                const answered = answers[q.id] !== undefined && answers[q.id] !== '';
                return (
                  <button key={i} onClick={() => setCurrentQ(i)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 6, border: 'none',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: i === currentQ ? 'var(--primary)' : answered ? '#dcfce7' : '#f1f5f9',
                      color: i === currentQ ? '#fff' : answered ? '#16a34a' : 'var(--text-2)',
                      transition: 'all 0.1s',
                    }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: '#dcfce7' }} />
                Đã trả lời ({answeredCount})
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f1f5f9' }} />
                Chưa trả lời ({questions.length - answeredCount})
              </div>
            </div>
          </div>

          {violations > 0 && (
            <div style={{
              marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <AlertTriangle size={13} />
              Vi phạm: {violations}/3
            </div>
          )}
        </div>
      </div>

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