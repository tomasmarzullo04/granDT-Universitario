import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveFecha, getConvocados } from '../../lib/api';
import { Save, Loader2, AlertCircle, CheckCircle, Search, Trophy, Info, Users, BarChart2, Lock } from 'lucide-react';
import RugbyPitch from '../RugbyPitch';
import TeamCounters from '../TeamCounters';
import ResumenFecha from '../ResumenFecha';

import { PITCH_POSITIONS } from '../../constants/pitchPositions';

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
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activePlayerMenu, setActivePlayerMenu] = useState(null);

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
          let idx = PITCH_POSITIONS.findIndex(pos => pos.label.toUpperCase() === p.posicion?.toUpperCase());
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
        const normalized = players.map(p => {
          let cKey = 'pre'; // Fallback a 'pre'
          const rawCat = (p.categoria || '').toLowerCase();
          if (rawCat.includes('superior') || rawCat.includes('primera') || rawCat.includes('1ra')) cKey = 'primera';
          else if (rawCat.includes('intermedia') || rawCat.includes('inter')) cKey = 'intermedia';
          else if (rawCat.includes('pre')) cKey = 'pre';
          return { ...p, categoryKey: cKey };
        });
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
  
  // -- NEW: Time-based Market Lock Logic --
  const isMarketClosed = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const hour = now.getHours();
    const min = now.getMinutes();

    // Viernes 23:59:59 -> Lunes 00:00:00
    if (day === 6 || day === 0) return true; // Sábado o Domingo
    if (day === 5 && hour === 23 && min === 59) return true; // Viernes casi medianoche (simplificado)
    // Para ser exactos: si es viernes y ya pasó la medianoche? No, el día cambia a sábado a las 00:00.
    return false;
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isLocked = activeFecha?.estado === 'en_juego' || activeFecha?.estado === 'finalizada' || isMarketClosed;

  const isComplete = isAdmin 
    ? selectedPlayers.length === 15 
    : (selectedPlayers.length === 15 && counts.primera === 5 && counts.intermedia === 5 && counts.pre === 5);

  const canSave = selectedPlayers.length > 0 && !isLocked;

  // D&D Handlers
  const handleDragStart = (e, playerId) => {
    if (!isEditing || isLocked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('playerId', String(playerId));
    e.currentTarget.classList.add('opacity-40');
    setIsDragging(true);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-40');
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

  const handleDrop = (e, index) => {
    e.preventDefault();
    e.currentTarget.classList.remove('scale-125', 'border-yellow-400', 'border-solid', 'bg-yellow-400/20', 'z-50');
    e.currentTarget.classList.add('border-dashed', 'border-white/20');
    
    if (!isEditing || isLocked) return;

    const playerId = e.dataTransfer.getData('playerId');
    const player = convocados.find(p => String(p.id) === playerId);
    if (player) {
      assignToSlot(player, index);
    }
    setSelectedPosition(null);
    setIsDragging(false);
  };

  const assignToSlot = (player, index) => {
    // NUEVA REGLA: El jugador solo puede ir en su posición oficial de la convocatoria
    const targetLabel = PITCH_POSITIONS[index].label;
    // Comprobación de posición oficial (insensible a mayúsculas/minúsculas)
    // Saltamos esta restricción si el usuario es Admin (God Mode)
    if (!isAdmin && player.posicion && 
        player.posicion.toLowerCase() !== 'jugador' && 
        player.posicion.toLowerCase() !== targetLabel.toLowerCase()) {
      setError(`¡Atención! No podés poner a ${player.nombre} en esta posición porque en esta fecha jugará de ${player.posicion}.`);
      setSelectedPosition(null);
      setActivePlayerMenu(null);
      return;
    }

    // Rule: One player can only be in one slot
    const alreadyInSlotIdx = pitchSlots.findIndex(p => p && p.id === player.id);
    const newSlots = [...pitchSlots];
    
    // If moving from another slot, clear it
    if (alreadyInSlotIdx !== -1) {
      newSlots[alreadyInSlotIdx] = null;
    }

    // Check category limit before adding if not already in the team (Skipped for Admin)
    if (alreadyInSlotIdx === -1 && !isAdmin) {
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
    setActivePlayerMenu(null);
  };

  const removeFromSlot = (e, index) => {
    e.stopPropagation();
    const newSlots = [...pitchSlots];
    newSlots[index] = null;
    setPitchSlots(newSlots);
  };

  const handlePositionClick = (index) => {
    if (!isEditing || isLocked) return;

    // Si ya hay un jugador seleccionado (Selección Cruzada: Jugador -> Puesto)
    if (activePlayerMenu) {
      assignToSlot(activePlayerMenu, index);
      setActivePlayerMenu(null);
      setSelectedPosition(null);
      return;
    }

    if (pitchSlots[index]) {
      removeFromSlot({ stopPropagation: () => {} }, index);
    } else {
      setActiveSlotIndex(index);
      setIsSelectorOpen(true);
      setSelectedPosition(selectedPosition === index ? null : index);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;

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
      setIsEditing(false); // Salir de modo edición tras guardar
      setTimeout(() => setSuccess(false), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Error al guardar. Intentá de nuevo.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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

  if (activeFecha.estado === 'finalizada') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-neutral/20 shadow-sm px-6 py-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-black text-primary text-lg leading-tight">Fecha {activeFecha.numero_fecha} — vs {activeFecha.rival}</h2>
            <p className="text-xs font-bold text-neutral uppercase tracking-widest">Resultados publicados</p>
          </div>
          <span className="ml-auto text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1.5 rounded-xl border border-green-200">
            FINALIZADA
          </span>
        </div>
        <ResumenFecha activeFecha={activeFecha} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 md:p-8 rounded-3xl border border-neutral/20 shadow-xl overflow-hidden relative">
            {!isEditing && !isLocked && selectedPlayers.length > 0 && (
                <div className="absolute top-0 right-0 bg-primary/5 px-4 py-1 rounded-bl-xl border-l border-b border-primary/10 text-[9px] font-black text-primary/40 uppercase tracking-widest">
                  Modo Lectura
                </div>
            )}
            <div className="space-y-0.5">
          <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tighter leading-none">
            {profile?.team_name || 'Mi Dream Team'}
          </h2>
          <div className="flex items-center gap-2">
             <span className="bg-accent text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Matchday</span>
             <p className="text-xs md:text-base font-bold text-neutral truncate">vs {activeFecha.rival}</p>
             <div className="ml-4 h-5 w-[1px] bg-neutral/10"></div>
             <p className="text-xs font-black text-primary/60">
                {selectedPlayers.length} / 15 <span className="hidden sm:inline">JUGADORES</span>
             </p>
          </div>
        </div>
        
        <div className="flex items-center">
           {isComplete ? (
             <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase bg-green-500 px-3 py-1.5 rounded-xl shadow-lg border border-white/20">
               <CheckCircle className="w-3 h-3" />
               EQUIPO COMPLETO ✅
             </div>
           ) : (
             <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase bg-neutral-light px-3 py-1.5 rounded-xl border border-neutral/20 whitespace-nowrap">
                  <Info className="w-3 h-3 text-accent" />
                  Faltan {15 - selectedPlayers.length} jugadores
                </div>
                {!isAdmin && selectedPlayers.length === 15 && !isComplete && (
                  <p className="text-[8px] font-black text-red-500 uppercase">Deben ser 5-5-5</p>
                )}
             </div>
           )}
        </div>
      </div>

      {isLocked && (
        <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-2xl flex items-center gap-4 animate-pulse-slow shadow-sm">
           <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <Lock className="w-6 h-6 text-white" />
           </div>
           <div>
              <p className="text-sm font-black text-yellow-800 uppercase tracking-tight">⛔ Mercado cerrado - Fecha en disputa</p>
              <p className="text-xs font-bold text-yellow-700/80">
                {isMarketClosed 
                  ? "El mercado cierra los viernes a las 23:59. Podrás editar tu equipo nuevamente el Lunes."
                  : "La fecha ya comenzó. No podés realizar cambios en tu alineación."
                }
              </p>
           </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-600 p-5 rounded-3xl flex items-center gap-4 animate-shake shadow-md font-black text-sm">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-white border-2 border-green-500 text-green-600 p-5 rounded-3xl flex items-center gap-4 animate-fade-in shadow-xl font-black text-sm">
          <CheckCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p>¡Progreso guardado correctamente!</p>
            <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">No olvides completar tus 15 antes del viernes 23:59</p>
          </div>
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
            <div className="flex bg-neutral-light/50 p-1 md:p-1.5 gap-1">
               {['Primera', 'Intermedia', 'Pre-intermedia'].map(cat => (
                 <button
                   key={cat}
                   onClick={() => setRefCategory(cat)}
                   className={`flex-1 py-1.5 md:py-3 text-[9px] md:text-xs font-black uppercase tracking-widest transition-all rounded-xl md:rounded-2xl ${
                     refCategory === cat ? 'bg-primary text-white shadow-md' : 'text-neutral hover:bg-white'
                   }`}
                 >
                   {cat === 'Pre-intermedia' ? 'Pre' : cat}
                 </button>
               ))}
            </div>
            
            <div className="p-3 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center">
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
            <div className="lg:col-span-7 bg-white rounded-[2rem] border border-neutral/20 shadow-2xl p-6 relative overflow-hidden flex flex-col items-center">
              <div className="absolute inset-0 bg-neutral-light/10 pointer-events-none"></div>
              
              <div className="relative z-10 w-full mb-6 flex items-center justify-between px-2">
                 <h4 className="font-black text-primary text-sm uppercase tracking-[0.2em]">
                    {profile?.team_name ? `DIAGRAMA: ${profile.team_name.toUpperCase()}` : 'TU PIZARRA INTERACTIVA'}
                 </h4>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isComplete ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neutral-light opacity-50'}`}></span>
                    <span className="text-[10px] font-black text-neutral uppercase">Estado: {isComplete ? 'COMPLETO' : 'EN PROCESO'}</span>
                  </div>
              </div>

              {error && error.includes('Atención') && (
                <div className="relative z-20 w-full mb-6 bg-red-50 border-2 border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-shake shadow-md font-bold text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 font-black text-lg">×</button>
                </div>
              )}

              <div 
                className="relative w-full max-w-md mx-auto rounded-3xl border-[6px] border-neutral-light/50 overflow-hidden shadow-2xl transition-all duration-500 bg-[#1B4D3E]"
                style={{ aspectRatio: '2/3.2' }}
              >
                <div className="absolute inset-x-0 top-0 h-[10%] bg-white/5 border-b border-white/20"></div>
                <div className="absolute inset-x-0 bottom-0 h-[10%] bg-white/5 border-t border-white/20"></div>
                <div className="absolute inset-x-0 top-1/2 -mt-[1px] border-t-[3px] border-white/30"></div>
                <div className="absolute inset-x-0 top-[22%] border-t-[2px] border-white/25"></div>
                <div className="absolute inset-x-0 top-[78%] border-t-[2px] border-white/25"></div>

                {PITCH_POSITIONS.map((pos, i) => {
                  const player = pitchSlots[i];
                  const isSelected = selectedPosition === i;
                  
                  return (
                    <div
                      key={i}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[34px] h-[34px] sm:w-[54px] sm:h-[54px] transition-all duration-300 ${
                         isSelected && !player ? 'scale-125' : ''
                      }`}
                      style={{ top: pos.top, left: pos.left }}
                      onClick={() => handlePositionClick(i)}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, i)}
                    >
                      {player ? (
                        <div className={`flex flex-col ${
                          parseFloat(pos.left) > 80 ? 'items-end' : 
                          parseFloat(pos.left) < 20 ? 'items-start' : 
                          'items-center'
                        }`}>
                          <div 
                            draggable
                            onDragStart={(e) => handleDragStart(e, player.id)}
                            onDragEnd={handleDragEnd}
                            className="w-8 h-8 sm:w-12 sm:h-12 bg-primary border-2 sm:border-[3px] border-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl relative group animate-pop-in"
                          >
                            <span className="text-[9px] sm:text-xs font-black text-white">{i + 1}</span>
                            
                            <button 
                              onClick={(e) => removeFromSlot(e, i)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 border-2 border-white"
                            >
                              ×
                            </button>
                          </div>
                          
                          <div 
                            className={`mt-1 text-white font-black uppercase player-name-full ${
                              parseFloat(pos.left) > 80 ? 'text-right' : 
                              parseFloat(pos.left) < 20 ? 'text-left' : 
                              'text-center'
                            }`}
                            style={{ 
                              fontSize: '7px',
                              lineHeight: '0.9',
                              maxWidth: '65px',
                              textShadow: '0 1px 2px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.5)',
                              width: 'max-content'
                            }}
                          >
                             {player.nombre}
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

            <div className="lg:col-span-5 flex flex-col gap-4 h-[700px] lg:h-auto">
              <div className="bg-white rounded-3xl border border-neutral/20 shadow-xl overflow-hidden flex flex-col flex-1">
                <div className="p-5 border-b border-neutral/20 bg-primary/5 space-y-4">
                  <div className="flex bg-neutral-light p-1 rounded-xl border border-neutral/20">
                     {[
                       { id: 'primera', label: '1era' },
                       { id: 'intermedia', label: 'Inter' },
                       { id: 'pre', label: 'Pre' }
                     ].map(cat => (
                       <button
                         key={cat.id}
                         onClick={() => setPoolCategory(cat.id)}
                         className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${
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
                      const isMenuOpen = activePlayerMenu?.id === player.id;
                      const isSelected = !!selectedPlayers.find(s => s.id === player.id);
                      const initials = player.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                      
                      return (
                        <div key={player.id} className="relative">
                          <div
                            draggable={!isSelected}
                            onDragStart={(e) => handleDragStart(e, player.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
                              if (!isSelected) {
                                  // Si ya hay un slot en cancha seleccionado (Selección Cruzada: Puesto -> Jugador)
                                  if (selectedPosition !== null) {
                                     assignToSlot(player, selectedPosition);
                                     setSelectedPosition(null);
                                     setActivePlayerMenu(null);
                                  } else {
                                     // De lo contrario, abrir menú rápido / resaltar
                                     setActivePlayerMenu(activePlayerMenu?.id === player.id ? null : player);
                                  }
                              }
                            }}
                            className={`relative group flex items-center gap-2 p-1.5 rounded-lg border-2 transition-all cursor-pointer ${
                              isSelected 
                              ? 'bg-neutral-light/50 border-neutral/10 opacity-60 grayscale' 
                              : isMenuOpen
                                ? 'bg-yellow-50 border-yellow-300 shadow-md scale-[1.02]'
                                : 'bg-white border-neutral/10 hover:border-accent hover:shadow-md hover-shadow'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                              isSelected ? 'bg-neutral/20 text-neutral' : 'bg-primary/10 text-primary border-primary/20'
                            }`}>
                              <span className="text-[8px] font-black">{initials}</span>
                            </div>

                            <div className="min-w-0 flex-1 flex flex-col leading-tight">
                              <p className={`font-black uppercase text-[9px] whitespace-normal ${isSelected ? 'text-neutral' : 'text-primary'}`}>
                                {player.nombre}
                              </p>
                              <span className={`text-[7px] font-bold uppercase tracking-tighter truncate ${isSelected ? 'text-neutral/70' : 'text-accent'}`}>
                                {player.posicion || 'JUGADOR'}
                              </span>
                            </div>
                            
                            <div className="shrink-0 flex items-center justify-center">
                              {isSelected ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                   isMenuOpen ? 'bg-yellow-400 text-white animate-pulse' : 'bg-neutral-light text-primary group-hover:bg-accent group-hover:text-white'
                                }`}>
                                  <span className="text-xs font-black">+</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Assign Pop-over for Mi Equipo */}
                          {isMenuOpen && (
                            <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border-2 border-primary rounded-2xl shadow-2xl z-[60] p-2 animate-pop-in overflow-hidden max-h-[300px] flex flex-col">
                              <div className="p-2 border-b border-neutral/10 flex justify-between items-center bg-neutral-light/30">
                                <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Asignar a:</span>
                                <button onClick={(e) => { e.stopPropagation(); setActivePlayerMenu(null); }} className="text-neutral hover:text-red-500 font-bold px-2">×</button>
                              </div>
                              <div className="overflow-y-auto grid grid-cols-2 gap-1 p-1 custom-scrollbar">
                                {PITCH_POSITIONS.map((pos, idx) => {
                                  // Solo permitimos asignar si el puesto está vacío o si es la posición oficial del jugador
                                  const occupied = pitchSlots[idx];
                                  const isOfficialPos = player.posicion === pos.label;
                                  const isRestricted = player.posicion && player.posicion !== 'Jugador' && !isOfficialPos;

                                  return (
                                    <button
                                      key={idx}
                                      disabled={isRestricted}
                                      onClick={(e) => { e.stopPropagation(); assignToSlot(player, idx); }}
                                      className={`p-2 rounded-lg text-left transition-all flex items-center gap-2 group/item ${
                                        occupied || isRestricted
                                          ? 'bg-neutral-light opacity-50 cursor-not-allowed' 
                                          : 'hover:bg-primary hover:text-white'
                                      }`}
                                    >
                                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black border ${occupied ? 'border-neutral/30' : 'bg-primary/10 border-primary/20 group-hover/item:bg-white group-hover/item:text-primary'}`}>{idx + 1}</span>
                                      <div className="flex flex-col min-w-0">
                                        <span className={`text-[9px] font-bold truncate leading-none ${isOfficialPos ? 'text-accent group-hover/item:text-white' : ''}`}>{pos.label}</span>
                                        {occupied && <span className="text-[7px] opacity-70 italic">Ocupado</span>}
                                        {isOfficialPos && !occupied && <span className="text-[7px] text-accent group-hover/item:text-white/80 font-black">SU PUESTO</span>}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
              
              <div className="bg-primary p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-10">
                    <Trophy className="w-24 h-24" />
                 </div>
                 <h4 className="font-black text-lg mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5 text-accent" /> MODALIDAD GRAN DT
                 </h4>
                 <ul className="text-xs space-y-2 font-bold opacity-90">
                    <li>- Arrastrá los jugadores a su posición en la pizarra.</li>
                    <li>- **Sin límites de presupuesto**: Elegí a quienes quieras.</li>
                    <li>- **Regla 5-5-5**: Elegí exactamente 5 por categoría.</li>
                    <li>- Respetá las posiciones oficiales de la convocatoria.</li>
                 </ul>
              </div>
              {/* Footer Actions */}
              <div className="sticky bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md p-4 -mx-4 border-t border-neutral/10 sm:relative sm:bg-transparent sm:border-none sm:p-0 sm:m-0 z-40 flex flex-col sm:flex-row gap-3">
                
                {!isEditing && !isLocked && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-4 px-6 rounded-2xl font-black tracking-widest transition-all flex items-center justify-center gap-3 border-2 bg-primary border-primary text-white shadow-xl hover:scale-[1.02] active:scale-95"
                  >
                    <Users className="w-5 h-5" />
                    EDITAR MI EQUIPO
                  </button>
                )}

                {(isEditing || isLocked || selectedPlayers.length === 0) && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !canSave || isLocked || !isEditing}
                    className={`
                      flex-1 py-4 px-6 rounded-2xl font-black tracking-widest transition-all flex items-center justify-center gap-3 border-2 
                      ${canSave && !isLocked && isEditing
                        ? 'bg-accent border-accent text-white shadow-[0_0_20px_rgba(19,170,212,0.4)] scale-100 hover:scale-[1.02] active:scale-95' 
                        : 'bg-neutral-light border-neutral/10 text-neutral/40 cursor-not-allowed'
                      }
                      ${saving ? 'opacity-70' : ''}
                    `}
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isLocked 
                      ? 'MERCADO CERRADO' 
                      : (isComplete
                        ? '¡FINALIZAR Y GUARDAR EQUIPO!'
                        : (selectedPlayers.length === 0 ? 'ARMÁ TU EQUIPO' : `GUARDAR PROGRESO (${selectedPlayers.length}/15)`))}
                  </button>
                )}

                {isEditing && (
                  <button
                    onClick={() => {
                        setIsEditing(false);
                        window.location.reload(); // Recargar para revertir cambios no guardados
                    }}
                    className="py-4 px-6 rounded-2xl font-black tracking-widest transition-all bg-white border-2 border-neutral/10 text-neutral hover:bg-neutral-light"
                  >
                    CANCELAR
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* TACTICAL SELECTOR (Modal / Bottom Sheet) */}
      {isSelectorOpen && activeSlotIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-md" onClick={() => setIsSelectorOpen(false)}></div>
          
          <div className="relative w-full max-w-sm bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up sm:animate-pop-in border border-neutral/10">
            {/* Header */}
            <div className="bg-primary p-6 text-white relative">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 sm:hidden"></div>
              <h3 className="text-xl font-black uppercase tracking-tight text-center">
                Elegir {PITCH_POSITIONS[activeSlotIndex].label}
              </h3>
              <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] text-center mt-1">
                Designados por el Staff
              </p>
              <button 
                onClick={() => setIsSelectorOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Candidates List */}
            <div className="p-0 space-y-0 max-h-[70vh] overflow-y-auto bg-neutral-light/5">
              <div className="px-4 py-6">
                {convocados
                  .filter(p => p.posicion === PITCH_POSITIONS[activeSlotIndex].label)
                  .sort((a,b) => {
                    const order = { 'primera': 1, 'intermedia': 2, 'pre': 3 };
                    return order[a.categoryKey] - order[b.categoryKey];
                  })
                  .map(player => {
                    const alreadySelected = selectedPlayers.find(s => s.id === player.id);
                    // Si ya tenemos 5 de esa categoría, deshabilitar (a menos que ya esté en el equipo)
                    const catLimitReached = counts[player.categoryKey] >= 5 && !alreadySelected;
                    // Fix: Corrected precedence with !== and removed canAfford
                    const isDisabled = (alreadySelected && pitchSlots[activeSlotIndex]?.id !== player.id) || catLimitReached;

                    return (
                      <button
                        key={player.id}
                        disabled={isDisabled}
                        onClick={() => {
                          assignToSlot(player, activeSlotIndex);
                          setIsSelectorOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all mb-4 relative overflow-hidden group
                          ${alreadySelected 
                            ? 'bg-neutral-light border-neutral/10 opacity-60 grayscale' 
                            : catLimitReached
                              ? 'bg-neutral-light/30 border-neutral/10 opacity-60'
                              : isDisabled
                                ? 'bg-neutral-light/50 border-neutral/10 opacity-40 cursor-not-allowed'
                                : 'bg-white border-neutral/10 shadow-sm hover:border-accent hover:shadow-md active:scale-95'
                          }
                        `}
                      >
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 border
                          ${alreadySelected ? 'bg-neutral/20 text-neutral' : 'bg-primary/5 text-primary border-primary/5 group-hover:bg-accent group-hover:text-white transition-all'}
                        `}>
                           {player.categoryKey === 'primera' ? '1ra' : player.categoryKey === 'intermedia' ? 'Int' : 'Pre'}
                        </div>

                        <div className="flex-1 text-left min-w-0 pr-1">
                          <p className="font-black text-slate-900 text-sm leading-tight uppercase player-name-full group-hover:translate-x-0.5 transition-transform">
                            {player.nombre}
                          </p>
                          <p className="text-[9px] font-bold text-neutral opacity-50 uppercase tracking-widest mt-0.5">
                             {player.posicion}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center">
                          {alreadySelected ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : catLimitReached ? (
                            <div className="bg-yellow-50 text-yellow-600 text-[8px] font-black px-2.5 py-1.5 rounded-lg uppercase border border-yellow-200 shadow-sm">Cupo lleno</div>
                          ) : (
                            <div className="bg-accent/5 text-accent text-[8px] font-black px-3 py-1.5 rounded-lg uppercase border border-accent/20 group-hover:bg-accent group-hover:text-white transition-all">Elegir</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {(convocados || []).filter(p => p.posicion === PITCH_POSITIONS[activeSlotIndex].label).length === 0 && (
                <div className="py-12 text-center bg-neutral-light/20 rounded-3xl border-2 border-dashed border-neutral/20">
                   <p className="text-xs font-black text-neutral uppercase tracking-widest leading-loose">
                     ⚠️ El Staff aún no cargó los jugadores<br/>oficiales para este puesto.
                   </p>
                </div>
              )}
            </div>

            <div className="bg-neutral-light/50 p-4 text-center">
                 <p className="text-[9px] font-black text-neutral uppercase tracking-[0.3em]">REGLA 5-5-5: {counts.primera}/5 · {counts.intermedia}/5 · {counts.pre}/5</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
