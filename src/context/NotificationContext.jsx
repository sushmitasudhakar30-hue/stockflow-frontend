import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationApi } from '../api/notificationApi';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load once someone is signed in; clear when they sign out.
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    notificationApi
      .getAll()
      .then((data) => { if (!cancelled) setNotifications(data); })
      .catch(() => { /* the bell just stays empty */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(async (notif) => {
    try {
      const created = await notificationApi.create({
        type: notif.type,
        title: notif.title,
        message: notif.message,
        date: notif.date || new Date().toISOString().split('T')[0],
      });
      setNotifications((prev) => [created, ...prev]);
    } catch { /* a failed notification should never break the action that triggered it */ }
  }, []);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await notificationApi.markRead(id); } catch { /* UI already updated */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await notificationApi.markAllRead(); } catch { /* UI already updated */ }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, loading }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
