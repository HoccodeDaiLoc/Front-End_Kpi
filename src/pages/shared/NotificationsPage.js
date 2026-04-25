import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../api/notifications';
import { formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';

const TYPE_ICONS = { evaluation_submitted:'📊', evaluation_reviewed:'✅', evaluation_approved:'🎉', evaluation_rejected:'❌', account_activated:'🔑', system:'🔔' };

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 50 });
      setNotifs(res.data.data);
      setUnread(res.data.unreadCount);
    } catch { toast.error('Lỗi tải thông báo'); }
    finally { setLoading(false); }
  };

  const handleRead = async (id) => {
    await markAsRead(id).catch(() => {});
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const handleReadAll = async () => {
    await markAllAsRead().catch(() => {});
    setNotifs(ns => ns.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    toast.success('Đã đánh dấu tất cả đã đọc');
  };

  const handleDelete = async (id) => {
    await deleteNotification(id).catch(() => {});
    setNotifs(ns => ns.filter(n => n.id !== id));
  };

  return (
    <>
      <Header title="Thông báo" subtitle={unread > 0 ? `${unread} thông báo chưa đọc` : 'Tất cả đã đọc'}
        actions={unread > 0 && <button className="btn btn-ghost btn-sm" onClick={handleReadAll}><CheckCheck size={14}/> Đánh dấu tất cả đã đọc</button>} />
      <div className="page-content">
        <div style={{maxWidth:700}}>
          {loading ? <div className="loading-page"><div className="spinner spinner-lg"/></div> : notifs.length === 0 ? (
            <div className="card"><div style={{padding:60,textAlign:'center',color:'var(--text-3)'}}>
              <Bell size={40} style={{opacity:.2,marginBottom:12}}/><br/>Chưa có thông báo nào
            </div></div>
          ) : notifs.map(n => (
            <div key={n.id} onClick={() => !n.isRead && handleRead(n.id)}
              style={{background: n.isRead ? 'var(--surface)' : '#eff6ff', borderRadius:10, border:`1px solid ${n.isRead ? 'var(--border)' : '#bfdbfe'}`, padding:'14px 16px', marginBottom:8, display:'flex', alignItems:'flex-start', gap:12, cursor: n.isRead ? 'default' : 'pointer', transition:'background .2s'}}>
              <div style={{fontSize:22,flexShrink:0}}>{TYPE_ICONS[n.type] || '🔔'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight: n.isRead ? 500 : 700, marginBottom:2}}>{n.title}</div>
                <div style={{fontSize:13,color:'var(--text-2)'}}>{n.message}</div>
                <div style={{fontSize:11,color:'var(--text-3)',marginTop:6}}>{formatDateTime(n.createdAt)}</div>
              </div>
              <div style={{display:'flex',gap:4,flexShrink:0}}>
                {!n.isRead && <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); handleRead(n.id); }}><Check size={13}/></button>}
                <button className="btn btn-ghost btn-sm btn-icon" style={{color:'var(--danger)'}} onClick={e => { e.stopPropagation(); handleDelete(n.id); }}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
