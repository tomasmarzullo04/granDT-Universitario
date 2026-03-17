import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!fullName.trim()) return 'El nombre de usuario es obligatorio.';
    if (!teamName.trim()) return 'El nombre de tu equipo es obligatorio.';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Sign up en Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            team_name: teamName,
          }
        }
      });

      if (signUpError) {
        // Manejar errores comunes de traducción
        if (signUpError.message.includes('User already registered')) {
          throw new Error('Este correo ya está registrado en el sistema.');
        }
        throw signUpError;
      }

      // Si requiere verificación de email (Supabase default configuration)
      if (data?.user?.identities?.length === 0) {
        throw new Error('Este correo ya está registrado en el sistema.');
      }

      // La sesión se auto-inicia si el email confirmation está apagado en Supabase,
      // y nuestro AuthContext nos redirigirá al /dashboard en ese caso.
      // Si requiere confirmación, navigate no se disparará automáticamente.
      // Forzamos direccionamiento:
      navigate('/dashboard');
      
    } catch (err) {
      setError(err.message || 'Ocurrió un error al intentar crear tu cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-neutral/20 shadow-xl mt-4 mb-4">
        <div className="flex flex-col items-center mb-6 space-y-4">
          <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/escudo.jpg" 
              alt="Escudo Club Universitario" 
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-primary mb-1">Unite al Gran DT</h1>
            <h2 className="text-xs font-bold tracking-widest uppercase text-accent">Crea tu cuenta de socio/jugador</h2>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-neutral-light border border-neutral/30 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Nombre de tu Equipo</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-neutral-light border border-neutral/30 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Ej: Los Gladiadores"
            />
          </div>
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
              placeholder="Min. 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Confirmar Contraseña</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-neutral-light border border-neutral/30 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Repite la contraseña"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:scale-[1.02] hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Crear Cuenta
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-accent hover:text-primary font-bold transition-colors">
              Ingresa aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
