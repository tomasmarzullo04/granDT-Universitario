import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Automatic redirection if already logged in
  useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      
      // Let the useEffect handle redirection once AuthContext updates
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-neutral/20 shadow-xl mt-4 mb-4">
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg flex items-center justify-center overflow-hidden border">
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
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 flex items-start gap-3 shadow-sm font-bold">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="animate-fade-in w-full">
          <form onSubmit={handleLogin} className="space-y-5">
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
              Ingresar al Panel
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 font-medium">
            ¿Eres nuevo?{' '}
            <Link to="/signup" className="text-accent hover:text-primary font-black transition-colors">
              Crea tu cuenta aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
