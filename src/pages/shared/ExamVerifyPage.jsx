import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function ExamVerifyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus]     = useState('loading');
  const [message, setMessage]   = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Đường link không hợp lệ'); return; }

    fetch(`${API_BASE}/exam-mobile-login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        return data;
      })
      .then(({ data }) => {
        setUserName(data.user.full_name);

        // Lưu vào sessionStorage — tự xóa khi đóng tab
        sessionStorage.setItem('exam_mobile_token',      data.sessionToken);
        sessionStorage.setItem('exam_mobile_submission', data.submissionId);
        sessionStorage.setItem('exam_mobile_user',       JSON.stringify(data.user));

        setStatus('redirecting');
        setTimeout(() => {
          window.location.href = `/my-exams/${data.submissionId}/take`;
        }, 1500);
      })
      .catch(err => {
        const msg = err.message || 'Xác thực thất bại';
        setStatus(msg.includes('hết hạn') ? 'expired' : 'error');
        setMessage(msg);
      });
  }, [token]);

  const cfg = {
    loading:     { icon: null,  color: '#3b82f6', title: 'Đang xác thực...',      sub: 'Vui lòng chờ trong giây lát' },
    redirecting: { icon: '✅',  color: '#16a34a', title: `Xin chào ${userName}!`, sub: 'Đang tải bài thi...' },
    expired:     { icon: '⏰',  color: '#f59e0b', title: 'Mã QR đã hết hạn',       sub: 'Quay lại máy tính, nhấn "Làm bài" để tạo mã mới.' },
    error:       { icon: '❌',  color: '#ef4444', title: 'Xác thực thất bại',       sub: message },
  }[status];

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#f8fafc', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 32, fontSize: 13, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Việt Hương Ceramics — Kiểm tra nội bộ
      </div>

      <div style={{
        background: '#fff', borderRadius: 16, padding: '32px 28px',
        width: '100%', maxWidth: 360, textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
      }}>
        {['loading', 'redirecting'].includes(status) ? (
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #e2e8f0', borderTop: `4px solid ${cfg.color}`, margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
        ) : (
          <div style={{ fontSize: 52, marginBottom: 16 }}>{cfg.icon}</div>
        )}

        <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color, marginBottom: 10 }}>{cfg.title}</div>
        {cfg.sub && <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{cfg.sub}</div>}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}