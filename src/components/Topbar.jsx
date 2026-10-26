import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../utils/hooks';
import NotificationBell from './NotificationBell';
import './Topbar.css';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [avatarOpen, setAvatarOpen] = useState(false);

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div className="topbar-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Search…" aria-label="Search" />
        </div>
      </div>
      <div className="topbar-right">
        <NotificationBell />
        <button className="topbar-icon-btn" onClick={toggleTheme} aria-label="Toggle dark mode">
          {theme === 'light' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          )}
        </button>
        <div className="topbar-avatar" onClick={() => setAvatarOpen((v) => !v)}>
          <div className="avatar-circle">{user?.avatar || 'U'}</div>
          <div className="avatar-info">
            <span className="avatar-name">{user?.name}</span>
            <span className="avatar-role">{user?.role}</span>
          </div>
          {avatarOpen && (
            <div className="avatar-dropdown">
              <button className="avatar-dropdown-item" onClick={logout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
