import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlayerLayout from '../components/PlayerLayout';
import { Users, Trophy, CalendarDays } from 'lucide-react';
import MiEquipo from '../components/tabs/MiEquipo';
import PlayersTab from '../components/tabs/PlayersTab';
import RankingTab from '../components/tabs/RankingTab';
import ProximasFechas from '../components/ProximasFechas';

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'equipo';

  const tabs = [
    { id: 'equipo', label: 'Mi Equipo', icon: Users },
    { id: 'jugadores', label: 'Jugadores', icon: Users },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'fechas', label: 'Fechas', icon: CalendarDays },
  ];

  const setActiveTab = (id) => {
    setSearchParams({ tab: id });
  };

  return (
    <PlayerLayout>
      <div className="flex flex-col gap-6">
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
