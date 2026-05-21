import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  LayoutDashboard, Users, Building2, FileText, FlaskConical ,ClipboardCheck,
  BarChart3, Settings, LogOut, Target, ChevronRight, UserCheck, X, BookOpen,
  BarChart2 ,List ,Mailbox ,Vote
}  from 'lucide-react';
import './Sidebar.scss';

const navConfig = {
 admin: [
  { section: 'Tổng quan', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
  ]},
  { section: 'Quản trị', items: [
    { to: '/admin/users', icon: Users, label: 'Quản lý User' },
    { to: '/admin/departments', icon: Building2, label: 'Phòng ban' },
    { to: '/admin/kpi-templates', icon: FileText, label: 'Mẫu KPI' },
  ]},
  { section: 'Kiểm tra', items: [
    { to: '/admin/exams', icon: FlaskConical, label: 'Đề thi' },
    { to: '/admin/exam-results', icon: BarChart2, label: 'Kết quả kiểm tra' },
  ]},
  { section: 'KPI', items: [
    { to: '/admin/evaluations', icon: ClipboardCheck, label: 'Danh sách đánh giá' },
    { to: '/admin/reports', icon: BarChart3, label: 'Báo cáo' },
  ]},
  { section: 'Khảo sát', items: [
  { to: '/proposals', icon: Mailbox, label: 'Quản lý khảo sát' },
]}
  
],
director: [
  { section: 'Tổng quan', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
  ]},
  { section: 'KPI của tôi', items: [
    { to: '/employee/evaluations', icon: Target, label: 'Đánh giá KPI của tôi' },
    { to: '/my-exams', icon: BookOpen, label: 'Bài kiểm tra' },
  ]},
  { section: 'Quản lý', items: [
    { to: '/director/staff', icon: Users, label: 'Quản lý Nhân viên' },
    { to: '/director/evaluations', icon: ClipboardCheck, label: 'Phê duyệt KPI' },
    { to: '/director/reports', icon: BarChart3, label: 'Báo cáo' },

  ]},
  // ✅ Thêm ra ngoài, cùng cấp với các section khác
  { section: 'Khảo sát', items: [
    { to: '/proposals', icon: Mailbox, label: 'Quản lý khảo sát' },
    { to: '/my-proposals', icon: Vote, label: 'Khảo sát của tôi' },
  ]},
],
manager: [
    { section: 'Tổng quan', items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] },
    { section: 'KPI của tôi', items: [
      { to: '/employee/evaluations', icon: Target, label: 'Đánh giá KPI của tôi' },
      { to: '/my-exams', icon: BookOpen, label: 'Bài kiểm tra' },
    ]},
    { section: 'Quản lý', items: [
      { to: '/manager/team', icon: UserCheck, label: 'Nhân viên của tôi' },
      { to: '/manager/evaluations', icon: ClipboardCheck, label: 'Duyệt KPI' },
    ]},
    // ✅ Thêm đúng cấu trúc
    { section: 'Khảo sát', items: [
      { to: '/my-proposals', icon: Vote, label: 'Khảo sát của tôi' },
    ]},
],

  chairman: [
    { section: 'Tổng quan', items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
    ]},
    { section: 'KPI', items: [
      { to: '/chairman/evaluations', icon: ClipboardCheck, label: 'Danh sách đánh giá' },
      { to: '/chairman/reports', icon: BarChart3, label: 'Báo cáo' },
      { to: '/chairman/templates', icon: FileText, label: 'Mẫu KPI' },
    ]},
    { section: 'Khảo sát', items: [
  { to: '/proposals', icon: Mailbox, label: 'Quản lý khảo sát' },
]},
  ],
employee: [
    { section: 'Tổng quan', items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] },
    { section: 'KPI của tôi', items: [
      { to: '/employee/evaluations', icon: ClipboardCheck, label: 'Đánh giá KPI' },
      { to: '/my-exams', icon: BookOpen, label: 'Bài kiểm tra' },
    ]},
    // ✅ Thêm mục khảo sát cho employee
    { section: 'Khảo sát', items: [
      { to: '/my-proposals', icon: Vote, label: 'Khảo sát của tôi' },
    ]},
],
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const nav = navConfig[user?.role] || [];
  const initials = (user?.fullName || user?.email || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleNavClick = () => {
    // Đóng sidebar khi bấm link trên mobile
    if (window.innerWidth <= 768) onClose?.();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>

      {/* Nút đóng — chỉ hiện trên mobile */}
      <button className="sidebar-close-btn" onClick={onClose}>
        <X size={16} />
      </button>

      <div className="sidebar-logo">
        <div className="sidebar-logo-image">
          <img src="/logo_viet_huong.png" alt="Viet Huong Logo" />
        </div>
        <div>
          <div className="sidebar-logo-text">VIETHUONG KPI</div>
          <div className="sidebar-logo-sub">Cùng đánh giá nào !</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.section} className="sidebar-section">
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <item.icon className="nav-icon" size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-section">
          <div className="sidebar-section-title">Tài khoản</div>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            <Settings className="nav-icon" size={16} />
            <span>Hồ sơ</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info" onClick={() => { navigate('/profile'); onClose?.(); }}>
          <div className="user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name truncate">{user?.fullName || user?.email}</div>
            <div className="user-role">{user?.position || 'Chưa cập nhật'}</div>
          </div>
          <ChevronRight size={14} style={{ opacity: .4 }} />
        </div>
        <button
          className="nav-item w-full"
          onClick={logout}
          style={{ color: 'rgba(4,4,4,0.5)', marginTop: 4 }}
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>

    </aside>
  );
}