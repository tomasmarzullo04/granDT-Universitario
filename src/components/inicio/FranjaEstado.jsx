import { Link } from 'react-router-dom';
import { FASES } from '../../hooks/useFechaActiva';

/**
 * Franja informativa fina (NO card) que anuncia el estado de la PRÓXIMA fecha.
 * El resto de la página muestra el pasado; esta franja mira al futuro.
 * Aquí sí se permiten emojis (regla de look-back).
 */
export default function FranjaEstado({ fase, upcomingMatch }) {
  if (!upcomingMatch && fase !== FASES.SIN_FECHA_ACTIVA) return null;

  const rival = upcomingMatch?.rival || 'la próxima fecha';

  let emoji = '⏳';
  let texto = `Próxima fecha: esperando convocados del staff`;
  let detalle = upcomingMatch ? `vs ${rival}` : null;
  let cta = null;

  if (fase === FASES.MERCADO_ABIERTO) {
    emoji = '🟢';
    const cierre = upcomingMatch?.cierre_mercado
      ? `hasta el ${new Date(upcomingMatch.cierre_mercado).toLocaleDateString('es-AR', { weekday: 'long' })} 23:59`
      : 'hasta el cierre del mercado';
    texto = `Mercado abierto ${cierre}`;
    detalle = `vs ${rival}`;
    cta = (
      <Link
        to="/dashboard?tab=equipo"
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary/90"
      >
        Armar equipo
      </Link>
    );
  } else if (fase === FASES.EN_JUEGO) {
    emoji = '🔒';
    texto = 'Fecha en juego — esperando resultados';
    detalle = `vs ${rival}`;
  } else if (fase === FASES.RESULTADOS_PUBLICADOS) {
    emoji = '✅';
    texto = 'Resultados publicados — revisá el ranking';
    detalle = null;
  } else if (fase === FASES.SIN_FECHA_ACTIVA) {
    emoji = '📅';
    texto = 'Sin fecha activa por el momento';
    detalle = null;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
      <span className="text-base leading-none" aria-hidden="true">{emoji}</span>
      <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-bold text-slate-900">{texto}</span>
        {detalle && (
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{detalle}</span>
        )}
      </div>
      {cta}
    </div>
  );
}
