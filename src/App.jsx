import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { supabase } from './lib/supabase';

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
  const { user, profile, role, loading } = useAuth();
  const [isVeteran, setIsVeteran] = useState(null);
  
  useEffect(() => {
    // Solo chequeamos si profile cargó, tiene rol player, y explícitamente está en false (o null antes de migracion real).
    // Si es_competidor === true o es admin, bypass inmediato no requiere check.
    if (!loading && profile && role !== 'admin' && profile.es_competidor === false) {
      const checkVeteran = async () => {
        try {
          const { count, error } = await supabase
            .from('equipos_usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_id', user.id);
            
          if (!error && count > 0) {
            setIsVeteran(true);
          } else {
            setIsVeteran(false);
          }
        } catch (e) {
          setIsVeteran(false);
        }
      };
      checkVeteran();
    }
  }, [loading, profile, role, user]);

  if (loading) return null;

  // 1. Admin SIEMPRE saltan el onboarding.
  if (role === 'admin') return <Dashboard />;
  
  // 2. Si ya es competidor verificado, también pasa directo.
  if (profile?.es_competidor === true) return <Dashboard />;

  // 3. Chequeo de Veterano (en progreso)
  if (isVeteran === null) {
    // Si aún no hemos comprobado si es veterano y está en es_competidor === false, mostramos loader o nada (esperando fetch)
    if (profile?.es_competidor === false) return null; 
  }

  // 4. Si es veterano, bypass.
  if (isVeteran === true) return <Dashboard />;

  // 5. Es nuevo y es_competidor es falso -> Onboarding!
  if (profile?.es_competidor === false && isVeteran === false) {
    return <OnboardingScreen />;
  }

  // Fallback (ej: si recien se esta creando)
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
