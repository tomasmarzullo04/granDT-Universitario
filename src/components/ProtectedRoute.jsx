import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import Layout from './Layout';

export default function ProtectedRoute({ requireAdmin = false }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <Loader2 className="w-12 h-12 text-accent-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  // Not logged in -> Go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin trying to access player dashboard -> Send to /admin
  if (!requireAdmin && role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Player trying to access admin panel -> Send to /dashboard
  if (requireAdmin && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Allowed -> render child routes
  return <Outlet />;
}
