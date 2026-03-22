import { AlertCircle, Lock } from 'lucide-react';

export default function OverlayCierre({ message = "FECHA CERRADA. Estamos procesando los resultados finales. El mercado para la nueva fecha abrirá cuando el Staff confirme los nuevos convocados." }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/70 backdrop-blur-md rounded-[2rem] animate-fade-in pointer-events-auto">
      <div className="bg-white border-2 border-yellow-200 shadow-2xl rounded-3xl p-8 max-w-lg w-full text-center relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
        <div className="absolute -right-4 -top-4 opacity-10">
          <Lock className="w-32 h-32 text-yellow-500" />
        </div>

        <div className="w-20 h-20 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-sm">
          <Lock className="w-10 h-10 text-yellow-600" />
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-primary mb-4 relative z-10">
          MERCADO CERRADO
        </h2>

        <p className="text-neutral font-bold leading-relaxed mb-8 relative z-10">
          {message}
        </p>

        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex items-center gap-3 text-left border border-yellow-200/50 shadow-inner relative z-10">
          <AlertCircle className="w-5 h-5 shrink-0 text-yellow-600" />
          <p className="text-xs font-medium">
            Tus cambios hasta el Lunes a las 23:59 han sido guardados automáticamente. Podrás ver tu equipo en el <strong>Historial</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
