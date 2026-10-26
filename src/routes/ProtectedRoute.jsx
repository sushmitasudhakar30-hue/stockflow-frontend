import { Navigate } from 'react-router-dom';
import { useAuth, canAccess } from '../context/AuthContext';

export default function ProtectedRoute({ children, route }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (route && !canAccess(user.role, route)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
