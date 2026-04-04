import { useState, useEffect } from 'react';
import { getRankingCompleto } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Trophy, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function RankingTab() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      const data = await getRankingCompleto();

      // Sort by puntos DESC, then by name
      const sorted = [...data].sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        const nameA = (a.full_name || a.email || '').toLowerCase();
        const nameB = (b.full_name || b.email || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setRanking(sorted);
      setLoading(false);
    }
    fetchRanking();

    // 📡 REALTIME: Escuchar cambios en estadísticas para actualizar ranking en vivo
    const channel = supabase
      .channel('public:ranking_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estadisticas_partido' }, () => {
        console.log('🔄 Actualizando ranking...');
        fetchRanking();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const renderTrend = (pts) => {
    // A minimalist approach
    if (pts > 0) return <TrendingUp className="w-4 h-4 text-green-500 drop-shadow-sm" strokeWidth={3} />;
    if (pts === 0) return <Minus className="w-4 h-4 text-neutral/40" strokeWidth={3} />;
    return <TrendingDown className="w-4 h-4 text-red-500 drop-shadow-sm" strokeWidth={3} />;
  };

  const getRankStyle = (index) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-300 to-yellow-500 border-2 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.6)] text-white';
    if (index === 1) return 'bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-gray-200 shadow-[0_0_10px_rgba(156,163,175,0.5)] text-white';
    if (index === 2) return 'bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-400 shadow-[0_0_10px_rgba(217,119,6,0.5)] text-white';
    return '';
  };

  return (
    <div className="p-4 flex flex-col h-full bg-white max-w-2xl mx-auto w-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sticky top-[60px] md:top-0 bg-white p-4 -mx-4 z-10 border-b border-neutral/20">
        <div className="bg-primary p-2.5 rounded-xl text-white shadow-md border border-primary/20">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bebas text-primary px-1 tracking-wide uppercase">Gran Ranking</h2>
          <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] px-1 -mt-1">Temporada 2026</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      ) : (
        <div className="bg-white border border-neutral/20 rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[3.5rem_1fr_4rem_4rem] gap-2 p-3 bg-primary border-b border-primary/20 text-[10px] font-black text-white uppercase tracking-widest text-center items-center font-oswald">
            <div>POS</div>
            <div className="text-left pl-2">Manager</div>
            <div>Tend.</div>
            <div>Pts</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-neutral/10">
            {ranking.map((profile, index) => {
              const isMe = profile.id === user?.id;
              return (
                <div
                  key={profile.id}
                  className={`grid grid-cols-[3.5rem_1fr_4rem_4rem] gap-2 p-3 items-center transition-all border-b border-neutral/5 ${
                    isMe
                      ? 'bg-accent/5 border-l-4 border-l-accent'
                      : index === 0 ? 'bg-yellow-50/40 hover:bg-yellow-50'
                      : index === 1 ? 'bg-gray-50/40 hover:bg-gray-50'
                      : index === 2 ? 'bg-orange-50/40 hover:bg-orange-50'
                      : 'hover:bg-neutral-light bg-white'
                  }`}
                >
                  {/* Posición */}
                  <div className="text-center">
                    {index < 3 ? (
                      <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bebas text-lg tracking-wide ${getRankStyle(index)}`}>
                        {index + 1}
                      </div>
                    ) : (
                      <span className={`font-bebas text-xl tracking-wide ${isMe ? 'text-accent' : 'text-neutral/60'}`}>{index + 1}</span>
                    )}
                  </div>

                  {/* Nombre */}
                  <div className="text-left pl-2">
                    <p className={`font-bold whitespace-normal break-words leading-tight ${isMe ? 'text-accent' : 'text-primary'}`}>
                      {profile.full_name || profile.email?.split('@')[0]}
                      {isMe && <span className="ml-2 text-[9px] font-black bg-accent text-white px-1.5 py-0.5 rounded uppercase">Vos</span>}
                    </p>
                    {profile.team_name && (
                      <p className="text-[10px] text-neutral font-bold whitespace-normal break-words opacity-60">{profile.team_name}</p>
                    )}
                  </div>

                  {/* Tendencia (basada en puntos) */}
                  <div className="flex justify-center">
                    <div className="bg-white/80 rounded-lg p-1.5 shadow-sm border border-neutral/10">
                      {renderTrend(profile.puntos)}
                    </div>
                  </div>

                  {/* Puntos */}
                  <div className="text-center">
                    <span className={`font-bebas tracking-wide text-2xl drop-shadow-sm ${index === 0 ? 'text-yellow-600' : index === 1 ? 'text-gray-600' : index === 2 ? 'text-amber-700' : isMe ? 'text-accent' : 'text-primary'}`}>
                      {profile.puntos}
                    </span>
                  </div>
                </div>
              );
            })}

            {ranking.length === 0 && (
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
