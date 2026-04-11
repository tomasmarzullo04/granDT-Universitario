import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  getAllFechas, 
  getAdminStatsData, 
  APP_STATUS, 
  getLiveStatus,
  SCORING,
  publicarResultadosFecha
} from '../../lib/api';
import { 
  Save, 
  Loader2, 
  Activity, 
  Search, 
  CheckCircle, 
  AlertCircle,
  Trophy,
  Rocket
} from 'lucide-react';

const STAT_FIELDS = [
  { key: 'tries',             label: 'Try',         pts: SCORING.TRY },
  { key: 'conversiones',      label: 'Conv',        pts: SCORING.CONVERSION },
  { key: 'penales',           label: 'Penal',       pts: SCORING.PENAL },
  { key: 'drops',             label: 'Drop',        pts: SCORING.DROP },
  { key: 'asistencias',       label: 'Asist',       pts: SCORING.ASISTENCIA },
  { key: 'tackles',           label: 'Tackle',      pts: SCORING.TACKLE },
  { key: 'tackles_ofensivos', label: 'Tackle Of.',  pts: SCORING.TACKLE_OFENSIVO },
  { key: 'recuperaciones',    label: 'Recuper.',    pts: SCORING.RECUPERACION },
  { key: 'cortes_limpios',    label: 'Corte L.',    pts: SCORING.CORTE_LIMPIO },
  { key: 'penales_hechos',    label: 'Penal Contra', pts: SCORING.PENALES_HECHOS },
  { key: 'amarillas',         label: 'Amarilla',    pts: SCORING.AMARILLA },
  { key: 'rojas',             label: 'Roja',        pts: SCORING.ROJA },
];

export default function ResultadosAdmin() {
    const [fechas, setFechas] = useState([]);
    const [selectedFecha, setSelectedFecha] = useState(null);
    const [status, setStatus] = useState(APP_STATUS.MERCADO_CERRADO);
    const [jugadores, setJugadores] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [search, setSearch] = useState('');
    const [msg, setMsg] = useState({ text: '', type: '' });

    // ── Carga inicial ──
    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                const { activeMatchday, status: liveStatus } = await getLiveStatus();
                const allFechas = await getAllFechas();
                setFechas(allFechas);
                setStatus(liveStatus);

                // Sugerir fecha: si hay una activa usarla, si no la más reciente finalizada
                if (activeMatchday) {
                  setSelectedFecha(activeMatchday.id);
                } else if (allFechas.length > 0) {
                  // Ordenar por fecha_inicio descendente para encontrar el más reciente
                  const sorted = [...allFechas].sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
                  setSelectedFecha(sorted[0].id);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    // ── Carga de jugadores y stats al cambiar la fecha ──
    useEffect(() => {
        if (!selectedFecha) return;
        async function loadStats() {
            const { jugadores: list, stats: initialStats } = await getAdminStatsData(selectedFecha);
            setJugadores(list);
            setStats(initialStats);
        }
        loadStats();
    }, [selectedFecha]);

    const handleStatChange = (jId, field, val) => {
        setStats(prev => ({
            ...prev,
            [jId]: {
                ...prev[jId],
                [field]: parseInt(val) || 0
            }
        }));
    };

    const handleSave = async () => {
        if (!selectedFecha) return;
        setSaving(true);
        try {
            const updates = Object.entries(stats).map(([jId, s]) => ({
                fecha_id: selectedFecha,
                jugador_id: jId,
                ...s
            }));
            const { error } = await supabase.from('estadisticas_partido').upsert(updates);
            if (error) throw error;
            setMsg({ text: 'Estadísticas guardadas localmente', type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 3000);
        } catch (err) {
            console.error(err);
            setMsg({ text: 'Error al guardar', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!selectedFecha) return;
        if (!window.confirm('¿Estás seguro de publicar los resultados finales? Esto cerrará la fecha permanentemente y abrirá la siguiente.')) return;
        
        setPublishing(true);
        try {
            // Mapear stats al formato esperado por el RPC
            const statsArray = jugadores.map(j => ({
                jugador_id: j.id,
                ...stats[j.id]
            }));

            // Llamar al RPC Atómico V3 (Cálculo -> Snapshot -> Reset -> Publicación)
            await publicarResultadosFecha(selectedFecha, statsArray);

            setMsg({ text: '¡Fecha procesada con éxito! Puntos calculados y equipo archivado.', type: 'success' });
            
            // Recargar datos
            const { activeMatchday, status: liveStatus } = await getLiveStatus();
            setStatus(liveStatus);
            if (activeMatchday) setSelectedFecha(activeMatchday.id);
            
        } catch (err) {
            console.error(err);
            setMsg({ text: 'Error al publicar resultados', type: 'error' });
        } finally {
            setPublishing(false);
        }
    };

    const filteredJugadores = jugadores.filter(j => 
        j.nombre.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-bold text-neutral">Preparando planilla técnica...</p>
      </div>
    );

    return (
        <div className="space-y-6 animate-fade-in relative pb-16">
            {/* FAB GUARDAR (Solo Mobile) */}
            <div className="md:hidden fixed bottom-24 right-6 z-50">
               <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-16 h-16 bg-accent text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-95 transition-all"
               >
                  {saving ? <Loader2 className="w-7 h-7 animate-spin" /> : <Save className="w-7 h-7" />}
               </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral/10 pb-6">
                <div>
                   <h2 className="text-2xl font-black text-primary flex items-center gap-2">
                       <Activity className="w-6 h-6 text-accent" /> CARGA DE RESULTADOS
                   </h2>
                   <p className="text-xs font-black text-neutral uppercase tracking-widest mt-1">Sincronización de estadísticas técnicas</p>
                </div>

                <div className="flex items-center gap-2">
                   <select
                     value={selectedFecha || ''}
                     onChange={e => setSelectedFecha(e.target.value)}
                     className="bg-white border border-neutral/20 px-4 py-3 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                   >
                     {fechas.map(f => (
                       <option key={f.id} value={f.id}>
                          {f.stats_cargadas ? '✅ ' : ''}Fecha {f.numero_fecha} vs {f.rival || 'S/D'}
                       </option>
                     ))}
                   </select>

                   <button
                     onClick={handleSave}
                     disabled={saving || publishing}
                     className="hidden md:flex items-center gap-2 px-6 py-3 bg-white border border-neutral/20 text-primary font-black rounded-xl hover:bg-neutral-light transition-all disabled:opacity-50"
                   >
                     {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                     GUARDAR
                   </button>

                   <button
                     onClick={handlePublish}
                     disabled={publishing || saving}
                     className="hidden md:flex items-center gap-2 px-6 py-3 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                   >
                     {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                     PUBLICAR RESULTADOS
                   </button>
                </div>
            </div>

            {msg.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${
                  msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
                }`}>
                  {msg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  <p className="text-sm font-bold">{msg.text}</p>
                </div>
            )}

            {/* BARRA DE BÚSQUEDA STICKY */}
            <div className="sticky top-[56px] md:top-0 z-40 py-2 bg-slate-50/80 backdrop-blur-md -mx-4 px-4 md:mx-0 md:px-0">
               <div className="relative group">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-neutral/20 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                  />
               </div>
            </div>

            {/* LISTA DE JUGADORES */}
            <div className="space-y-4">
                {filteredJugadores.length > 0 ? (
                    filteredJugadores.map(j => (
                        <div key={j.id} className="bg-white rounded-3xl border border-neutral/10 overflow-hidden shadow-sm hover:shadow-md transition-all">
                            {/* Header del Jugador */}
                            <div className="px-5 py-4 bg-neutral-light/30 flex items-center justify-between border-b border-neutral/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-black text-sm">
                                        {j.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-primary leading-tight">{j.nombre}</h4>
                                        <p className="text-[10px] font-bold text-neutral uppercase tracking-widest">{j.categoria}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Grid de Estadísticas (Todas visibles) */}
                            <div className="p-4 bg-white">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {STAT_FIELDS.map(field => (
                                        <div key={field.key} className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black text-neutral uppercase tracking-tighter truncate opacity-60">
                                                {field.label}
                                            </label>
                                            <div className="flex items-center">
                                                <button 
                                                    onClick={() => handleStatChange(j.id, field.key, Math.max(0, (stats[j.id]?.[field.key] || 0) - 1))}
                                                    className="w-8 h-8 rounded-l-lg bg-neutral-light border border-neutral/10 flex items-center justify-center text-primary font-bold active:scale-95 transition-transform"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={stats[j.id]?.[field.key] || 0}
                                                    onChange={e => handleStatChange(j.id, field.key, e.target.value)}
                                                    className="w-full min-w-0 h-8 text-center bg-white border-y border-neutral/10 font-bold text-sm outline-none"
                                                />
                                                <button 
                                                    onClick={() => handleStatChange(j.id, field.key, (stats[j.id]?.[field.key] || 0) + 1)}
                                                    className="w-8 h-8 rounded-r-lg bg-neutral-light border border-neutral/10 flex items-center justify-center text-primary font-bold active:scale-95 transition-transform"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-neutral/10 text-center">
                        <div className="w-16 h-16 bg-neutral-light rounded-full flex items-center justify-center mb-4">
                           <Activity className="w-8 h-8 text-neutral" />
                        </div>
                        <h3 className="font-black text-primary text-lg">No se encontraron jugadores</h3>
                        <p className="text-sm text-neutral max-w-xs mt-2">
                           Asegurate de haber cargado la convocatoria para esta fecha o probá con otro término de búsqueda.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
