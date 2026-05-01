import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for missing credentials early
    if (!supabase.isConfigured) {
      setError("Las credenciales de Supabase no están configuradas correctamente en el entorno.");
      setLoading(false);
      return;
    }

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth timeout reached.");
        setLoading(false);
      }
    }, 8000);

    // Session fetching
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user || null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Error al obtener sesión:", err);
        setError("No se pudo conectar con el servidor de autenticación.");
        setLoading(false);
      })
      .finally(() => clearTimeout(safetyTimeout));

    // Listener de cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Suscripción Realtime a cambios en el perfil del usuario activo
  useEffect(() => {
    let profileSubscription = null;

    if (user?.id) {
      profileSubscription = supabase
        .channel(`public:profiles:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            console.log('🔄 Perfil modificado desde Admin:', payload.new);
            setProfile(payload.new);
          }
        )
        .subscribe();
    }

    return () => {
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
    };
  }, [user?.id]);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setProfile(data);
      } else {
        if (error) console.error('Error fetching profile:', error);
        setProfile(null);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    } finally {
      // Garantizamos que el estado de carga termine SIEMPRE.
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // state clears through listener
  };

  if (loading || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-white p-4">
        {error ? (
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-black mb-2">ERROR DE CONEXIÓN</h1>
            <p className="text-white/70 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-white text-primary px-6 py-2 rounded-full font-bold hover:bg-accent transition-colors"
            >
              REINTENTAR
            </button>
            <p className="mt-4 text-xs text-white/40">Verifica que las variables de entorno de Supabase estén configuradas en Vercel.</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
            <p className="font-black animate-pulse">INICIANDO SESIÓN...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, role: profile?.role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
