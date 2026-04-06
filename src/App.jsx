import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import OnboardingScreen from './pages/OnboardingScreen';

function RootRedirect() {
  const { user, role, loading } = useAuth();
  
  if (loading) return null; // Or a simple loader

  if (!user) return <Navigate to="/login" replace />;
  
  if (role === 'admin') return <Navigate to="/admin" replace />;
  
  return <Navigate to="/dashboard" replace />;
}

function UserDashboardGate() {
  const { profile, loading } = useAuth();
  
  if (loading) return null;

  // Si no es competidor, va al Gate
  if (profile && profile.es_competidor === false) {
    return <OnboardingScreen />;
  }

  // Si no hay profile o es_competidor === true (o undefined en caso extremo)
  return <Dashboard />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Routes for Players */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<UserDashboardGate />} />
          </Route>

          {/* Protected Routes for Admins (requireAdmin = true) */}
          <Route element={<ProtectedRoute requireAdmin={true} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
          
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
