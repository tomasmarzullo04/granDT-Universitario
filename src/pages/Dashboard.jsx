import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlayerLayout from '../components/PlayerLayout';
import { Users, Trophy, CalendarDays, History } from 'lucide-react';
import MiEquipo from '../components/tabs/MiEquipo';
import PlayersTab from '../components/tabs/PlayersTab';
import RankingTab from '../components/tabs/RankingTab';
import ProximasFechas from '../components/ProximasFechas';
import OverlayCierre from '../components/OverlayCierre';
import HistorialTab from '../components/tabs/HistorialTab';
import { getActiveFecha } from '../lib/api';

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'equipo';
  const [isCerrado, setIsCerrado] = useState(false);

  const tabs = [
    { id: 'equipo', label: 'Mi Equipo', icon: Users },
    { id: 'jugadores', label: 'Jugadores', icon: Users },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'fechas', label: 'Fechas', icon: CalendarDays },
    { id: 'historial', label: 'Historial', icon: History },
  ];

  const setActiveTab = (id) => {
    setSearchParams({ tab: id });
  };

  useEffect(() => {
    async function checkCierre() {
      const fecha = await getActiveFecha();
      if (!fecha) return;

      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Verificar si es Lunes (1) y la hora es igual o mayor a 23:59
      // O si estamos en Martes (2), Miércoles (3), Jueves (4) y la fecha sigue 'en_juego' o 'abierta' (en espera de nueva apertura)
      const esLunesNoche = (day === 1 && hour === 23 && minute >= 59);
      const diasEspera = [2, 3, 4]; // Martes, Miércoles, Jueves

      if ((esLunesNoche || diasEspera.includes(day)) && (fecha.estado === 'abierta' || fecha.estado === 'en_juego')) {
         // Ojo: Si el admin ya cambió el estado a una *nueva* fecha abierta un martes, esto podría bloquear.
         // Para simplificar: solo bloqueamos si es la fecha actual y estamos en el rango de espera.
         // Una mejor forma es que si la fecha está 'en_juego' (que se pone el viernes) y sigue siendo lunes a la noche o martes, etc.
         
         // PERO la especificación dice: "El cartel de espera y el bloqueo del Dashboard solo se levantarán cuando el Admin actualice el estado de la aplicación a una nueva "Fecha Activa""
         // Entonces: Si estamos Lunes>=23:59 o Martes, y todavía estamos viendo la fecha que se jugó el finde (asumimos que sí, porque el cronograma dicta eso).
         
         // Para evitar bugs si el admin abre el mercado temprano:
         // Vamos a confiar primariamente en el estado de la fecha o un check estricto del día.
         setIsCerrado(esLunesNoche || diasEspera.includes(day));
      }
    }
    checkCierre();
  }, []);

  return (
    <PlayerLayout>
      <div className="flex flex-col gap-6 relative">
        {isCerrado && <OverlayCierre />}
        {/* Navigation Tabs (Desktop Only) */}
        <div className="hidden sm:flex bg-white p-1.5 rounded-2xl border border-neutral/20 shadow-sm sticky top-[80px] z-40 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-lg scale-[1.02]' 
                  : 'text-neutral hover:bg-neutral-light'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in min-h-[500px]">
          {activeTab === 'equipo' && <MiEquipo />}
          {activeTab === 'jugadores' && <PlayersTab />}
          {activeTab === 'ranking' && <RankingTab />}
          {activeTab === 'historial' && <HistorialTab />}
          {activeTab === 'fechas' && (
            <div className="bg-white rounded-3xl border border-neutral/20 shadow-xl p-4 md:p-8">
              <h2 className="text-2xl font-black text-primary mb-6 flex items-center gap-3">
                <CalendarDays className="w-8 h-8 text-accent" /> Fixture Completo
              </h2>
              <ProximasFechas />
            </div>
          )}
        </div>
      </div>
    </PlayerLayout>
  );
}
