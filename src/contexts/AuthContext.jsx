import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Session fetching
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listener de cambios de sesión (login/logout/token refresh)
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

    return () => subscription.unsubscribe();
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-white p-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="font-black animate-pulse">INICIANDO SESIÓN...</p>
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
