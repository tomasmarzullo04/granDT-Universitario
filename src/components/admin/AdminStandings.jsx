import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Loader2 } from 'lucide-react';

export default function AdminStandings() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        // En un escenario real, los puntos vendrían calculados de supabase. 
        // Como estamos definiendo la vista ahora, los seteamos en 0 temporalmente
        const perfilesMapeados = data.map((p) => ({
          ...p,
          puntos: 0
        }));
        
        perfilesMapeados.sort((a, b) => b.puntos - a.puntos);
        setProfiles(perfilesMapeados);
      }
      setLoading(false);
    }
    fetchRanking();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral/20 rounded-2xl shadow-sm overflow-hidden animate-fade-in relative z-10 w-full">
      <div className="bg-primary p-4 border-b border-primary/20 flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-lg text-white">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gran Ranking</h2>
          <p className="text-xs text-accent font-bold uppercase tracking-widest">General</p>
        </div>
      </div>
      
      {/* Table Header */}
      <div className="grid grid-cols-[3rem_1fr_5rem] gap-2 p-3 bg-neutral-light border-b border-neutral/20 text-xs font-bold text-neutral uppercase tracking-widest items-center">
        <div className="text-center">#</div>
        <div className="text-left pl-2">Manager</div>
        <div className="text-center">Pts</div>
      </div>
      
      {/* Table Body */}
      <div className="divide-y divide-neutral/10">
        {profiles.map((profile, index) => (
           <div key={profile.id} className="grid grid-cols-[3rem_1fr_5rem] gap-2 p-3 items-center hover:bg-neutral-light transition-colors even:bg-neutral-light/50 bg-white">
             {/* Posicion */}
             <div className="text-center">
               {index < 3 ? (
                  <div className="w-7 h-7 mx-auto rounded-full flex items-center justify-center font-black text-sm bg-accent text-white shadow-sm">
                    {index + 1}
                  </div>
               ) : (
                  <span className="font-bold text-neutral">{index + 1}</span>
               )}
             </div>
             
             {/* Nombre */}
             <div className="text-left pl-2 truncate">
               <p className="font-bold text-primary truncate">
                 {profile.full_name || profile.email?.split('@')[0] || 'Usuario'}
               </p>
               {profile.role === 'admin' && (
                 <span className="inline-block mt-0.5 text-[10px] bg-primary/10 text-primary px-1.5 rounded uppercase font-bold tracking-widest border border-primary/20">Admin</span>
               )}
             </div>

             {/* Puntos */}
             <div className="text-center">
               <span className="font-black text-primary text-lg">{profile.puntos}</span>
             </div>
           </div>
        ))}
        
        {profiles.length === 0 && (
           <div className="p-8 text-center text-gray-400">
             Aún no hay usuarios registrados en el sistema.
           </div>
        )}
      </div>
    </div>
  );
}
