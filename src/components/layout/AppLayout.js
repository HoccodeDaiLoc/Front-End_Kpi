import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  LayoutDashboard, ClipboardCheck, BarChart3,
  Users, BookOpen, Target, Bell
} from 'lucide-react';
import Sidebar from './Sidebar';

const bottomNavConfig = {
  admin: [
    { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/evaluations', icon: ClipboardCheck,  label: 'Đánh giá' },
    { to: '/admin/reports',     icon: BarChart3,        label: 'Báo cáo' },
    { to: '/admin/users',       icon: Users,            label: 'Users' },
    { to: '/notifications',     icon: Bell,             label: 'Thông báo', isBell: true },
  ],
  director: [
    { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employee/evaluations', icon: Target,          label: 'KPI tôi' },
    { to: '/director/evaluations', icon: ClipboardCheck,  label: 'Phê duyệt' },
    { to: '/director/reports',     icon: BarChart3,        label: 'Báo cáo' },
    { to: '/notifications',        icon: Bell,             label: 'Thông báo', isBell: true },
  ],
  manager: [
    { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employee/evaluations', icon: Target,          label: 'KPI tôi' },
    { to: '/manager/evaluations',  icon: ClipboardCheck,  label: 'Duyệt KPI' },
    { to: '/manager/team',         icon: Users,            label: 'Nhân viên' },
    { to: '/notifications',        icon: Bell,             label: 'Thông báo', isBell: true },
  ],
  employee: [
    { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employee/evaluations', icon: ClipboardCheck,  label: 'Đánh giá' },
    { to: '/my-exams',             icon: BookOpen,         label: 'Bài thi' },
    { to: '/notifications',        icon: Bell,             label: 'Thông báo', isBell: true },
  ],
  chairman: [
    { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/chairman/evaluations', icon: ClipboardCheck,  label: 'Đánh giá' },
    { to: '/chairman/reports',     icon: BarChart3,        label: 'Báo cáo' },
    { to: '/notifications',        icon: Bell,             label: 'Thông báo', isBell: true },
  ],
};

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const bottomItems = bottomNavConfig[user?.role] || bottomNavConfig.employee;

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

   <main
  className="main-content"
  style={{
    paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 16px))'
  }}
>
        {/* ── Hamburger — chỉ hiện trên mobile ── */}
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Mở menu"
        >
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
        </button>

        {children}
      </main>

      {/* ── Bottom Nav — 5 tab bao gồm Thông báo ── */}
      <nav className="bottom-nav">
        {bottomItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''} ${item.isBell ? 'bell-tab' : ''}`
            }
          >
            <span className="bottom-nav-icon-wrap">
              <item.icon size={20} />
              {item.isBell && unreadCount > 0 && (
                <span className="bottom-nav-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}