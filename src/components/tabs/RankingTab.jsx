import { useState, useEffect } from 'react';
import { getRankingCompleto } from '../../lib/api';
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
  }, []);

  const renderTrend = (pts) => {
    if (pts > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (pts === 0) return <Minus className="w-4 h-4 text-gray-400" />;
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  const medalColors = ['bg-yellow-400', 'bg-neutral-300', 'bg-amber-600'];

  return (
    <div className="p-4 flex flex-col h-full bg-white max-w-2xl mx-auto w-full pb-24">
      {/* Header */}
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
            {ranking.map((profile, index) => {
              const isMe = profile.id === user?.id;
              return (
                <div
                  key={profile.id}
                  className={`grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 p-3 items-center transition-colors ${
                    isMe
                      ? 'bg-accent/5 border-l-4 border-accent'
                      : 'hover:bg-neutral-light even:bg-neutral-light/50 bg-white'
                  }`}
                >
                  {/* Posición */}
                  <div className="text-center">
                    {index < 3 ? (
                      <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-black text-sm ${medalColors[index]} text-white shadow-sm`}>
                        {index + 1}
                      </div>
                    ) : (
                      <span className={`font-bold ${isMe ? 'text-accent' : 'text-neutral'}`}>{index + 1}</span>
                    )}
                  </div>

                  {/* Nombre */}
                  <div className="text-left pl-2 truncate">
                    <p className={`font-bold truncate ${isMe ? 'text-accent' : 'text-primary'}`}>
                      {profile.full_name || profile.email?.split('@')[0]}
                      {isMe && <span className="ml-2 text-[9px] font-black bg-accent text-white px-1.5 py-0.5 rounded uppercase">Vos</span>}
                    </p>
                    {profile.team_name && (
                      <p className="text-[10px] text-neutral font-bold truncate opacity-60">{profile.team_name}</p>
                    )}
                  </div>

                  {/* Tendencia (basada en puntos) */}
                  <div className="flex justify-center">
                    <div className="bg-white rounded-md p-1.5 border border-neutral/10 shadow-sm">
                      {renderTrend(profile.puntos)}
                    </div>
                  </div>

                  {/* Puntos */}
                  <div className="text-center">
                    <span className={`font-black text-lg ${isMe ? 'text-accent' : 'text-primary'}`}>
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
