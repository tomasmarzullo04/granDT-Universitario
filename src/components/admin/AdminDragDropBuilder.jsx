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

  const filteredForDrawer = jugadores
    .filter(p => p.nombre.toLowerCase().includes(drawerSearch.toLowerCase()))
    .sort((a, b) => {
       const isUsedA = !!getPlayerStatus(a.id);
       const isUsedB = !!getPlayerStatus(b.id);
       if (isUsedA && !isUsedB) return 1;
       if (!isUsedA && isUsedB) return -1;
       return 0;
    });

  const countComplete = planteles[activeCategory].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="font-bold text-neutral animate-pulse">Cargando planteles...</p>
      </div>
    );
  }

  if (!activeFecha) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-neutral/20 shadow-sm mt-4">
        <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
        <h2 className="text-xl font-bold text-primary mb-2">No hay fecha abierta</h2>
        <p className="text-neutral mb-6">Debes abrir una fecha primero para poder gestionar sus convocados.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col pt-2 animate-fade-in relative z-10 px-0 sm:px-4 pb-20">
      
      {/* ── FAB Guardar (Mobile) ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-2xl z-[60] flex items-center justify-center animate-bounce-subtle border-4 border-white active:scale-95 transition-transform"
      >
        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
      </button>

      {/* ── Badge Completitud Flotante (Mobile) ── */}
      <div className="md:hidden fixed bottom-24 left-6 px-4 py-2 bg-primary text-white rounded-full shadow-2xl z-[60] font-black text-xs border-2 border-white flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-accent" />
        {countComplete}/15
      </div>

      {/* Header & Main Save */}
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
             {saving && <span className="text-xs font-bold text-primary animate-pulse">Guardando cambios...</span>}
             <button
                onClick={handleSave}
                disabled={saving}
                className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-2xl font-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed group"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                Guardar Convocados
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
        <div className="flex gap-1 p-1 bg-neutral-light rounded-xl border border-neutral/20 overflow-x-auto no-scrollbar w-full md:max-w-fit">
          {['Primera', 'Intermedia', 'Pre-intermedia'].map(cat => {
            const count = planteles[cat].filter(Boolean).length;
            const isFull = count === 15;
            return (
              <button
                key={cat}
                onClick={() => { setSelectedPosition(null); setActiveCategory(cat); }}
                className={`flex-1 min-w-[100px] md:min-w-[140px] px-3 md:px-6 py-2 md:py-3 text-[10px] md:text-sm font-black tracking-wider rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeCategory === cat ? 'bg-primary text-white shadow-md' : 'text-neutral hover:bg-white/50'
                }`}
              >
                {cat === 'Pre-intermedia' ? 'Pre' : cat} 
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isFull ? 'bg-green-500 text-white' : 'bg-neutral/20 text-neutral-dark'}`}>
                  {count}/15
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-8 lg:h-[750px]">
        {/* ── PITCH AREA (Izquierda) ── */}
        <div className="flex-1 bg-white border border-neutral/20 p-2 md:p-6 rounded-3xl shadow-xl flex flex-col relative overflow-hidden h-[550px] md:h-[600px] lg:h-full">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-10 pointer-events-none"></div>
          
          <div className="text-center mb-4 md:mb-6 relative z-10 flex items-center justify-center gap-3 px-4">
             <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-neutral/20"></div>
             <h2 className="font-black text-lg md:text-2xl text-primary tracking-tight">{activeCategory.toUpperCase()}</h2>
             <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-neutral/20"></div>
          </div>

          <div 
            className="flex-1 relative w-full h-full max-w-lg mx-auto rounded-3xl border-[4px] md:border-[6px] border-neutral-light/50 overflow-hidden shadow-2xl transition-colors duration-500"
            style={{ backgroundColor: '#1B4D3E', aspectRatio: '2/3.2' }} /* Verde Bosque Rugbier */
          >
            {/* Field Detail Lines */}
            <div className="absolute inset-x-0 top-0 h-[10%] bg-white/5 border-b border-white/20"></div> 
            <div className="absolute inset-x-0 bottom-0 h-[10%] bg-white/5 border-t border-white/20"></div> 
            <div className="absolute inset-x-0 top-1/2 -mt-[1px] border-t-[2px] md:border-t-[3px] border-white/30"></div> 
            <div className="absolute inset-x-0 top-[22%] border-t-[1px] md:border-t-[2px] border-white/25"></div> 
            <div className="absolute inset-x-0 top-[35%] border-t-[1px] md:border-t-[2px] border-dashed border-white/15"></div> 
            <div className="absolute inset-x-0 top-[65%] border-t-[1px] md:border-t-[2px] border-dashed border-white/15"></div> 
            <div className="absolute inset-x-0 top-[78%] border-t-[1px] md:border-t-[2px] border-white/25"></div> 

            {/* Position Circles */}
            {PITCH_POSITIONS.map((pos, i) => {
              const player = planteles[activeCategory][i];
              const isSelected = selectedPosition === i;
              
              return (
                <div
                  key={i}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[40px] h-[40px] md:w-[58px] md:h-[58px] transition-all duration-300 ${
                     isSelected && !player ? 'scale-125' : ''
                  }`}
                  style={{ top: pos.top, left: pos.left }}
                  onClick={() => handleSlotClick(i)}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('scale-110'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnter={(e) => e.preventDefault()}
                >
                  {player ? (
                    <div className="flex flex-col items-center">
                      <div 
                        draggable
                        onDragStart={(e) => handleDragStart(e, player.id)}
                        onDragEnd={handleDragEnd}
                        className="w-8 h-8 md:w-12 md:h-12 bg-accent border-2 md:border-[3px] border-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl relative group animate-pop-in"
                      >
                        <span className="text-[10px] md:text-xs font-black text-white">{i + 1}</span>
                        
                        <button 
                          onClick={(e) => removeFromPitch(e, activeCategory, i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 md:w-6 md:h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20 border-2 border-white"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div 
                        className="mt-1 text-white font-black uppercase text-center"
                        style={{ 
                          fontSize: '8px',
                          lineHeight: '1',
                          maxWidth: '70px',
                          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                          wordBreak: 'break-word'
                        }}
                      >
                         {player.nombre.split(' ')[0]}
                      </div>
                    </div>
                  ) : (
                    <div className={`w-full h-full rounded-full flex flex-col items-center justify-center p-1 backdrop-blur-[1px] transition-all border-2 border-dashed ${
                        isSelected 
                        ? 'bg-yellow-400/30 border-yellow-400 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                        : (isDragging || activePlayerMenu)
                          ? 'bg-accent/20 border-accent/50 animate-pulse-subtle border-solid'
                          : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
                    }`}>
                      <div className={`font-black text-xs md:text-lg leading-none ${isSelected ? 'text-yellow-400' : 'text-white/40'}`}>
                        {i + 1}
                      </div>
                      <div className={`text-[6px] md:text-[7px] font-black uppercase tracking-tighter text-center leading-[1] px-1 ${isSelected ? 'text-yellow-400/80' : 'text-white/20'}`}>
                         {pos.label}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── JUGADORES DISPONIBLES (Desktop / Side Panel) ── */}
        <div className="hidden lg:flex lg:w-[380px] flex-shrink-0 bg-white border border-neutral/20 rounded-3xl shadow-xl flex-col h-full overflow-hidden">
           {/* ... Contenido original de Atletas aquí, mantenlo para Desktop ... */}
           <div className="p-5 border-b border-neutral/20 bg-neutral-light/30 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-black text-primary text-lg flex items-center gap-2">
                   <Users className="w-5 h-5" /> Atletas
                </h3>
             </div>
             <div className="relative">
               <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral" />
               <input
                 type="text"
                 placeholder="Buscar por nombre..."
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
                const isMenuOpen = activePlayerMenu?.id === player.id;
                return (
                  <div key={player.id} className="relative group">
                    <div
                      draggable={!isUsed}
                      onDragStart={(e) => handleDragStart(e, player.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handlePlayerClick(player, isUsed)}
                      className={`p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${
                        isUsed 
                          ? 'opacity-40 grayscale border-neutral/10 bg-neutral-light/50 cursor-not-allowed' 
                          : selectedPosition !== null || isMenuOpen
                            ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 hover:scale-[1.02] cursor-pointer shadow-md'
                            : 'bg-white border-neutral/10 hover:border-primary/30 hover:scale-[1.02] cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm truncate ${isUsed ? 'text-neutral' : 'text-primary'}`}>{player.nombre}</p>
                        <span className="text-[9px] text-neutral font-black uppercase tracking-widest bg-neutral-light px-2 py-0.5 rounded mt-1 inline-block">
                          {player.posicion || 'JUGADOR'}
                        </span>
                      </div>
                      {status && (
                        <div className="bg-primary/10 text-primary font-black text-[9px] px-3 py-1.5 rounded-full border border-primary/20">
                          {status.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                )
             })}
           </div>
        </div>
      </div>

      {/* ── MOBILE SELECTION DRAWER (Bottom Sheet) ── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end animate-fade-in md:hidden">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          
          <div className="relative bg-white rounded-t-[32px] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] max-h-[85vh] flex flex-col animate-slide-up">
            {/* Handle bar */}
            <div className="w-12 h-1.5 bg-neutral/20 rounded-full mx-auto my-4 shrink-0"></div>
            
            <div className="px-6 pb-6 space-y-4 flex flex-col flex-1 min-h-0">
               <div className="flex items-center justify-between">
                  <h3 className="font-black text-primary text-xl">Elección: <span className="text-accent">{PITCH_POSITIONS[drawerSlot].label}</span></h3>
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
                    className="w-full bg-neutral-light border-2 border-neutral/10 rounded-2xl py-4 pl-12 pr-4 font-bold text-primary focus:border-primary/30 outline-none transition-all"
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
                          isUsed 
                            ? 'opacity-40 grayscale bg-neutral-light border-neutral/10' 
                            : 'bg-white border-neutral/10 active:scale-95 active:bg-neutral-light/50'
                        }`}
                      >
                        <div>
                          <p className="font-black text-primary text-sm">{player.nombre}</p>
                          <p className="text-[10px] font-bold text-neutral uppercase mt-1">{player.posicion}</p>
                        </div>
                        {status && (
                          <div className="bg-primary/10 text-primary font-black text-[9px] px-3 py-1.5 rounded-full border border-primary/20">
                            {status.toUpperCase()}
                          </div>
                        )}
                        {!status && <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black">+</div>}
                      </button>
                    );
                  })}
                  {filteredForDrawer.length === 0 && (
                    <div className="py-12 text-center opacity-40">
                       <p className="font-black">No se encontró a nadie</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

