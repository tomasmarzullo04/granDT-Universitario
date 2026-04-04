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

      {/* ── Banner de Estado: Próxima Fecha ── */}
      <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 p-8 rounded-[2.5rem] text-center space-y-6 relative overflow-hidden group shadow-inner">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none grayscale select-none scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
          <img src="https://nniwyswxojkalelavdnn.supabase.co/storage/v1/object/public/logos/gilbert_ball.png" alt="" className="w-full max-w-sm object-contain" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto border-2 border-blue-200 animate-pulse-slow">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-black text-primary leading-tight uppercase tracking-tighter px-4">
              ⏳ EL STAFF ESTÁ DEFINIENDO LOS CONVOCADOS<br className="hidden md:block" /> PARA LA <span className="text-blue-600">PRÓXIMA FECHA</span>
            </h3>
            <p className="text-xs md:text-sm font-bold text-gray-500 max-w-md mx-auto uppercase tracking-widest leading-relaxed px-4">
              Preparate para diagramar tu 15 ideal.<br />
              <span className="block mt-2 text-primary font-black">La ventana de selección abrirá en breve.</span>
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4 pt-4 border-t border-blue-200/50 max-w-[150px] mx-auto">
            <div className="h-[2px] w-12 bg-blue-300 rounded-full"></div>
            <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.5em] italic">Gran DT UNI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
