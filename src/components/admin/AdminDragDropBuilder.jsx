import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getActiveFecha } from '../../lib/api';
import { Save, Loader2, AlertCircle, Search, Users, CheckCircle, X, Edit3 } from 'lucide-react';

import { PITCH_POSITIONS } from '../../constants/pitchPositions';

export default function AdminDragDropBuilder() {
  const [activeFecha, setActiveFecha] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [activeCategory, setActiveCategory] = useState('Primera'); // 'Primera', 'Intermedia', 'Pre-intermedia'
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [planteles, setPlanteles] = useState({
    Primera: Array(15).fill(null),
    Intermedia: Array(15).fill(null),
    'Pre-intermedia': Array(15).fill(null)
  });

  // ── MÁQUINA DE ESTADOS DE INTERACCIÓN ──
  // interactionState: { type: 'NONE' | 'AWAITING_PLAYER' | 'AWAITING_SLOT', target: index | player }
  const [interactionState, setInteractionState] = useState({ type: 'NONE', target: null });
  
  // categoryLocks: { [cat]: 'editing' | 'saved' }
  const [categoryLocks, setCategoryLocks] = useState({
    Primera: 'editing',
    Intermedia: 'editing',
    'Pre-intermedia': 'editing'
  });

  useEffect(() => {
    async function loadData() {
      const fecha = await getActiveFecha();
      setActiveFecha(fecha);

      const { data: players, error: playersErr } = await supabase.from('jugadores').select('*').order('nombre');
      if (!playersErr && players) {
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

  // ── HANDLERS DE ASIGNACIÓN ──

  const handleDragStart = (e, playerId) => {
    if (categoryLocks[activeCategory] === 'saved') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('playerId', playerId);
    e.currentTarget.classList.add('opacity-50');
    setIsDragging(true);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50');
    setIsDragging(false);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (categoryLocks[activeCategory] === 'saved') return;

    const playerId = e.dataTransfer.getData('playerId');
    if (!playerId) return;

    const player = jugadores.find(j => j.id === playerId);
    if (!player) return;

    assignToSlot(player, targetIndex);
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerSlot, setDrawerSlot] = useState(null);
  const [drawerSearch, setDrawerSearch] = useState('');

  const handleSlotClick = (index) => {
    if (categoryLocks[activeCategory] === 'saved') return;

    // MÉTODO B (AWAITING_SLOT): Ya tenemos un jugador seleccionado del pool
    if (interactionState.type === 'AWAITING_SLOT') {
      assignToSlot(interactionState.target, index);
      return;
    }

    const playerInSlot = planteles[activeCategory][index];
    if (playerInSlot) {
      removeFromPitch({ stopPropagation: () => {} }, activeCategory, index);
      setInteractionState({ type: 'NONE', target: null });
    } else {
      // MÉTODO A: Seleccionamos el slot primero
      if (interactionState.type === 'AWAITING_PLAYER' && interactionState.target === index) {
        setInteractionState({ type: 'NONE', target: null });
      } else {
        setInteractionState({ type: 'AWAITING_PLAYER', target: index });
        if (window.innerWidth < 768) {
          setDrawerSlot(index);
          setIsDrawerOpen(true);
          setDrawerSearch('');
        }
      }
    }
  };

  const handlePlayerClick = (player) => {
    if (categoryLocks[activeCategory] === 'saved') return;

    // MÉTODO A (AWAITING_PLAYER): Ya tenemos un slot seleccionado
    if (interactionState.type === 'AWAITING_PLAYER') {
      assignToSlot(player, interactionState.target);
      return;
    }

    // MÉTODO B: Seleccionamos el jugador primero
    if (interactionState.type === 'AWAITING_SLOT' && interactionState.target?.id === player.id) {
       setInteractionState({ type: 'NONE', target: null });
    } else {
       setInteractionState({ type: 'AWAITING_SLOT', target: player });
    }
  };

  const handleDrawerSelect = (player) => {
    assignToSlot(player, drawerSlot);
    setIsDrawerOpen(false);
    setDrawerSlot(null);
  };

  const assignToSlot = (player, targetIndex) => {
    setPlanteles(prev => {
      const next = { ...prev };
      next[activeCategory] = [...prev[activeCategory]];
      ['Primera', 'Intermedia', 'Pre-intermedia'].forEach(cat => {
         next[cat] = next[cat].map(p => (p && p.id === player.id) ? null : p);
      });
      next[activeCategory][targetIndex] = player;
      return next;
    });
    setInteractionState({ type: 'NONE', target: null });
  };

  const removeFromPitch = (e, catOrig, idxOrig) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (categoryLocks[catOrig] === 'saved') return;
    setPlanteles(prev => {
      const next = { ...prev };
      next[catOrig] = [...prev[catOrig]];
      next[catOrig][idxOrig] = null;
      return next;
    });
  };

  const toggleCategoryLock = (cat) => {
    if (categoryLocks[cat] === 'editing') {
       const count = planteles[cat].filter(Boolean).length;
       if (count < 15) {
          setError(`No puedes guardar ${cat} con solo ${count}/15 jugadores. Completa el equipo primero.`);
          setTimeout(() => setError(null), 3000);
          return;
       }
    }
    
    setCategoryLocks(prev => ({
      ...prev,
      [cat]: prev[cat] === 'editing' ? 'saved' : 'editing'
    }));
    setInteractionState({ type: 'NONE', target: null });
    setError(null);
  };

  const handleSave = async () => {
    const incomplete = Object.entries(planteles).find(([cat, p]) => p.filter(Boolean).length < 15);
    if (incomplete) {
       setError(`No puedes publicar. La categoría ${incomplete[0]} está incompleta (${incomplete[1].filter(Boolean).length}/15).`);
       return;
    }

    if (!allSaved) {
       setError("Debes GUARDAR las tres categorías antes de publicar.");
       return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const categories = ['Primera', 'Intermedia', 'Pre-intermedia'];
      const { error: deleteError } = await supabase.from('convocados_fecha')
        .delete()
        .eq('fecha_id', activeFecha.id)
        .in('categoria', categories);

      if (deleteError) throw deleteError;

      const allInserts = [];
      categories.forEach(cat => {
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

      setCategoryLocks({ Primera: 'saved', Intermedia: 'saved', 'Pre-intermedia': 'saved' });
      setSuccess(`¡Publicación completada exitosamente!`);
      setTimeout(() => setSuccess(false), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error:', err);
      setError(`Error al guardar: ${err.message}`);
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
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const allSaved = Object.values(categoryLocks).every(l => l === 'saved');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-neutral font-black uppercase tracking-widest text-[10px]">Cargando Sistema de Armado...</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col animate-fade-in relative z-10 px-0 md:px-4 pb-48 ${isDragging ? 'cursor-grabbing' : ''}`}>
      
      {/* ── HEADER ── */}
      <div className="mb-4 md:mb-8 space-y-4 px-4 md:px-0 mt-4 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-primary/5 pb-4">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-primary flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                 <Users className="w-6 h-6 md:w-8 md:h-8 text-accent" />
              </div>
              Armado de Planteles
            </h1>
            <p className="text-[10px] md:text-xs font-black text-neutral uppercase tracking-[0.2em] mt-1 opacity-60">
              Rival: {activeFecha?.rival || 'Cargando...'}
            </p>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
             <button
                onClick={handleSave}
                disabled={saving || !allSaved}
                className={`px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-40 group ${
                  allSaved ? 'bg-accent hover:bg-accent-dark text-white shadow-accent/20' : 'bg-neutral-light text-neutral cursor-not-allowed'
                }`}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                PUBLICAR CONVOCADOS
              </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-100 text-red-600 p-3 rounded-xl flex items-center gap-3 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-2 border-green-100 text-green-700 p-3 rounded-xl flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-bold">{success}</p>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex bg-neutral-light/50 p-1.5 rounded-[20px] border border-neutral/10 gap-2 overflow-x-auto no-scrollbar snap-x">
          {['Primera', 'Intermedia', 'Pre-intermedia'].map(cat => {
            const isLocked = categoryLocks[cat] === 'saved';
            const count = planteles[cat].filter(Boolean).length;
            return (
              <button
                key={cat}
                onClick={() => { setInteractionState({ type: 'NONE', target: null }); setActiveCategory(cat); }}
                className={`flex-1 min-w-[120px] px-4 py-3 text-[10px] font-black tracking-widest rounded-[14px] transition-all flex flex-col items-center justify-center gap-1 snap-center border-2 ${
                  activeCategory === cat 
                    ? 'bg-white border-primary text-primary shadow-sm' 
                    : 'text-neutral border-transparent hover:bg-white/40'
                }`}
              >
                 <span className="flex items-center gap-2">
                    {cat === 'Pre-intermedia' ? 'PRE' : cat.toUpperCase()}
                    {isLocked && <Users className="w-3 h-3 text-green-600" />}
                 </span>
                 <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${count === 15 ? 'bg-green-500 text-white' : 'bg-primary/5 text-primary'}`}>
                    {count}/15
                 </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 md:gap-8 lg:h-[800px]">
        {/* PITCH AREA */}
        <div 
          className="flex-1 rounded-[40px] border-4 border-[#12362b] relative overflow-hidden shadow-2xl pitch-grass transition-all duration-500"
          style={{ aspectRatio: '2/3.2' }}
        >
          {/* Markings */}
          <div className="absolute inset-x-2 inset-y-2 border-2 border-white/85 pointer-events-none z-0"></div>
          <div className="absolute inset-x-2 top-1/2 -mt-[1px] border-t-2 border-white/85 pointer-events-none z-0"></div>
          <div className="absolute inset-x-2 top-[22%] border-t-2 border-white/85 pointer-events-none z-0"></div>
          <div className="absolute inset-x-2 top-[78%] border-t-2 border-white/85 pointer-events-none z-0"></div>
          
          <span className="absolute top-[22%] left-4 text-white/30 font-bebas text-2xl -translate-y-1/2 pointer-events-none">22</span>
          <span className="absolute top-[78%] left-4 text-white/30 font-bebas text-2xl -translate-y-1/2 rotate-180 pointer-events-none">22</span>

          {PITCH_POSITIONS.map((pos, i) => {
            const player = planteles[activeCategory][i];
            const isWaitingSlot = interactionState.type === 'AWAITING_SLOT';
            const isActiveSlot = interactionState.type === 'AWAITING_PLAYER' && interactionState.target === i;
            const isLocked = categoryLocks[activeCategory] === 'saved';
            
            return (
              <div
                key={i}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 w-[50px] h-[50px] md:w-[75px] md:h-[75px] ${
                  (isActiveSlot || (isWaitingSlot && !player)) ? 'scale-110 z-20' : 'z-10'
                }`}
                style={{ top: pos.top, left: pos.left }}
                onClick={() => handleSlotClick(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, i)}
              >
                {player ? (
                  <div className={`relative group w-full h-full flex items-center justify-center ${isLocked ? 'cursor-default' : 'cursor-pointer animate-fade-in'}`}>
                    {/* Circle with Full Name */}
                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-white shadow-xl overflow-hidden bg-primary relative transition-all duration-300 group-hover:scale-110 flex items-center justify-center p-1.5 text-center">
                       {player.foto_url && (
                         <img src={player.foto_url} alt={player.nombre} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                       )}
                       <p className="relative z-10 text-[6px] md:text-[8.5px] font-black text-white uppercase tracking-[0.15em] leading-[1] font-bebas break-words">
                         {player.nombre}
                       </p>
                    </div>

                    {/* Position Badge (Outside) */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-white border-2 border-primary rounded-full flex items-center justify-center shadow-lg z-20">
                       <span className="text-[8px] md:text-[10px] font-black text-primary font-bebas">{i + 1}</span>
                    </div>

                    {!isLocked && (
                      <button 
                        onClick={(e) => removeFromPitch(e, activeCategory, i)}
                        className="absolute -bottom-1 -left-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shadow-lg border-2 border-white scale-0 group-hover:scale-100 transition-all z-30"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`
                    relative w-full h-full rounded-full flex flex-col items-center justify-center border-2 transition-all duration-300 shadow-sm
                    ${isActiveSlot
                      ? 'bg-accent/40 border-accent border-solid animate-pulse shadow-[0_0_15px_rgba(19,170,212,0.5)]'
                      : (isWaitingSlot && !isLocked)
                        ? 'bg-yellow-400/20 border-yellow-400 border-dashed animate-pulse'
                        : 'bg-black/10 border-white/20 border-dashed hover:bg-white/5 hover:border-white/30'
                    }
                  `}>
                    <span className={`font-bebas text-sm md:text-lg leading-none ${isActiveSlot ? 'text-white' : 'text-white/20'}`}>
                      {i + 1}
                    </span>
                    <span className={`text-[6px] md:text-[7px] font-black uppercase tracking-widest ${isActiveSlot ? 'text-white' : 'text-white/10'}`}>
                      {pos.label.split(' ')[0]}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* LIST AREA */}
        <div className="hidden xl:flex xl:w-[400px] flex-col bg-white border border-neutral/20 rounded-[40px] shadow-2xl overflow-hidden">
           <div className="p-6 border-b border-neutral/10 bg-neutral-light/20">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-black text-primary flex items-center gap-2">
                    <Users className="w-5 h-5 text-accent" /> Pool de Jugadores
                 </h3>
                 <span className="text-[10px] bg-primary/10 text-primary font-black px-2 py-1 rounded-full">{jugadores.length} DISP.</span>
              </div>
              <div className="relative group">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral" />
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-neutral/10 rounded-2xl text-sm font-bold focus:outline-none focus:border-accent/40 transition-all shadow-sm"
                />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredJugadores.map(player => {
                 const status = getPlayerStatus(player.id);
                 const isUsed = !!status;
                 const isActive = interactionState.type === 'AWAITING_SLOT' && interactionState.target?.id === player.id;
                 const isLocked = categoryLocks[activeCategory] === 'saved';
                 return (
                   <div
                      key={player.id}
                      draggable={!isUsed && !isLocked}
                      onDragStart={(e) => handleDragStart(e, player.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !isUsed && !isLocked && handlePlayerClick(player)}
                      className={`p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${
                        isUsed 
                          ? 'opacity-40 grayscale border-neutral/10 bg-neutral-light/50 cursor-not-allowed' 
                          : isLocked
                            ? 'opacity-40 border-neutral/10 cursor-default'
                            : isActive
                              ? 'bg-accent/10 border-accent shadow-[0_0_15px_rgba(19,170,212,0.3)] scale-[1.05]'
                              : 'bg-white border-neutral/10 hover:border-accent/50 hover:scale-[1.02] cursor-grab'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-black text-sm text-primary">{player.nombre}</p>
                        <p className="text-[10px] font-bold text-neutral uppercase opacity-60">{player.categoria}</p>
                      </div>
                      {isUsed && (
                        <span className="bg-primary/10 text-primary font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                           {status.split('-')[0]}
                        </span>
                      )}
                      {isActive && <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center animate-bounce"><span className="text-white text-[10px]">✓</span></div>}
                    </div>
                 );
              })}
           </div>
        </div>
      </div>

      {/* FOOTER ACTION BAR - Relative on mobile, Fixed Card on Desktop */}
      <div className="relative mt-8 md:fixed md:bottom-8 md:right-8 bg-white/80 backdrop-blur-xl border border-neutral/10 p-4 md:pb-8 z-[60] flex flex-col gap-3 shadow-[0_-15px_35px_rgba(0,0,0,0.05)] md:shadow-2xl md:w-[350px] md:rounded-3xl mb-12 md:mb-0 mx-4 md:mx-0">
         <div className="flex gap-3">
            <button 
              onClick={() => toggleCategoryLock(activeCategory)}
              className={`flex-1 py-4 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                categoryLocks[activeCategory] === 'saved'
                  ? 'bg-neutral-light text-primary border border-neutral/20'
                  : 'bg-primary text-white shadow-lg shadow-primary/20'
              }`}
            >
               {categoryLocks[activeCategory] === 'saved' ? (
                 <> <Edit3 className="w-4 h-4" /> RE-EDITAR {activeCategory.split('-')[0].toUpperCase()} </>
               ) : (
                 <> <Save className="w-4 h-4" /> GUARDAR {activeCategory.split('-')[0].toUpperCase()} </>
               )}
            </button>
         </div>
         
         <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-neutral/40 uppercase tracking-widest">Progreso Global</span>
               <div className="flex gap-1 mt-1">
                  {['Primera', 'Intermedia', 'Pre-intermedia'].map(cat => (
                    <div 
                      key={cat} 
                      className={`w-4 h-1 rounded-full transition-all ${categoryLocks[cat] === 'saved' ? 'bg-green-500' : 'bg-neutral/10'}`} 
                    />
                  ))}
               </div>
            </div>
            {allSaved && (
               <div className="animate-pulse">
                  <span className="text-[10px] font-black text-accent uppercase tracking-tighter">¡Listo para publicar! 🚀</span>
               </div>
            )}
         </div>

         {/* Mobile Master Publish (Footer alternative) */}
         <button
            onClick={handleSave}
            disabled={saving || !allSaved}
            className={`md:hidden w-full py-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
              allSaved ? 'bg-accent text-white shadow-lg' : 'bg-neutral-light text-neutral cursor-not-allowed border border-neutral/10'
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            PUBLICAR PLANTELES 
          </button>
      </div>

      {/* MOBILE DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative bg-white rounded-t-[40px] shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
            <div className="w-12 h-1.5 bg-neutral/20 rounded-full mx-auto my-4"></div>
            <div className="px-6 pb-4 border-b border-neutral/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">Posición</span>
                  <h3 className="font-black text-primary text-xl uppercase italic mt-1">Slot {drawerSlot + 1}</h3>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="bg-neutral-light p-3 rounded-2xl"><X className="w-5 h-5 text-neutral" /></button>
              </div>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral" />
                <input 
                  autoFocus type="text" placeholder="Buscar jugador..."
                  value={drawerSearch} onChange={e => setDrawerSearch(e.target.value)}
                  className="w-full bg-neutral-light border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 font-bold text-primary focus:bg-white focus:border-accent/30 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 pb-32 no-scrollbar">
              {filteredForDrawer.map(player => {
                const status = getPlayerStatus(player.id);
                const isUsed = !!status;
                return (
                  <button
                    key={player.id} disabled={isUsed}
                    onClick={() => handleDrawerSelect(player)}
                    className={`w-full p-4 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${
                      isUsed ? 'opacity-30 bg-neutral-light/50 border-transparent' : 'bg-white border-neutral/10 active:border-accent shadow-sm'
                    }`}
                  >
                    <div>
                        <p className="font-black text-primary text-sm">{player.nombre}</p>
                        <p className="text-[10px] font-bold text-neutral uppercase opacity-60">{player.categoria}</p>
                    </div>
                    {isUsed ? <span className="text-[10px] font-black text-accent">{status.split('-')[0].toUpperCase()}</span> : <CheckCircle className="w-5 h-5 text-neutral/20" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
