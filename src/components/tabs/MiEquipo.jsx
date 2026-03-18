import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveFecha, getConvocados } from '../../lib/api';
import { Save, Loader2, AlertCircle, CheckCircle, Search, Trophy, Info, Users } from 'lucide-react';
import RugbyPitch from '../RugbyPitch';
import TeamCounters from '../TeamCounters';

const pitchPositions = [
  { top: '15%', left: '25%', label: 'PILAR 1' },
  { top: '15%', left: '50%', label: 'HOOKER' },
  { top: '15%', left: '75%', label: 'PILAR 3' },
  { top: '24%', left: '38%', label: 'SEGUNDA 4' },
  { top: '24%', left: '62%', label: 'SEGUNDA 5' },
  { top: '35%', left: '25%', label: 'TERCERA 6' },
  { top: '35%', left: '75%', label: 'TERCERA 7' },
  { top: '38%', left: '50%', label: 'OCTAVO' },
  { top: '48%', left: '45%', label: 'MEDIO SCRUM' },
  { top: '56%', left: '65%', label: 'APERTURA' },
  { top: '70%', left: '16%', label: 'WING IZQ.' },
  { top: '65%', left: '42%', label: '1ER CENTRO' },
  { top: '74%', left: '72%', label: '2DO CENTRO' },
  { top: '82%', left: '86%', label: 'WING DER.' },
  { top: '90%', left: '50%', label: 'FULLBACK' },
];

export default function MiEquipo() {
  const { profile } = useAuth();
  const [activeFecha, setActiveFecha] = useState(null);
  const [convocados, setConvocados] = useState([]);
  const [pitchSlots, setPitchSlots] = useState(Array(15).fill(null));
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [refCategory, setRefCategory] = useState('Primera');
  const [poolCategory, setPoolCategory] = useState('primera');

  // Helper to get selected players from slots
  const selectedPlayers = useMemo(() => pitchSlots.filter(Boolean), [pitchSlots]);
  
  // Group official teams for reference (Mapped to pitch indices)
  const officialTeams = useMemo(() => {
    const teams = { Primera: Array(15).fill(null), Intermedia: Array(15).fill(null), 'Pre-intermedia': Array(15).fill(null) };
    if (!convocados || !Array.isArray(convocados)) return teams;
    
    convocados.forEach(p => {
      if (p) {
        const catKey = Object.keys(teams).find(k => k.toLowerCase() === p.categoria?.toLowerCase());
        if (catKey) {
          let idx = pitchPositions.findIndex(pos => pos.label.toUpperCase() === p.posicion?.toUpperCase());
          if (idx === -1) {
              idx = (parseInt(p.posicion) || 0) - 1;
          }
          if (idx >= 0 && idx < 15) {
              teams[catKey][idx] = p;
          }
        }
      }
    });
    return teams;
  }, [convocados]);

  useEffect(() => {
    async function init() {
      const fecha = await getActiveFecha();
      setActiveFecha(fecha);
      if (fecha) {
        const players = await getConvocados(fecha.id);
        const normalized = players.map(p => ({
          ...p,
          categoryKey: p.categoria === 'Pre-intermedia' ? 'pre' : p.categoria?.toLowerCase() || ''
        }));
        setConvocados(normalized);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: selection } = await supabase
            .from('equipos_usuarios')
            .select('jugador_id, posicion_cancha')
            .eq('usuario_id', user.id)
            .eq('fecha_id', fecha.id);
          
          if (selection && selection.length > 0) {
            const newSlots = Array(15).fill(null);
            selection.forEach(s => {
              const p = normalized.find(p => p.id === s.jugador_id);
              if (p && s.posicion_cancha >= 1 && s.posicion_cancha <= 15) {
                newSlots[s.posicion_cancha - 1] = p;
              }
            });
            setPitchSlots(newSlots);
          }
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  const counts = useMemo(() => {
    const res = { primera: 0, intermedia: 0, pre: 0 };
    selectedPlayers.forEach(p => {
      if (p.categoryKey === 'primera') res.primera++;
      else if (p.categoryKey === 'intermedia') res.intermedia++;
      else if (p.categoryKey === 'pre') res.pre++;
    });
    return res;
  }, [selectedPlayers]);

  const isValid = selectedPlayers.length === 15 && counts.primera === 5 && counts.intermedia === 5 && counts.pre === 5;

  // D&D Handlers
  const handleDragStart = (e, playerId) => {
    e.dataTransfer.setData('playerId', String(playerId));
    e.currentTarget.classList.add('opacity-40');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-40');
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

  const handleDrop = (e, index) => {
    e.preventDefault();
    e.currentTarget.classList.remove('scale-125', 'border-yellow-400', 'border-solid', 'bg-yellow-400/20', 'z-50');
    e.currentTarget.classList.add('border-dashed', 'border-white/20');
    
    const playerId = e.dataTransfer.getData('playerId');
    const player = convocados.find(p => String(p.id) === playerId);
    if (player) {
      assignToSlot(player, index);
    }
    setSelectedPosition(null);
  };

  const assignToSlot = (player, index) => {
    // NUEVA REGLA: El jugador solo puede ir en su posición oficial de la convocatoria
    const targetLabel = pitchPositions[index].label;
    if (player.posicion && player.posicion !== 'Jugador' && player.posicion !== targetLabel) {
      setError(`¡Atención! No podés poner a ${player.nombre} en esta posición porque en esta fecha jugará de ${player.posicion}.`);
      setSelectedPosition(null);
      // Removed window.scrollTo to keep user in place
      return;
    }

    // Rule: One player can only be in one slot
    const alreadyInSlotIdx = pitchSlots.findIndex(p => p && p.id === player.id);
    
    const newSlots = [...pitchSlots];
    
    // If moving from another slot, clear it
    if (alreadyInSlotIdx !== -1) {
      newSlots[alreadyInSlotIdx] = null;
    }

    // Check category limit before adding if not already in the team
    if (alreadyInSlotIdx === -1) {
      const cat = player.categoryKey;
      if (cat === 'primera' && counts.primera >= 5) {
        setError('¡Límite alcanzado! Ya elegiste 5 de Primera.'); return;
      }
      if (cat === 'intermedia' && counts.intermedia >= 5) {
        setError('¡Límite alcanzado! Ya elegiste 5 de Intermedia.'); return;
      }
      if (cat === 'pre' && counts.pre >= 5) {
        setError('¡Límite alcanzado! Ya elegiste 5 de Pre.'); return;
      }
    }

    // Swap if slot occupied
    const occupied = newSlots[index];
    if (occupied && alreadyInSlotIdx !== -1) {
       newSlots[alreadyInSlotIdx] = occupied;
    }
    
    newSlots[index] = player;
    setPitchSlots(newSlots);
    setError(null);
  };

  const removeFromSlot = (e, index) => {
    e.stopPropagation();
    const newSlots = [...pitchSlots];
    newSlots[index] = null;
    setPitchSlots(newSlots);
  };

  const handlePositionClick = (index) => {
    if (pitchSlots[index]) {
      removeFromSlot({ stopPropagation: () => {} }, index);
    } else {
      setSelectedPosition(index);
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      setError('Debes cumplir la regla 5-5-5 para guardar.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('equipos_usuarios').delete().match({ usuario_id: user.id, fecha_id: activeFecha.id });

      const inserts = pitchSlots.map((p, idx) => p ? ({
        usuario_id: user.id,
        fecha_id: activeFecha.id,
        jugador_id: p.id,
        posicion_cancha: idx + 1,
        es_capitan: false 
      }) : null).filter(Boolean);

      const { error: insertErr } = await supabase.from('equipos_usuarios').insert(inserts);
      if (insertErr) throw insertErr;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Error al guardar. Intentá de nuevo.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredList = convocados.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) && 
    !selectedPlayers.find(s => s.id === p.id)
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 animate-pulse">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <p className="font-black text-primary uppercase tracking-widest text-sm">Cargando Convocatoria...</p>
    </div>
  );

  if (!activeFecha) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-neutral/20 shadow-xl max-w-2xl mx-auto mt-8">
        <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6 opacity-20" />
        <h2 className="text-3xl font-black text-primary mb-3">Convocatoria Cerrada</h2>
        <p className="text-neutral font-medium">Estamos a la espera de que el Staff oficial anuncie los planteles para la próxima fecha.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Save Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-neutral/20 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-primary tracking-tighter">
            {profile?.team_name || 'Mi Dream Team'}
          </h2>
          <div className="flex items-center gap-3">
             <span className="bg-accent text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Matchday</span>
             <p className="text-base font-bold text-neutral">vs {activeFecha.rival}</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
           {!isValid && (
             <div className="flex items-center gap-2 text-primary font-black text-xs uppercase bg-neutral-light px-4 py-2 rounded-xl">
               <Info className="w-4 h-4 text-accent" />
               Faltan {15 - selectedPlayers.length} jugadores
             </div>
           )}
           <button
             onClick={handleSave}
             disabled={saving || !isValid}
             className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black transition-all shadow-xl flex items-center justify-center gap-2 ${
               isValid 
               ? 'bg-accent hover:bg-accent-dark text-white scale-100 hover:scale-[1.03]' 
               : 'bg-neutral-light text-neutral opacity-50 cursor-not-allowed hidden sm:flex'
             }`}
           >
             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-white/50" />}
             ¡GUARDAR MI EQUIPO!
           </button>
           
           {/* Mobile Save Floating Button Concept via the same button but shown */}
           {!isValid && (
             <button disabled className="sm:hidden w-full bg-neutral-light text-neutral p-4 rounded-2xl font-black opacity-50">
               COMPLETÁ EL 5-5-5
             </button>
           )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-600 p-5 rounded-3xl flex items-center gap-4 animate-shake shadow-md font-black text-sm">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-white border-2 border-green-500 text-green-600 p-5 rounded-3xl flex items-center gap-4 animate-fade-in shadow-xl font-black text-sm">
          <CheckCircle className="w-6 h-6 flex-shrink-0" />
          ¡Equipo confirmado y guardado para la fecha!
        </div>
      )}

      {/* REFERENCE BOARDS (Official Teams) */}
      <div className="space-y-4">
         <div className="flex items-center gap-3 px-2">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="text-xl font-black text-primary uppercase tracking-tight">Planteles Oficiales (Staff)</h3>
         </div>
         <p className="text-sm text-neutral font-bold px-2 -mt-2">Consultá quiénes juegan cada partido para elegir tu equipo.</p>
         
         <div className="bg-white rounded-3xl border border-neutral/20 shadow-xl overflow-hidden">
            <div className="flex bg-neutral-light/50 p-1">
               {['Primera', 'Intermedia', 'Pre-intermedia'].map(cat => (
                 <button
                   key={cat}
                   onClick={() => setRefCategory(cat)}
                   className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-2xl ${
                     refCategory === cat ? 'bg-primary text-white shadow-lg' : 'text-neutral hover:bg-white'
                   }`}
                 >
                   {cat}
                 </button>
               ))}
            </div>
            
            <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
               <div className="bg-neutral-light/30 rounded-2xl p-4">
                  <RugbyPitch players={officialTeams[refCategory]} />
               </div>
               <div className="space-y-3">
                  <h4 className="font-black text-primary uppercase text-sm border-b pb-2">Convocados: {refCategory}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {officialTeams[refCategory]?.some(p => p !== null) ? (
                       officialTeams[refCategory].map((p, idx) => {
                         if (!p) return null;
                         return (
                           <div key={p.id || idx} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-neutral/10 shadow-sm">
                              <span className="w-6 h-6 bg-primary text-white text-[10px] font-black rounded-md flex items-center justify-center shrink-0">
                                 {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-primary truncate leading-none">{p.nombre || 'Jugador'}</span>
                           </div>
                         );
                       })
                     ) : (
                       <div className="col-span-2 py-8 text-center bg-neutral-light/20 rounded-2xl border border-dashed border-neutral/20">
                          <p className="text-xs font-black text-neutral uppercase tracking-widest">Todavía no hay convocados oficiales para esta fecha</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="h-[2px] bg-gradient-to-r from-transparent via-neutral/20 to-transparent my-8"></div>

      {/* TEAM SELECTION AREA */}
      <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <h3 className="text-xl font-black text-primary uppercase tracking-tight">Armá tu 15 Ideal</h3>
             </div>
             <div className="hidden md:block">
                <p className="text-[10px] font-black text-neutral uppercase tracking-widest bg-neutral-light px-3 py-1 rounded-full border border-neutral/20">
                   Regla 5-5-5: Elegí 5 por categoría
                </p>
             </div>
          </div>

          <TeamCounters counts={counts} activeCategory={poolCategory} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Pitch Selection View (Interactive) */}
            <div className="lg:col-span-7 bg-white rounded-[2rem] border border-neutral/20 shadow-2xl p-6 relative overflow-hidden flex flex-col items-center">
              <div className="absolute inset-0 bg-neutral-light/10 pointer-events-none"></div>
              
              <div className="relative z-10 w-full mb-6 flex items-center justify-between px-2">
                 <h4 className="font-black text-primary text-sm uppercase tracking-[0.2em]">
                    {profile?.team_name ? `DIAGRAMA: ${profile.team_name.toUpperCase()}` : 'TU PIZARRA INTERACTIVA'}
                 </h4>
                 <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neutral-light opacity-50'}`}></span>
                    <span className="text-[10px] font-black text-neutral uppercase">Estado: {isValid ? 'LISTO' : 'EN PROCESO'}</span>
                 </div>
              </div>

              {/* LOCALIZED WARNING MESSAGE */}
              {error && error.includes('Atención') && (
                <div className="relative z-20 w-full mb-6 bg-red-50 border-2 border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-shake shadow-md font-bold text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 font-black text-lg">×</button>
                </div>
              )}

              {/* INTERACTIVE PITCH */}
              <div 
                className="relative w-full aspect-[2/3] max-w-md mx-auto rounded-3xl border-[6px] border-neutral-light/50 overflow-hidden shadow-2xl transition-all duration-500 bg-[#1B4D3E]"
              >
                {/* Field Detail Lines */}
                <div className="absolute inset-x-0 top-0 h-[10%] bg-white/5 border-b border-white/20"></div>
                <div className="absolute inset-x-0 bottom-0 h-[10%] bg-white/5 border-t border-white/20"></div>
                <div className="absolute inset-x-0 top-1/2 -mt-[1px] border-t-[3px] border-white/30"></div>
                <div className="absolute inset-x-0 top-[22%] border-t-[2px] border-white/25"></div>
                <div className="absolute inset-x-0 top-[78%] border-t-[2px] border-white/25"></div>

                {pitchPositions.map((pos, i) => {
                  const player = pitchSlots[i];
                  const isSelected = selectedPosition === i;
                  
                  return (
                    <div
                      key={i}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[55px] h-[55px] sm:w-[62px] sm:h-[62px] z-10 transition-all duration-300 ${
                         isSelected && !player ? 'scale-125' : ''
                      }`}
                      style={{ top: pos.top, left: pos.left }}
                      onClick={() => handlePositionClick(i)}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, i)}
                    >
                      {player ? (
                        <div 
                          draggable
                          onDragStart={(e) => handleDragStart(e, player.id)}
                          onDragEnd={handleDragEnd}
                          className="w-full h-full bg-primary border-[3px] border-white rounded-full flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing shadow-xl relative group animate-pop-in"
                        >
                          <div className="text-[8px] sm:text-[9px] font-black text-white text-center leading-tight uppercase line-clamp-2 px-1">
                             {player.nombre?.split(' ').length > 1 ? player.nombre?.split(' ').slice(1).join(' ') : player.nombre}
                          </div>
                          
                          <button 
                            onClick={(e) => removeFromSlot(e, i)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 border-2 border-white"
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
                          <div className={`text-[6px] sm:text-[7px] font-black uppercase tracking-tighter text-center leading-[1] px-1 ${isSelected ? 'text-yellow-400/80' : 'text-white/20'}`}>
                             {pos.label}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-8 w-full">
                 <h4 className="font-black text-primary text-[10px] uppercase tracking-widest text-center mb-4">Jugadores Seleccionados ({selectedPlayers.length}/15)</h4>
                 <div className="flex flex-wrap justify-center gap-2">
                    {selectedPlayers.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => {
                          const idx = pitchSlots.findIndex(slot => slot && slot.id === p.id);
                          if (idx !== -1) removeFromSlot({ stopPropagation: () => {} }, idx);
                        }}
                        className="bg-primary text-white text-[9px] font-black px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-600 hover:scale-[1.05] transition-all shadow-md group border border-white/20"
                      >
                        {p.nombre.toUpperCase()} 
                        <span className="text-white/60 group-hover:text-white transition-colors">×</span>
                      </button>
                    ))}
                    {selectedPlayers.length === 0 && (
                       <p className="text-xs font-bold text-neutral opacity-40 py-4 uppercase tracking-widest text-center w-full">Arrastrá jugadores a la cancha o hacé clic en un número</p>
                    )}
                 </div>
              </div>
            </div>

            {/* Selection Pool (Convocados) */}
            <div className="lg:col-span-5 flex flex-col gap-4 h-[700px] lg:h-auto">
              <div className="bg-white rounded-3xl border border-neutral/20 shadow-xl overflow-hidden flex flex-col flex-1">
                <div className="p-5 border-b border-neutral/20 bg-primary/5 space-y-4">
                  {/* Category Filter Tabs */}
                  <div className="flex bg-neutral-light p-1 rounded-xl border border-neutral/20">
                     {[
                       { id: 'primera', label: 'Primera' },
                       { id: 'intermedia', label: 'Intermedia' },
                       { id: 'pre', label: 'Pre' }
                     ].map(cat => (
                       <button
                         key={cat.id}
                         onClick={() => setPoolCategory(cat.id)}
                         className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${
                           poolCategory === cat.id 
                           ? 'bg-primary text-white shadow-md' 
                           : 'text-neutral hover:bg-white/50'
                         }`}
                       >
                         {cat.label}
                       </button>
                     ))}
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" />
                    <input
                      type="text"
                      placeholder={`Buscar en ${poolCategory === 'pre' ? 'Pre-inter' : poolCategory.charAt(0).toUpperCase() + poolCategory.slice(1)}...`}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral/30 rounded-xl text-xs font-black text-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 grid grid-cols-2 gap-2 custom-scrollbar bg-neutral-light/20 content-start">
                  {convocados
                    .filter(p => 
                      p.categoryKey === poolCategory &&
                      p.nombre.toLowerCase().includes(search.toLowerCase())
                    )
                    .map(player => {
                      const isSelected = selectedPlayers.find(s => s.id === player.id);
                      // Get initials for avatar
                      const initials = player.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                      
                      return (
                        <div
                          key={player.id}
                          draggable={!isSelected}
                          onDragStart={(e) => handleDragStart(e, player.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (!isSelected && selectedPosition !== null) {
                               assignToSlot(player, selectedPosition);
                               setSelectedPosition(null);
                            }
                          }}
                          className={`relative group flex items-center gap-2 p-1.5 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected 
                            ? 'bg-neutral-light/50 border-neutral/10 opacity-60 grayscale' 
                            : selectedPosition !== null
                              ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 shadow-sm'
                              : 'bg-white border-neutral/10 hover:border-accent hover:shadow-md'
                          }`}
                        >
                          {/* Small Avatar/Initials */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-neutral/20 text-neutral' : 'bg-primary/10 text-primary border-primary/20'
                          }`}>
                            <span className="text-[8px] font-black">{initials}</span>
                          </div>

                          <div className="min-w-0 flex-1 flex flex-col leading-tight">
                            <p className={`font-black uppercase text-[9px] truncate ${isSelected ? 'text-neutral' : 'text-primary'}`}>
                              {player.nombre}
                            </p>
                            <span className={`text-[7px] font-bold uppercase tracking-tighter truncate ${isSelected ? 'text-neutral/70' : 'text-accent'}`}>
                              {player.posicion || 'JUGADOR'}
                            </span>
                          </div>
                          
                          {/* Selection Indicator */}
                          <div className="shrink-0 flex items-center justify-center">
                            {isSelected ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                 selectedPosition !== null ? 'bg-yellow-400 text-white animate-pulse' : 'bg-neutral-light text-primary group-hover:bg-accent group-hover:text-white'
                              }`}>
                                <span className="text-xs font-black">+</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {convocados.filter(p => p.categoryKey === poolCategory).length === 0 && (
                    <div className="py-8 text-center bg-white/50 rounded-2xl border border-dashed border-neutral/20">
                      <p className="text-[10px] font-black text-neutral uppercase tracking-widest px-4">No hay jugadores convocados para esta categoría</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Rules Card */}
              <div className="bg-primary p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-10">
                    <Trophy className="w-24 h-24" />
                 </div>
                 <h4 className="font-black text-lg mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5 text-accent" /> MODALIDAD GRAN DT
                 </h4>
                 <ul className="text-xs space-y-2 font-bold opacity-90">
                    <li>- Arrastrá los jugadores a su posición en la pizarra.</li>
                    <li>- **Importante**: Cada jugador solo puede ir en la posición en la que fue convocado.</li>
                    <li>- Respetá el 5-5-5: ¡Igualdad de categorías!</li>
                 </ul>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
