// src/pages/shared/ExamVerifyPage.jsx
// Trang này mở trên ĐIỆN THOẠI sau khi quét QR
// Route: /exam-verify?token=xxx
// KHÔNG cần đăng nhập — token trong QR đã chứa đủ thông tin

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ExamVerifyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'redirecting' | 'expired' | 'error'
  const [message, setMessage] = useState('');
  const [examUrl, setExamUrl] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Đường link không hợp lệ');
      return;
    }

    // Gọi API không cần auth — backend dùng QR_SECRET để verify
    fetch(`${API_BASE}/exams/verify-qr?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Lỗi xác thực');
        return data;
      })
      .then(data => {
        // Backend trả về examToken (JWT ngắn hạn) và submissionId
        const { examToken, submissionId } = data.data;
        const url = `${window.location.origin}/exam-take?submissionId=${submissionId}&examToken=${examToken}`;
        setExamUrl(url);
        setStatus('redirecting');
        // Tự động redirect sau 1.5 giây
        setTimeout(() => { window.location.href = url; }, 1500);
      })
      .catch(err => {
        const msg = err.message || 'Xác thực thất bại';
        setStatus(msg.includes('hết hạn') ? 'expired' : 'error');
        setMessage(msg);
      });
  }, [token]);

  const config = {
    loading:     { icon: '⏳', color: '#3b82f6', title: 'Đang xác thực...',        sub: 'Vui lòng chờ trong giây lát' },
    redirecting: { icon: '✅', color: '#16a34a', title: 'Xác thực thành công!',     sub: 'Đang chuyển vào bài thi...' },
    expired:     { icon: '⏰', color: '#f59e0b', title: 'Mã QR đã hết hạn',         sub: 'Quay lại máy tính, nhấn "Làm bài" để tạo mã mới.' },
    error:       { icon: '❌', color: '#ef4444', title: 'Xác thực thất bại',         sub: message },
  }[status];

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Việt Hương Ceramics — Kiểm tra nội bộ
        </div>
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '32px 28px',
        width: '100%',
        maxWidth: 360,
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
      }}>
        {/* Spinner khi loading/redirecting */}
        {['loading', 'redirecting'].includes(status) ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '4px solid #e2e8f0',
              borderTop: `4px solid ${config.color}`,
              margin: '0 auto 16px',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : (
          <div style={{ fontSize: 52, marginBottom: 16 }}>{config.icon}</div>
        )}

        <div style={{ fontSize: 20, fontWeight: 700, color: config.color, marginBottom: 10 }}>
          {config.title}
        </div>

        {config.sub && (
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            {config.sub}
          </div>
        )}

        {status === 'redirecting' && examUrl && (
          <a href={examUrl} style={{
            display: 'block', marginTop: 20,
            padding: '12px 16px',
            background: '#16a34a', color: '#fff',
            borderRadius: 10, fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
          }}>
            Vào làm bài ngay →
          </a>
        )}

        {status === 'expired' && (
          <div style={{
            marginTop: 20, padding: '12px 16px',
            background: '#fef9c3', borderRadius: 10,
            fontSize: 13, color: '#92400e',
          }}>
            Mã QR chỉ có hiệu lực 5 phút. Hãy quay lại máy tính để tạo mã mới.
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}