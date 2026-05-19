// src/pages/exams/ExamVerifyPage.jsx
// Trang này mở trên ĐIỆN THOẠI sau khi quét QR
// Route: /exam-verify?token=xxx

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios'; // axios instance đã có auth header

export default function ExamVerifyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error' | 'expired'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Đường link không hợp lệ');
      return;
    }

    api.get(`/exams/verify-session?token=${encodeURIComponent(token)}`)
      .then(res => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Xác thực thất bại';
        setStatus(msg.includes('hết hạn') ? 'expired' : 'error');
        setMessage(msg);
      });
  }, [token]);

  const config = {
    loading: { icon: '⏳', color: '#3b82f6', title: 'Đang xác thực...',      sub: '' },
    success: { icon: '✅', color: '#16a34a', title: 'Xác thực thành công!',   sub: 'Quay lại máy tính để bắt đầu làm bài.' },
    expired: { icon: '⏰', color: '#f59e0b', title: 'Mã QR đã hết hạn',       sub: 'Quay lại máy tính, nhấn "Làm bài" để tạo mã mới.' },
    error:   { icon: '❌', color: '#ef4444', title: 'Xác thực thất bại',       sub: message },
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
      {/* Logo / Brand */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Hệ thống kiểm tra nội bộ
        </div>
      </div>

      {/* Card */}
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
        <div style={{ fontSize: 52, marginBottom: 16 }}>{config.icon}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: config.color, marginBottom: 10 }}>
          {config.title}
        </div>
        {config.sub && (
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            {config.sub}
          </div>
        )}

        {status === 'success' && (
          <div style={{
            marginTop: 24,
            padding: '12px 16px',
            background: '#f0fdf4',
            borderRadius: 10,
            fontSize: 13,
            color: '#15803d',
          }}>
            Bạn có thể đóng trang này sau khi quay lại máy tính
          </div>
        )}
      </div>
    </div>
  );
}