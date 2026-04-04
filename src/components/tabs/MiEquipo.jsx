import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveFecha, getConvocados, archiveTeamSnapshot, isWaitingMode, isSelectionWindowClosed, isTransitionMode } from '../../lib/api';
import { Save, Loader2, AlertCircle, CheckCircle, Search, Trophy, Info, Users, BarChart2, Lock, Crown } from 'lucide-react';
import RugbyPitch from '../RugbyPitch';
import TeamCounters from '../TeamCounters';
import ResumenFecha from '../ResumenFecha';

import { PITCH_POSITIONS } from '../../constants/pitchPositions';

export default function MiEquipo() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const forceOpen = searchParams.get('force_open') === 'true';
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
  const [captainId, setCaptainId] = useState(null);
  const [isCaptainSelectorOpen, setIsCaptainSelectorOpen] = useState(false);

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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let currentSquad = [];
      let currentSelection = [];
      let finalCaptainId = null;

      // 1. Si hay fecha activa, intentar traer convocados
      if (fecha) {
        const players = await getConvocados(fecha.id);
        currentSquad = players.map(p => {
          let cKey = 'pre';
          const rawCat = (p.categoria || '').toLowerCase();
          if (rawCat.includes('pre')) cKey = 'pre';
          else if (rawCat.includes('superior') || rawCat.includes('primera') || rawCat.includes('1ra')) cKey = 'primera';
          else if (rawCat.includes('intermedia') || rawCat.includes('inter')) cKey = 'intermedia';
          return { ...p, categoryKey: cKey };
        });
        setConvocados(currentSquad);

        const { data: selection } = await supabase
          .from('equipos_usuarios')
          .select('jugador_id, posicion_cancha, capitan_id')
          .eq('usuario_id', user.id)
          .eq('fecha_id', fecha.id);
        
        currentSelection = selection || [];
      }

      // 2. Si hay selección para la fecha actual, cargarla
      if (currentSelection.length > 0) {
        finalCaptainId = currentSelection[0].capitan_id;
        const newSlots = Array(15).fill(null);
        currentSelection.forEach(s => {
          const p = currentSquad.find(p => p.id === s.jugador_id);
          if (p && s.posicion_cancha >= 1 && s.posicion_cancha <= 15) {
            newSlots[s.posicion_cancha - 1] = p;
          }
        });
        setPitchSlots(newSlots);
        setCaptainId(finalCaptainId);
      } else {
        // 3. FALLBACK: Si no hay selección actual (o estamos en espera/transición), buscar la última fecha con equipo
        const { data: lastTeamSelection } = await supabase
          .from('equipos_usuarios')
          .select('jugador_id, posicion_cancha, capitan_id, fecha_id')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        if (lastTeamSelection && lastTeamSelection.length > 0) {
          const lastFechaId = lastTeamSelection[0].fecha_id;
          // Necesitamos las estadísticas o info de esos jugadores históricos
          const lastPlayerIds = lastTeamSelection.map(s => s.jugador_id);
          const { data: lastPlayersData } = await supabase
            .from('jugadores')
            .select('id, nombre, precio')
            .in('id', lastPlayerIds);

          if (lastPlayersData) {
            finalCaptainId = lastTeamSelection[0].capitan_id;
            const newSlots = Array(15).fill(null);
            lastTeamSelection.forEach(s => {
              const p = lastPlayersData.find(x => x.id === s.jugador_id);
              if (p && s.posicion_cancha >= 1 && s.posicion_cancha <= 15) {
                // Mock category information for historical view if not available
                newSlots[s.posicion_cancha - 1] = { ...p, categoryKey: 'primera' }; 
              }
            });
            setPitchSlots(newSlots);
            setCaptainId(finalCaptainId);
            console.log('🔄 Fallback: Cargado equipo de la fecha ID:', lastFechaId);
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
      const key = p.categoryKey;
      if (res.hasOwnProperty(key)) {
        res[key]++;
      }
    });
    return res;
  }, [selectedPlayers]);
  
  // ── CICLO SEMANAL: Lógica de bloqueo ──
  const isMarketClosed = useMemo(() => forceOpen ? false : isSelectionWindowClosed(), [forceOpen]);
  const isTransition = useMemo(() => forceOpen ? false : isTransitionMode(activeFecha), [activeFecha, forceOpen]);

  // Snapshot automático al entrar en modo transición (miércoles)
  useEffect(() => {
    async function triggerSnapshotIfNeeded() {
      if (isTransition && activeFecha && profile && pitchSlots.some(Boolean)) {
        if (activeFecha.estado === 'abierta' || activeFecha.estado === 'en_juego') {
          try {
            const playerIds = pitchSlots.map(p => p ? p.id : null).filter(Boolean);
            if (playerIds.length > 0) {
              await archiveTeamSnapshot(profile.id, activeFecha.numero_fecha, activeFecha.id, playerIds, 0);
              console.log('Snapshot automático de transición guardado.');
            }
          } catch (err) {
            console.error('Error al disparar snapshot automático:', err);
          }
        }
      }
    }
    triggerSnapshotIfNeeded();
  }, [isTransition, activeFecha, profile, pitchSlots]);

  const isAdmin = profile?.role === 'admin';
  const isWaiting = useMemo(() => forceOpen ? false : isWaitingMode(activeFecha), [activeFecha, forceOpen]);
  const isLocked = activeFecha?.estado === 'en_juego' || isMarketClosed || isTransition;

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

      // Solo guardamos el capitan_id si ese jugador realmente está en el equipo actual
      const currentCaptainInTeam = pitchSlots.find(p => p && p.id === captainId);
      const finalCaptainId = currentCaptainInTeam ? captainId : null;

      const inserts = pitchSlots.map((p, idx) => p ? ({
        usuario_id: user.id,
        fecha_id: activeFecha.id,
        jugador_id: p.id,
        posicion_cancha: idx + 1,
        capitan_id: finalCaptainId
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

  // El overlay gigante ha sido eliminado para permitir el modo lectura.

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
          <h2 className="text-3xl md:text-5xl font-bebas text-primary tracking-wide leading-none uppercase">
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
             <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.6)] border border-green-400 animate-pulse-slow transition-all">
               <CheckCircle className="w-4 h-4" />
               EQUIPO LISTO ✅
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

      {/* Banner dinámico de estado */}
      {isTransition ? (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
               <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-tight">⏳ Esperando carga de planteles</p>
              <p className="text-[10px] font-bold text-amber-700/70 uppercase">Podés consultar tu historial o planteles anteriores mientras tanto.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.search = '?tab=historial'}
            className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            IR AL HISTORIAL COMPLETO
          </button>
        </div>
      ) : isLocked ? (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm animate-fade-in">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-black text-red-900 uppercase tracking-tight">🔒 Ventana de Selección Cerrada</p>
            <p className="text-[10px] font-bold text-red-700/70 uppercase">La fecha está en juego o los resultados se están procesando.</p>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm animate-fade-in">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-black text-green-900 uppercase tracking-tight">✅ Mercado Abierto</p>
            <p className="text-[10px] font-bold text-green-700/70 uppercase">Armá tu 15 ideal. Cierra el viernes a las 23:59.</p>
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
      {!isWaiting && (
        <div className="space-y-4 animate-fade-in">
           <div className="flex items-center gap-3 px-2">
              <Trophy className="w-5 h-5 text-accent" />
              <h3 className="text-2xl font-bebas text-primary uppercase tracking-wide">Identidad & Convocados</h3>
           </div>
           <p className="text-sm text-neutral font-bold px-2 -mt-2">Diagrama oficial y jugadores disponibles dictados por el Staff.</p>
           
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
                 <div className="flex flex-col h-full bg-neutral-light/20 rounded-2xl relative overflow-hidden border border-neutral/10">
                    {/* Banner Identidad */}
                    <div className="bg-primary relative h-24 sm:h-28 flex items-center justify-between px-6 overflow-hidden">
                       <div className="z-10 bg-white p-1.5 md:p-2 rounded-xl shadow-lg border border-white/20 transform -rotate-3 hover:rotate-0 transition-transform">
                          <img src="/escudo.jpg" alt="Club Universitario" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                       </div>
                       <div className="z-10 flex flex-col items-end">
                          <span className="text-[10px] md:text-xs font-black text-white/60 uppercase tracking-widest">Plantel Oficial</span>
                          <h4 className="font-bebas text-accent text-xl md:text-3xl tracking-wide uppercase leading-none">
                             {refCategory}
                          </h4>
                       </div>
                       {/* Pelota asomándose */}
                       <img 
                         src="/rugby_ball.jpg" 
                         alt="Gilbert" 
                         className="absolute -right-8 -bottom-10 w-40 md:w-48 opacity-[0.25] transform -rotate-[15deg] mix-blend-multiply pointer-events-none" 
                       />
                    </div>
                    
                    {/* Lista */}
                    <div className="p-4 flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                         {officialTeams[refCategory]?.some(p => p !== null) ? (
                           officialTeams[refCategory].map((p, idx) => {
                             if (!p) return null;
                             return (
                               <div key={p.id || idx} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-neutral/10 shadow-sm hover:scale-[1.025] transition-transform duration-200 group">
                                  <span className="w-6 h-6 bg-primary text-white text-[10px] font-black rounded-md flex items-center justify-center shrink-0 group-hover:bg-accent transition-colors">
                                     {idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-primary truncate leading-none">{p.nombre || 'Jugador'}</span>
                               </div>
                             );
                           })
                         ) : (
                           <div className="col-span-2 py-10 text-center bg-white/40 rounded-2xl border border-dashed border-neutral/20">
                              <p className="text-xs font-black text-neutral uppercase tracking-widest">Aún no hay convocados</p>
                           </div>
                         )}
                      </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="h-[2px] bg-gradient-to-r from-transparent via-neutral/20 to-transparent my-8"></div>

      {/* TEAM SELECTION AREA */}
      <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <h3 className="text-2xl font-bebas text-primary uppercase tracking-wide">Armá tu 15 Ideal</h3>
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
                className={`relative w-full max-w-md mx-auto rounded-xl border-2 border-[#12362b] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] transition-all duration-500 pitch-grass ${!isEditing && !isLocked && selectedPlayers.length > 0 ? 'opacity-80 saturate-50 cursor-not-allowed' : ''}`}
                style={{ aspectRatio: '2/3.2' }}
              >
                {/* Pitch Markings (Chalk Lines) */}
                <div className="absolute inset-x-2 inset-y-2 border-2 border-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)] pointer-events-none z-0"></div>
                <div className="absolute inset-x-2 top-1/2 -mt-[1px] border-t-2 border-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)] pointer-events-none z-0"></div>
                
                {/* 10m lines */}
                <div className="absolute inset-x-2 top-[40%] border-t-[1.5px] border-dashed border-white/60 pointer-events-none z-0"></div>
                <div className="absolute inset-x-2 top-[60%] border-t-[1.5px] border-dashed border-white/60 pointer-events-none z-0"></div>

                {/* 22m lines */}
                <div className="absolute inset-x-2 top-[22%] border-t-2 border-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)] pointer-events-none z-0"></div>
                <div className="absolute inset-x-2 top-[78%] border-t-2 border-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)] pointer-events-none z-0"></div>
                
                {/* Floating Captain Button */}
                {!isLocked && isEditing && selectedPlayers.length > 0 && (
                  <button
                    onClick={() => setIsCaptainSelectorOpen(true)}
                    className="absolute top-4 right-4 z-30 bg-yellow-500 hover:bg-yellow-400 text-primary p-2 rounded-2xl shadow-xl border-2 border-white/50 transition-all hover:scale-110 active:scale-95 group flex items-center justify-center min-w-[44px] min-h-[44px]"
                    title="Seleccionar Capitán"
                  >
                    <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-inner">
                       <span className="text-primary font-black text-lg leading-none">C</span>
                    </div>
                    <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-white/10 uppercase tracking-widest">
                      Elegir Capitán
                    </span>
                  </button>
                )}
                
                {/* 5m lines (dashed) */}
                <div className="absolute inset-x-2 top-[5%] border-t border-dashed border-white/50 pointer-events-none z-0"></div>
                <div className="absolute inset-x-2 top-[95%] border-t border-dashed border-white/50 pointer-events-none z-0"></div>
                
                {/* Numbering */}
                <span className="absolute top-[22%] left-4 text-white/30 font-bebas text-2xl -translate-y-1/2 pointer-events-none z-0 select-none">22</span>
                <span className="absolute top-[78%] left-4 text-white/30 font-bebas text-2xl -translate-y-1/2 rotate-180 pointer-events-none z-0 select-none">22</span>
                <span className="absolute top-[40%] left-4 text-white/20 font-bebas text-xl -translate-y-1/2 pointer-events-none z-0 select-none">10</span>
                <span className="absolute top-[60%] left-4 text-white/20 font-bebas text-xl -translate-y-1/2 rotate-180 pointer-events-none z-0 select-none">10</span>
                <span className="absolute top-[50%] left-4 text-white/20 font-bebas text-xl -translate-y-1/2 pointer-events-none z-0 select-none">50</span>

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
                            className={`w-8 h-8 sm:w-12 sm:h-12 bg-primary border-[2.5px] border-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing font-bebas tracking-wide sm:text-lg relative group animate-pop-in z-10 transition-shadow ${isEditing && !isLocked ? 'glow-hover shadow-[0_4px_6px_rgba(0,0,0,0.6)]' : 'shadow-[0_4px_6px_rgba(0,0,0,0.6)]'}`}
                          >
                            <span className="text-[12px] sm:text-[16px] font-black text-white">{i + 1}</span>
                            
                            {/* Captain Badge */}
                            {player.id === captainId && (
                              <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg z-30 animate-bounce-subtle">
                                <span className="text-[8px] sm:text-[10px] font-black text-primary">C</span>
                              </div>
                            )}
                            
                            {isEditing && !isLocked && (
                                <button 
                                  onClick={(e) => removeFromSlot(e, i)}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 border-2 border-white"
                                >
                                  ×
                                </button>
                            )}
                          </div>
                          
                          <div 
                            className={`mt-1 font-bold uppercase player-name-full tracking-tight ${
                              parseFloat(pos.left) > 80 ? 'text-right' : 
                              parseFloat(pos.left) < 20 ? 'text-left' : 
                              'text-center'
                            }`}
                            style={{ 
                              color: '#FFFFFF',
                              fontSize: '9px',
                              lineHeight: '1.1',
                              maxWidth: '75px',
                              textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,1), 1px 1px 1px rgba(0,0,0,1)',
                              width: 'max-content',
                              position: 'relative',
                              zIndex: 10
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
                          if (!isEditing || isLocked) return;
                          const idx = pitchSlots.findIndex(slot => slot && slot.id === p.id);
                          if (idx !== -1) removeFromSlot({ stopPropagation: () => {} }, idx);
                        }}
                        className={`text-white text-[9px] font-black px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md group border border-white/20 ${isEditing && !isLocked ? 'bg-primary hover:bg-red-600 hover:scale-[1.05]' : 'bg-primary/70 opacity-80 cursor-default'}`}
                      >
                        {p.nombre.toUpperCase()} 
                        {isEditing && !isLocked && <span className="text-white/60 group-hover:text-white transition-colors">×</span>}
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
                
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 grid grid-cols-2 gap-2 custom-scrollbar bg-neutral-light/20 content-start relative min-h-[400px]">
                  {isWaiting ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/50 backdrop-blur-sm z-20 animate-fade-in">
                       <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-primary/20 animate-pulse">
                          <Lock className="w-6 h-6 text-primary/30" />
                       </div>
                       <h5 className="font-black text-primary text-sm uppercase tracking-tighter mb-2">Cerrado por Preparación</h5>
                       <p className="text-[10px] font-bold text-neutral/60 uppercase tracking-widest leading-relaxed">
                          El Staff está definiendo los convocados para la próxima fecha.<br/>
                          <span className="text-accent font-black">La ventana de selección abrirá en breve.</span>
                       </p>
                       
                       <div className="mt-10 opacity-[0.05] grayscale pointer-events-none select-none">
                          <img src="https://nniwyswxojkalelavdnn.supabase.co/storage/v1/object/public/logos/gilbert_ball.png" alt="" className="w-32 h-32 object-contain" onError={(e) => e.target.style.display = 'none'} />
                       </div>
                    </div>
                  ) : (
                    convocados
                      .filter(p => 
                        p.categoryKey === poolCategory &&
                        p.nombre.toLowerCase().includes(search.toLowerCase())
                      )
                      .map(player => {
                        // ... current map logic ...
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
                                if (!isEditing || isLocked) return;
                                if (!isSelected) {
                                    if (selectedPosition !== null) {
                                       assignToSlot(player, selectedPosition);
                                       setSelectedPosition(null);
                                       setActivePlayerMenu(null);
                                    } else {
                                       setActivePlayerMenu(activePlayerMenu?.id === player.id ? null : player);
                                    }
                                }
                              }}
                              className={`relative group flex items-center gap-2 p-1.5 rounded-lg border-2 transition-all ${!isEditing || isLocked ? 'cursor-default' : 'cursor-pointer'} ${
                                isSelected 
                                ? 'bg-neutral-light/50 border-neutral/10 opacity-60 grayscale' 
                                : isMenuOpen
                                  ? 'bg-yellow-50 border-yellow-300 shadow-md scale-[1.02]'
                                  : `bg-white border-neutral/10 ${!isEditing || isLocked ? '' : 'hover:shadow-md hover-shadow hover:scale-[1.025] transition-transform duration-200'}`
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
                                ) : isEditing && !isLocked ? (
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                     isMenuOpen ? 'bg-yellow-400 text-white animate-pulse' : 'bg-neutral-light text-primary group-hover:bg-accent group-hover:text-white'
                                  }`}>
                                    <span className="text-xs font-black">+</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {isMenuOpen && (
                              <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border-2 border-primary rounded-2xl shadow-2xl z-[60] p-2 animate-pop-in overflow-hidden max-h-[300px] flex flex-col">
                                <div className="p-2 border-b border-neutral/10 flex justify-between items-center bg-neutral-light/30">
                                  <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Asignar a:</span>
                                  <button onClick={(e) => { e.stopPropagation(); setActivePlayerMenu(null); }} className="text-neutral hover:text-red-500 font-bold px-2">×</button>
                                </div>
                                <div className="overflow-y-auto grid grid-cols-2 gap-1 p-1 custom-scrollbar">
                                  {PITCH_POSITIONS.map((pos, idx) => {
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
                      })
                  )}
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
                     <li>- Elegí a tus 15 jugadores sin restricciones.</li>
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
                    EDITAR EQUIPO
                  </button>
                )}

                {(isEditing || isLocked || selectedPlayers.length === 0) && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !canSave || isLocked || !isEditing}
                    className={`
                      flex-1 py-4 px-6 rounded-2xl font-black tracking-widest transition-all flex items-center justify-center gap-3 border-2 
                      ${canSave && !isLocked && isEditing
                        ? 'bg-red-500 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-100 hover:scale-[1.02] active:scale-95' 
                        : 'bg-neutral-light border-neutral/10 text-neutral/40 cursor-not-allowed'
                      }
                      ${saving ? 'opacity-70' : ''}
                    `}
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isLocked 
                      ? (isWaiting ? 'PREPARANDO PRÓXIMA FECHA' : 'VENTANA CERRADA')
                      : (isComplete
                        ? '¡FINALIZAR EDICIÓN Y GUARDAR!'
                        : (selectedPlayers.length === 0 ? 'GUARDAR EQUIPO' : `GUARDAR PROGRESO (${selectedPlayers.length}/15)`))}
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
                                : 'bg-white border-neutral/10 shadow-sm hover:shadow-md hover:scale-[1.02] transition-transform duration-200 active:scale-95'
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
      {/* Captain Selection Modal */}
      {isCaptainSelectorOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-neutral/20 animate-pop-in">
            <div className="bg-primary p-6 relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/20">
                  <span className="text-primary font-black text-2xl">C</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bebas text-white tracking-wide uppercase leading-none">Elegí tu Capitán</h3>
                  <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mt-1">Puntuación Doble (x2)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCaptainSelectorOpen(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2"
              >
                ×
              </button>
              {/* Decoration */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-accent opacity-10 rounded-full blur-3xl"></div>
            </div>
            
            <div className="p-6">
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {selectedPlayers.length === 0 ? (
                  <div className="py-12 text-center text-neutral/40 font-bold uppercase text-xs">
                    Primero completá tu equipo
                  </div>
                ) : (
                  selectedPlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        setCaptainId(player.id);
                        setIsCaptainSelectorOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group ${
                        captainId === player.id 
                          ? 'bg-yellow-50 border-yellow-400 shadow-md' 
                          : 'bg-white border-neutral/10 hover:border-primary/20 hover:bg-neutral-light/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                        captainId === player.id ? 'bg-yellow-500 text-primary' : 'bg-primary/5 text-primary'
                      }`}>
                        {player.nombre.charAt(0)}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-black text-primary uppercase text-sm">{player.nombre}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${captainId === player.id ? 'text-yellow-600' : 'text-neutral/60'}`}>
                          {player.posicion || 'JUGADOR'}
                        </p>
                      </div>
                      {captainId === player.id && (
                        <CheckCircle className="w-6 h-6 text-yellow-500" />
                      )}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${captainId === player.id ? 'bg-yellow-500/20' : 'bg-primary/10'}`}>
                         <span className={`font-black text-sm ${captainId === player.id ? 'text-yellow-600' : 'text-primary/40'}`}>C</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              <div className="mt-6">
                 <button
                  onClick={() => setIsCaptainSelectorOpen(false)}
                  className="w-full py-4 bg-primary text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl hover:bg-primary-light transition-all active:scale-[0.98]"
                 >
                   Confirmar Selección
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
