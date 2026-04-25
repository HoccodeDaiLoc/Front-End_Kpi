import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login as loginApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Target } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Vui lòng nhập đầy đủ thông tin');
    setLoading(true);
    try {
      const res = await loginApi(form);
      login(res.data.data.token, res.data.data.user);
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card fade-in">
        <div className="auth-logo"><Target size={26} /></div>
        <h1 className="auth-title">Chào mừng trở lại</h1>
        <p className="auth-sub">Đăng nhập để tiếp tục vào hệ thống KPI</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="email@company.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="form-group" style={{position:'relative'}}>
            <label className="form-label">Mật khẩu</label>
            <input className="form-input" type={show ? 'text' : 'password'} placeholder="••••••••"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              style={{paddingRight:40}} />
            <button type="button" onClick={() => setShow(!show)}
              style={{position:'absolute',right:10,top:34,background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}>
              {show ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          <div style={{textAlign:'right',marginBottom:20}}>
            <Link to="/forgot-password" style={{fontSize:13,color:'var(--primary)',fontWeight:600}}>Quên mật khẩu?</Link>
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
