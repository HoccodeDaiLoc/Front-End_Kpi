import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Users, Building2, FileText, ClipboardList, Bell, Settings, LogOut, ChevronRight, Target } from 'lucide-react'
import s from './Sidebar.module.css'

const navItems = [
  { to: '/dashboard', icon: <LayoutDashboard size={18}/>, label: 'Dashboard', roles: ['admin','manager','director'] },
  { to: '/my-kpi', icon: <Target size={18}/>, label: 'KPI của tôi', roles: ['employee','manager','director'] },
  { to: '/evaluations', icon: <ClipboardList size={18}/>, label: 'Đánh giá KPI', roles: ['all'] },
  { to: '/kpi-templates', icon: <FileText size={18}/>, label: 'Mẫu KPI', roles: ['admin','manager','director'] },
  { to: '/users', icon: <Users size={18}/>, label: 'Người dùng', roles: ['admin'] },
  { to: '/departments', icon: <Building2 size={18}/>, label: 'Phòng ban', roles: ['admin','director'] },
  { to: '/notifications', icon: <Bell size={18}/>, label: 'Thông báo', roles: ['all'] },
  { to: '/settings', icon: <Settings size={18}/>, label: 'Cài đặt', roles: ['all'] },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const visible = navItems.filter(n => n.roles.includes('all') || n.roles.includes(user?.role))

  return (
    <aside className={[s.sidebar, collapsed ? s.collapsed : ''].join(' ')}>
      <div className={s.logo}>
        <div className={s.logoIcon}><Target size={20}/></div>
        {!collapsed && <div className={s.logoText}><span className={s.logoMain}>KPI</span><span className={s.logoSub}>System</span></div>}
      </div>

      <nav className={s.nav}>
        {visible.map(item => (
          <NavLink key={item.to} to={item.to} className={({isActive})=>[s.link, isActive?s.active:''].join(' ')}>
            <span className={s.linkIcon}>{item.icon}</span>
            {!collapsed && <span className={s.linkLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={s.bottom}>
        {!collapsed && (
          <div className={s.userCard}>
            <div className={s.avatar}>{user?.fullName?.[0] || user?.email?.[0] || 'U'}</div>
            <div className={s.userInfo}>
              <p className={s.userName}>{user?.fullName || 'Người dùng'}</p>
              <p className={s.userRole}>{user?.position || user?.role}</p>
            </div>
          </div>
        )}
        <button className={s.logout} onClick={logout} title="Đăng xuất">
          <LogOut size={17}/>
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  )
}
