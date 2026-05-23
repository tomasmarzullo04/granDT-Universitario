/**
 * Banda de identidad del club (versión sobria, sin emojis).
 * Mantiene la marca presente sin romper la estética profesional.
 */
export default function IdentidadUni() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <img
        src="/escudo.jpg"
        alt="Escudo Club Universitario"
        className="h-14 w-14 shrink-0 object-contain"
      />
      <div className="min-w-0">
        <p className="text-base font-bold text-slate-900">Club Universitario MDP</p>
        <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-500">
          Gran DT · Edición 2026
        </p>
      </div>
    </div>
  );
}
