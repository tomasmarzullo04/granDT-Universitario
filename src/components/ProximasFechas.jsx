import { useState, useEffect } from 'react';
import { getAllFechas, getLiveStatus, APP_STATUS } from '../lib/api';
import { CalendarDays, MapPin } from 'lucide-react';

export default function ProximasFechas() {
  const [fechas, setFechas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFechas() {
      // Obtenemos todas, la activa y el estado real
      const { activeMatchday, status } = await getLiveStatus();
      const all = await getAllFechas();
      
      const numeroActual = activeMatchday ? activeMatchday.numero_fecha : 0;
      
      // Filtramos: 
      // 1. Incluimos la activa si el mercado está abierto o se están cargando planteles (para que no parezca que falta)
      // 2. Incluimos las futuras
      const proximas = all
        .filter(f => {
          if (activeMatchday && f.id === activeMatchday.id) {
            return status === APP_STATUS.ARMADO_EQUIPO || status === APP_STATUS.ESPERANDO_PLANTELES;
          }
          return f.numero_fecha > numeroActual;
        })
        .sort((a, b) => a.numero_fecha - b.numero_fecha)
        .slice(0, 4); // Tomamos hasta 4 para compensar si incluimos la activa
        
      setFechas(proximas);
      setLoading(false);
    }
    loadFechas();
  }, []);

  if (loading || fechas.length === 0) return null;

  return (
    <div className="w-full bg-white border-b border-neutral/20 shadow-sm relative z-30">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2 uppercase tracking-wide">
          <CalendarDays className="w-4 h-4 text-accent" />
          Próximas Fechas
        </h3>
        
        <div className="flex flex-col gap-2">
          {fechas.map(fecha => {
            const isLibre = fecha.rival && fecha.rival.toUpperCase().includes('LIBRE');
            
            return (
              <div 
                key={fecha.id} 
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  isLibre ? 'bg-neutral-light border-neutral/20' : 'bg-white border-neutral/30 shadow-sm'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs text-neutral font-bold uppercase mb-0.5 tracking-wider">
                    Fecha {fecha.numero_fecha}
                  </span>
                  <span className={`text-sm font-bold ${isLibre ? 'text-neutral italic' : 'text-primary'}`}>
                    {fecha.rival}
                  </span>
                </div>
                {!isLibre && (
                  <div className="flex items-center gap-1 text-xs text-primary font-bold bg-neutral-light px-2 py-1 rounded-md border border-neutral/20">
                    <MapPin className="w-3 h-3 text-accent" />
                    {fecha.rival.toLowerCase().includes('local') ? 'Local' : 'Visitante'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
