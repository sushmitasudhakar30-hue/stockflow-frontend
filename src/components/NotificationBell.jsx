import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationBell.css';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const prevUnread = useRef(unreadCount);
  const ref = useRef(null);

  // Ring animation when a new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setRinging(true);
      const t = setTimeout(() => setRinging(false), 600);
      return () => clearTimeout(t);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getIcon = (type) => {
    if (type === 'low_stock') return '⚠';
    if (type === 'order_status') return '📦';
    if (type === 'transfer') return '↔';
    return '🔔';
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button
        className={`bell-btn ${ringing ? 'ringing' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="bell-dot" />}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllAsRead}>Mark all read</button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 16px' }}>No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.read ? '' : 'unread'}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <span className="notif-icon">{getIcon(n.type)}</span>
                  <div className="notif-body">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-date">{n.date}</div>
                  </div>
                  {!n.read && <span className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
