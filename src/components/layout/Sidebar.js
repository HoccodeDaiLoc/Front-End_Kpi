import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNotifications } from '../../api/notifications';
import {
  LayoutDashboard, Users, Building2, FileText, ClipboardCheck,
  BarChart3, Bell, Settings, LogOut, Target, ChevronRight, UserCheck
} from 'lucide-react';

const navConfig = {
  admin: [
    { section: 'Tổng quan', items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] },
    { section: 'Quản trị', items: [
      { to: '/admin/users', icon: Users, label: 'Quản lý User' },
      { to: '/admin/departments', icon: Building2, label: 'Phòng ban' },
      { to: '/admin/kpi-templates', icon: FileText, label: 'Mẫu KPI' },
    ]},
    { section: 'KPI', items: [
      { to: '/admin/evaluations', icon: ClipboardCheck, label: 'Đánh giá KPI' },
      { to: '/admin/reports', icon: BarChart3, label: 'Báo cáo' },
    ]}
  ],
  director: [
    { section: 'Tổng quan', items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] },
    { section: 'KPI', items: [
      { to: '/director/evaluations', icon: ClipboardCheck, label: 'Phê duyệt KPI' },
      { to: '/director/reports', icon: BarChart3, label: 'Báo cáo' },
    ]}
  ],
  manager: [
    { section: 'Tổng quan', items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] },
    { section: 'KPI', items: [
      { to: '/manager/team', icon: UserCheck, label: 'Nhân viên của tôi' },
      { to: '/manager/evaluations', icon: ClipboardCheck, label: 'Duyệt KPI' },
    ]}
  ],
  employee: [
    { section: 'Tổng quan', items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] },
    { section: 'KPI của tôi', items: [
      { to: '/employee/evaluations', icon: ClipboardCheck, label: 'Đánh giá KPI' },
    ]}
  ]
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getNotifications({ isRead: false, limit: 1 }).then(res => {
      setUnread(res.data.unreadCount || 0);
    }).catch(() => {});
  }, []);

  const nav = navConfig[user?.role] || [];
  const initials = (user?.fullName || user?.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">KPI</div>
        <div>
          <div className="sidebar-logo-text">KPI System</div>
          <div className="sidebar-logo-sub">Evaluation Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.section} className="sidebar-section">
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <item.icon className="nav-icon" size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-section">
          <div className="sidebar-section-title">Tài khoản</div>
          <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Bell className="nav-icon" size={16} />
            <span>Thông báo</span>
            {unread > 0 && <span className="nav-badge">{unread}</span>}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings className="nav-icon" size={16} />
            <span>Hồ sơ</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info" onClick={() => navigate('/profile')}>
          <div className="user-avatar">{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="user-name truncate">{user?.fullName || user?.email}</div>
            <div className="user-role">{user?.position || 'Chưa cập nhật'}</div>
          </div>
          <ChevronRight size={14} style={{opacity:.4}} />
        </div>
        <button className="nav-item w-full" onClick={logout} style={{color:'rgba(255,255,255,.5)',marginTop:4}}>
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
