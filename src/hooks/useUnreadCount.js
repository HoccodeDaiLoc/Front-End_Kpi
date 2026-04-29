import { useState, useEffect } from 'react';
import { getNotifications } from '../api/notifications';

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getNotifications({ limit: 1 });
        setUnreadCount(res.data.unreadCount || 0);
      } catch {}
    };
    fetch();
    // Cập nhật mỗi 60 giây
    const timer = setInterval(fetch, 60000);
    return () => clearInterval(timer);
  }, []);

  return { unreadCount, setUnreadCount };
}