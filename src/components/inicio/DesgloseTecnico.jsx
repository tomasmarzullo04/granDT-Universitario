import { Target, Shield, AlertTriangle } from 'lucide-react';

/**
 * Nivel 3 (Detalles): desglose técnico de la fecha en 3 mini-cards.
 * Positivos en verde, defensivos (neutros) en azul, infracciones en rojo.
 */
export default function DesgloseTecnico({ ataque, muralla, disciplina }) {
  const items = [
    {
      label: 'Ataque Total',
      sub: 'Tries, penales, drops',
      value: ataque,
      sign: '+',
      icon: Target,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      label: 'La Muralla',
      sub: 'Tackles y turnovers',
      value: muralla,
      sign: '+',
      icon: Shield,
      color: 'text-blue-700',
      iconBg: 'bg-blue-50',
    },
    {
      label: 'Disciplina',
      sub: 'Infracciones cometidas',
      value: disciplina,
      sign: '-',
      icon: AlertTriangle,
      color: 'text-red-500',
      iconBg: 'bg-red-50',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Desglose Técnico
      </h3>

      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:p-4"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconBg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-slate-600 sm:text-xs">
              {item.label}
            </p>
            <p className={`mt-1.5 text-2xl font-black leading-none sm:text-3xl ${item.color}`}>
              {item.sign}{item.value}
            </p>
            <p className="mt-1 text-[9px] font-medium uppercase tracking-wider text-slate-400 sm:text-[10px]">
              {item.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
