import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getAllFechas, getConvocados, getEstadisticasPartido, upsertEstadisticas, SCORING } from '../../lib/api';
import { Save, Loader2, FileBarChart, Calendar, ChevronDown, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default function ResultadosAdmin() {
  const [fechas, setFechas] = useState([]);
  const [selectedFecha, setSelectedFecha] = useState('');
  const [players, setPlayers] = useState([]);
  
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

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

        const initStats = {};
        convocadosData.forEach(p => {
          const pre = prevStats.find(s => s.jugador_id === p.id);
          initStats[p.id] = {
            tries: pre?.tries || 0,
            conversiones: pre?.conversiones || 0,
            penales: pre?.penales || 0,
            amarillas: pre?.amarillas || 0,
            rojas: pre?.rojas || 0,
            motm: pre?.motm || false,
          };
        });

        setPlayers(convocadosData);
        setStats(initStats);
      } catch (err) {
        console.error(err);
        setStatusMsg({ type: 'error', text: 'Error al cargar los datos.' });
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
        ? !current 
        : Math.max(0, current + delta);

      return {
        ...prev,
        [jugadorId]: {
          ...prev[jugadorId],
          [field]: newVal
        }
      };
    });
  };

  const calculatePoints = (pStats) => {
    if (!pStats) return 0;
    return (
      (pStats.tries * SCORING.TRY) +
      (pStats.conversiones * SCORING.CONVERSION) +
      (pStats.penales * SCORING.PENAL) +
      (pStats.amarillas * SCORING.AMARILLA) +
      (pStats.rojas * SCORING.ROJA) +
      SCORING.PRESENCIA // Presence points
    );
  };

  const handleSave = async () => {
    if (!selectedFecha || players.length === 0) return;
    
    setSaving(true);
    setStatusMsg({ type: '', text: '' });
    
    try {
      const fechaId = parseInt(selectedFecha);
      
      const statsArray = players.map(p => ({
        fecha_id: fechaId,
        jugador_id: p.id,
        tries: stats[p.id].tries,
        conversiones: stats[p.id].conversiones,
        penales: stats[p.id].penales,
        amarillas: stats[p.id].amarillas,
        rojas: stats[p.id].rojas,
        motm: stats[p.id].motm
      }));

      await upsertEstadisticas(statsArray);
      await supabase.from('fechas').update({ estado: 'finalizada' }).eq('id', fechaId);

      setStatusMsg({ type: 'success', text: 'Estadísticas guardadas y Ranking actualizado.' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const StatBox = ({ label, value, onIncrease, onDecrease, colorClass }) => (
    <div className="flex flex-col items-center bg-neutral-light/50 p-2 rounded-xl border border-neutral/10 w-16">
      <span className="text-[9px] font-black text-neutral uppercase mb-1">{label}</span>
      <div className="flex flex-col items-center gap-1">
        <button onClick={onIncrease} className="text-primary hover:text-accent">+</button>
        <span className={`font-black text-sm ${colorClass || 'text-primary'}`}>{value}</span>
        <button onClick={onDecrease} className="text-primary hover:text-red-500">-</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral/10 pb-6">
        <div>
          <h2 className="text-2xl font-black text-primary flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-accent" /> Carga de Resultados
          </h2>
          <p className="text-sm font-bold text-neutral uppercase tracking-widest mt-1">Impacto directo en el Ranking</p>
        </div>
        
        <div className="flex gap-4">
           <div className="relative min-w-[240px]">
             <select 
               value={selectedFecha} 
               onChange={(e) => setSelectedFecha(e.target.value)}
               className="w-full bg-neutral-light border border-neutral/20 rounded-xl px-4 py-3 text-sm font-bold text-primary appearance-none focus:ring-2 focus:ring-primary/20 outline-none"
             >
               {fechas.map(f => (
                 <option key={f.id} value={f.id}>Fecha {f.numero_fecha} - {f.rival}</option>
               ))}
             </select>
             <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-neutral" />
           </div>
           
           <button
             onClick={handleSave}
             disabled={saving || players.length === 0}
             className="bg-primary text-white px-6 py-3 rounded-xl font-black shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50"
           >
             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
             Guardar
           </button>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${
          statusMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {statusMsg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : players.length === 0 ? (
        <div className="bg-neutral-light/50 rounded-3xl p-12 text-center border-2 border-dashed border-neutral/20">
          <FileBarChart className="w-12 h-12 text-neutral/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral">No hay jugadores convocados</h3>
          <p className="text-sm text-neutral/60">Carga el plantel en la pestaña "Armado" para esta fecha.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden border border-neutral/20 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-light/50 border-b border-neutral/20">
              <tr>
                <th className="p-4 text-[10px] font-black text-neutral uppercase tracking-widest">Jugador</th>
                <th className="p-4 text-[10px] font-black text-neutral uppercase tracking-widest text-center">Stats</th>
                <th className="p-4 text-[10px] font-black text-neutral uppercase tracking-widest text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id} className="border-b border-neutral/10 hover:bg-neutral-light/30 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-primary">{player.nombre}</p>
                    <p className="text-[9px] font-black text-neutral uppercase">{player.categoria}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <StatBox label="Try" value={stats[player.id]?.tries} onIncrease={()=>updateStat(player.id,'tries',1)} onDecrease={()=>updateStat(player.id,'tries',-1)} />
                      <StatBox label="Conv" value={stats[player.id]?.conversiones} onIncrease={()=>updateStat(player.id,'conversiones',1)} onDecrease={()=>updateStat(player.id,'conversiones',-1)} />
                      <StatBox label="Pen" value={stats[player.id]?.penales} onIncrease={()=>updateStat(player.id,'penales',1)} onDecrease={()=>updateStat(player.id,'penales',-1)} />
                      <StatBox label="Ama" value={stats[player.id]?.amarillas} onIncrease={()=>updateStat(player.id,'amarillas',1)} onDecrease={()=>updateStat(player.id,'amarillas',-1)} colorClass="text-yellow-600" />
                      <StatBox label="Roja" value={stats[player.id]?.rojas} onIncrease={()=>updateStat(player.id,'rojas',1)} onDecrease={()=>updateStat(player.id,'rojas',-1)} colorClass="text-red-600" />
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-lg font-black text-primary">
                      {calculatePoints(stats[player.id])}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
