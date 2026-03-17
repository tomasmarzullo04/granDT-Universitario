import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getActiveFecha, getConvocados } from '../../lib/api';
import { Save, Loader2, AlertCircle, CheckCircle, Search, Trophy, Info } from 'lucide-react';
import RugbyPitch from '../RugbyPitch';
import TeamCounters from '../TeamCounters';

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

  useEffect(() => {
    async function init() {
      const fecha = await getActiveFecha();
      setActiveFecha(fecha);
      if (fecha) {
        const players = await getConvocados(fecha.id);
        // Normalize categories for counters
        const normalized = players.map(p => ({
          ...p,
          categoryKey: p.categoria?.toLowerCase() || ''
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
    if (profile.team_name && profile.team_name !== 'Admin Team') return `Tu Equipo: ${profile.team_name}`;
    return `Equipo de ${profile.full_name || 'Nuevo Socio'}`;
  }, [profile]);

  const counts = useMemo(() => {
    const res = { primera: 0, intermedia: 0, pre: 0 };
    selectedPlayers.forEach(p => {
      if (p.categoryKey.includes('primera')) res.primera++;
      else if (p.categoryKey.includes('intermedia')) res.intermedia++;
      else if (p.categoryKey.includes('pre')) res.pre++;
    });
    return res;
  }, [selectedPlayers]);

  const togglePlayer = (player) => {
    const isSelected = selectedPlayers.find(p => p.id === player.id);
    if (isSelected) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
      return;
    }

    if (selectedPlayers.length >= 15) {
      setError('Ya seleccionaste el máximo de 15 jugadores.');
      return;
    }

    // Validation: 5 per category
    const cat = player.categoryKey;
    if (cat.includes('primera') && counts.primera >= 5) {
      setError('Solo podés elegir 5 de Primera.');
      return;
    }
    if (cat.includes('intermedia') && counts.intermedia >= 5) {
      setError('Solo podés elegir 5 de Intermedia.');
      return;
    }
    if (cat.includes('pre') && counts.pre >= 5) {
      setError('Solo podés elegir 5 de Pre-intermedia.');
      return;
    }

    setError(null);
    setSelectedPlayers(prev => [...prev, player]);
  };

  const handleSave = async () => {
    if (selectedPlayers.length !== 15) {
      setError(`Debes elegir exactamente 15 jugadores (tienes ${selectedPlayers.length}).`);
      return;
    }
    if (counts.primera !== 5 || counts.intermedia !== 5 || counts.pre !== 5) {
      setError('Debes cumplir la regla 5-5-5 (5 de cada categoría).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Clear previous
      await supabase
        .from('equipos_usuarios')
        .delete()
        .match({ usuario_id: user.id, fecha_id: activeFecha.id });

      // Insert new
      const inserts = selectedPlayers.map(p => ({
        usuario_id: user.id,
        fecha_id: activeFecha.id,
        jugador_id: p.id,
        es_capitan: false // Default to false for now
      }));

      const { error: insertErr } = await supabase.from('equipos_usuarios').insert(inserts);
      if (insertErr) throw insertErr;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Error al guardar tu equipo.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredList = convocados.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) && 
    !selectedPlayers.find(s => s.id === p.id)
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  if (!activeFecha) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-neutral/20 shadow-xl">
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 opacity-20" />
        <h2 className="text-2xl font-black text-primary mb-2">No hay fecha abierta</h2>
        <p className="text-neutral mb-6">Estamos esperando que el Admin abra la convocatoria para el próximo partido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">
            {!profile ? (
              <span className="opacity-20 animate-pulse">Cargando equipo...</span>
            ) : (
              displayTeamName
            )}
          </h2>
          <p className="text-sm font-bold text-neutral uppercase tracking-widest mt-1">
            Matchday vs {activeFecha.rival}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || selectedPlayers.length !== 15}
          className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-2xl font-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Guardar Equipo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-shake shadow-sm font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-2 border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm font-bold">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ¡Equipo guardado con éxito!
        </div>
      )}

      <TeamCounters counts={counts} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pitch Area */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral/20 shadow-xl p-4 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
             <h3 className="font-black text-primary text-lg uppercase tracking-tight">Cancha</h3>
             <span className="bg-neutral-light px-3 py-1 rounded-full text-xs font-bold text-neutral">
               {selectedPlayers.length}/15 jugadores
             </span>
          </div>
          <RugbyPitch players={selectedPlayers} />
          
          <div className="mt-6 space-y-3">
             <h4 className="font-bold text-primary text-sm uppercase tracking-wide px-2">Mis Seleccionados</h4>
             <div className="flex flex-wrap gap-2">
                {selectedPlayers.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => togglePlayer(p)}
                    className="bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-red-600 transition-colors"
                  >
                    {p.nombre} <span>×</span>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Players List Area */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral/20 shadow-xl overflow-hidden flex flex-col max-h-[700px]">
          <div className="p-4 border-b border-neutral/20 bg-neutral-light/30">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral/30 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredList.map(player => (
              <button
                key={player.id}
                onClick={() => togglePlayer(player)}
                className="w-full text-left p-4 rounded-2xl border border-neutral/10 hover:border-accent hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="font-black text-primary group-hover:text-accent transition-colors">{player.nombre}</p>
                  <p className="text-[10px] text-neutral font-bold uppercase tracking-widest mt-0.5">{player.categoria}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-neutral-light flex items-center justify-center text-primary group-hover:bg-accent group-hover:text-white transition-all font-black">
                  +
                </div>
              </button>
            ))}
            {filteredList.length === 0 && (
              <div className="p-8 text-center opacity-40">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-bold">No quedan jugadores para mostrar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
