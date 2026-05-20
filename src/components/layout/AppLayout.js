import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, ClipboardCheck, BarChart3, Users, BookOpen, Target } from 'lucide-react';
import Sidebar from './Sidebar';

const bottomNavConfig = {
  admin: [
    { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/evaluations',  icon: ClipboardCheck,  label: 'Đánh giá' },
    { to: '/admin/reports',      icon: BarChart3,        label: 'Báo cáo' },
    { to: '/admin/users',        icon: Users,            label: 'Users' },
  ],
  director: [
    { to: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employee/evaluations',   icon: Target,          label: 'KPI tôi' },
    { to: '/director/evaluations',   icon: ClipboardCheck,  label: 'Phê duyệt' },
    { to: '/director/reports',       icon: BarChart3,        label: 'Báo cáo' },
  ],
  manager: [
    { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employee/evaluations', icon: Target,          label: 'KPI tôi' },
    { to: '/manager/evaluations',  icon: ClipboardCheck,  label: 'Duyệt KPI' },
    { to: '/manager/team',         icon: Users,            label: 'Nhân viên' },
  ],
  employee: [
    { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employee/evaluations', icon: ClipboardCheck,  label: 'Đánh giá' },
    { to: '/my-exams',             icon: BookOpen,         label: 'Bài thi' },
  ],
  chairman: [
    { to: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/chairman/evaluations',   icon: ClipboardCheck,  label: 'Đánh giá' },
    { to: '/chairman/reports',       icon: BarChart3,        label: 'Báo cáo' },
  ],
};

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const bottomItems = bottomNavConfig[user?.role] || bottomNavConfig.employee;

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
        {children}
      </main>

      {/* Bottom Nav — chỉ hiện trên mobile */}
      <nav className="bottom-nav">
        {bottomItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}