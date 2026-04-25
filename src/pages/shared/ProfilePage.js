import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { updateProfile, changePassword } from '../../api/auth';
import { getManagers } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../../components/common/Badge';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({ fullName: '', position: '', department: '', phone: '', directManagerId: '', directorId: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName || '', position: user.position || '', department: user.department || '', phone: user.phone || '', directManagerId: user.directManagerId || '', directorId: user.directorId || '' });
    getManagers().then(r => setManagers(r.data.data)).catch(() => { });
  }, [user]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfile(form);
      updateUser(res.data.data);
      toast.success('Cập nhật hồ sơ thành công');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi cập nhật'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (pwForm.newPassword.length < 6) return toast.error('Mật khẩu tối thiểu 6 ký tự');
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Mật khẩu không khớp');
    setSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Đổi mật khẩu thành công');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu'); }
    finally { setSaving(false); }
  };

  const initials = (user?.fullName || user?.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const currentManager = managers.find(
    m => String(m.id) === String(form.directManagerId)
  );
  return (
    <>
      <Header title="Hồ sơ cá nhân" />
      <div className="page-content">
        <div style={{ maxWidth: 700 }}>
          {/* User card */}
          <div className="card mb-4">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: 'white', flexShrink: 0 }}>{initials}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{user?.fullName || 'Chưa cập nhật'}</div>
                <div style={{ color: 'var(--text-3)', marginBottom: 8 }}>{user?.email}</div>
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>

          <div className="tabs">
            <button className={`tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}><User size={13} /> Thông tin</button>
            <button className={`tab-btn ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}><Lock size={13} /> Mật khẩu</button>
          </div>

          {tab === 'profile' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Thông tin cá nhân</div></div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Họ và tên</label>
                    <input className="form-input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Số điện thoại</label>
                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Chức vụ</label>
                    <input className="form-input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Phòng ban</label>
                    <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quản lý trực tiếp</label>
                    <div
                      className="form-input"
                      style={{
                        background: '#f1f5f9',
                        cursor: 'not-allowed',
                        pointerEvents: 'none',
                        color: '#64748b'
                      }}
                    >
                      {currentManager
                        ? `${currentManager.fullName} (${currentManager.position || currentManager.role})`
                        : '— Không có —'}
                    </div>
                  </div>

                </div>
                <div style={{ textAlign: 'right' }}>
                  <button className="btn btn-primary" onClick={handleProfileSave} disabled={saving}><Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Đổi mật khẩu</div></div>
              <div className="card-body">
                <div className="form-group"><label className="form-label">Mật khẩu hiện tại</label>
                  <input className="form-input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Mật khẩu mới</label>
                  <input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Xác nhận mật khẩu mới</label>
                  <input className="form-input" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} /></div>
                <div style={{ textAlign: 'right' }}>
                  <button className="btn btn-primary" onClick={handlePasswordChange} disabled={saving}>{saving ? 'Đang xử lý...' : 'Đổi mật khẩu'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
