import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlayerLayout from '../components/PlayerLayout';
import { Users, Trophy, CalendarDays, History } from 'lucide-react';
import MiEquipo from '../components/tabs/MiEquipo';
import PlayersTab from '../components/tabs/PlayersTab';
import RankingTab from '../components/tabs/RankingTab';
import ProximasFechas from '../components/ProximasFechas';
import HistorialTab from '../components/tabs/HistorialTab';
import { getActiveFecha } from '../lib/api';

import Navigation from '../components/Navigation';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'equipo';

  return (
    <PlayerLayout>
      <div className="flex flex-col gap-6 relative">
        <Navigation />

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
