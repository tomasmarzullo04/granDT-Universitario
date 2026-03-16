import { useState } from 'react';
import Layout from '../components/Layout';
import { Users, Trophy, ShieldHalf } from 'lucide-react';
import AdminDragDropBuilder from '../components/admin/AdminDragDropBuilder';
import AdminStandings from '../components/admin/AdminStandings';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('armado'); // 'armado' | 'posiciones'

  return (
    <Layout>
      <div className="flex-1 w-full bg-base max-w-7xl mx-auto h-full flex flex-col">
        {/* Navbar Administrador Privada */}
        <div className="bg-white border-b border-neutral/20 px-4 py-3 shadow-sm flex items-center justify-between sticky top-[60px] md:top-0 z-40">
          <div className="flex items-center gap-2">
            <ShieldHalf className="w-6 h-6 text-accent" />
            <span className="font-black text-primary text-xl tracking-tight hidden sm:block">Admin Portal</span>
          </div>

          <div className="flex bg-neutral-light p-1 rounded-xl border border-neutral/20">
            <button
              onClick={() => setActiveTab('armado')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'armado' ? 'bg-primary text-white shadow-md' : 'text-neutral hover:text-primary hover:bg-white/50'
              }`}
            >
              <Users className="w-4 h-4" /> Armado de Equipos
            </button>
            <button
              onClick={() => setActiveTab('posiciones')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'posiciones' ? 'bg-primary text-white shadow-md' : 'text-neutral hover:text-primary hover:bg-white/50'
              }`}
            >
              <Trophy className="w-4 h-4" /> Posiciones
            </button>
          </div>
        </div>

        {/* Contenido Principal Admin */}
        <div className="flex-1 p-4 lg:p-8 w-full max-w-6xl mx-auto">
          {activeTab === 'armado' ? <AdminDragDropBuilder /> : <AdminStandings />}
        </div>
      </div>
    </Layout>
  );
}
