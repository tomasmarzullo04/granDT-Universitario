import { Users, Crown, AlertTriangle, Medal } from 'lucide-react';

/**
 * Nivel 3 (Detalles): estadísticas individuales en lista compacta.
 * Más elegido / Capitán más elegido / Más penalizado / Entrenador de la fecha.
 */
export default function EstadisticasIndividuales({ marketMetrics, coach }) {
  const rows = [
    {
      label: 'Más elegido (esta fecha)',
      name: marketMetrics?.mostElegidoFecha?.nombre || 'S/D',
      value: `${marketMetrics?.mostElegidoFecha?.count || 0} elecciones`,
      icon: Users,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      label: 'Capitán más elegido',
      name: marketMetrics?.mostCapitanHist?.nombre || 'S/D',
      value: `${marketMetrics?.mostCapitanHist?.count || 0} elecciones`,
      icon: Crown,
      color: 'text-accent',
      iconBg: 'bg-sky-50',
    },
    {
      label: 'Más penalizado',
      name: marketMetrics?.mostPenalized?.nombre || 'S/D',
      value: `-${marketMetrics?.mostPenalized?.penaltyPoints || 0} pts`,
      icon: AlertTriangle,
      color: 'text-red-500',
      iconBg: 'bg-red-50',
      negative: true,
    },
    {
      label: 'Entrenador de la fecha',
      name: coach?.nombre || 'S/D',
      value: `${coach?.puntos || 0} pts`,
      icon: Medal,
      color: 'text-primary',
      iconBg: 'bg-blue-50',
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Estadísticas Individuales
        </h3>
      </div>

      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 px-6 py-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${row.iconBg}`}>
              <row.icon className={`h-5 w-5 ${row.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{row.label}</p>
              <p className="truncate text-sm font-bold text-slate-900">{row.name}</p>
            </div>
            <span
              className={`shrink-0 text-sm font-bold ${row.negative ? 'text-red-500' : 'text-blue-700'}`}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
