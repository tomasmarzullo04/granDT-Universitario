import { Trophy, Medal, Star } from 'lucide-react';

/**
 * Premios de Temporada — podio visual.
 * Campeón al centro (más alto), 2° a la izquierda, 3° a la derecha.
 * En mobile colapsa a una columna (Campeón primero).
 */
export default function PodioPremios() {
  return (
    <section className="pb-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
          Premios de Temporada
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Recompensas para los mejores entrenadores del torneo.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 items-end gap-4 px-4 md:grid-cols-3">
        {/* 2° Lugar */}
        <div className="order-2 md:order-1">
          <div className="rounded-t-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
              <Medal className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">2° Lugar</p>
            <p className="mt-1 text-2xl font-black text-slate-900">$30.000</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Efectivo</p>
          </div>
          <div className="flex h-14 items-center justify-center rounded-b-2xl bg-slate-200">
            <span className="text-2xl font-black text-slate-400">2</span>
          </div>
        </div>

        {/* Campeón */}
        <div className="order-1 md:order-2">
          <div className="rounded-t-2xl bg-primary p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-2 ring-accent">
              <Star className="h-7 w-7 fill-accent text-accent" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">Campeón</p>
            <p className="mt-1 text-3xl font-black uppercase tracking-tight text-white">Botines</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">
              Gama alta (a elección)
            </p>
          </div>
          <div className="flex h-20 items-center justify-center gap-2 rounded-b-2xl bg-primary/80">
            <Trophy className="h-5 w-5 text-accent" />
            <span className="text-3xl font-black text-white">1</span>
          </div>
        </div>

        {/* 3° Lugar */}
        <div className="order-3">
          <div className="rounded-t-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-orange-50">
              <Medal className="h-5 w-5 text-orange-400" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">3° Lugar</p>
            <p className="mt-1 text-2xl font-black text-slate-900">$15.000</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Efectivo</p>
          </div>
          <div className="flex h-10 items-center justify-center rounded-b-2xl bg-orange-100">
            <span className="text-xl font-black text-orange-400">3</span>
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-slate-400">
        Cierre de Torneo: Temporada Regular 2026
      </p>
    </section>
  );
}
