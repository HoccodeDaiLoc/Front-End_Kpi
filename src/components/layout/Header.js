  import React, { useState, useRef, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';

  import { useNotifications } from '../../context/NotificationContext';
  import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../api/notifications';
  import { formatDateTime } from '../../utils/helpers';
  import { 
    Bell, 
    Check, 
    CheckCheck, 
    Trash2,
    BarChart3,
    CircleCheckBig,
    PartyPopper,
    CircleX,
    KeyRound
  } from 'lucide-react';

  const TYPE_ICONS = {
    evaluation_submitted: <BarChart3 size={18} />,
    evaluation_reviewed: <CircleCheckBig size={18} />,
    evaluation_approved: <PartyPopper size={18} />,
    evaluation_rejected: <CircleX size={18} />,
    account_activated: <KeyRound size={18} />,
    system: <Bell size={18} />
  };
  function NotificationDropdown({ onClose }) {
    const navigate = useNavigate();
    const { setUnreadCount } = useNotifications();
    const [notifs, setNotifs] = useState([]);
    const [unread, setUnread] = useState(0);
    const isMobile = window.innerWidth <= 768;
    const [loading, setLoading] = useState(true);
  const handleClick = (n) => {
    if (!n.isRead) handleRead(n.id);
    if (n.relatedId && n.type !== 'system') {
      onClose();
      navigate(`/evaluation/${n.relatedId}`);
    }
  };
    useEffect(() => {
      getNotifications({ limit: 20 }).then(res => {
        setNotifs(res.data.data);
        setUnread(res.data.unreadCount || 0);
      }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const handleRead = async (id) => {
      await markAsRead(id).catch(() => {});
      setNotifs(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(u => Math.max(0, u - 1));
      setUnreadCount(u => Math.max(0, u - 1));
    };

    const handleReadAll = async () => {
      await markAllAsRead().catch(() => {});
      setNotifs(ns => ns.map(n => ({ ...n, isRead: true })));
      setUnread(0);
      setUnreadCount(0);
    };

    const handleDelete = async (id, e) => {
      e.stopPropagation();
      await deleteNotification(id).catch(() => {});
      setNotifs(ns => ns.filter(n => n.id !== id));
    };

return (
  <div style={{
    position: isMobile ? 'fixed' : 'absolute',
    top: isMobile ? 60 : 'calc(100% + 8px)',
    left: isMobile ? 8 : 'auto',
    right: isMobile ? 8 : 0,
    width: isMobile ? 'auto' : 360,
    maxHeight: isMobile ? '70vh' : 480,
    overflowY: 'auto',
    background: 'var(--surface, #fff)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,.12)',
    zIndex: 1000,
  }}>
        {/* Header dropdown */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            Thông báo {unread > 0 && <span style={{ color: '#ef4444' }}>({unread})</span>}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleReadAll} title="Đánh dấu tất cả đã đọc">
                <CheckCheck size={13} /> Đọc tất cả
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => { onClose(); navigate('/notifications'); }}>
              Xem tất cả
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div>
        ) : notifs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
            <Bell size={32} style={{ opacity: .2, marginBottom: 8 }} /><br />Chưa có thông báo
          </div>
        ) : notifs.map(n => (
        <div key={n.id}
    onClick={() => handleClick(n)}
    style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px',
      background: n.isRead ? 'transparent' : '#eff6ff',
      borderBottom: '1px solid var(--border)',
      cursor: (n.relatedId && n.type !== 'system') ? 'pointer' : (n.isRead ? 'default' : 'pointer'), // ← đây
      transition: 'background .15s',
    }}>
            <div 
    style={{ 
      flexShrink: 0,
      marginTop: 2,
      width: 32,
      height: 32,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: n.isRead ? '#f3f4f6' : '#dbeafe',
      color: n.isRead ? '#6b7280' : '#2563eb'
    }}
  >
    {TYPE_ICONS[n.type] || <Bell size={18} />}
  </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{formatDateTime(n.createdAt)}</div>
            </div>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {!n.isRead && (
                <button className="btn btn-ghost btn-sm btn-icon" onClick={e => { e.stopPropagation(); handleRead(n.id); }} title="Đánh dấu đã đọc">
                  <Check size={12} />
                </button>
              )}
              <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={e => handleDelete(n.id, e)} title="Xóa">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
  export default function Header({ title, subtitle, actions }) {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
      <header className="header" style={{ flexWrap: 'wrap', height: 'auto', minHeight: 'var(--header-h)', padding: '8px 24px', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div className="header-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60vw' }}>
            {title}
          </div>
          {subtitle && <div className="header-sub">{subtitle}</div>}
        </div>
        <div className="header-spacer" />
        <div className="header-actions" style={{ flexWrap: 'wrap', gap: 6 }}>
          {actions}
          <div ref={ref} style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(o => !o)}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  background: '#ef4444', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  minWidth: 16, height: 16, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', pointerEvents: 'none'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {open && <NotificationDropdown onClose={() => setOpen(false)} />}
          </div>
        </div>
      </header>
    );
  }