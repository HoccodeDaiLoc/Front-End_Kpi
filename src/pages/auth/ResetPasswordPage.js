import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPassword } from '../../api/auth';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Mật khẩu xác nhận không khớp');
    if (password.length < 6) return toast.error('Mật khẩu tối thiểu 6 ký tự');
    setLoading(true);
    try {
      await resetPassword({ token, password });
      toast.success('Đặt lại mật khẩu thành công!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card fade-in">
        <h1 className="auth-title">Đặt lại mật khẩu</h1>
        <p className="auth-sub">Nhập mật khẩu mới cho tài khoản của bạn</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Mật khẩu mới</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu</label>
            <input
              className="form-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}