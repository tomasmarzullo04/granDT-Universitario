import { useEffect, useState } from 'react';
import PlayerLayout from '../components/PlayerLayout';
import { useAuth } from '../contexts/AuthContext';
import { 
  getActiveFecha, getResumenFecha, getRankingCompleto, 
  SCORING, getPlayersStatistics, getMarketMetrics, getEntrenadorDeLaFecha 
} from '../lib/api';
import { 
  Shield, Zap, AlertTriangle, TrendingUp, Medal, Footprints, Target, 
  Clock, Star, Trophy, Activity, AlertCircle, Users, Quote, 
  ChevronRight, CalendarDays
} from 'lucide-react';
import { Link } from 'react-router-dom';

// --- CACHE GLOBAL PARA PERSISTENCIA DE ESTADO ---
let dashboardCache = {
  fecha: null,
  equipoData: null,
  rankingInfo: null,
  topJugadores: null,
  marketMetrics: null,
  entrenadorFecha: null,
  lastFetched: 0
};

export default function Resumenes() {
  const { user } = useAuth();
  
  // Inicializamos con la data del caché si existe
  const [fecha, setFecha] = useState(dashboardCache.fecha);
  const [equipoData, setEquipoData] = useState(dashboardCache.equipoData);
  const [rankingInfo, setRankingInfo] = useState(dashboardCache.rankingInfo);
  const [topJugadores, setTopJugadores] = useState(dashboardCache.topJugadores || []);
  const [marketMetrics, setMarketMetrics] = useState(dashboardCache.marketMetrics);
  const [entrenadorFecha, setEntrenadorFecha] = useState(dashboardCache.entrenadorFecha);
  
  // Solo cargamos si el equipoData es nulo (montaje inicial o logout previo)
  const [loading, setLoading] = useState(!dashboardCache.equipoData);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      // Si ya cargamos hace menos de 5 minutos, no bloqueamos la UI con loading
      const now = Date.now();
      const shouldSilentRefresh = dashboardCache.equipoData && (now - dashboardCache.lastFetched < 300000);
      
      if (!shouldSilentRefresh) {
         // Si es la primera vez o pasó mucho tiempo, podríamos mostrar un sutil indicador 
         // pero la instrucción pide evitar el spinner excesivo
      }

      try {
        const activeFecha = await getActiveFecha();
        
        const [eqData, ranking, allPlayerStats, market, coach] = await Promise.all([
          activeFecha ? getResumenFecha(activeFecha.id, user.id) : Promise.resolve(null),
          getRankingCompleto(),
          getPlayersStatistics(),
          getMarketMetrics(activeFecha?.id),
          activeFecha ? getEntrenadorDeLaFecha(activeFecha.id) : Promise.resolve(null)
        ]);

        // Guardar en estados
        setFecha(activeFecha);
        setEquipoData(eqData || { items: [], puntosTotal: 0 });
        setMarketMetrics(market);
        setEntrenadorFecha(coach);

        // User ranking info
        const userRankIndex = ranking.findIndex(r => r.id === user.id);
        if (userRankIndex !== -1) {
          const info = {
            posicion: userRankIndex + 1,
            puntosTotalesCampaña: ranking[userRankIndex].puntos
          };
          setRankingInfo(info);
          dashboardCache.rankingInfo = info;
        }

        // Top 5 Jugadores
        const top5 = [...allPlayerStats]
          .sort((a, b) => b.puntos - a.puntos)
          .slice(0, 5);
        setTopJugadores(top5);

        // ACTUALIZAR CACHÉ GLOBAL
        dashboardCache = {
          fecha: activeFecha,
          equipoData: eqData || { items: [], puntosTotal: 0 },
          rankingInfo: dashboardCache.rankingInfo,
          topJugadores: top5,
          marketMetrics: market,
          entrenadorFecha: coach,
          lastFetched: Date.now()
        };

      } catch (err) {
        console.error('Error loading resumen data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading && !dashboardCache.equipoData) {
    return (
      <PlayerLayout>
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-neutral/60 font-bold uppercase tracking-widest text-sm">Sincronizando Estadísticas...</p>
        </div>
      </PlayerLayout>
    );
  }

  // --- DERIVED METRICS ---
  const teamCount = equipoData?.items?.length || 0;
  let mvp = null;
  let capitan = null;
  let statsAtaque = 0;
  let statsDefensa = 0;
  let statsDisciplina = 0;

  if (equipoData && equipoData.items.length > 0) {
    let maxPts = -999;
    equipoData.items.forEach(jugador => {
      if (jugador.puntos > maxPts) {
        maxPts = jugador.puntos;
        mvp = jugador;
      }
      if (jugador.es_capitan) capitan = jugador;

      const s = jugador.stats;
      // REGLA: Los desgloses tácticos NO usan el multiplicador de capitán
      statsAtaque += (
        (s.tries * SCORING.TRY) +
        (s.conversiones * SCORING.CONVERSION) +
        (s.penales * SCORING.PENAL) +
        (s.drops * SCORING.DROP) +
        (s.asistencias * SCORING.ASISTENCIA)
      );

      statsDefensa += (
        (s.tackles * SCORING.TACKLE) +
        (s.lines_robados * SCORING.LINES_ROBADOS) +
        (s.cortes_limpios * SCORING.CORTE_LIMPIO)
      );

      statsDisciplina += (
        (s.penales_hechos * Math.abs(SCORING.PENALES_HECHOS)) +
        (s.amarillas * Math.abs(SCORING.AMARILLA)) +
        (s.rojas * Math.abs(SCORING.ROJA))
      );
    });
  }

  // --- BANNER RENDERER ---
  const renderBanner = () => {
    if (!fecha) return null;

    if (fecha.estado === 'abierta') {
      const isMissing = teamCount < 15;
      return (
        <div className={`w-full ${isMissing ? 'bg-red-600' : 'bg-emerald-600'} text-white p-4 md:p-6 rounded-2xl shadow-lg border border-white/10 relative overflow-hidden mb-8 transition-colors duration-500`}>
           <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
              {isMissing ? <AlertCircle className="w-48 h-48" /> : <Shield className="w-48 h-48" />}
           </div>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                    {isMissing ? <AlertTriangle className="w-6 h-6 text-white" /> : <Shield className="w-6 h-6 text-white" />}
                 </div>
                 <div>
                    <h3 className="font-black text-lg md:text-xl tracking-tight uppercase leading-none">
                       {isMissing ? '¡ENTRÁ A LA CANCHA!' : '¡EQUIPO LISTO!'}
                    </h3>
                    <p className="text-sm font-bold opacity-90 mt-1 max-w-lg">
                       {isMissing 
                         ? `Todavía no completaste tu XV ideal para la Fecha ${fecha.numero_fecha}. Tenés ${teamCount}/15 confirmados.`
                         : `Selección confirmada para la Fecha ${fecha.numero_fecha}. Kick-off en breve. ¡Vamos UNI!`}
                    </p>
                 </div>
              </div>
              <Link to="/dashboard?tab=equipo" className="bg-white text-gray-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-md text-center">
                 {isMissing ? 'Completar Plantel' : 'Revisar Selección'}
              </Link>
           </div>
        </div>
      );
    }

    if (fecha.estado === 'en_juego' || fecha.estado === 'finalizada') {
       const isFinished = fecha.estado === 'finalizada';
       return (
        <div className={`w-full ${isFinished ? 'bg-primary' : 'bg-amber-500'} text-white p-4 md:p-6 rounded-2xl shadow-lg border border-white/10 relative overflow-hidden mb-8 transition-colors`}>
           <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
              {isFinished ? <Trophy className="w-48 h-48" /> : <Clock className="w-48 h-48" />}
           </div>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                    {isFinished ? <Star className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                 </div>
                 <div>
                    <h3 className="font-black text-lg md:text-xl tracking-tight uppercase leading-none">
                       {isFinished ? '✅ RESULTADOS PUBLICADOS' : '⏳ VENTANA CERRADA'}
                    </h3>
                    <p className="text-sm font-bold opacity-90 mt-1 max-w-lg">
                       {isFinished 
                         ? `Los puntajes oficiales de la Fecha ${fecha.numero_fecha} ya están disponibles. Revisá tu rendimiento.`
                         : `El Staff está procesando las estadísticas de la Fecha ${fecha.numero_fecha}. El mercado está cerrado.`}
                    </p>
                 </div>
              </div>
           </div>
        </div>
      );
    }
    return null;
  };

  return (
    <PlayerLayout>
      <div className="min-h-screen bg-slate-50/50 -mx-4 -mt-4 px-4 pt-6 pb-20 overflow-x-hidden">
        <div className="max-w-5xl mx-auto">
          
          {/* Top Banner Refined */}
          {renderBanner()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Main Content (Left) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Rendimiento (Dashboard Pro) */}
              <section>
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <Activity className="w-6 h-6 text-primary" />
                       <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Rendimiento Fecha {fecha?.numero_fecha}</h2>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Ptos Fecha', val: equipoData?.puntosTotal || 0, sub: 'Fin de semana', icon: Star, color: 'text-primary' },
                      { label: 'Ranking', val: `#${rankingInfo?.posicion || '-'}`, sub: 'Global Club', icon: Trophy, color: 'text-accent' },
                      { label: 'MVP Team', val: mvp ? mvp.nombre : 'S/D', sub: mvp ? `+${mvp.puntos} pts` : '-', icon: Medal, color: 'text-emerald-600', isTitle: true },
                      { label: 'El Capitán', val: capitan ? capitan.nombre : 'S/D', sub: 'Multiplicador x2', icon: Shield, color: 'text-blue-600', isTitle: true }
                    ].map((card, i) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                         <div className="absolute right-0 bottom-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-1/4 translate-y-1/4">
                            <card.icon className="w-24 h-24" />
                         </div>
                         <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{card.label}</p>
                         <h4 className={`text-2xl font-black tracking-tighter ${card.color} ${card.isTitle ? 'text-lg md:text-xl truncate' : 'text-3xl'}`}>
                            {card.val}
                         </h4>
                         <p className="text-[11px] text-slate-500 font-bold mt-0.5">{card.sub}</p>
                      </div>
                    ))}
                 </div>
              </section>

              {/* Estadísticas Individuales (Anterior Inteligencia de Mercado) */}
              <section>
                 <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Estadísticas Individuales</h2>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Entrenador de la Fecha */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-primary">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Entrenador de la Fecha</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{entrenadorFecha?.nombre || 'Calculando...'}</span>
                          <span className="text-xs font-bold text-primary mt-2">{entrenadorFecha?.puntos || 0} pts sumados</span>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-full">
                          <Star className="w-6 h-6 text-primary" />
                       </div>
                    </div>

                    {/* Más elegido Fecha */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Más elegido (Esta Fecha)</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{marketMetrics?.mostElegidoFecha?.nombre || '...' }</span>
                          <span className="text-xs font-bold text-emerald-600 mt-2">{marketMetrics?.mostElegidoFecha?.count || 0} elecciones</span>
                       </div>
                       <div className="bg-emerald-50 p-3 rounded-full">
                          <Users className="w-6 h-6 text-emerald-600" />
                       </div>
                    </div>

                    {/* Capitán más elegido */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-accent">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Capitán más elegido</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{marketMetrics?.mostCapitanHist?.nombre || 'S/D'}</span>
                          <span className="text-xs font-bold text-accent mt-2">Liderazgo favorito</span>
                       </div>
                       <div className="bg-orange-50 p-3 rounded-full">
                          <Shield className="w-6 h-6 text-accent" />
                       </div>
                    </div>

                    {/* Más Tarjetas */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-red-500">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Más Penalizado</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{marketMetrics?.mostPenalized?.nombre || 'Limpio'}</span>
                          <span className="text-xs font-bold text-red-600 mt-2">-{marketMetrics?.mostPenalized?.penaltyPoints || 0} pts disciplina</span>
                       </div>
                       <div className="bg-red-50 p-3 rounded-full">
                          <Zap className="w-6 h-6 text-red-500" />
                       </div>
                    </div>
                 </div>
              </section>

              {/* Desglose Táctico */}
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                 <div className="flex items-center gap-3 mb-6">
                    <Zap className="w-6 h-6 text-accent" />
                    <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Desglose Técnico (La Fecha)</h2>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-slate-100">
                    {[
                      { l: 'Ataque Total', v: statsAtaque, c: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Tries, Penales, Drops', icon: Target },
                      { l: 'La Muralla', v: statsDefensa, c: 'text-blue-600', bg: 'bg-blue-50', sub: 'Tackles y Turnovers', icon: Shield },
                      { l: 'Disciplina', v: statsDisciplina, c: 'text-red-500', bg: 'bg-red-50', sub: 'Infracciones cometidas', icon: AlertTriangle, neg: true }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col p-4 md:px-8 first:pl-0 last:pr-0">
                         <div className="flex items-center gap-3 mb-3">
                            <div className={`${item.bg} p-2 rounded-lg`}>
                               <item.icon className={`w-4 h-4 ${item.c}`} />
                            </div>
                            <span className="text-xs font-black uppercase text-slate-700 tracking-tight">{item.l}</span>
                         </div>
                         <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-black ${item.c}`}>{item.neg ? '-' : '+'}{item.v}</span>
                            <span className="text-slate-400 text-xs font-bold">pts</span>
                         </div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">{item.sub}</p>
                      </div>
                    ))}
                 </div>
              </section>

            </div>

            {/* Sidebar (Right) */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Bloque Identidad "VAMOS UNI" */}
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center group">
                 <div className="w-24 h-24 mb-6 relative">
                    <img 
                      src="/escudo.jpg" 
                      alt="Escudo UNI" 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                    />
                    <div className="absolute -inset-2 bg-primary/5 rounded-full -z-10 animate-pulse"></div>
                 </div>
                 <h3 className="text-2xl font-black text-primary tracking-tighter">¡VAMOS UNI! 🦉</h3>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Club Universitario MDP</p>
              </div>

              {/* Top 5 del Torneo */}
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                 <div className="p-6 bg-primary text-white flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-tight text-sm">Top 5 del Torneo</h3>
                    <Trophy className="w-4 h-4 text-accent" />
                 </div>
                 <div className="p-2">
                    {topJugadores.map((p, idx) => (
                       <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors rounded-xl group">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${idx === 0 ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'}`}>
                             {idx + 1}
                          </div>
                          <div className="flex-1">
                             <h4 className="font-black text-slate-800 text-sm leading-none group-hover:text-primary transition-colors">{p.nombre}</h4>
                             <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{p.categoria}</p>
                          </div>
                          <div className="text-right">
                             <div className="text-lg font-black text-primary leading-none">{p.puntos}</div>
                             <div className="text-[9px] text-slate-400 font-black uppercase">PTS</div>
                          </div>
                       </div>
                    ))}
                    <Link to="/dashboard?tab=jugadores" className="block text-center p-4 mt-2 border-t border-slate-50 text-[10px] font-black text-primary uppercase tracking-widest hover:text-accent transition-colors">
                       Ver plantel completo
                    </Link>
                 </div>
              </section>

            </div>

          </div>

          {/* Sección Premios */}
          <section className="mt-16 pb-12">
             <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Premios de Temporada</h2>
                <p className="text-slate-400 font-medium text-sm mt-1 uppercase tracking-widest">Reconocimiento al esfuerzo y la estrategia</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-6 max-w-4xl mx-auto px-4">
                
                {/* 2nd Place */}
                <div className="order-2 md:order-1">
                   <div className="bg-white rounded-t-3xl border border-slate-100 p-8 pt-10 text-center shadow-lg transform translate-y-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
                         <Medal className="w-6 h-6 text-slate-400" />
                      </div>
                      <h4 className="font-black text-slate-400 text-3xl mb-1 tracking-tighter uppercase">2° Lugar</h4>
                      <p className="text-slate-800 font-black text-xl">$30.000</p>
                      <p className="text-slate-400 text-xs font-bold uppercase mt-1">Efectivo</p>
                   </div>
                   <div className="h-4 bg-slate-200 rounded-b-3xl"></div>
                </div>

                {/* 1st Place */}
                <div className="order-1 md:order-2">
                   <div className="bg-primary rounded-t-[2.5rem] p-10 py-14 text-center shadow-2xl relative z-10 scale-105">
                      <div className="absolute top-4 left-1/2 -translate-x-1/2">
                         <Trophy className="w-10 h-10 text-accent animate-bounce" />
                      </div>
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-accent">
                         <Star className="w-8 h-8 text-accent fill-accent" />
                      </div>
                      <h4 className="font-black text-white text-4xl mb-2 tracking-tighter uppercase">CAMPEÓN</h4>
                      <p className="text-accent font-black text-2xl uppercase tracking-widest">Botines</p>
                      <p className="text-white/60 text-xs font-bold uppercase mt-1 tracking-tighter">GAMA ALTA (A Elección)</p>
                   </div>
                   <div className="h-6 bg-primary-light rounded-b-[2.5rem]"></div>
                </div>

                {/* 3rd Place */}
                <div className="order-3">
                   <div className="bg-white rounded-t-3xl border border-slate-100 p-8 pt-10 text-center shadow-lg transform translate-y-4">
                      <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-orange-100">
                         <Medal className="w-6 h-6 text-orange-400" />
                      </div>
                      <h4 className="font-black text-orange-400/70 text-3xl mb-1 tracking-tighter uppercase">3° Lugar</h4>
                      <p className="text-slate-800 font-black text-xl">$15.000</p>
                      <p className="text-slate-400 text-xs font-bold uppercase mt-1">Efectivo</p>
                   </div>
                   <div className="h-4 bg-orange-100/50 rounded-b-3xl"></div>
                </div>

             </div>

             <div className="mt-12 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Cierre de Torneo: Temporada Regular 2026</p>
             </div>
          </section>

        </div>
      </div>
    </PlayerLayout>
  );
}
