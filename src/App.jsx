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
import Resumenes from './pages/Resumenes';

function RootRedirect() {
  const { user, role, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-white p-4">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
      <p className="font-black animate-pulse">CARGANDO...</p>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  
  if (role === 'admin') return <Navigate to="/admin" replace />;
  
  return <Navigate to="/resumenes" replace />;
}

let veteranCache = new Map();

function UserGate({ Component }) {
  const { user, profile, role, loading } = useAuth();
  const [isVeteran, setIsVeteran] = useState(null);
  
  useEffect(() => {
    if (!loading && profile && role !== 'admin' && profile.es_competidor === false) {
      // Si ya está en caché, no volver a consultar
      if (veteranCache.has(user.id)) {
        setIsVeteran(veteranCache.get(user.id));
        return;
      }

      const checkVeteran = async () => {
        try {
          const { count, error } = await supabase
            .from('equipos_usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_id', user.id);
            
          const veteranStatus = !error && count > 0;
          veteranCache.set(user.id, veteranStatus);
          setIsVeteran(veteranStatus);
        } catch (e) {
          setIsVeteran(false);
        }
      };
      checkVeteran();
    }
  }, [loading, profile, role, user]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-white p-4">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
      <p className="font-black animate-pulse">VALIDANDO USUARIO...</p>
    </div>
  );

  // 1. Admin SIEMPRE saltan el onboarding.
  if (role === 'admin') return <Component />;
  
  // 2. Si ya es competidor verificado, también pasa directo.
  if (profile?.es_competidor === true) return <Component />;

  // 3. Chequeo de Veterano (en progreso)
  if (isVeteran === null) {
    if (profile?.es_competidor === false) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-white p-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4"></div>
        <p className="font-black animate-pulse">VERIFICANDO HISTORIAL...</p>
      </div>
    ); 
  }

  // 4. Si es veterano, bypass.
  if (isVeteran === true) return <Component />;

  // 5. Es nuevo y es_competidor es falso -> Onboarding!
  if (profile?.es_competidor === false && isVeteran === false) {
    return <OnboardingScreen />;
  }

  // Fallback (ej: si recien se esta creando)
  return <Component />;
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
            <Route path="/resumenes" element={<UserGate Component={Resumenes} />} />
            <Route path="/dashboard" element={<UserGate Component={Dashboard} />} />
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
