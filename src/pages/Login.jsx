import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, profile, signOut } = useAuth();
  const [loginRole, setLoginRole] = useState('player'); // 'player' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Automatic redirection if already logged in and roles match
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/resumenes', { replace: true });
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      // Importante: Verificar el rol inmediatamente
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Si no hay perfil, creamos uno básico de emergencia para permitir el acceso (failsafe)
      if (!profileData) {
        console.warn('Profile missing on login. Creating emergency profile...');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: data.user.id, 
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || 'Nuevo Usuario',
            role: 'player' 
          }])
          .select('role')
          .single();
        
        if (insertError) {
           console.error('Lamentablemente no se pudo crear el perfil de emergencia:', insertError);
           throw new Error('Error de configuración de cuenta: Perfil no encontrado.');
        }
        profileData = newProfile;
      }

      // Validación de Seguridad: Si intenta entrar como Staff pero es Player
      if (loginRole === 'admin' && profileData.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Acceso denegado. No tenés permisos de administrador.');
      }

      // La redirección la maneja el useEffect o el RootRedirect
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-neutral/20 shadow-xl mt-4 mb-4">
        <div className="flex flex-col items-center mb-6 space-y-4">
          <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg flex items-center justify-center overflow-hidden border">
            <img 
              src="/escudo.jpg" 
              alt="Escudo Club Universitario" 
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-primary mb-1">Gran DT Universitario</h1>
            <h2 className="text-xs font-bold tracking-widest uppercase text-accent">Panel de Ingreso</h2>
          </div>
        </div>

        {/* Tabs de Rol */}
        <div className="flex bg-neutral-light p-1 rounded-2xl border border-neutral/20 mb-6">
          <button
            onClick={() => setLoginRole('player')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${
              loginRole === 'player' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-neutral hover:text-primary'
            }`}
          >
            Ingreso Jugador
          </button>
          <button
            onClick={() => setLoginRole('admin')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${
              loginRole === 'admin' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-neutral hover:text-primary'
            }`}
          >
            Ingreso Staff
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 p-4 rounded-2xl mb-6 flex items-start gap-3 shadow-sm font-bold animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="animate-fade-in w-full">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-light border border-neutral/30 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-bold"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-light border border-neutral/30 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-bold"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg hover:scale-[1.02] hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loginRole === 'admin' ? 'Ingreso Staff' : 'Ingreso al Panel'}
            </button>
          </form>
        </div>
        
        {loginRole === 'player' && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-sm text-gray-600 font-medium">
              ¿Eres nuevo?{' '}
              <Link to="/signup" className="text-accent hover:text-primary font-black transition-colors">
                Crea tu cuenta aquí
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
