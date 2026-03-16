import { useState, useEffect } from 'react';
import { ChevronDown, Loader2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getActiveFecha } from '../lib/api';
import RugbyPitch from './RugbyPitch';

export default function EquiposOficiales() {
  const [activeTab, setActiveTab] = useState('Primera'); // 'Primera', 'Intermedia', 'Pre-intermedia'
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(null);
  const [planteles, setPlanteles] = useState({
    Primera: [],
    Intermedia: [],
    'Pre-intermedia': []
  });

  useEffect(() => {
    async function fetchEquipos() {
      const active = await getActiveFecha();
      setFecha(active);

      if (active) {
        const { data, error } = await supabase
          .from('convocados_fecha')
          .select(`
            categoria,
            posicion_actual,
            jugadores ( id, nombre, foto_url )
          `)
          .eq('fecha_id', active.id);

        if (!error && data) {
          const agrupados = { Primera: [], Intermedia: [], 'Pre-intermedia': [] };
          data.forEach(item => {
            if (agrupados[item.categoria]) {
              // Create a combined object
              agrupados[item.categoria].push({
                ...item.jugadores,
                posicion_actual: parseInt(item.posicion_actual) || 0
              });
            }
          });

          // Sort by posicion_actual to ensure 1 to 15 mapping
          for (let cat in agrupados) {
            agrupados[cat].sort((a, b) => a.posicion_actual - b.posicion_actual);
          }

          setPlanteles(agrupados);
        }
      }
      setLoading(false);
    }

    fetchEquipos();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  if (!fecha) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-neutral/20 shadow-sm">
        <Users className="w-12 h-12 text-neutral mb-4 opacity-50" />
        <h3 className="text-xl font-bold text-primary mb-2">Sin Fecha Activa</h3>
        <p className="text-neutral text-sm">No hay un partido programado para esta semana.</p>
      </div>
    );
  }

  const AccordionItem = ({ title, category }) => {
    const isOpen = activeTab === category;
    const players = planteles[category] || [];
    
    return (
      <div className="border border-neutral/20 rounded-xl overflow-hidden mb-3 bg-white shadow-sm transition-all duration-300">
        <button
          onClick={() => setActiveTab(isOpen ? null : category)}
          className={`w-full flex justify-between items-center p-4 transition-colors ${
            isOpen ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-neutral-light'
          }`}
        >
          <div className="flex flex-col items-start">
            <span className="font-black tracking-wider text-lg uppercase">{title}</span>
            {!isOpen && <span className="text-xs opacity-80 font-medium">{players.length} Convocados</span>}
          </div>
          <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'text-accent'}`} />
        </button>
        
        <div 
          className={`transition-all duration-500 ease-in-out origin-top overflow-hidden ${
            isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-4 bg-neutral-light/30">
            {players.length === 0 ? (
              <div className="text-center p-8 text-neutral">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>El staff aún no ha publicado el equipo.</p>
              </div>
            ) : (
              <div className="animate-fade-in pt-2">
                <RugbyPitch players={players} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-2 mt-2">
      <div className="text-center mb-6">
        <span className="inline-block bg-accent/10 text-accent px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase mb-2 border border-accent/20">
          Oficial
        </span>
        <h1 className="text-3xl font-black text-primary tracking-tighter">Formaciones</h1>
        <p className="text-neutral text-sm mt-1">Convocados vs {fecha.rival}</p>
      </div>

      <AccordionItem title="Los 15 de Primera" category="Primera" />
      <AccordionItem title="Los 15 de Intermedia" category="Intermedia" />
      <AccordionItem title="Los 15 de Pre-Intermedia" category="Pre-intermedia" />
    </div>
  );
}
