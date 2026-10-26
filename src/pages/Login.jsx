import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import './Login.css';

// Demo accounts created by `npm run seed` in the backend. Shown ONLY in development builds, never in production.
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'Stockflow@123';
const DEMO_USERS = [
  { role: 'Admin', email: 'admin@stockflow.com' },
  { role: 'Warehouse Manager', email: 'manager@stockflow.com' },
  { role: 'Inventory Staff', email: 'staff@stockflow.com' },
  { role: 'Sales Staff', email: 'sales@stockflow.com' },
];

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      showToast('success', 'Welcome to StockFlow!');
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const fillDemo = (demoRole) => {
    const user = DEMO_USERS.find((u) => u.role === demoRole);
    if (user) {
      setEmail(user.email);
      setPassword(DEMO_PASSWORD);
      setRole(user.role);
    }
  };

  return (
    <div className="login-page">
      {/* Left animated panel */}
      <div className="login-left">
        <div className="login-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
          <div className="shape shape-4" />
        </div>
        <div className="login-left-content">
          <div className="login-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>StockFlow</span>
          </div>
          <h1 className="login-tagline">Smart Inventory & Warehouse Management</h1>
          <p className="login-subtitle">Track stock across warehouses, manage orders, and get real-time alerts — all in one place.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-right">
        <div className="login-form-wrap">
          <h2 className="login-form-title">Sign in to your account</h2>
          <p className="login-form-sub">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@stockflow.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="role">Role (demo selector)</label>
              <select id="role" className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Admin</option>
                <option>Warehouse Manager</option>
                <option>Inventory Staff</option>
                <option>Sales Staff</option>
              </select>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {import.meta.env.DEV && (
          <div className="demo-hint">
            <p className="demo-hint-title">Demo credentials — click to autofill:</p>
            <div className="demo-chips">
              <button type="button" className="demo-chip" onClick={() => fillDemo('Admin')}>Admin</button>
              <button type="button" className="demo-chip" onClick={() => fillDemo('Warehouse Manager')}>Warehouse Manager</button>
              <button type="button" className="demo-chip" onClick={() => fillDemo('Inventory Staff')}>Inventory Staff</button>
              <button type="button" className="demo-chip" onClick={() => fillDemo('Sales Staff')}>Sales Staff</button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
