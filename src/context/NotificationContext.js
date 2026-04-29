import React, { createContext, useContext, useState, useEffect } from 'react';
import { getNotifications } from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({ unreadCount: 0, refresh: () => {} });

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const refresh = async () => {
    if (!user) return;
    try {
      const res = await getNotifications({ limit: 1 });
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => clearInterval(timer);
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);