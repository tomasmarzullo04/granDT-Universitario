import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getActiveFecha } from '../../lib/api';
import { Save, Loader2, AlertCircle, Search, Users, CheckCircle } from 'lucide-react';

import { PITCH_POSITIONS } from '../../constants/pitchPositions';

export default function AdminDragDropBuilder() {
  const [activeFecha, setActiveFecha] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  const [activeCategory, setActiveCategory] = useState('Primera'); // 'Primera', 'Intermedia', 'Pre-intermedia'
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [activePlayerMenu, setActivePlayerMenu] = useState(null);

  const [planteles, setPlanteles] = useState({
    Primera: Array(15).fill(null),
    Intermedia: Array(15).fill(null),
    'Pre-intermedia': Array(15).fill(null)
  });

  useEffect(() => {
    async function loadData() {
      const fecha = await getActiveFecha();
      setActiveFecha(fecha);

      const { data: players, error: playersErr } = await supabase.from('jugadores').select('*').order('nombre');
      if (!playersErr && players) {
        // Unique players just in case
        const uniquePlayers = Array.from(new Set(players.map(p => p.nombre)))
          .map(name => players.find(p => p.nombre === name));
        setJugadores(uniquePlayers);
      }

      if (fecha) {
        const { data: convocados } = await supabase
          .from('convocados_fecha')
          .select(`jugador_id, categoria, posicion_actual, jugadores (*)`)
          .eq('fecha_id', fecha.id);
          
        if (convocados && convocados.length > 0) {
          const newPlanteles = {
            Primera: Array(15).fill(null),
            Intermedia: Array(15).fill(null),
            'Pre-intermedia': Array(15).fill(null)
          };

          convocados.forEach(c => {
             let idx = PITCH_POSITIONS.findIndex(p => p.label === c.posicion_actual);
             if (idx === -1) {
                 idx = parseInt(c.posicion_actual) - 1;
             }
             if (idx >= 0 && idx < 15 && newPlanteles[c.categoria]) {
                // Safeguard: handle potential array result from join
                const playerInfo = Array.isArray(c.jugadores) ? c.jugadores[0] : c.jugadores;
                newPlanteles[c.categoria][idx] = playerInfo;
             }
          });
          setPlanteles(newPlanteles);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleDragStart = (e, playerId) => {
    e.dataTransfer.setData('playerId', playerId);
    e.currentTarget.classList.add('opacity-50');
    setIsDragging(true);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50');
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('scale-125', 'border-yellow-400', 'border-solid', 'bg-yellow-400/20', 'z-50');
    e.currentTarget.classList.remove('border-dashed', 'border-white/20');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('scale-125', 'border-yellow-400', 'border-solid', 'bg-yellow-400/20', 'z-50');
    e.currentTarget.classList.add('border-dashed', 'border-white/20');
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    e.currentTarget.classList.remove('scale-125', 'border-yellow-400', 'border-solid', 'bg-yellow-400/20', 'z-50');
    e.currentTarget.classList.add('border-dashed', 'border-white/20');
    
    const playerId = e.dataTransfer.getData('playerId');
    if (!playerId) return;

    const player = jugadores.find(j => j.id === playerId);
    if (!player) return;

    setPlanteles(prev => {
      const newPlanteles = { 
        Primera: [...prev.Primera], 
        Intermedia: [...prev.Intermedia], 
        'Pre-intermedia': [...prev['Pre-intermedia']] 
      };
      
      const existingPlayerInTarget = newPlanteles[activeCategory][targetIndex];
      
      // Remove dropped player from everywhere
      let sourceCat = null;
      let sourceIdx = null;
      
      ['Primera', 'Intermedia', 'Pre-intermedia'].forEach(cat => {
        const idx = newPlanteles[cat].findIndex(p => p && p.id === playerId);
        if(idx !== -1) {
           sourceCat = cat;
           sourceIdx = idx;
           newPlanteles[cat][idx] = null;
        }
      });

      // Put him in target
      newPlanteles[activeCategory][targetIndex] = player;

      // If there was someone in target, and the dropped player came from the SAME category, swap them.
      // Otherwise just drop the existing player (goes to pool)
      if (existingPlayerInTarget && sourceCat === activeCategory && sourceIdx !== null) {
          newPlanteles[activeCategory][sourceIdx] = existingPlayerInTarget;
      }

      return newPlanteles;
    });
  };

  // ── Mobile Drawer Stats ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerSlot, setDrawerSlot] = useState(null);
  const [drawerSearch, setDrawerSearch] = useState('');

  const handleSlotClick = (index) => {
    // Si estamos en mobile (detectado por media query o simplemente habilitamos el drawer para pantallas pequeñas)
    if (window.innerWidth < 768) {
      setDrawerSlot(index);
      setIsDrawerOpen(true);
      setDrawerSearch('');
      return;
    }
    
    // Lógica desktop original
    if (activePlayerMenu) {
      assignToSlot(activePlayerMenu, index);
      setActivePlayerMenu(null);
      setSelectedPosition(null);
      return;
    }

    if (planteles[activeCategory][index]) {
      removeFromPitch({ stopPropagation: () => {} }, activeCategory, index);
    } else {
      setSelectedPosition(selectedPosition === index ? null : index);
      setActivePlayerMenu(null);
    }
  };

  const handleDrawerSelect = (player) => {
    assignToSlot(player, drawerSlot);
    setIsDrawerOpen(false);
    setDrawerSlot(null);
  };

  const handlePlayerClick = (player, isUsed) => {
    if (isUsed) return;
    
    // Si ya hay un slot en la cancha seleccionado (Selección Cruzada: Puesto -> Jugador)
    if (selectedPosition !== null) {
      assignToSlot(player, selectedPosition);
      setSelectedPosition(null);
      setActivePlayerMenu(null);
      return;
    }

    // De lo contrario, abrir el menú rápido / resaltar el jugador
    setActivePlayerMenu(activePlayerMenu?.id === player.id ? null : player);
  };

  const assignToSlot = (player, targetIndex) => {
    setPlanteles(prev => {
      const newPlanteles = { 
        Primera: [...prev.Primera], 
        Intermedia: [...prev.Intermedia], 
        'Pre-intermedia': [...prev['Pre-intermedia']] 
      };
      
      const existingPlayerInTarget = newPlanteles[activeCategory][targetIndex];
      
      // Remove player from everywhere he might be
      let sourceCat = null;
      let sourceIdx = null;
      ['Primera', 'Intermedia', 'Pre-intermedia'].forEach(cat => {
        const idx = newPlanteles[cat].findIndex(p => p && p.id === player.id);
        if(idx !== -1) {
           sourceCat = cat;
           sourceIdx = idx;
           newPlanteles[cat][idx] = null;
        }
      });

      // Put him in target
      newPlanteles[activeCategory][targetIndex] = player;

      // Swap if necessary
      if (existingPlayerInTarget && sourceCat === activeCategory && sourceIdx !== null) {
          newPlanteles[activeCategory][sourceIdx] = existingPlayerInTarget;
      }

      return newPlanteles;
    });
    setActivePlayerMenu(null);
  };

  const removeFromPitch = (e, catOrig, idxOrig) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setPlanteles(prev => {
      const next = { Primera: [...prev.Primera], Intermedia: [...prev.Intermedia], 'Pre-intermedia': [...prev['Pre-intermedia']] };
      next[catOrig][idxOrig] = null;
      return next;
    });
  };

  const handleSave = async () => {
    if (!activeFecha) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const categoriesToClear = ['Primera', 'Intermedia', 'Pre-intermedia'];
      const { error: deleteError } = await supabase.from('convocados_fecha')
        .delete()
        .eq('fecha_id', activeFecha.id)
        .in('categoria', categoriesToClear);

      if (deleteError) throw deleteError;

      const allInserts = [];
      categoriesToClear.forEach(cat => {
        planteles[cat].forEach((player, index) => {
          if (player) {
            allInserts.push({
              fecha_id: activeFecha.id,
              jugador_id: player.id,
              categoria: cat,
              posicion_actual: PITCH_POSITIONS[index].label
            });
          }
        });
      });

      if (allInserts.length > 0) {
        const { error: insertError } = await supabase.from('convocados_fecha').insert(allInserts);
        if (insertError) throw insertError;
      }

      setSuccess(`¡Todos los planteles guardados y publicados con éxito!`);
      setTimeout(() => setSuccess(false), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saving planteles:', err);
      setError(`Error al guardar: ${err.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  const getPlayerStatus = (pId) => {
    for (let cat of ['Primera', 'Intermedia', 'Pre-intermedia']) {
       if (planteles[cat].some(p => p && p.id === pId)) return cat;
    }
    return null;
  };

  const filteredJugadores = jugadores.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

  const countComplete = planteles[activeCategory].filter(Boolean).length;

  const filteredForDrawer = jugadores
    .filter(p => p.nombre.toLowerCase().includes(drawerSearch.toLowerCase()))
const POSITION_MAP = {
    1: 'P1', 2: 'H', 3: 'P3', // Primera línea
    4: 'S4', 5: 'S5',          // Segunda línea
    6: 'T6', 7: 'T7', 8: 'O8', // Tercera línea (O8 = Octavo, T6/T7 = Alas)
    9: 'M9', 10: 'A10',        // Half / Apertura
    11: 'W11', 12: 'C12', 13: 'C13', 14: 'W14', // Backs
    15: 'F15'                  // Fullback
  };

  const getSlotLabel = (num) => POSITION_MAP[num] || num;

  return (
    <div className="w-full h-full flex flex-col pt-2 animate-fade-in relative z-10 px-0 sm:px-4 pb-20">
      
      {/* ── FAB Guardar (Mobile) ── */}
      <div className="md:hidden fixed bottom-24 right-4 flex flex-col items-end gap-3 z-[60]">
        <div className="bg-primary text-white px-4 py-2 rounded-2xl shadow-xl border-2 border-white flex items-center gap-2 animate-bounce-subtle">
           <span className="text-[10px] font-black uppercase">Listos</span>
           <span className="text-lg font-black">{countComplete}/15</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-16 h-16 bg-accent text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-95 transition-transform"
        >
          {saving ? <Loader2 className="w-7 h-7 animate-spin" /> : <Save className="w-7 h-7" />}
        </button>
      </div>

      {/* Header & Main Save (Desktop) */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral/20 pb-4">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-primary flex items-center gap-2">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-accent" /> Armado de Equipos
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-neutral uppercase tracking-widest mt-1">
              Matchday vs {activeFecha.rival}
            </p>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
             <div className="bg-neutral-light px-4 py-2 rounded-xl flex items-center gap-2 mr-2">
                <span className="text-xs font-black text-neutral/60 uppercase">Completitud:</span>
                <span className="text-lg font-black text-primary">{countComplete}/15</span>
             </div>
             <button
                onClick={handleSave}
                disabled={saving}
                className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-2xl font-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 group"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                Guardar Selección
              </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-100 text-red-600 p-3 rounded-xl flex items-center gap-3 shadow-sm animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-2 border-green-100 text-green-700 p-3 rounded-xl flex items-center gap-3 shadow-sm animate-fade-in">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-bold">{success}</p>
          </div>
        )}

        {/* Category Selector Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-light rounded-xl border border-neutral/20 overflow-x-auto no-scrollbar w-full md:max-w-fit snap-x">
          {['Primera', 'Intermedia', 'Pre-intermedia'].map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedPosition(null); setActiveCategory(cat); }}
              className={`flex-1 min-w-[120px] md:min-w-[140px] px-4 py-2.5 md:py-3 text-[10px] md:text-sm font-black tracking-wider rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-2 snap-center ${
                activeCategory === cat ? 'bg-primary text-white shadow-md' : 'text-neutral hover:bg-white/50'
              }`}
            >
              {cat === 'Pre-intermedia' ? 'Pre' : cat} 
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${planteles[cat].filter(Boolean).length === 15 ? 'bg-green-500 text-white' : 'bg-neutral/20 text-neutral-dark'}`}>
                {planteles[cat].filter(Boolean).length}/15
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-8 lg:h-[750px]">
        {/* ── PITCH AREA (Izquierda) ── */}
        <div className="flex-1 bg-emerald-600 border border-emerald-500/30 p-2 md:p-6 rounded-[40px] shadow-2xl flex flex-col relative overflow-hidden h-[550px] md:h-[650px] lg:h-full">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-10 pointer-events-none"></div>
           
           {/* Marcación del campo */}
           <div className="absolute inset-0 flex flex-col justify-between py-12 pointer-events-none opacity-40">
              <div className="w-full h-[2px] bg-white/20" />
              <div className="w-full h-[2px] bg-white/40" />
              <div className="w-full h-[2px] bg-white/20" />
              <div className="w-full h-[2px] bg-white/40" />
              <div className="w-full h-[2px] bg-white/20" />
           </div>
           <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] bg-white/40 pointer-events-none" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full pointer-events-none" />

           {/* Grid de Posiciones */}
           <div className="relative z-10 h-full flex flex-col justify-around py-4">
              {/* Primera Línea: 1, 2, 3 */}
              <div className="flex justify-center gap-6 md:gap-12">
                 {[1, 2, 3].map(idx => (
                    <PitchSlot 
                      key={idx} 
                      num={idx} 
                      label={POSITION_MAP[idx]}
                      player={planteles[activeCategory][idx-1]}
                      isSelected={selectedPosition === (idx-1)}
                      onSlotClick={() => handleSlotClick(idx-1)}
                      onRemove={(e) => removeFromPitch(e, activeCategory, idx-1)}
                      onDrop={(e) => handleDrop(e, idx-1)}
                    />
                 ))}
              </div>
              {/* Segundas: 4, 5 */}
              <div className="flex justify-center gap-12 md:gap-24">
                 {[4, 5].map(idx => (
                    <PitchSlot 
                      key={idx} 
                      num={idx} 
                      label={POSITION_MAP[idx]}
                      player={planteles[activeCategory][idx-1]}
                      isSelected={selectedPosition === (idx-1)}
                      onSlotClick={() => handleSlotClick(idx-1)}
                      onRemove={(e) => removeFromPitch(e, activeCategory, idx-1)}
                      onDrop={(e) => handleDrop(e, idx-1)}
                    />
                 ))}
              </div>
              {/* Terceras: 6, 8, 7 */}
              <div className="flex justify-center gap-6 md:gap-12">
                 {[6, 8, 7].map(idx => (
                    <PitchSlot 
                      key={idx} 
                      num={idx} 
                      label={POSITION_MAP[idx]}
                      player={planteles[activeCategory][idx-1]}
                      isSelected={selectedPosition === (idx-1)}
                      onSlotClick={() => handleSlotClick(idx-1)}
                      onRemove={(e) => removeFromPitch(e, activeCategory, idx-1)}
                      onDrop={(e) => handleDrop(e, idx-1)}
                    />
                 ))}
              </div>
              {/* Half & Apertura: 9, 10 */}
              <div className="flex justify-center gap-12 md:gap-24">
                 {[9, 10].map(idx => (
                    <PitchSlot 
                      key={idx} 
                      num={idx} 
                      label={POSITION_MAP[idx]}
                      player={planteles[activeCategory][idx-1]}
                      isSelected={selectedPosition === (idx-1)}
                      onSlotClick={() => handleSlotClick(idx-1)}
                      onRemove={(e) => removeFromPitch(e, activeCategory, idx-1)}
                      onDrop={(e) => handleDrop(e, idx-1)}
                    />
                 ))}
              </div>
              {/* Backs: 11, 12, 13, 14, 15 */}
              <div className="flex flex-col gap-6 items-center">
                 <div className="flex justify-center gap-6 md:gap-12">
                    {[11, 12, 13, 14].map(idx => (
                       <PitchSlot 
                         key={idx} 
                         num={idx} 
                         label={POSITION_MAP[idx]}
                         player={planteles[activeCategory][idx-1]}
                         isSelected={selectedPosition === (idx-1)}
                         onSlotClick={() => handleSlotClick(idx-1)}
                         onRemove={(e) => removeFromPitch(e, activeCategory, idx-1)}
                         onDrop={(e) => handleDrop(e, idx-1)}
                       />
                    ))}
                 </div>
                 <PitchSlot 
                   num={15} 
                   label={POSITION_MAP[15]}
                   player={planteles[activeCategory][14]}
                   isSelected={selectedPosition === 14}
                   onSlotClick={() => handleSlotClick(14)}
                   onRemove={(e) => removeFromPitch(e, activeCategory, 14)}
                   onDrop={(e) => handleDrop(e, 14)}
                 />
              </div>
           </div>
        </div>

        {/* ── LISTA DE JUGADORES (Derecha - Desktop) ── */}
        <div className="hidden xl:flex xl:w-[400px] flex-col bg-white border border-neutral/20 rounded-3xl shadow-xl overflow-hidden">
           <div className="p-5 border-b border-neutral/20 bg-neutral-light/30">
              <h3 className="font-black text-primary text-lg flex items-center gap-2 mb-4">
                 <Users className="w-5 h-5" /> Atletas {activeCategory}
              </h3>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral" />
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-neutral/30 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredJugadores.map(player => {
                 const status = getPlayerStatus(player.id);
                 const isUsed = !!status;
                 const isSelected = selectedPosition !== null;
                 return (
                   <div
                     key={player.id}
                     draggable={!isUsed}
                     onDragStart={(e) => handleDragStart(e, player.id)}
                     onDragEnd={handleDragEnd}
                     onClick={() => !isUsed && handlePlayerClick(player)}
                     className={`p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${
                       isUsed 
                         ? 'opacity-40 grayscale border-neutral/10 bg-neutral-light/50 cursor-not-allowed' 
                         : isSelected
                           ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 cursor-pointer shadow-md'
                           : 'bg-white border-neutral/10 hover:border-primary/30 hover:scale-[1.02] cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg'
                     }`}
                   >
                     <div className="flex-1">
                        <p className="font-black text-sm text-primary">{player.nombre}</p>
                        <p className="text-[10px] font-bold text-neutral uppercase opacity-60">{player.categoria}</p>
                     </div>
                     {status && <span className="bg-primary/10 text-primary font-black text-[9px] px-2 py-1 rounded-full uppercase">{status.split('-')[0]}</span>}
                   </div>
                 );
              })}
           </div>
        </div>
      </div>

      {/* ── MOBILE SELECTION DRAWER (Bottom Sheet) ── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end animate-fade-in md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative bg-white rounded-t-[32px] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] max-h-[85vh] flex flex-col animate-slide-up">
            <div className="w-12 h-1.5 bg-neutral/20 rounded-full mx-auto my-4"></div>
            <div className="px-6 pb-6 space-y-4 flex flex-col flex-1 min-h-0">
               <div className="flex items-center justify-between">
                  <h3 className="font-black text-primary text-xl">Elegir: <span className="text-accent">{POSITION_MAP[drawerSlot + 1]}</span></h3>
                  <button onClick={() => setIsDrawerOpen(false)} className="bg-neutral-light p-2 rounded-full"><X className="w-5 h-5 text-neutral" /></button>
               </div>
               <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral" />
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Buscar jugador..."
                    value={drawerSearch}
                    onChange={e => setDrawerSearch(e.target.value)}
                    className="w-full bg-neutral-light border-2 border-neutral/10 rounded-2xl py-4 pl-12 pr-4 font-bold text-primary focus:border-primary/30 outline-none"
                  />
               </div>
               <div className="flex-1 overflow-y-auto space-y-3 pb-6 no-scrollbar">
                  {filteredForDrawer.map(player => {
                    const status = getPlayerStatus(player.id);
                    const isUsed = !!status;
                    return (
                      <button
                        key={player.id}
                        disabled={isUsed}
                        onClick={() => handleDrawerSelect(player)}
                        className={`w-full p-4 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${
                          isUsed ? 'opacity-40 bg-neutral-light' : 'bg-white border-neutral/10 active:scale-95'
                        }`}
                      >
                        <div>
                           <p className="font-black text-primary text-sm">{player.nombre}</p>
                           <p className="text-[10px] font-bold text-neutral uppercase opacity-60">{player.categoria}</p>
                        </div>
                        {isUsed && <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full uppercase">{status.split('-')[0]}</span>}
                      </button>
                    );
                  })}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

