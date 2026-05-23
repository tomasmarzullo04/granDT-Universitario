import { Shield } from 'lucide-react';

/**
 * Nivel 1 (Hero): la puntuación del usuario en la fecha + su ranking global.
 * El número de puntuación es el elemento tipográficamente dominante de la página.
 * Fondo azul institucional sólido (sin gradientes).
 */
export default function HeroPuntuacion({ match, finalizada, puntos, ranking, teamCount }) {
  const subtitulo = match
    ? `Fecha ${match.numero_fecha} · vs ${match.rival || 'S/D'}`
    : 'Resumen general';

  return (
    <section className="rounded-2xl bg-primary p-6 text-white shadow-sm md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-white/70" />
          <span className="text-xs font-medium uppercase tracking-wider text-white/70">
            {subtitulo}
          </span>
        </div>
        {finalizada && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Finalizada
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        {/* Puntuación dominante */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">Tu puntuación</p>
          <p className="mt-1 text-6xl font-black leading-none tracking-tight md:text-7xl">
            {puntos}
          </p>
        </div>

        {/* Stats secundarias */}
        <div className="flex gap-8 md:gap-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">Ranking</p>
            <p className="mt-1 text-3xl font-black leading-none md:text-4xl">
              #{ranking || '--'}
            </p>
          </div>
          <div className="border-l border-white/15 pl-8 md:pl-10">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">Jugadores</p>
            <p className="mt-1 text-3xl font-black leading-none md:text-4xl">
              {teamCount}
              <span className="text-lg font-bold text-white/50">/15</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
