import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { activate } from '../../api/auth';
import { CheckCircle } from 'lucide-react';

export default function ActivatePage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Mật khẩu tối thiểu 6 ký tự');
    if (password !== confirm) return toast.error('Mật khẩu không khớp');
    setLoading(true);
    try {
      await activate({ token, password });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Token không hợp lệ');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card fade-in">
        {done ? (
          <div className="flex-center" style={{flexDirection:'column',gap:16,padding:'20px 0'}}>
            <div style={{width:64,height:64,background:'#f0fdf4',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <CheckCircle size={32} color="var(--success)" />
            </div>
            <h2 className="auth-title">Kích hoạt thành công!</h2>
            <p style={{color:'var(--text-3)',textAlign:'center'}}>Tài khoản đã được kích hoạt.</p>
            <button className="btn btn-primary btn-lg w-full" onClick={() => navigate('/login')}>Đăng nhập</button>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Kích hoạt tài khoản</h1>
            <p className="auth-sub">Đặt mật khẩu cho tài khoản của bạn</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <input className="form-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
              </div>
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu</label>
                <input className="form-input" type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" />
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Kích hoạt tài khoản'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
