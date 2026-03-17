import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getActiveFecha } from '../../lib/api';
import { Save, Loader2, AlertCircle, Search, Users, CheckCircle } from 'lucide-react';

const pitchPositions = [
  // Forwards (1-8)
  { top: '15%', left: '25%', label: 'PILAR 1' },    // 1
  { top: '15%', left: '50%', label: 'HOOKER' },     // 2
  { top: '15%', left: '75%', label: 'PILAR 3' },    // 3
  { top: '24%', left: '38%', label: 'SEGUNDA 4' },  // 4
  { top: '24%', left: '62%', label: 'SEGUNDA 5' },  // 5
  { top: '35%', left: '25%', label: 'TERCERA 6' },  // 6
  { top: '35%', left: '75%', label: 'TERCERA 7' },  // 7
  { top: '38%', left: '50%', label: 'OCTAVO' },     // 8
  
  // Backs (9-15)
  { top: '48%', left: '45%', label: 'MEDIO SCRUM' }, // 9
  { top: '56%', left: '65%', label: 'APERTURA' },    // 10
  { top: '70%', left: '16%', label: 'WING IZQ.' },   // 11
  { top: '65%', left: '42%', label: '1ER CENTRO' },  // 12
  { top: '74%', left: '72%', label: '2DO CENTRO' },  // 13
  { top: '82%', left: '86%', label: 'WING DER.' },   // 14
  { top: '90%', left: '50%', label: 'FULLBACK' },    // 15
];

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
             let idx = pitchPositions.findIndex(p => p.label === c.posicion_actual);
             if (idx === -1) {
                 idx = parseInt(c.posicion_actual) - 1;
             }
             if (idx >= 0 && idx < 15 && newPlanteles[c.categoria]) {
                newPlanteles[c.categoria][idx] = c.jugadores;
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
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('scale-110', 'border-accent');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('scale-110', 'border-accent');
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    e.currentTarget.classList.remove('scale-110', 'border-accent');
    
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

  const handlePositionClick = (index) => {
    if (!planteles[activeCategory][index]) {
      setSelectedPosition(selectedPosition === index ? null : index);
    }
  };

  const handlePlayerClick = (player, isUsed) => {
    if (isUsed || selectedPosition === null) return;
    
    setPlanteles(prev => {
      const next = { ...prev, [activeCategory]: [...prev[activeCategory]] };
      
      // Remove dropped player from everywhere
      ['Primera', 'Intermedia', 'Pre-intermedia'].forEach(cat => {
         const idx = prev[cat].findIndex(p => p && p.id === player.id);
         if(idx !== -1) { next[cat] = [...prev[cat]]; next[cat][idx] = null; }
      });

      // Put in target
      next[activeCategory][selectedPosition] = player;
      return next;
    });
    setSelectedPosition(null);
  };

  const removeFromPitch = (e, catOrig, idxOrig) => {
    e.stopPropagation();
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
      // 1. Limpiar todos los convocados de esta fecha (de las 3 categorías)
      // para asegurar una sobrescritura limpia
      const categoriesToClear = ['Primera', 'Intermedia', 'Pre-intermedia'];
      
      const { error: deleteError } = await supabase.from('convocados_fecha')
        .delete()
        .eq('fecha_id', activeFecha.id)
        .in('categoria', categoriesToClear);

      if (deleteError) throw deleteError;

      // 2. Preparar los nuevos registros para todas las categorías
      const allInserts = [];
      
      categoriesToClear.forEach(cat => {
        planteles[cat].forEach((player, index) => {
          if (player) {
            allInserts.push({
              fecha_id: activeFecha.id,
              jugador_id: player.id,
              categoria: cat,
              posicion_actual: pitchPositions[index].label
            });
          }
        });
      });

      // 3. Insertar si hay algo que guardar
      if (allInserts.length > 0) {
        const { error: insertError } = await supabase.from('convocados_fecha').insert(allInserts);
        if (insertError) throw insertError;
      }

      setSuccess(`¡Todos los planteles guardados y publicados con éxito!`);
      setTimeout(() => setSuccess(false), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saving planteles:', err);
      // Extraemos el mensaje de error si está disponible de Supabase
      const msg = err.message || err.details || 'Verifica tu conexión.';
      setError(`Error al guardar: ${msg}`);
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
      
      {/* Header & Main Save */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral/20 pb-4">
          <div>
            <h1 className="text-3xl font-black text-primary flex items-center gap-2">
              <Users className="w-8 h-8 text-accent" /> Armado de Equipos
            </h1>
            <p className="text-sm font-bold text-neutral uppercase tracking-widest mt-1">
              Matchday Setup vs {activeFecha.rival}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             {saving && <span className="text-xs font-bold text-primary animate-pulse hidden md:inline">Guardando cambios...</span>}
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
          <div className="bg-red-50 border-2 border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3 shadow-sm animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-2 border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3 shadow-sm animate-fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{success}</p>
          </div>
        )}

        {/* Category Selector Tabs */}
        <div className="flex gap-2 p-1 bg-neutral-light rounded-2xl border border-neutral/20 max-w-fit overflow-x-auto w-full">
          {['Primera', 'Intermedia', 'Pre-intermedia'].map(cat => {
            const count = planteles[cat].filter(Boolean).length;
            const isFull = count === 15;
            return (
              <button
                key={cat}
                onClick={() => { setSelectedPosition(null); setActiveCategory(cat); }}
                className={`flex-1 min-w-[140px] px-6 py-3 text-sm font-black tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeCategory === cat ? 'bg-primary text-white shadow-md' : 'text-neutral hover:bg-white/50'
                }`}
              >
                {cat} 
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isFull ? 'bg-green-500 text-white' : 'bg-neutral/20 text-neutral-dark'}`}>
                  {count}/15
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:h-[750px]">
        {/* PITCH AREA (Izquierda) */}
        <div className="flex-1 bg-white border border-neutral/20 p-6 rounded-3xl shadow-xl flex flex-col relative overflow-hidden h-[650px] lg:h-full">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-20 pointer-events-none"></div>
          
          <div className="text-center mb-6 relative z-10 flex items-center justify-center gap-3">
             <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-neutral/20"></div>
             <h2 className="font-black text-2xl text-primary tracking-tight">{activeCategory.toUpperCase()}</h2>
             <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-neutral/20"></div>
          </div>

          <div 
            className="flex-1 relative w-full h-full max-w-lg mx-auto rounded-3xl border-[6px] border-neutral-light/50 overflow-hidden shadow-2xl transition-colors duration-500"
            style={{ backgroundColor: '#1B4D3E' }} /* Verde Bosque Rugbier */
          >
            {/* Field Detail Lines */}
            <div className="absolute inset-x-0 top-0 h-[10%] bg-white/5 border-b border-white/20"></div> {/* In-goal Top */}
            <div className="absolute inset-x-0 bottom-0 h-[10%] bg-white/5 border-t border-white/20"></div> {/* In-goal Bottom */}
            <div className="absolute inset-x-0 top-1/2 -mt-[1px] border-t-[3px] border-white/30"></div> {/* Halfway */}
            <div className="absolute inset-x-0 top-[22%] border-t-[2px] border-white/25"></div> {/* 22m */}
            <div className="absolute inset-x-0 top-[35%] border-t-[2px] border-dashed border-white/15"></div> {/* 10m */}
            <div className="absolute inset-x-0 top-[65%] border-t-[2px] border-dashed border-white/15"></div> {/* 10m */}
            <div className="absolute inset-x-0 top-[78%] border-t-[2px] border-white/25"></div> {/* 22m */}

            {/* Position Circles */}
            {pitchPositions.map((pos, i) => {
              const player = planteles[activeCategory][i];
              const isSelected = selectedPosition === i;
              
              return (
                <div
                  key={i}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] z-10 transition-all duration-300 ${
                     isSelected && !player ? 'scale-125' : ''
                  }`}
                  style={{ top: pos.top, left: pos.left }}
                  onClick={() => handlePositionClick(i)}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('scale-110'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
                  onDrop={(e) => handleDrop(e, i)}
                >
                  {player ? (
                    <div 
                      draggable
                      onDragStart={(e) => handleDragStart(e, player.id)}
                      onDragEnd={handleDragEnd}
                      className="w-full h-full bg-accent border-[3px] border-white rounded-full flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing shadow-xl relative group animate-pop-in"
                    >
                      <div className="text-[9px] sm:text-[10px] font-black text-white text-center leading-tight uppercase line-clamp-2 px-1 drop-shadow-md">
                         {player.nombre?.split(' ').length > 1 ? player.nombre?.split(' ').slice(1).join(' ') : player.nombre}
                      </div>
                      
                      <button 
                        onClick={(e) => removeFromPitch(e, activeCategory, i)}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 border-2 border-white"
                        title="Quitar jugador"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className={`w-full h-full rounded-full flex flex-col items-center justify-center p-1 backdrop-blur-[1px] transition-all border-2 border-dashed ${
                        isSelected 
                        ? 'bg-yellow-400/30 border-yellow-400 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                        : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
                    }`}>
                      <div className={`font-black text-sm sm:text-lg leading-none ${isSelected ? 'text-yellow-400' : 'text-white/40'}`}>
                        {i + 1}
                      </div>
                      <div className={`text-[7px] sm:text-[8px] font-black uppercase tracking-tighter text-center leading-[1] px-1 ${isSelected ? 'text-yellow-400/80' : 'text-white/20'}`}>
                         {pos.label}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* JUGADORES DISPONIBLES (Derecha) */}
        <div className="lg:w-[380px] flex-shrink-0 bg-white border border-neutral/20 rounded-3xl shadow-xl flex flex-col h-[600px] lg:h-full overflow-hidden">
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

                return (
                  <div
                    key={player.id}
                    draggable={!isUsed}
                    onClick={() => handlePlayerClick(player, isUsed)}
                    onDragStart={(e) => handleDragStart(e, player.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-4 rounded-2xl border-2 flex justify-between items-center transition-all group ${
                      isUsed 
                        ? 'opacity-40 grayscale border-neutral/10 bg-neutral-light/50 cursor-not-allowed scale-[0.98]' 
                        : selectedPosition !== null
                          ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 hover:scale-[1.02] cursor-pointer shadow-md'
                          : 'bg-white border-neutral/10 hover:border-primary/30 hover:scale-[1.02] cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm truncate ${isUsed ? 'text-neutral' : 'text-primary'}`}>{player.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] text-neutral font-black uppercase tracking-widest bg-neutral-light px-2 py-0.5 rounded">
                           {player.posicion || 'JUGADOR'}
                         </span>
                      </div>
                    </div>
                    
                    {status && (
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary font-black text-[9px] px-3 py-1.5 rounded-full ml-3 border border-primary/20 shrink-0">
                        <CheckCircle className="w-3 h-3" /> {status.toUpperCase()}
                      </div>
                    )}

                    {!status && selectedPosition !== null && (
                      <div className="w-8 h-8 rounded-xl bg-yellow-400 text-white flex items-center justify-center font-black animate-pulse">
                        +
                      </div>
                    )}
                  </div>
                )
             })}
             
             {filteredJugadores.length === 0 && (
               <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
                 <Search className="w-10 h-10 mb-4" />
                 <p className="font-black">No se encontraron jugadores</p>
               </div>
             )}
           </div>

           {/* Quick Tips */}
           <div className="p-4 bg-primary text-white text-[10px] font-bold">
              <p className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
                 Tip: Arrastrá los nombres directamente a las posiciones de la cancha.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
