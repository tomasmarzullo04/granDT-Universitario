import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function RankingTab() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      // Obtenemos a los perfiles
      const { data, error } = await supabase.from('profiles').select('*');
      
      if (!error && data) {
        // Por ahora simulamos los puntos en 0, asignándolos manualmente para el ranking. 
        // Más adelante será una consulta calculada.
        const profilesWithMockPoints = data.map((p, index) => ({
          ...p,
          puntos: 0,
          tendencia: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'down' : 'same' // Mock tendencia
        }));
        
        // Orden simplificado por puntos (todos tienen 0 por ahora pero prepara la estructura)
        profilesWithMockPoints.sort((a, b) => b.puntos - a.puntos);
        
        setProfiles(profilesWithMockPoints);
      }
      setLoading(false);
    }
    fetchRanking();
  }, []);

  const renderTrend = (trend) => {
    switch(trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="p-4 flex flex-col h-full bg-white max-w-2xl mx-auto w-full pb-24">
      <div className="flex items-center gap-3 mb-6 sticky top-0 bg-white p-4 -mx-4 z-10 border-b border-neutral/20">
        <div className="bg-primary p-2.5 rounded-xl text-white">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-primary px-1 tracking-tight">Gran Ranking</h2>
          <p className="text-xs text-accent font-bold uppercase tracking-widest px-1">Temporada 2026</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      ) : (
        <div className="bg-white border border-neutral/20 rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 p-3 bg-primary border-b border-primary/20 text-xs font-bold text-white uppercase tracking-widest text-center items-center">
            <div>#</div>
            <div className="text-left pl-2">Manager</div>
            <div>Tend.</div>
            <div>Pts</div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-neutral/10">
            {profiles.map((profile, index) => (
               <div key={profile.id} className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 p-3 items-center hover:bg-neutral-light transition-colors even:bg-neutral-light/50 bg-white">
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
                     {profile.full_name || profile.email.split('@')[0]}
                   </p>
                   {profile.role === 'admin' && (
                     <span className="inline-block mt-0.5 text-[10px] bg-primary/10 text-primary px-1.5 rounded uppercase font-bold tracking-widest border border-primary/20">Admin</span>
                   )}
                 </div>

                 {/* Tendencia */}
                 <div className="flex justify-center">
                   <div className="bg-white rounded-md p-1.5 border border-neutral/10 shadow-sm">
                     {renderTrend(profile.tendencia)}
                   </div>
                 </div>

                 {/* Puntos */}
                 <div className="text-center">
                   <span className="font-black text-primary text-lg">{profile.puntos}</span>
                 </div>
               </div>
            ))}
            
            {profiles.length === 0 && (
               <div className="p-8 text-center text-gray-400">
                 Aún no hay usuarios registrados.
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
