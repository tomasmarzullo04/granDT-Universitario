import { useState, useEffect } from 'react';
import { getResumenFecha, getRankingCompleto } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Loader2, Star, TrendingUp, AlertCircle, Zap } from 'lucide-react';

const CAT_COLORS = {
  'Primera':        { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
  'Intermedia':     { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700' },
  'Pre-intermedia': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
};

export default function ResumenFecha({ activeFecha }) {
  const { user } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [posicion, setPosicion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      if (!activeFecha?.id || !user?.id) {
        setLoading(false);
        return;
      }
      try {
        const [resumenData, rankingData] = await Promise.all([
          getResumenFecha(activeFecha.id, user.id),
          getRankingCompleto(),
        ]);

        setResumen(resumenData);

        // Calcular posición del usuario en el ranking
        const sorted = [...rankingData].sort((a, b) => b.puntos - a.puntos);
        const pos = sorted.findIndex(p => p.id === user.id);
        setPosicion(pos >= 0 ? pos + 1 : null);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el resumen de la fecha.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeFecha, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-black text-neutral uppercase tracking-widest">Cargando resumen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-sm font-bold text-red-600">{error}</p>
      </div>
    );
  }

  if (!resumen || !resumen.items || resumen.items.length === 0) {
    return (
      <div className="bg-neutral-light/50 rounded-3xl p-12 text-center border-2 border-dashed border-neutral/20">
        <Trophy className="w-16 h-16 text-neutral/20 mx-auto mb-4" />
        <h3 className="text-xl font-black text-neutral">Sin equipo registrado</h3>
        <p className="text-sm text-neutral/60 mt-2">
          No armaste tu equipo para esta fecha, o los resultados aún no han sido publicados.
        </p>
      </div>
    );
  }

  // Group players by category for display
  const byCategory = {};
  resumen.items.forEach(item => {
    if (!byCategory[item.categoria]) byCategory[item.categoria] = [];
    byCategory[item.categoria].push(item);
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header Scoreboard ── */}
      <div className="bg-primary rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -right-2 bottom-0 w-24 h-24 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-accent" />
              <span className="text-xs font-black uppercase tracking-widest text-white/60">Fecha {activeFecha?.numero_fecha} — vs {activeFecha?.rival}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Resumen de Fecha</h2>
            <p className="text-white/60 font-bold text-sm mt-1">Resultados publicados por el staff</p>
          </div>

          <div className="flex gap-4">
            {/* Total puntos */}
            <div className="bg-white/10 rounded-2xl p-4 text-center min-w-[100px] border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Tus Puntos</p>
              <p className="text-4xl font-black text-accent">{resumen.puntosTotal}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase">esta fecha</p>
            </div>

            {/* Posición */}
            {posicion && (
              <div className="bg-white/10 rounded-2xl p-4 text-center min-w-[80px] border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Ranking</p>
                <p className="text-4xl font-black text-white">#{posicion}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase">general</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Players by Category ── */}
      {Object.entries(byCategory).map(([cat, players]) => {
        const colors = CAT_COLORS[cat] || CAT_COLORS['Primera'];
        const catTotal = players.reduce((s, p) => s + p.puntos, 0);

        return (
          <div key={cat} className={`rounded-2xl border overflow-hidden shadow-sm ${colors.border}`}>
            {/* Cat header */}
            <div className={`flex items-center justify-between px-5 py-3 ${colors.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${colors.badge}`}>{cat}</span>
                <span className="text-xs font-bold text-neutral">{players.length} jugadores</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className={`w-4 h-4 ${colors.text}`} />
                <span className={`font-black text-lg ${colors.text}`}>{catTotal} pts</span>
              </div>
            </div>

            {/* Players table */}
            <div className="divide-y divide-neutral/10 bg-white">
              {players
                .sort((a, b) => b.puntos - a.puntos)
                .map(player => {
                  const { stats, puntos, nombre, posicion_oficial } = player;
                  const initials = nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

                  return (
                    <div key={player.jugador_id} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-light/20 transition-colors">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${colors.bg} ${colors.border}`}>
                        <span className={`text-[11px] font-black ${colors.text}`}>{initials}</span>
                      </div>

                      {/* Name & position */}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-primary truncate">{nombre}</p>
                        <p className="text-[9px] font-bold text-neutral uppercase tracking-widest">{posicion_oficial || 'Jugador'}</p>
                      </div>

                      {/* Stats mini chips */}
                      <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end">
                        {stats.tries > 0 && (
                          <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {stats.tries}T
                          </span>
                        )}
                        {stats.conversiones > 0 && (
                          <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {stats.conversiones}C
                          </span>
                        )}
                        {stats.penales > 0 && (
                          <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            {stats.penales}P
                          </span>
                        )}
                        {stats.drops > 0 && (
                          <span className="text-[9px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                            {stats.drops}D
                          </span>
                        )}
                        {stats.amarillas > 0 && (
                          <span className="text-[9px] font-black bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            {stats.amarillas}🟡
                          </span>
                        )}
                        {stats.rojas > 0 && (
                          <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            {stats.rojas}🔴
                          </span>
                        )}
                        {/* If no stats at all, show presence */}
                        {stats.tries === 0 && stats.conversiones === 0 && stats.penales === 0 &&
                         stats.drops === 0 && stats.amarillas === 0 && stats.rojas === 0 && (
                          <span className="text-[9px] font-bold text-neutral/50 px-2">presencia</span>
                        )}
                      </div>

                      {/* Points */}
                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-xl font-black ${puntos > 2 ? 'text-primary' : puntos < 0 ? 'text-red-500' : 'text-neutral/50'}`}>
                          {puntos}
                        </span>
                        <p className="text-[9px] text-neutral font-bold">pts</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}

      {/* ── Footer total ── */}
      <div className="bg-neutral-light/50 rounded-2xl p-4 flex items-center justify-between border border-neutral/20">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" />
          <span className="font-black text-primary uppercase text-sm tracking-wide">Total de la fecha</span>
        </div>
        <span className="text-3xl font-black text-primary">{resumen.puntosTotal} <span className="text-base text-neutral font-bold">pts</span></span>
      </div>
    </div>
  );
}
