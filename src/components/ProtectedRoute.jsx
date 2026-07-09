import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading your workspace…</div>;
  }

  return user ? <Outlet /> : <Navigate to="/auth" replace />;
}

export default ProtectedRoute;
