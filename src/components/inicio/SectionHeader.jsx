/**
 * Encabezado de sección sobrio para guiar el ojo entre niveles de la página.
 */
export default function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      {Icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </div>
      )}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs font-medium text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
