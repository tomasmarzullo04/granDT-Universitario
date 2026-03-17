import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveFecha, getConvocados } from '../../lib/api';
import { Save, Loader2, AlertCircle, CheckCircle, Search, Trophy, Info, Users } from 'lucide-react';
import RugbyPitch from '../RugbyPitch';
import TeamCounters from '../TeamCounters';

const pitchPositionLabels = [
  'PILAR 1', 'HOOKER', 'PILAR 3', 'SEGUNDA 4', 'SEGUNDA 5',
  'TERCERA 6', 'OCTAVO', 'TERCERA 7', 'MEDIO SCRUM', 'APERTURA',
  '1ER CENTRO', '2DO CENTRO', 'WING IZQ.', 'WING DER.', 'FULLBACK'
];

export default function MiEquipo() {
  const { profile } = useAuth();
  const [activeFecha, setActiveFecha] = useState(null);
  const [convocados, setConvocados] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [refCategory, setRefCategory] = useState('Primera'); // 'Primera', 'Intermedia', 'Pre-intermedia'
  
  // Group official teams for reference (Mapped to pitch indices)
  const officialTeams = useMemo(() => {
    const teams = { Primera: Array(15).fill(null), Intermedia: Array(15).fill(null), 'Pre-intermedia': Array(15).fill(null) };
    convocados.forEach(p => {
      if (teams[p.categoria]) {
        // Find index based on the saved position label
        let idx = pitchPositionLabels.indexOf(p.posicion);
        if (idx === -1) {
            // Fallback to numeric if somehow saved differently
            idx = parseInt(p.posicion) - 1;
        }
        if (idx >= 0 && idx < 15) {
            teams[p.categoria][idx] = p;
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
        // Pool of selectable players (only those selected by Admin)
        const players = await getConvocados(fecha.id);
        
        // Normalize categories for counters and logic
        const normalized = players.map(p => ({
          ...p,
          categoryKey: p.categoria === 'Pre-intermedia' ? 'pre' : p.categoria?.toLowerCase() || ''
        }));
        setConvocados(normalized);

        // Fetch user's current selection
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: selection } = await supabase
            .from('equipos_usuarios')
            .select('jugador_id')
            .eq('usuario_id', user.id)
            .eq('fecha_id', fecha.id);
          
          if (selection && selection.length > 0) {
            const selectedIds = selection.map(s => s.jugador_id);
            // Reconstruct selected players from the pool
            const selected = normalized.filter(p => selectedIds.includes(p.id));
            setSelectedPlayers(selected);
          }
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  const displayTeamName = useMemo(() => {
    if (!profile) return 'Cargando equipo...';
    return profile.team_name || 'Mi Dream Team';
  }, [profile]);

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

  const togglePlayer = (player) => {
    const isSelected = selectedPlayers.find(p => p.id === player.id);
    if (isSelected) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
      setError(null);
      return;
    }

    if (selectedPlayers.length >= 15) {
      setError('Ya seleccionaste el máximo de 15 jugadores.');
      return;
    }

    // STRICT VALIDATION: 5 per category
    const cat = player.categoryKey;
    if (cat === 'primera' && counts.primera >= 5) {
      setError('¡Límite alcanzado! Solo podés elegir 5 jugadores de Primera.');
      return;
    }
    if (cat === 'intermedia' && counts.intermedia >= 5) {
      setError('¡Límite alcanzado! Solo podés elegir 5 jugadores de Intermedia.');
      return;
    }
    if (cat === 'pre' && counts.pre >= 5) {
      setError('¡Límite alcanzado! Solo podés elegir 5 jugadores de Pre-intermedia.');
      return;
    }

    setError(null);
    setSelectedPlayers(prev => [...prev, player]);
  };

  const handleSave = async () => {
    if (!isValid) {
      setError('Debes cumplir la regla 5-5-5 (5 de cada categoría) para sumar 15 jugadores.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Clear previous selection for this date
      await supabase
        .from('equipos_usuarios')
        .delete()
        .match({ usuario_id: user.id, fecha_id: activeFecha.id });

      // Insert new selection
      const inserts = selectedPlayers.map(p => ({
        usuario_id: user.id,
        fecha_id: activeFecha.id,
        jugador_id: p.id,
        es_capitan: false 
      }));

      const { error: insertErr } = await supabase.from('equipos_usuarios').insert(inserts);
      if (insertErr) throw insertErr;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Hubo un problema al guardar tu equipo. Intentá de nuevo.');
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
                     {officialTeams[refCategory].length > 0 ? (
                       officialTeams[refCategory].map((p, idx) => (
                         <div key={p.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-neutral/10 shadow-sm">
                            <span className="w-6 h-6 bg-primary text-white text-[10px] font-black rounded-md flex items-center justify-center shrink-0">
                               {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-primary truncate leading-none">{p.nombre}</span>
                         </div>
                       ))
                     ) : (
                       <p className="text-xs font-bold text-neutral col-span-2 py-4">No hay convocados para este plantel aún.</p>
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

          <TeamCounters counts={counts} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Pitch Selection View */}
            <div className="lg:col-span-7 bg-white rounded-[2rem] border border-neutral/20 shadow-2xl p-6 relative overflow-hidden flex flex-col items-center">
              <div className="absolute inset-0 bg-neutral-light/10 pointer-events-none"></div>
              <div className="relative z-10 w-full mb-6 flex items-center justify-between px-2">
                 <h4 className="font-black text-primary text-sm uppercase tracking-[0.2em]">Tu Pizarra</h4>
                 <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neutral-light opacity-50'}`}></span>
                    <span className="text-[10px] font-black text-neutral uppercase">Estado: {isValid ? 'LISTO' : 'EN PROCESO'}</span>
                 </div>
              </div>
              <RugbyPitch players={selectedPlayers} />
              
              <div className="mt-8 w-full">
                 <h4 className="font-black text-primary text-[10px] uppercase tracking-widest text-center mb-4">Jugadores Seleccionados ({selectedPlayers.length}/15)</h4>
                 <div className="flex flex-wrap justify-center gap-2">
                    {selectedPlayers.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => togglePlayer(p)}
                        className="bg-primary text-white text-[9px] font-black px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-600 hover:scale-[1.05] transition-all shadow-md group border border-white/20"
                      >
                        {p.nombre.toUpperCase()} 
                        <span className="text-white/60 group-hover:text-white transition-colors">×</span>
                      </button>
                    ))}
                    {selectedPlayers.length === 0 && (
                       <p className="text-xs font-bold text-neutral opacity-40 py-4 uppercase tracking-widest">Hacé clic en los jugadores de la lista</p>
                    )}
                 </div>
              </div>
            </div>

            {/* Selection Pool */}
            <div className="lg:col-span-5 flex flex-col gap-4 h-[600px] lg:h-auto">
              <div className="bg-white rounded-3xl border border-neutral/20 shadow-xl overflow-hidden flex flex-col flex-1">
                <div className="p-5 border-b border-neutral/20 bg-primary/5">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-neutral/30 rounded-2xl text-sm font-black text-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-neutral-light/20">
                  {filteredList.map(player => (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player)}
                      className="w-full text-left p-4 bg-white rounded-2xl border-2 border-transparent hover:border-accent hover:shadow-lg transition-all flex items-center justify-between group transform hover:-translate-y-0.5"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-primary group-hover:text-accent transition-colors truncate">{player.nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                              player.categoryKey === 'primera' ? 'bg-primary text-white' : 
                              player.categoryKey === 'intermedia' ? 'bg-accent text-white' : 
                              'bg-neutral-light text-primary'
                           }`}>
                              {player.categoria}
                           </span>
                           <span className="text-[8px] text-neutral font-bold uppercase tracking-widest">{player.posicion}</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-neutral-light flex items-center justify-center text-primary group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                        <span className="text-xl font-black group-hover:scale-110 transition-transform">+</span>
                      </div>
                    </button>
                  ))}
                  
                  {filteredList.length === 0 && convocados.length > 0 && (
                    <div className="p-12 text-center opacity-40 flex flex-col items-center">
                      <Trophy className="w-12 h-12 mb-4 text-primary" />
                      <p className="text-sm font-black uppercase tracking-widest leading-loose">
                        {search ? 'Sin coincidencias' : 'Todos seleccionados'}
                      </p>
                    </div>
                  )}
                  
                  {convocados.length === 0 && !loading && (
                    <div className="p-12 text-center text-neutral">
                       <p className="font-black italic">El administrador está armando los planteles...</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Rules Card */}
              <div className="bg-primary p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy className="w-24 h-24" />
                 </div>
                 <h4 className="font-black text-lg mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5 text-accent" /> REGLAS PRO
                 </h4>
                 <ul className="text-xs space-y-2 font-bold opacity-90">
                    <li className="flex gap-2"><span>-</span> <span>Elegí 5 de Primera, 5 de Intermedia y 5 de Pre.</span></li>
                    <li className="flex gap-2"><span>-</span> <span>Podés cambiar tu equipo hasta que cierre la fecha.</span></li>
                    <li className="flex gap-2"><span>-</span> <span>¡El ranking se actualiza automáticamente!</span></li>
                 </ul>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
