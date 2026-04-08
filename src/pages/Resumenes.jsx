import { useEffect, useState } from 'react';
import PlayerLayout from '../components/PlayerLayout';
import { useAuth } from '../contexts/AuthContext';
import { 
  getLiveStatus, getResumenFecha, getRankingCompleto, 
  SCORING, getPlayersStatistics, getMarketMetrics, getEntrenadorDeLaFecha,
  APP_STATUS, getLastPublishedFecha
} from '../lib/api';
import { 
  Shield, Zap, AlertTriangle, TrendingUp, Medal, Footprints, Target, 
  Clock, Star, Trophy, Activity, AlertCircle, Users, Quote, 
  ChevronRight, CalendarDays, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

// --- CACHE GLOBAL PARA PERSISTENCIA DE ESTADO ---
let dashboardCache = {
  upcomingMatch: null,
  lastResultsMatch: null,
  status: null,
  lastResultsData: null,
  rankingInfo: null,
  topJugadores: null,
  marketMetrics: null,
  entrenadorFecha: null,
  lastFetched: 0
};

export default function Resumenes() {
  const { user } = useAuth();
  
  // Inicializamos con la data del caché si existe
  const [upcomingMatch, setUpcomingMatch] = useState(dashboardCache.upcomingMatch);
  const [lastResultsMatch, setLastResultsMatch] = useState(dashboardCache.lastResultsMatch);
  const [status, setStatus] = useState(dashboardCache.status);
  const [lastResultsData, setLastResultsData] = useState(dashboardCache.lastResultsData);
  const [rankingInfo, setRankingInfo] = useState(dashboardCache.rankingInfo);
  const [topJugadores, setTopJugadores] = useState(dashboardCache.topJugadores || []);
  const [marketMetrics, setMarketMetrics] = useState(dashboardCache.marketMetrics);
  const [entrenadorFecha, setEntrenadorFecha] = useState(dashboardCache.entrenadorFecha);
  
  // Solo cargamos si el lastResultsData es nulo (montaje inicial o logout previo)
  const [loading, setLoading] = useState(!dashboardCache.lastResultsData);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      const now = Date.now();
      const shouldSilentRefresh = dashboardCache.lastResultsData && (now - dashboardCache.lastFetched < 300000);
      
      try {
        const { activeMatchday, status: liveStatus } = await getLiveStatus();
        const lastFinished = await getLastPublishedFecha();
        
        // Las métricas (Equipo, Entrenador, etc.) ahora vienen SIEMPRE de la ÚLTIMA fecha terminada
        const [resultsData, ranking, allPlayerStats, market, coach] = await Promise.all([
          lastFinished ? getResumenFecha(lastFinished.id, user.id) : Promise.resolve(null),
          getRankingCompleto(),
          getPlayersStatistics(),
          getMarketMetrics(activeMatchday?.id),
          lastFinished ? getEntrenadorDeLaFecha(lastFinished.id) : Promise.resolve(null)
        ]);

        // Guardar en estados
        setUpcomingMatch(activeMatchday);
        setLastResultsMatch(lastFinished);
        setStatus(liveStatus);
        setLastResultsData(resultsData || { items: [], puntosTotal: 0 });
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
          upcomingMatch: activeMatchday,
          lastResultsMatch: lastFinished,
          status: liveStatus,
          lastResultsData: resultsData || { items: [], puntosTotal: 0 },
          rankingInfo: dashboardCache.rankingInfo,
          topJugadores: top5,
          marketMetrics: market,
          entrenadorFecha: coach,
          lastFetched: Date.now()
        };

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (loading && !dashboardCache.lastResultsData) {
    return (
      <PlayerLayout>
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-neutral/60 font-medium uppercase tracking-widest text-sm">Sincronizando Estadísticas...</p>
        </div>
      </PlayerLayout>
    );
  }

  // --- DERIVED METRICS ---
  const teamCount = lastResultsData?.items?.length || 0;
  let mvp = null;
  let capitan = null;
  let statsAtaque = 0;
  let statsDefensa = 0;
  let statsDisciplina = 0;

  if (lastResultsData && lastResultsData.items.length > 0) {
    let maxPts = -999;
    lastResultsData.items.forEach(jugador => {
      if (jugador.puntos > maxPts) {
        maxPts = jugador.puntos;
        mvp = jugador;
      }
      if (jugador.es_capitan) capitan = jugador;

      const s = jugador.stats;
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
  // ── RENDERIZADO DE BANNER DINÁMICO ──
  const renderBanner = () => {
    if (!upcomingMatch) return null;

    let bannerConfig = {
      bg: 'bg-blue-50/50',
      border: 'border-blue-100',
      icon: Clock,
      iconColor: 'text-blue-500',
      title: `⏳ PRÓXIMA FECHA: ${upcomingMatch.rival}`,
      desc: 'Esperando carga de planteles...',
      textColor: 'text-blue-900',
      showButton: false
    };

    if (status === APP_STATUS.ARMADO_EQUIPO) {
      bannerConfig = {
        bg: 'bg-green-50/50',
        border: 'border-green-100',
        icon: Footprints,
        iconColor: 'text-green-600',
        title: `🏉 PRÓXIMA FECHA: ${upcomingMatch.rival}`,
        desc: `Armá tu equipo hasta el ${new Date(upcomingMatch.fecha_cierre_equipo).toLocaleDateString('es-AR', { weekday: 'long' })} 23:59`,
        textColor: 'text-green-900',
        showButton: true,
        showCountdown: true
      };
    } else if (status === APP_STATUS.FECHA_EN_JUEGO) {
      bannerConfig = {
        bg: 'bg-slate-50/50',
        border: 'border-slate-200',
        icon: Shield,
        iconColor: 'text-slate-500',
        title: '🔒 FECHA EN JUEGO',
        desc: 'Esperando resultados...',
        textColor: 'text-slate-900',
        showButton: false
      };
    } else if (status === APP_STATUS.ESPERANDO_STATS) {
      bannerConfig = {
        bg: 'bg-amber-50/50',
        border: 'border-amber-100',
        icon: Activity,
        iconColor: 'text-amber-600',
        title: '🏁 FECHA FINALIZADA',
        desc: `Esperando estadísticas técnicas (hasta ${new Date(upcomingMatch.fecha_limite_stats).toLocaleDateString('es-AR', { weekday: 'long' })} 23:59)`,
        textColor: 'text-amber-900',
        showButton: false
      };
    } else if (status === APP_STATUS.RESULTADOS_PUBLICADOS) {
      bannerConfig = {
        bg: 'bg-emerald-500',
        border: 'border-emerald-600',
        icon: Trophy,
        iconColor: 'text-white',
        title: '✅ ESTADÍSTICAS CARGADAS',
        desc: 'Revisá el ranking y los resultados oficiales.',
        textColor: 'text-white',
        showButton: false
      };
    }

    return (
      <div className={`
        ${bannerConfig.bg} rounded-[32px] border ${bannerConfig.border} p-5 md:p-6 mb-8 relative overflow-hidden transition-all animate-fade-in
      `}>
        <div className="flex items-center gap-5 relative z-10">
          <div className={`p-4 rounded-2xl ${status === APP_STATUS.RESULTADOS_PUBLICADOS ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
            <bannerConfig.icon className={`w-8 h-8 ${bannerConfig.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-black tracking-tight ${bannerConfig.textColor}`}>
              {bannerConfig.title}
            </h3>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
               <p className={`text-sm font-medium ${status === APP_STATUS.RESULTADOS_PUBLICADOS ? 'text-white/90' : 'text-neutral/70'}`}>
                 {bannerConfig.desc}
               </p>
               {bannerConfig.showCountdown && upcomingMatch?.fecha_cierre_equipo && (
                  <div className="hidden md:flex items-center gap-2 px-2 py-0.5 rounded-full bg-green-100/50 border border-green-200 text-[10px] font-black text-green-700 uppercase">
                     <Clock className="w-3 h-3" />
                     {/* El contador real sería un hook, por ahora mostramos tiempo aprox */}
                     {Math.max(0, Math.floor((new Date(upcomingMatch.fecha_cierre_equipo) - new Date()) / (1000 * 60 * 60)))}h restantes
                  </div>
               )}
            </div>
          </div>
          {bannerConfig.showButton && (
            <Link to="/dashboard?tab=equipo" className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
              Jugar
            </Link>
          )}
        </div>
      </div>
    );
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
                       <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">RESUMEN FECHA ANTERIOR ({lastResultsMatch?.rival || '...'})</h2>
                    </div>
                 </div>
 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-5 md:p-6 rounded-[32px] border transition-all hover:shadow-xl ${lastResultsData ? 'bg-white border-neutral/10' : 'bg-neutral-light/30 border-dashed border-neutral/20'}`}>
                      <div className="flex items-center justify-between mb-8">
                        <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10">
                          <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest text-neutral/50 font-medium mb-1">Mi Puntuación</p>
                          <h4 className="text-3xl font-black text-primary leading-none">{lastResultsData?.puntosTotal || 0}</h4>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-neutral/5 pb-3">
                          <span className="text-xs text-neutral font-medium">Jugadores activos</span>
                          <span className="text-sm font-black text-primary">{teamCount}<span className="text-neutral/30 font-medium ml-1">/15</span></span>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-xs text-neutral font-medium">Rank Global</span>
                          <span className="text-sm font-black text-primary">#{rankingInfo?.posicion || '--'}</span>
                        </div>
                      </div>
                    </div>

                    {/* MVP de la Fecha */}
                    <div className="bg-white border border-neutral/10 p-5 md:p-6 rounded-[32px] transition-all hover:shadow-xl group relative overflow-hidden">
                      <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="w-12 h-12 bg-accent/5 rounded-2xl flex items-center justify-center border border-accent/10">
                          <Zap className="w-6 h-6 text-accent" />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest text-neutral/50 font-medium mb-1">MVP de Fecha</p>
                          <h4 className="text-sm font-black text-primary truncate max-w-[120px]">
                            {mvp ? mvp.nombre : 'S/D'}
                          </h4>
                        </div>
                      </div>
                      
                      <div className="flex items-end justify-between relative z-10">
                        <div>
                           <p className="text-[10px] font-medium text-neutral/40 uppercase tracking-tighter mb-0.5">Puntos MVP</p>
                           <span className="text-2xl font-black text-accent">{mvp?.puntos || 0}</span>
                        </div>
                        {mvp && (
                           <span className="text-[9px] font-black text-accent bg-accent/5 px-2 py-1 rounded-lg border border-accent/10 uppercase tracking-widest">
                             {mvp.categoria}
                           </span>
                        )}
                      </div>
                      <Activity className="absolute -bottom-6 -right-6 w-24 h-24 text-accent/5 group-hover:scale-110 transition-transform duration-700" />
                    </div>

                    {/* Entrenador de la Fecha */}
                    <div className="bg-primary p-5 md:p-6 rounded-[32px] shadow-xl shadow-primary/20 relative overflow-hidden group">
                      <div className="flex items-center justify-between mb-8 relative z-10 text-white/90">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                          <Medal className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-1 text-sky-200">Coach de Fecha</p>
                          <h4 className="text-sm font-black text-white truncate max-w-[120px]">
                            {entrenadorFecha ? entrenadorFecha.nombre : 'S/D'}
                          </h4>
                        </div>
                      </div>
                      
                      <div className="flex items-end justify-between relative z-10">
                        <div>
                           <p className="text-[10px] font-medium text-white/50 uppercase tracking-tighter mb-0.5">Puntos Coach</p>
                           <span className="text-2xl font-black text-white">{entrenadorFecha?.puntos || 0}</span>
                        </div>
                        <Link to="/dashboard?tab=ranking" className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors border border-white/10">
                          <ChevronRight className="w-4 h-4 text-white" />
                        </Link>
                      </div>
                      <Trophy className="absolute -bottom-6 -left-6 w-24 h-24 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
                    </div>
                 </div>
              </section>

              {/* Estadísticas Individuales (Anterior Inteligencia de Mercado) */}
              <section>
                 <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Estadísticas Individuales</h2>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Más elegido Fecha */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1">Más elegido (Esta Fecha)</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{marketMetrics?.mostElegidoFecha?.nombre || '...' }</span>
                          <span className="text-xs font-medium text-emerald-600 mt-2">{marketMetrics?.mostElegidoFecha?.count || 0} elecciones</span>
                       </div>
                       <div className="bg-emerald-50 p-3 rounded-full">
                          <Users className="w-6 h-6 text-emerald-600" />
                       </div>
                    </div>

                    {/* Capitán más elegido */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-accent">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1">Capitán más elegido</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{marketMetrics?.mostCapitanHist?.nombre || 'S/D'}</span>
                          <span className="text-xs font-medium text-accent mt-2">Liderazgo favorito</span>
                       </div>
                       <div className="bg-orange-50 p-3 rounded-full">
                          <Shield className="w-6 h-6 text-accent" />
                       </div>
                    </div>

                    {/* Más Tarjetas */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-red-500">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1">Más Penalizado</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{marketMetrics?.mostPenalized?.nombre || 'Limpio'}</span>
                          <span className="text-xs font-medium text-red-600 mt-2">-{marketMetrics?.mostPenalized?.penaltyPoints || 0} pts disciplina</span>
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
                            <span className="text-xs font-medium uppercase text-slate-700 tracking-tight">{item.l}</span>
                         </div>
                         <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-black ${item.c}`}>{item.neg ? '-' : '+'}{item.v}</span>
                            <span className="text-slate-400 text-xs font-medium">pts</span>
                         </div>
                         <p className="text-[10px] text-slate-400 font-medium uppercase mt-2">{item.sub}</p>
                      </div>
                    ))}
                 </div>
              </section>

            </div>

            {/* Sidebar (Right) */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              
              {/* Bloque Identidad "VAMOS UNI" - Arriba en Desktop, Abajo en Mobile */}
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center group order-2 md:order-1">
                 <div className="w-24 h-24 mb-6 relative">
                    <img 
                      src="/escudo.jpg" 
                      alt="Escudo UNI" 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                    />
                    <div className="absolute -inset-2 bg-primary/5 rounded-full -z-10 animate-pulse"></div>
                 </div>
                 <h3 className="text-2xl font-black text-primary tracking-tighter">¡VAMOS UNI! 🦉</h3>
                 <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em] mt-2">Club Universitario MDP</p>
              </div>

              {/* Top 5 del Torneo - Arriba en Mobile, Abajo en Desktop */}
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden order-1 md:order-2">
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
                             <p className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-wider">{p.categoria}</p>
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
                <p className="text-neutral font-medium">Estamos a la espera de que el Staff oficial anuncie los planteles para la próxima fecha.</p>
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
                      <p className="text-white/60 text-xs font-medium uppercase mt-1 tracking-tighter">GAMA ALTA (A Elección)</p>
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
