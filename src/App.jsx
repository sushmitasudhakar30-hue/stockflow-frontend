import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastProvider, useToast } from './components/Toast';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Warehouses from './pages/Warehouses';
import StockMovement from './pages/StockMovement';
import Suppliers from './pages/Suppliers';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Users from './pages/Users';

/* Inner layout that uses auth + inventory context */
function AppLayout() {
  const { user } = useAuth();
  const { setToastFn } = useInventory();
  const { showToast } = useToast();
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // Wire up toast callback so InventoryContext can trigger toasts
  useEffect(() => {
    setToastFn((type, message) => showToast(type, message));
  }, [setToastFn, showToast]);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileSidebar} onClose={() => setMobileSidebar(false)} />
      <div className="app-main">
        <Topbar onMenuClick={() => setMobileSidebar(true)} />
        <main className="app-content">
          <Routes>
            <Route path="/dashboard"      element={<ProtectedRoute route="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/inventory"      element={<ProtectedRoute route="inventory"><Products /></ProtectedRoute>} />
            <Route path="/warehouses"     element={<ProtectedRoute route="warehouses"><Warehouses /></ProtectedRoute>} />
            <Route path="/stock-movement" element={<ProtectedRoute route="stock-movement"><StockMovement /></ProtectedRoute>} />
            <Route path="/suppliers"      element={<ProtectedRoute route="suppliers"><Suppliers /></ProtectedRoute>} />
            <Route path="/orders"         element={<ProtectedRoute route="orders"><Orders /></ProtectedRoute>} />
            <Route path="/reports"        element={<ProtectedRoute route="reports"><Reports /></ProtectedRoute>} />
            <Route path="/users"          element={<ProtectedRoute route="users"><Users /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* Bridge: wire NotificationContext.addNotification into InventoryContext */
function NotificationBridge({ children }) {
  const { addNotification } = useNotifications();
  const { setNotifyFn } = useInventory();

  useEffect(() => {
    setNotifyFn((notif) => addNotification(notif));
  }, [setNotifyFn, addNotification]);

  return children;
}

/* Root router: redirects / to /dashboard or /login */
function RootRouter() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (location.pathname === '/' || location.pathname === '') {
      navigate(user ? '/dashboard' : '/login', { replace: true });
    } else if (location.pathname === '/login' && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        user ? (
          <NotificationBridge>
            <AppLayout />
          </NotificationBridge>
        ) : (
          <Login />
        )
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <InventoryProvider>
            <RootRouter />
          </InventoryProvider>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
