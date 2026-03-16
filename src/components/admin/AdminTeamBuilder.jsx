import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getActiveFecha } from '../../lib/api';
import { Users, Save, Loader2, AlertCircle, Search, CheckCircle2 } from 'lucide-react';

export default function AdminTeamBuilder({ onBack }) {
  const [activeFecha, setActiveFecha] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // States para cada plantel
  const [planteles, setPlanteles] = useState({
    primera: [],
    intermedia: [],
    pre: []
  });

  const [activeCategory, setActiveCategory] = useState('primera');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      // Fetch active fecha
      const fecha = await getActiveFecha();
      setActiveFecha(fecha);

      // Fetch todos los jugadores
      const { data: players, error: playersErr } = await supabase.from('jugadores').select('*').order('nombre');
      if (playersErr) {
        setError('Error al cargar jugadores');
        setLoading(false);
        return;
      }
      
      // Filtrar duplicados temporalmente si existieran
      const uniquePlayers = Array.from(new Set(players.map(p => p.nombre)))
          .map(name => players.find(p => p.nombre === name));
          
      setJugadores(uniquePlayers);

      // Si hay fecha, vemos si ya hay convocados
      if (fecha) {
        const { data: convocados } = await supabase
          .from('convocados_fecha')
          .select('*')
          .eq('fecha_id', fecha.id);
          
        if (convocados && convocados.length > 0) {
          setPlanteles({
            primera: convocados.filter(c => c.categoria === 'Primera').map(c => c.jugador_id),
            intermedia: convocados.filter(c => c.categoria === 'Intermedia').map(c => c.jugador_id),
            pre: convocados.filter(c => c.categoria === 'Pre-intermedia').map(c => c.jugador_id),
          });
        }
      }
      
      setLoading(false);
    }
    loadData();
  }, []);

  const togglePlayer = (playerId) => {
    setPlanteles(prev => {
      const currentList = prev[activeCategory];
      const categoryNameLabel = activeCategory === 'pre' ? 'Pre-intermedia' : activeCategory;
      
      // Check if already in this category
      if (currentList.includes(playerId)) {
        return { ...prev, [activeCategory]: currentList.filter(id => id !== playerId) };
      }
      
      // Check if already in another category
      const inPrimera = prev.primera.includes(playerId);
      const inInter = prev.intermedia.includes(playerId);
      const inPre = prev.pre.includes(playerId);
      
      if (inPrimera || inInter || inPre) {
        setError('Este jugador ya está convocado en otro plantel.');
        setTimeout(() => setError(null), 3000);
        return prev;
      }

      // Check limit
      if (currentList.length >= 15) {
        setError(`El plantel de ${categoryNameLabel} ya tiene 15 jugadores.`);
        setTimeout(() => setError(null), 3000);
        return prev;
      }

      return { ...prev, [activeCategory]: [...currentList, playerId] };
    });
  };

  const mapCategoryName = (key) => {
    if (key === 'primera') return 'Primera';
    if (key === 'intermedia') return 'Intermedia';
    return 'Pre-intermedia';
  };

  const handleSave = async () => {
    if (!activeFecha) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Limpiar convocados anteriores
      await supabase.from('convocados_fecha').delete().eq('fecha_id', activeFecha.id);

      // Preparar inserts para cada categoría
      const buildInserts = (plantelArray, catName) => {
        return plantelArray.map((jugadorId, index) => ({
          fecha_id: activeFecha.id,
          jugador_id: jugadorId,
          categoria: catName,
          posicion_actual: (index + 1).toString() // Posiciones genéricas 1 a 15
        }));
      };

      const inserts = [
        ...buildInserts(planteles.primera, 'Primera'),
        ...buildInserts(planteles.intermedia, 'Intermedia'),
        ...buildInserts(planteles.pre, 'Pre-intermedia')
      ];

      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from('convocados_fecha').insert(inserts);
        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Hubo un error al guardar los planteles.');
    } finally {
      setSaving(false);
    }
  };

  const filteredJugadores = jugadores.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  if (!activeFecha) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-neutral/20 shadow-sm mt-4">
        <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
        <h2 className="text-xl font-bold text-primary mb-2">No hay fecha abierta</h2>
        <p className="text-neutral mb-6">Debes abrir una fecha desde el tablero principal antes de gestionar convocados.</p>
        <button onClick={onBack} className="bg-neutral-light text-primary px-6 py-2 rounded-xl font-bold">Volver</button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral/20 rounded-2xl shadow-sm overflow-hidden mt-2">
      <div className="bg-primary p-4 text-white flex justify-between items-center">
        <div>
          <h2 className="font-black text-xl flex items-center gap-2">
            <Users className="w-5 h-5" />
            Armar Planteles: {activeFecha.rival}
          </h2>
          <p className="text-sm opacity-90 font-medium">Selecciona los 15 de cada categoría</p>
        </div>
        <button onClick={onBack} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-bold">
          Volver
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 flex items-center gap-2 border-b border-red-100 text-sm font-bold">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-3 flex items-center gap-2 border-b border-green-100 text-sm font-bold">
          <CheckCircle2 className="w-4 h-4" /> ¡Planteles guardados y publicados con éxito!
        </div>
      )}

      {/* Selector de Categoría */}
      <div className="flex border-b border-neutral/20">
        {['primera', 'intermedia', 'pre'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider relative transition-colors ${
              activeCategory === cat ? 'text-primary bg-primary/5' : 'text-neutral hover:bg-neutral-light'
            }`}
          >
            {mapCategoryName(cat)}
            <span className="block text-xs mt-0.5 opacity-80 font-medium">({planteles[cat].length}/15)</span>
            {activeCategory === cat && <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent"></div>}
          </button>
        ))}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
        {/* Jugadores Disponibles (Izquierda) */}
        <div className="flex flex-col border border-neutral/20 rounded-xl overflow-hidden bg-neutral-light/30">
          <div className="p-3 bg-white border-b border-neutral/20 relative">
            <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-neutral" />
            <input 
              type="text" 
              placeholder="Buscar jugador..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-light border border-neutral/30 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredJugadores.map(jugador => {
              const isSelectedHere = planteles[activeCategory].includes(jugador.id);
              const inPrimera = planteles.primera.includes(jugador.id);
              const inInter = planteles.intermedia.includes(jugador.id);
              const inPre = planteles.pre.includes(jugador.id);
              const inOther = (inPrimera || inInter || inPre) && !isSelectedHere;

              return (
                <button
                  key={jugador.id}
                  onClick={() => togglePlayer(jugador.id)}
                  disabled={inOther}
                  className={`w-full text-left p-2.5 rounded-lg flex justify-between items-center transition-all ${
                    isSelectedHere ? 'bg-accent/10 border border-accent/30 text-primary' : 
                    inOther ? 'opacity-40 grayscale cursor-not-allowed hidden' : 
                    'hover:bg-white bg-white/50 border border-transparent hover:border-neutral/20'
                  }`}
                >
                  <span className={`font-bold text-sm ${isSelectedHere ? 'text-primary' : 'text-neutral-dark'}`}>{jugador.nombre}</span>
                  {isSelectedHere && <CheckCircle2 className="w-4 h-4 text-accent" />}
                  {inOther && <span className="text-[10px] uppercase font-bold text-neutral px-2 py-0.5 bg-neutral-light rounded">En {inPrimera ? 'Primera' : inInter ? 'Inter' : 'Pre'}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seleccionados (Derecha) */}
        <div className="flex flex-col border border-neutral/20 rounded-xl overflow-hidden bg-white">
          <div className="p-3 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
            <h3 className="font-bold text-primary">Convocados: {mapCategoryName(activeCategory)}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {planteles[activeCategory].length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral text-sm opacity-60">
                <Users className="w-8 h-8 mb-2" />
                <p>No hay jugadores seleccionados</p>
              </div>
            ) : (
              <div className="space-y-1">
                {planteles[activeCategory].map((id, index) => {
                  const p = jugadores.find(j => j.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 p-2 bg-neutral-light/50 rounded-lg text-sm border border-neutral/10">
                      <span className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center font-black text-xs shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-bold text-primary flex-1">{p.nombre}</span>
                      <button 
                        onClick={() => togglePlayer(id)}
                        className="text-neutral hover:text-red-500 font-bold px-2 py-1 text-xs transition-colors"
                      >
                       Quitar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-3 bg-white border-t border-neutral/20">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar y Publicar {mapCategoryName(activeCategory)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
