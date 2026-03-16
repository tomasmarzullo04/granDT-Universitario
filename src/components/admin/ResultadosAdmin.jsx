import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getAllFechas, getConvocados, getEstadisticasPartido, upsertEstadisticas } from '../../lib/api';
import { Save, Loader2, FileBarChart, Calendar, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResultadosAdmin() {
  const [fechas, setFechas] = useState([]);
  const [selectedFecha, setSelectedFecha] = useState('');
  const [players, setPlayers] = useState([]);
  
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Cargar Fechas al montar
  useEffect(() => {
    async function load() {
      const data = await getAllFechas();
      setFechas(data);
      if (data.length > 0) {
        setSelectedFecha(data[0].id.toString());
      }
      setLoading(false);
    }
    load();
  }, []);

  // Cargar jugadores convocados y stats al cambiar la fecha
  useEffect(() => {
    async function loadDataForFecha() {
      if (!selectedFecha) return;
      
      setLoading(true);
      setStatusMsg({ type: '', text: '' });
      
      try {
        const fechaId = parseInt(selectedFecha);
        const [convocadosData, prevStats] = await Promise.all([
          getConvocados(fechaId),
          getEstadisticasPartido(fechaId)
        ]);

        // Transformamos convocados y mapeamos stats previas o valores default
        const initStats = {};
        convocadosData.forEach(p => {
          const pre = prevStats.find(s => s.jugador_id === p.id);
          initStats[p.id] = {
            tries: pre?.tries || 0,
            conversiones: pre?.conversiones || 0,
            penales: pre?.penales || 0,
            amarillas: pre?.amarillas || 0,
            rojas: pre?.rojas || 0,
            knock_ons: pre?.knock_ons || 0,
            motm: pre?.motm || false,
          };
        });

        setPlayers(convocadosData);
        setStats(initStats);
      } catch (err) {
        console.error(err);
        setStatusMsg({ type: 'error', text: 'Error al cargar los datos del partido.' });
      } finally {
        setLoading(false);
      }
    }
    
    loadDataForFecha();
  }, [selectedFecha]);

  const updateStat = (jugadorId, field, delta) => {
    setStats(prev => {
      const current = prev[jugadorId][field];
      let newVal = typeof current === 'boolean' 
        ? !current // Toggle for MOTM
        : Math.max(0, current + delta); // Prevent negative numbers

      return {
        ...prev,
        [jugadorId]: {
          ...prev[jugadorId],
          [field]: newVal
        }
      };
    });
  };

  const handleSave = async () => {
    if (!selectedFecha || players.length === 0) return;
    
    setSaving(true);
    setStatusMsg({ type: '', text: '' });
    
    try {
      const fechaId = parseInt(selectedFecha);
      
      // Armamos el array a guardar. Guardamos a todos los convocados.
      const statsArray = players.map(p => ({
        fecha_id: fechaId,
        jugador_id: p.id,
        tries: stats[p.id].tries,
        conversiones: stats[p.id].conversiones,
        penales: stats[p.id].penales,
        amarillas: stats[p.id].amarillas,
        rojas: stats[p.id].rojas,
        knock_ons: stats[p.id].knock_ons,
        motm: stats[p.id].motm
      }));

      await upsertEstadisticas(statsArray);
      
      // Si la guardamos con éxito, sería ideal cambiar el estado de la fecha a finalizada
      await supabase.from('fechas').update({ estado: 'finalizada' }).eq('id', fechaId);

      setStatusMsg({ type: 'success', text: 'Estadísticas guardadas exitosamente y Fecha Finalizada.' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Error al guardar. Intenta nuevamente.' });
    } finally {
      setSaving(false);
    }
  };

  const StatCounter = ({ label, value, onIncrease, onDecrease, dotColor }) => (
    <div className="flex flex-col items-center flex-1 min-w-[60px]">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
        {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>}
        {label}
      </span>
      <div className="flex items-center gap-2 bg-base/80 rounded-lg p-1 border border-accent-secondary/50">
        <button onClick={onDecrease} className="w-6 h-6 flex items-center justify-center rounded-md bg-accent-secondary hover:bg-red-500/50 text-white transition-colors">-</button>
        <span className="w-4 text-center text-sm font-bold text-white">{value}</span>
        <button onClick={onIncrease} className="w-6 h-6 flex items-center justify-center rounded-md bg-accent-secondary hover:bg-green-500/50 text-white transition-colors">+</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
       
      {/* Selector de Fecha */}
      <div className="bg-baseborder border-accent-secondary/50 rounded-2xl p-6 shadow-lg bg-base/80 backdrop-blur-sm">
        <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent-primary" />
          Seleccionar Fecha Jugada
        </label>
        <div className="relative">
          <select 
            value={selectedFecha} 
            onChange={(e) => setSelectedFecha(e.target.value)}
            disabled={loading || saving}
            className="w-full bg-base border border-accent-secondary/80 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent-primary appearance-none font-bold"
          >
            {fechas.map(f => (
              <option key={f.id} value={f.id}>
                Fecha {f.numero_fecha} vs {f.rival} ({f.estado.toUpperCase()})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-accent-primary">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm animate-fade-in ${
          statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-green-500/10 border-green-500/30 text-green-200'
        }`}>
          {statusMsg.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-medium">{statusMsg.text}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-10 h-10 animate-spin text-accent-primary" />
        </div>
      ) : players.length === 0 ? (
        <div className="bg-base/80 border border-accent-secondary/50 rounded-2xl p-8 text-center shadow-xl">
          <FileBarChart className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Sin Convocados</h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            No hay jugadores convocados para esta fecha. Ve a la pestaña 'Convocatorias' primero.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <p className="text-gray-400 text-sm font-medium">
              Mostrando <span className="text-white font-bold">{players.length}</span> jugadores para cargar estadísticas.
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-accent-primary text-base font-bold py-2.5 px-6 rounded-xl shadow-[0_0_15px_rgba(112,193,179,0.3)] hover:scale-[1.02] transition-transform flex items-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Resultados
            </button>
          </div>

          <div className="bg-base border border-accent-secondary/50 rounded-2xl overflow-hidden shadow-2xl">
            {players.map((player, _, arr) => (
              <div key={player.id} className="p-4 border-b border-accent-secondary/30 last:border-0 hover:bg-accent-secondary/10 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Info del Jugador */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-accent-secondary rounded-full flex items-center justify-center overflow-hidden border-2 border-accent-primary/50 relative">
                       {player.foto_url ? (
                         <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover" />
                       ) : (
                         <span className="text-white font-bold text-sm tracking-tighter">
                           {player.nombre.split(' ').map(n=>n[0]).join('').substring(0,2)}
                         </span>
                       )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white leading-tight">{player.nombre}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs uppercase font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-md border border-accent-primary/20">
                          {player.categoria}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Controles de Estadísticas */}
                  <div className="flex flex-wrap items-center gap-2 lg:gap-4 md:flex-1 justify-end">
                    
                    <StatCounter 
                      label="Tries" 
                      value={stats[player.id]?.tries} 
                      onIncrease={() => updateStat(player.id, 'tries', 1)} 
                      onDecrease={() => updateStat(player.id, 'tries', -1)} 
                    />
                    <StatCounter 
                      label="Conv" 
                      value={stats[player.id]?.conversiones} 
                      onIncrease={() => updateStat(player.id, 'conversiones', 1)} 
                      onDecrease={() => updateStat(player.id, 'conversiones', -1)} 
                    />
                    <StatCounter 
                      label="Penales" 
                      value={stats[player.id]?.penales} 
                      onIncrease={() => updateStat(player.id, 'penales', 1)} 
                      onDecrease={() => updateStat(player.id, 'penales', -1)} 
                    />
                    <StatCounter 
                       label="Ama" 
                       value={stats[player.id]?.amarillas} 
                       onIncrease={() => updateStat(player.id, 'amarillas', 1)} 
                       onDecrease={() => updateStat(player.id, 'amarillas', -1)} 
                       dotColor="bg-yellow-400"
                    />
                     <StatCounter 
                       label="Roja" 
                       value={stats[player.id]?.rojas} 
                       onIncrease={() => updateStat(player.id, 'rojas', 1)} 
                       onDecrease={() => updateStat(player.id, 'rojas', -1)}
                       dotColor="bg-red-500" 
                    />
                    
                    <div className="flex flex-col items-center ml-2 border-l border-accent-secondary/50 pl-2 lg:pl-4">
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">MOTM</span>
                       <button
                         onClick={() => updateStat(player.id, 'motm', null)} // null won't be used since we toggle internally based on current boolean
                         className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                           stats[player.id]?.motm 
                             ? 'bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)] border-2 border-yellow-300' 
                             : 'bg-base border border-accent-secondary text-gray-500 hover:text-white'
                         }`}
                         title="Man of the Match (Jugador del Partido)"
                       >
                         <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                         </svg>
                       </button>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
