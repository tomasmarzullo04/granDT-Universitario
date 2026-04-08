import { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Users, ClipboardCheck, LayoutDashboard, UserCheck } from 'lucide-react';
import AdminDragDropBuilder from '../components/admin/AdminDragDropBuilder';
import ResultadosAdmin from '../components/admin/ResultadosAdmin';
import AprobacionesAdmin from '../components/admin/AprobacionesAdmin';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('armado'); // 'armado' | 'stats' | 'pagos'

  return (
    <AdminLayout>
      <div className="w-full h-full flex flex-col">
        {/* Sub-nav Local (Tabs) */}
        <div className="relative mb-6">
          {/* Left Gradient Indicator */}
          <div className="md:hidden absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none opacity-50"></div>
          
          <div className="flex bg-white p-1 rounded-2xl border border-neutral/20 shadow-sm w-full md:max-w-xl overflow-x-auto no-scrollbar whitespace-nowrap snap-x snap-mandatory">
            <button
              onClick={() => setActiveTab('armado')}
              className={`flex-1 min-w-[110px] px-4 py-2.5 rounded-xl text-[11px] md:text-sm font-black transition-all flex items-center justify-center gap-2 snap-center ${
                activeTab === 'armado' ? 'bg-primary text-white shadow-lg' : 'text-neutral hover:bg-neutral-light'
              }`}
            >
              <Users className="w-4 h-4" /> Armado
            </button>
            <button
              onClick={() => setActiveTab('pagos')}
              className={`flex-1 min-w-[110px] px-4 py-2.5 rounded-xl text-[11px] md:text-sm font-black transition-all flex items-center justify-center gap-2 snap-center ${
                activeTab === 'pagos' ? 'bg-primary text-white shadow-lg' : 'text-neutral hover:bg-neutral-light'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Inscripciones
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 min-w-[110px] px-4 py-2.5 rounded-xl text-[11px] md:text-sm font-black transition-all flex items-center justify-center gap-2 snap-center ${
                activeTab === 'stats' ? 'bg-primary text-white shadow-lg' : 'text-neutral hover:bg-neutral-light'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" /> Estadísticas
            </button>
          </div>

          {/* Right Gradient Indicator */}
          <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none opacity-50"></div>
        </div>

        {/* Contenido Principal Admin */}
        <div className="bg-white rounded-3xl border border-neutral/20 shadow-xl p-4 md:p-8 animate-fade-in min-h-[600px]">
          {activeTab === 'armado' && <AdminDragDropBuilder />}
          {activeTab === 'stats' && <ResultadosAdmin />}
          {activeTab === 'pagos' && <AprobacionesAdmin />}
        </div>
      </div>
    </AdminLayout>
  );
}
