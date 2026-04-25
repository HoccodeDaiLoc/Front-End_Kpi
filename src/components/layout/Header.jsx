import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Bell, Search } from 'lucide-react'
import { notifAPI } from '../../api'
import s from './Header.module.css'

export default function Header({ onToggleSidebar, title }) {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    notifAPI.getNotifications({ isRead: false, limit: 1 }).then(r => setUnread(r.unreadCount || 0)).catch(()=>{})
  }, [])
  return (
    <header className={s.header}>
      <div className={s.left}>
        <button className={s.menuBtn} onClick={onToggleSidebar}><Menu size={20}/></button>
        <h1 className={s.title}>{title}</h1>
      </div>
      <div className={s.right}>
        <Link to="/notifications" className={s.notifBtn}>
          <Bell size={19}/>
          {unread > 0 && <span className={s.badge}>{unread > 9 ? '9+' : unread}</span>}
        </Link>
      </div>
    </header>
  )
}
