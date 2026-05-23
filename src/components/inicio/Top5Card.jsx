import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

function iniciales(nombre = '') {
  return (
    nombre
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

// Colores de medalla para el podio del top.
const RANK_BADGE = {
  0: 'bg-amber-400 text-white',
  1: 'bg-slate-300 text-slate-700',
  2: 'bg-orange-300 text-white',
};

/**
 * Nivel 2 (Destacados): Top 5 del torneo en lista compacta con avatares
 * circulares (iniciales), colores de medalla en el podio y categoría como pill.
 */
export default function Top5Card({ jugadores = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Top 5 del Torneo
        </h3>
        <Trophy className="h-4 w-4 text-accent" />
      </div>

      <ul className="divide-y divide-slate-100">
        {jugadores.length === 0 && (
          <li className="px-6 py-8 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
            Aún sin datos
          </li>
        )}
        {jugadores.map((p, idx) => (
          <li key={p.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black ${
                RANK_BADGE[idx] || 'bg-slate-100 text-slate-400'
              }`}
            >
              {idx + 1}
            </span>

            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary ${
                idx === 0 ? 'ring-2 ring-amber-300' : ''
              }`}
            >
              {iniciales(p.nombre)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{p.nombre}</p>
              <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                {p.categoria || 'S/C'}
              </span>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-lg font-black leading-none text-primary">{p.puntos}</p>
              <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">pts</p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        to="/dashboard?tab=jugadores"
        className="block border-t border-slate-100 py-3 text-center text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:text-accent"
      >
        Ver plantel completo
      </Link>
    </div>
  );
}
