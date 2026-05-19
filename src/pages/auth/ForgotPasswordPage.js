import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPassword } from '../../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await forgotPassword({ email }); setSent(true); }
    catch (err) { toast.error(err.response?.data?.message || 'Có lỗi xảy ra'); }
    finally { setLoading(false); }
  };
  return (
    <div className="auth-layout">
      <div className="auth-card fade-in">
        <h1 className="auth-title">Quên mật khẩu</h1>
        <p className="auth-sub">Nhập email để nhận link đặt lại mật khẩu</p>
        {sent ? <div className="alert alert-success">Kiểm tra hộp thư của bạn để lấy link đặt lại.</div> :
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                textAlign: 'center'
              }}
            >
              {loading ? 'Đang gửi...' : 'Gửi mã'}
            </button>
          </form>
        }
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
