import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import s from './AppLayout.module.css'

const titles = {
  '/dashboard': 'Dashboard',
  '/my-kpi': 'KPI của tôi',
  '/evaluations': 'Đánh giá KPI',
  '/kpi-templates': 'Mẫu KPI',
  '/users': 'Quản lý người dùng',
  '/departments': 'Phòng ban',
  '/notifications': 'Thông báo',
  '/settings': 'Cài đặt',
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] || 'KPI System'
  return (
    <div className={s.layout}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className={s.main}>
        <Header onToggleSidebar={() => setCollapsed(c => !c)} title={title} />
        <main className={s.content}><Outlet /></main>
      </div>
    </div>
  )
}
