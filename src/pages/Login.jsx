import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle, Shield, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, role } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null); // 'admin' | 'player'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Validar rol en base de datos
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();
        
      if (profileError) throw profileError;

      if (selectedRole === 'admin' && profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('No tienes permisos de Administrador.');
      }

      // Redireccionar según el rol validado
      if (profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-neutral/20 shadow-xl mt-4 mb-4">
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/escudo.jpg" 
              alt="Escudo Club Universitario" 
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-primary mb-1">Club Universitario</h1>
            <h2 className="text-sm font-bold tracking-widest uppercase text-accent">Gran DT • Ingreso</h2>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!selectedRole ? (
          <div className="space-y-4 animate-fade-in w-full">
            <h3 className="text-xl font-bold text-primary text-center mb-6">¿Cómo deseas ingresar?</h3>
            <button
              onClick={() => setSelectedRole('player')}
              className="w-full bg-white border-2 border-neutral/20 hover:border-accent hover:bg-neutral-light/50 text-left p-6 rounded-2xl transition-all flex items-center gap-4 group shadow-sm"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors text-accent">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-primary">Ingresar como Jugador</h4>
                <p className="text-sm text-neutral">Armar mi equipo y competir</p>
              </div>
            </button>
            <button
              onClick={() => setSelectedRole('admin')}
              className="w-full bg-white border-2 border-neutral/20 hover:border-primary hover:bg-neutral-light/50 text-left p-6 rounded-2xl transition-all flex items-center gap-4 group shadow-sm"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-primary">Ingresar como Administrador</h4>
                <p className="text-sm text-neutral">Gestionar fixture y resultados</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="animate-fade-in w-full">
            <div className="flex items-center mb-6">
              <button 
                onClick={() => { setSelectedRole(null); setError(null); setPassword(''); }}
                className="text-neutral hover:text-primary transition-colors flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-neutral-light"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-primary ml-2">
                Ingreso {selectedRole === 'admin' ? 'Administrador' : 'Jugador'}
              </h3>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-light border border-neutral/30 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
              className="w-full bg-neutral-light border border-neutral/30 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
          
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:scale-[1.02] hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Ingresar
            </button>
          </form>
        </div>
        )}
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            ¿Eres nuevo?{' '}
            <Link to="/signup" className="text-accent hover:text-primary font-bold transition-colors">
              Crea tu cuenta aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
