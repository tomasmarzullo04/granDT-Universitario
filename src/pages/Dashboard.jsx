import { useState } from 'react';
import PlayerLayout from '../components/PlayerLayout';
import { Users, Trophy, CalendarDays } from 'lucide-react';
import MiEquipo from '../components/tabs/MiEquipo';
import PlayersTab from '../components/tabs/PlayersTab'; // This might be used for ranking or a modified version
import ProximasFechas from '../components/ProximasFechas';

// Dummy ranking for now if PlayersTab isn't ready
const RankingTab = () => (
  <div className="bg-white rounded-3xl border border-neutral/20 shadow-xl p-8 text-center animate-fade-in">
    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 opacity-50" />
    <h3 className="text-2xl font-black text-primary mb-2">Próximamente</h3>
    <p className="text-neutral">El ranking global se habilitará cuando terminen los primeros partidos.</p>
  </div>
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('equipo'); // 'equipo' | 'ranking' | 'fechas'

  const tabs = [
    { id: 'equipo', label: 'Mi Equipo', icon: Users },
    { id: 'jugadores', label: 'Jugadores', icon: Users }, // Changed to JUGADORES
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'fechas', label: 'Fechas', icon: CalendarDays },
  ];

  return (
    <PlayerLayout>
      <div className="flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-neutral/20 shadow-sm sticky top-[80px] z-40 overflow-x-auto no-scrollbar">
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
