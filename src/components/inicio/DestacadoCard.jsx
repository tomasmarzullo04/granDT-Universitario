import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Nivel 2 (Destacados): card reutilizable para MVP de la Fecha y Coach de la Fecha.
 * Estética sobria: blanco, borde sutil, sombra suave.
 */
export default function DestacadoCard({
  icon: Icon,
  label,
  name,
  value,
  valueLabel = 'Puntos',
  pill,
  to,
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-6 w-6 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-slate-900">{name || 'S/D'}</p>
        {pill && (
          <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {pill}
          </span>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-3xl font-black leading-none text-primary">{value ?? 0}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {valueLabel}
        </p>
        {to && (
          <Link
            to={to}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-primary"
            aria-label="Ver más"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
