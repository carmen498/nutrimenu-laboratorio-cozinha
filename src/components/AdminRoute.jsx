import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AdminRoute() {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
