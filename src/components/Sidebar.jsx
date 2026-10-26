import { NavLink } from 'react-router-dom';
import { useAuth, canAccess } from '../context/AuthContext';
import './Sidebar.css';

const menuItems = [
  { route: 'dashboard',      path: '/dashboard',      label: 'Dashboard',       icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { route: 'inventory',      path: '/inventory',      label: 'Inventory',       icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { route: 'warehouses',     path: '/warehouses',     label: 'Warehouses',      icon: 'M3 21h18M3 21V7l9-4 9 4v14M9 21v-6h6v6' },
  { route: 'stock-movement', path: '/stock-movement', label: 'Stock Movement',  icon: 'M8 7h8m-8 5h8m-8 5h5M4 3h16v18H4V3z' },
  { route: 'suppliers',      path: '/suppliers',      label: 'Suppliers', icon: 'M3 7h18M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l2-3h14l2 3M8 12h8' },
  { route: 'orders',         path: '/orders',         label: 'Sales Orders',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { route: 'reports',        path: '/reports',        label: 'Reporting',       icon: 'M9 17v-6m3 6V8m3 9v-4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { route: 'users',          path: '/users',          label: 'User Management', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2m13-10a4 4 0 11-8 0 4 4 0 018 0z' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useAuth();

  const visibleItems = menuItems.filter((item) => canAccess(user?.role, item.route));

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="sidebar-logo-text">StockFlow</span>
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map((item, i) => (
            <NavLink
              key={item.route}
              to={item.path}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="sidebar-accent" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-version">StockFlow v1.0</div>
        </div>
      </aside>
    </>
  );
}
