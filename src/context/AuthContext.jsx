import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { tokenStore, UNAUTHORIZED_EVENT } from '../api/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session: if a token is saved, ask the server who it belongs to (this also checks it is still valid).
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await orderApi.me();
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    restore();
    return () => { cancelled = true; };
  }, []);

  // The API client fires this when the server says the token expired or the account was deactivated.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { token, user: loggedIn } = await orderApi.login(email, password);
      tokenStore.set(token);
      setUser(loggedIn);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed — please try again' };
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Role permission map: which routes each role can access
export const rolePermissions = {
  Admin: ['dashboard', 'inventory', 'warehouses', 'stock-movement', 'suppliers', 'orders', 'reports', 'users'],
  'Warehouse Manager': ['dashboard', 'inventory', 'warehouses', 'stock-movement', 'suppliers', 'orders', 'reports'],
  'Inventory Staff': ['dashboard', 'inventory', 'warehouses', 'stock-movement'],
  'Sales Staff': ['dashboard', 'inventory', 'suppliers', 'orders', 'reports'],
};

export function canAccess(role, route) {
  return (rolePermissions[role] || []).includes(route);
}
