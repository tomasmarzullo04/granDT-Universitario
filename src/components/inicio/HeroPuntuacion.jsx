import { Shield, Trophy } from 'lucide-react';

/**
 * Nivel 1 (Hero): la puntuación del usuario en la fecha + su ranking global.
 * El número de puntuación es el elemento tipográficamente dominante de la página.
 * Fondo azul institucional sólido (sin gradientes), con marca de agua sutil.
 */
export default function HeroPuntuacion({ match, finalizada, puntos, ranking, teamCount }) {
  const subtitulo = match
    ? `Fecha ${match.numero_fecha} · vs ${match.rival || 'S/D'}`
    : 'Resumen general';

  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-sm md:p-8">
      {/* Marca de agua sutil (sin gradientes) */}
      <Trophy
        className="pointer-events-none absolute -bottom-8 -right-6 h-44 w-44 text-white/5"
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
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

      <div className="relative mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        {/* Puntuación dominante */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">Tu puntuación</p>
          <p className="mt-1 flex items-baseline gap-2 leading-none">
            <span className="text-7xl font-black tracking-tight md:text-8xl">{puntos}</span>
            <span className="text-base font-bold uppercase tracking-wider text-accent">pts</span>
          </p>
        </div>

        {/* Stats secundarias */}
        <div className="flex gap-6 sm:gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">Ranking</p>
            <p className="mt-1 text-3xl font-black leading-none md:text-4xl">
              #{ranking || '--'}
            </p>
          </div>
          <div className="border-l border-white/15 pl-6 sm:pl-8">
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
