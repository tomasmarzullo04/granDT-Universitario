import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import MyTeamTab from '../components/tabs/MyTeamTab';
import RankingTab from '../components/tabs/RankingTab';
import EquiposOficiales from '../components/EquiposOficiales';
import { Users, Trophy, Shield, Calendar, Loader2 } from 'lucide-react';
import { getActiveFecha } from '../lib/api';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('team');
  const [activeFecha, setActiveFecha] = useState(null);
  const [loadingHeader, setLoadingHeader] = useState(true);

  useEffect(() => {
    async function fetchHeader() {
      const fecha = await getActiveFecha();
      setActiveFecha(fecha);
      setLoadingHeader(false);
    }
    fetchHeader();
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'team': return <MyTeamTab activeFechaGlobal={activeFecha} />;
      case 'ranking': return <RankingTab />;
      case 'oficiales': return <EquiposOficiales />;
      default: return <MyTeamTab activeFechaGlobal={activeFecha} />;
    }
  };

  return (
    <Layout>
      {/* Dynamic Header */}
      <div className="bg-white border-b border-neutral/20 px-4 py-3 shadow-sm flex items-center justify-between sticky top-[60px] md:top-0 z-40">
        <div className="flex items-center gap-2 text-primary">
          <Calendar className="w-5 h-5 text-accent" />
          {loadingHeader ? (
             <div className="h-4 w-32 bg-neutral/20 rounded animate-pulse" />
          ) : activeFecha ? (
             <span className="font-bold text-sm sm:text-base truncate">
               Próximo partido: <span className="text-accent">{activeFecha.rival}</span>
             </span>
          ) : (
             <span className="font-bold text-sm text-neutral">Torneo en Receso</span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full bg-base relative">
        {renderTab()}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-primary shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-md mx-auto grid grid-cols-3 items-center">
          <button 
            onClick={() => setActiveTab('team')}
            className={`flex flex-col items-center justify-center p-3 sm:py-4 transition-all duration-300 relative border-t-2 ${activeTab === 'team' ? 'text-white border-accent bg-white/10' : 'text-white/60 border-transparent hover:text-white'}`}
          >
            <Shield className={`w-6 h-6 mb-1 transition-transform ${activeTab === 'team' ? '-translate-y-1' : ''}`} />
            <span className="text-[10px] uppercase font-bold tracking-widest z-10">Equipo</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex flex-col items-center justify-center p-3 sm:py-4 transition-all duration-300 relative border-t-2 ${activeTab === 'ranking' ? 'text-white border-accent bg-white/10' : 'text-white/60 border-transparent hover:text-white'}`}
          >
            <Trophy className={`w-6 h-6 mb-1 transition-transform ${activeTab === 'ranking' ? '-translate-y-1' : ''}`} />
            <span className="text-[10px] uppercase font-bold tracking-widest z-10">Ranking</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('oficiales')}
            className={`flex flex-col items-center justify-center p-3 sm:py-4 transition-all duration-300 relative border-t-2 ${activeTab === 'oficiales' ? 'text-white border-accent bg-white/10' : 'text-white/60 border-transparent hover:text-white'}`}
          >
            <Users className={`w-6 h-6 mb-1 transition-transform ${activeTab === 'oficiales' ? '-translate-y-1' : ''}`} />
            <span className="text-[10px] uppercase font-bold tracking-widest z-10">Oficiales</span>
          </button>
        </div>
      </nav>
    </Layout>
  );
}
