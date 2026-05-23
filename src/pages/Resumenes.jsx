import { useEffect, useState, useMemo } from 'react';
import PlayerLayout from '../components/PlayerLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  getResumenFecha, getRankingCompleto,
  SCORING, getPlayersStatistics, getMarketMetrics, getEntrenadorDeLaFecha,
  getLastPublishedFecha
} from '../lib/api';
import { useFechaActiva } from '../hooks/useFechaActiva';
import { Zap, Medal, Loader2, Star, Trophy } from 'lucide-react';
import Navigation from '../components/Navigation';
import FranjaEstado from '../components/inicio/FranjaEstado';
import HeroPuntuacion from '../components/inicio/HeroPuntuacion';
import SectionHeader from '../components/inicio/SectionHeader';
import DestacadoCard from '../components/inicio/DestacadoCard';
import DesgloseTecnico from '../components/inicio/DesgloseTecnico';
import Top5Card from '../components/inicio/Top5Card';
import EstadisticasIndividuales from '../components/inicio/EstadisticasIndividuales';
import IdentidadUni from '../components/inicio/IdentidadUni';
import PodioPremios from '../components/inicio/PodioPremios';

// --- CACHE GLOBAL PARA PERSISTENCIA DE ESTADO ---
let dashboardCache = {
  lastResultsMatch: null,
  lastResultsData: null,
  rankingInfo: null,
  topJugadores: null,
  marketMetrics: null,
  entrenadorFecha: null,
  lastFetched: 0
};

export default function Resumenes() {
  const { user } = useAuth();

  // Fuente única de verdad: fase y fecha activa vienen del backend (vw_fecha_activa).
  const { fechaActiva: fechaRow, fase } = useFechaActiva();
  const upcomingMatch = useMemo(
    () => (fechaRow && fechaRow.fecha_id != null ? { ...fechaRow, id: fechaRow.fecha_id } : null),
    [fechaRow]
  );

  // Inicializamos con la data del caché si existe
  const [lastResultsMatch, setLastResultsMatch] = useState(dashboardCache.lastResultsMatch);
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

      try {
        const lastFinished = await getLastPublishedFecha();

        // Determinar la fecha para mostrar métricas:
        // 1. Si hay una fecha publicada con datos reales → usarla
        // 2. Si no, usar la fecha activa (stats en vivo, aún no publicadas)
        const metricsFechaId = lastFinished?.id || fechaRow?.fecha_id;
        const metricsFecha =
          lastFinished ||
          (fechaRow && fechaRow.fecha_id != null ? { ...fechaRow, id: fechaRow.fecha_id } : null);

        const [resultsData, ranking, allPlayerStats, market, coach] = await Promise.all([
          metricsFechaId ? getResumenFecha(metricsFechaId, user.id) : Promise.resolve(null),
          getRankingCompleto(),
          getPlayersStatistics(),
          metricsFechaId ? getMarketMetrics(metricsFechaId) : Promise.resolve(null),
          metricsFechaId ? getEntrenadorDeLaFecha(metricsFechaId) : Promise.resolve(null)
        ]);

        // Guardar en estados
        setLastResultsMatch(metricsFecha);
        setLastResultsData(resultsData || { items: [], puntosTotal: 0 });
        setMarketMetrics(market);
        setEntrenadorFecha(coach);

        // User ranking info
        const userRankIndex = ranking.findIndex(r => r.id === user.id);
        if (userRankIndex !== -1) {
          const info = {
            posicion: userRankIndex + 1,
            "puntosTotales Campaña": ranking[userRankIndex].puntos
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
          lastResultsMatch: metricsFecha,
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
  }, [user, fechaRow?.fecha_id]);

  if (loading && !dashboardCache.lastResultsData) {
    return (
      <PlayerLayout>
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="mt-4 text-neutral/60 font-medium uppercase tracking-widest text-sm">Sincronizando Estadísticas...</p>
        </div>
      </PlayerLayout>
    );
  }

  // --- DERIVED METRICS ---
  const teamCount = lastResultsData?.items?.length || 0;

  // El MVP de la fecha es GLOBAL (el jugador con más puntos), no el de mi equipo.
  const mvp = topJugadores?.length > 0 ? topJugadores[0] : null;

  let statsAtaque = 0;
  let statsDefensa = 0;
  let statsDisciplina = 0;

  if (lastResultsData && lastResultsData.items.length > 0) {
    lastResultsData.items.forEach(jugador => {
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
        (s.tackles_ofensivos * SCORING.TACKLE_OFENSIVO) +
        (s.recuperaciones * SCORING.RECUPERACION) +
        (s.cortes_limpios * SCORING.CORTE_LIMPIO)
      );

      statsDisciplina += (
        (s.penales_hechos * Math.abs(SCORING.PENALES_HECHOS)) +
        (s.amarillas * Math.abs(SCORING.AMARILLA)) +
        (s.rojas * Math.abs(SCORING.ROJA)) +
        (s.knock_ons * Math.abs(SCORING.KNOCK_ON))
      );
    });
  }

  const fechaFinalizada = !!(
    lastResultsMatch && (lastResultsMatch.estado === 'finalizada' || lastResultsMatch.stats_cargadas)
  );

  return (
    <PlayerLayout>
      <div className="flex flex-col gap-6">
        <Navigation />

        {/* Look-back: franja del FUTURO (próxima fecha) separada del resumen pasado */}
        <FranjaEstado fase={fase} upcomingMatch={upcomingMatch} />

        {/* Nivel 1 — Hero: puntuación dominante + ranking */}
        <HeroPuntuacion
          match={lastResultsMatch}
          finalizada={fechaFinalizada}
          puntos={lastResultsData?.puntosTotal || 0}
          ranking={rankingInfo?.posicion}
          teamCount={teamCount}
        />

        {/* Nivel 2 — Destacados de la fecha */}
        <section>
          <SectionHeader icon={Star} title="Destacados de la Fecha" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DestacadoCard
              icon={Zap}
              label="MVP de la Fecha"
              name={mvp?.nombre}
              value={mvp?.puntos || 0}
              valueLabel="Puntos MVP"
              pill={mvp?.categoria}
              tone="accent"
            />
            <DestacadoCard
              icon={Medal}
              label="Coach de la Fecha"
              name={entrenadorFecha?.nombre}
              value={entrenadorFecha?.puntos || 0}
              valueLabel="Puntos Coach"
              to="/dashboard?tab=ranking"
            />
          </div>
        </section>

        {/* Nivel 3 — Desglose técnico (barra de stats) */}
        <DesgloseTecnico
          ataque={statsAtaque}
          muralla={statsDefensa}
          disciplina={statsDisciplina}
        />

        {/* Nivel 2/3 — El torneo: Top 5 + Estadísticas individuales */}
        <section>
          <SectionHeader icon={Trophy} title="El Torneo" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Top5Card jugadores={topJugadores} />
            <EstadisticasIndividuales marketMetrics={marketMetrics} coach={entrenadorFecha} />
          </div>
        </section>

        {/* Identidad del club (sobria) */}
        <IdentidadUni />

        {/* Premios de Temporada — podio a lo ancho */}
        <PodioPremios />
      </div>
    </PlayerLayout>
  );
}
