import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getActiveFecha } from '../../lib/api';
import { Save, Loader2, AlertCircle, Search, Users, CheckCircle } from 'lucide-react';

const pitchPositions = [
  // Front Row (1, 2, 3) - Pilares y Hooker (Bien separados)
  { top: '15%', left: '25%', label: 'PILAR 1' }, 
  { top: '15%', left: '50%', label: 'HOOKER' }, 
  { top: '15%', left: '75%', label: 'PILAR 3' },
  
  // Second Row (4, 5) - Segundas líneas
  { top: '24%', left: '38%', label: 'SEGUNDA 4' }, 
  { top: '24%', left: '62%', label: 'SEGUNDA 5' },
  
  // Back Row (6, 8, 7) - Tercera línea y Octavo
  { top: '35%', left: '25%', label: 'TERCERA 6' }, 
  { top: '36%', left: '50%', label: 'OCTAVO' }, 
  { top: '35%', left: '75%', label: 'TERCERA 7' },
  
  // Half backs (9, 10) - Medios
  { top: '48%', left: '45%', label: 'MEDIO SCRUM' }, 
  { top: '56%', left: '65%', label: 'APERTURA' },
  
  // Centers (12, 13) - Centros escalonados
  { top: '65%', left: '42%', label: '1ER CENTRO' }, 
  { top: '74%', left: '72%', label: '2DO CENTRO' },
  
  // Wings (11, 14) - Wings bien abiertos
  { top: '70%', left: '16%', label: 'WING IZQ.' }, 
  { top: '82%', left: '86%', label: 'WING DER.' },
  
  // Fullback (15) - Fullback al fondo
  { top: '90%', left: '50%', label: 'FULLBACK' },
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

    // Validate 15 starters for specific category
    const count = planteles[activeCategory].filter(Boolean).length;
    if (count !== 15) {
      setError(`Faltan ${15 - count} jugador(es) en ${activeCategory}`);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      await supabase.from('convocados_fecha')
        .delete()
        .eq('fecha_id', activeFecha.id)
        .eq('categoria', activeCategory);

      const inserts = [];
      planteles[activeCategory].forEach((player, index) => {
        if (player) {
          inserts.push({
            fecha_id: activeFecha.id,
            jugador_id: player.id,
            categoria: activeCategory,
            posicion_actual: pitchPositions[index].label
          });
        }
      });

      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from('convocados_fecha').insert(inserts);
        if (insertError) throw insertError;
      }

      setSuccess(`¡Plantel de ${activeCategory} guardado correctamente!`);
      setTimeout(() => setSuccess(false), 4000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Hubo un error al guardar los planteles.');
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
    return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
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
      
      {/* Header & Tabs */}
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
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar Convocados
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 shadow-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{success}</p>
          </div>
        )}

        {/* Category Selector */}
        <div className="flex gap-2 p-1 bg-neutral-light rounded-xl border border-neutral/20 max-w-fit overflow-x-auto w-full">
          {['Primera', 'Intermedia', 'Pre-intermedia'].map(cat => {
            const count = planteles[cat].filter(Boolean).length;
            const isFull = count === 15;
            return (
              <button
                key={cat}
                onClick={() => { setSelectedPosition(null); setActiveCategory(cat); }}
                className={`flex-1 min-w-[120px] px-4 py-2 text-sm font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                  activeCategory === cat ? 'bg-primary text-white shadow-md' : 'text-neutral hover:bg-white/50'
                }`}
              >
                {cat} 
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isFull ? 'bg-green-500/20 text-green-500' : 'bg-neutral/20 text-neutral-dark'}`}>
                  {count}/15
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:h-[700px]">
        {/* PITCH AREA (Izquierda) */}
        <div className="flex-1 bg-white border border-neutral/20 p-4 rounded-2xl shadow-sm flex flex-col relative overflow-hidden h-[600px] lg:h-full">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-20 pointer-events-none"></div>
          
          <div className="text-center mb-4 relative z-10">
             <h2 className="font-black text-xl text-primary">{activeCategory}</h2>
             <p className="text-xs font-bold text-neutral uppercase tracking-widest">Arrastrá jugadores a la cancha</p>
          </div>

          <div 
            className="flex-1 relative w-full h-[800px] max-w-lg mx-auto rounded-2xl border-4 border-neutral-light overflow-hidden shadow-sm"
            style={{ backgroundColor: '#0C4F2A' }}
          >
            {/* Field Lines (Schematic) */}
            <div className="absolute inset-x-0 top-1/2 -mt-[1px] border-t-[3px] border-white/80"></div>
            <div className="absolute inset-x-0 top-[22%] border-t-[2px] border-white/80"></div> {/* 22m */}
            <div className="absolute inset-x-0 top-[35%] border-t-[2px] border-dashed border-white/60"></div> {/* 10m */}
            <div className="absolute inset-x-0 top-[65%] border-t-[2px] border-dashed border-white/60"></div> {/* 10m */}
            <div className="absolute inset-x-0 top-[78%] border-t-[2px] border-white/80"></div> {/* 22m */}

            {/* H Posts (Postes Clásicos In-goal Superior) */}
            <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[16%] h-[9%] pointer-events-none z-0">
               <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-white"></div>
               <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-white"></div>
               <div className="absolute left-0 right-0 bottom-[25%] h-[4px] bg-white"></div>
            </div>

            {/* H Posts (Postes Clásicos In-goal Inferior) */}
            <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-[16%] h-[9%] pointer-events-none z-0">
               <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-white"></div>
               <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-white"></div>
               <div className="absolute left-0 right-0 top-[25%] h-[4px] bg-white"></div>
            </div>

            {/* Drop Zones */}
            {pitchPositions.map((pos, i) => {
              const player = planteles[activeCategory][i];
              const isSelected = selectedPosition === i;
              return (
                <div
                  key={i}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[58px] h-[58px] sm:w-[66px] sm:h-[66px] z-10 transition-transform ${
                     isSelected && !player ? 'ring-4 ring-yellow-400 rounded-full scale-110' : ''
                  }`}
                  style={{ top: pos.top, left: pos.left }}
                  onClick={() => handlePositionClick(i)}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('scale-110'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('scale-110'); handleDrop(e, i); }}
                >
                  {player ? (
                    <div 
                      draggable
                      onDragStart={(e) => handleDragStart(e, player.id)}
                      onDragEnd={handleDragEnd}
                      className="w-full h-full bg-accent border-[3px] border-dashed border-accent-light rounded-full flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing shadow-lg relative group"
                    >
                      <div className="text-[10px] sm:text-[11px] font-black text-white text-center leading-tight tracking-tight uppercase line-clamp-2 w-full break-words">
                         {player.nombre?.split(' ')[1] ? player.nombre?.split(' ').slice(1).join(' ') : player.nombre}
                      </div>
                      <div className="text-[7.5px] text-white/90 font-bold uppercase mt-0.5 tracking-wider">{pos.label}</div>
                      
                      <button 
                        onClick={(e) => removeFromPitch(e, activeCategory, i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-md md:opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white border-[3px] border-primary rounded-full flex flex-col items-center justify-center p-1 pointer-events-none shadow-md">
                      <div className="text-primary opacity-25 font-black text-[13px] sm:text-[15px] leading-none mb-0.5">{i + 1}</div>
                      <div className="text-primary font-black text-[7px] sm:text-[8px] uppercase leading-[1.1] text-center tracking-tight break-words px-0.5 w-full">
                         {pos.label}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* LISTA JUGADORES (Derecha) */}
        <div className="lg:w-[350px] flex-shrink-0 bg-white border border-neutral/20 rounded-2xl shadow-sm flex flex-col h-[500px] lg:h-full">
           <div className="p-4 border-b border-neutral/20 bg-neutral-light/30">
             <div className="relative">
               <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral" />
               <input
                 type="text"
                 placeholder="Buscar jugador..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral/30 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
               />
             </div>
           </div>

           <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-20">
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
                    className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                      isUsed 
                        ? 'opacity-40 grayscale border-transparent bg-neutral-light/50 cursor-not-allowed' 
                        : selectedPosition !== null
                          ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 hover:shadow-md cursor-pointer'
                          : 'bg-white border-neutral/20 hover:border-primary/40 hover:shadow-md cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <div>
                      <p className={`font-bold text-sm ${isUsed ? 'text-neutral' : 'text-primary'}`}>{player.nombre}</p>
                      <p className="text-[10px] text-neutral uppercase tracking-wider font-bold mt-0.5">{player.posicion || 'JUGADOR'}</p>
                    </div>
                    
                    {status && (
                      <span className="text-[10px] bg-neutral text-white font-black px-2 py-1 rounded truncate flex items-center gap-1 max-w-[80px]">
                        <CheckCircle className="w-3 h-3" /> En {status.slice(0,3).toUpperCase()}
                      </span>
                    )}
                  </div>
                )
             })}
             
             {filteredJugadores.length === 0 && (
               <div className="text-center p-8 text-neutral opacity-60">
                 No se encontraron jugadores.
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
