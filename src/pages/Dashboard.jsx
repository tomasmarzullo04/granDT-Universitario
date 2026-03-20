import { useState } from 'react';
import PlayerLayout from '../components/PlayerLayout';
import { Users, Trophy, CalendarDays } from 'lucide-react';
import MiEquipo from '../components/tabs/MiEquipo';
import PlayersTab from '../components/tabs/PlayersTab';
import RankingTab from '../components/tabs/RankingTab';
import ProximasFechas from '../components/ProximasFechas';

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

        {/* Bottom Tab Bar (Mobile Only - User First Concept) */}
        <div className="sm:hidden fixed bottom-1 left-4 right-4 bg-white/95 backdrop-blur-md border border-neutral/10 rounded-3xl z-50 flex justify-around items-center px-4 py-2 shadow-2xl safe-area-bottom">
           {tabs.map(tab => {
             const Icon = tab.icon;
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                 className={`flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-primary' : 'text-neutral/40'}`}
               >
                 <Icon className={`w-5 h-5 ${isActive ? 'stroke-[3px] scale-110' : 'stroke-[2px]'}`} />
                 <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {tab.label === 'Mi Equipo' ? 'Equipo' : tab.label}
                 </span>
                 {isActive && <div className="w-1.5 h-1.5 bg-accent rounded-full -mb-1 mt-0.5"></div>}
               </button>
             );
           })}
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
