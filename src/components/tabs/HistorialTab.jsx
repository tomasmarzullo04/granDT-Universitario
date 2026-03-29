import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAllFechas, calcularPuntosJugador } from '../../lib/api';
import { History, CalendarDays, Users, Trophy, Loader2, Crown } from 'lucide-react';
import RugbyPitch from '../RugbyPitch';

export default function HistorialTab() {
  const { profile } = useAuth();
  const [fechas, setFechas] = useState([]);
  const [selectedFecha, setSelectedFecha] = useState(null);
  const [historicoData, setHistoricoData] = useState(null);
  const [teamObj, setTeamObj] = useState([]);
  const [playerPoints, setPlayerPoints] = useState({});
  const [teamTotal, setTeamTotal] = useState(null);
  const [capitanId, setCapitanId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const allFechas = await getAllFechas();
      const disponibles = allFechas.filter(f => f.estado === 'finalizada' || f.estado === 'en_juego' || f.estado === 'abierta');
      setFechas(disponibles);
      if (disponibles.length > 0) {
        setSelectedFecha(disponibles[0].id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchHistorico() {
      if (!selectedFecha || !profile) return;
      setLoading(true);
      setHistoricoData(null);
      setTeamObj([]);
      setPlayerPoints({});
      setTeamTotal(null);
      setCapitanId(null);

      let playerIds = [];
      let currentCapitanId = null;
      let source = null;

      // 1. Intentar desde historico_equipos (snapshot archivado)
      const { data: historial } = await supabase
        .from('historico_equipos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('fecha_id', selectedFecha)
        .maybeSingle();

      if (historial && historial.player_ids) {
        playerIds = historial.player_ids;
        currentCapitanId = historial.capitan_id || null;
        source = 'historico';
      } else {
        // 2. FALLBACK: equipos_usuarios
        const { data: equipoActivo } = await supabase
          .from('equipos_usuarios')
          .select('jugador_id, posicion_cancha, capitan_id')
          .eq('usuario_id', profile.id)
          .eq('fecha_id', selectedFecha)
          .order('posicion_cancha', { ascending: true });

        if (equipoActivo && equipoActivo.length > 0) {
          currentCapitanId = equipoActivo[0]?.capitan_id || null;
          source = 'equipos_usuarios';
          // Build ordered playerIds array (15 positions)
          const orderedIds = Array(15).fill(null);
          equipoActivo.forEach(e => {
            if (e.posicion_cancha >= 1 && e.posicion_cancha <= 15) {
              orderedIds[e.posicion_cancha - 1] = e.jugador_id;
            }
          });
          playerIds = orderedIds;
        }
      }

      if (playerIds.length === 0) {
        setLoading(false);
        return;
      }

      setCapitanId(currentCapitanId);

      // 3. Fetch player details
      const validIds = playerIds.filter(Boolean);
      let players = [];
      
      if (validIds.length > 0) {
        const { data: playersData, error: pError } = await supabase
          .from('jugadores')
          .select('id, nombre, precio')
          .in('id', validIds);
          
        if (pError) console.error("Error fetching jugadores:", pError);
        if (playersData) players = playersData;
      }

      console.log('DATOS RECUPERADOS:', {
        source,
        playerIds,
        validIds,
        players
      });

      // 4. Map players to pitch positions
      const mappedTeam = Array(15).fill(null);
      playerIds.forEach((pid, idx) => {
        if (pid && players.length > 0) {
          const p = players.find(x => x.id === pid);
          if (p) mappedTeam[idx] = p; // idx es posicion_cancha - 1
        }
      });
      setTeamObj(mappedTeam);

      // 5. Fetch estadisticas_partido SOLO para esta fecha y estos jugadores
      let statsData = [];
      if (validIds.length > 0) {
        const { data: sData } = await supabase
          .from('estadisticas_partido')
          .select('*')
          .eq('fecha_id', selectedFecha)
          .in('jugador_id', validIds);
        if (sData) statsData = sData;
      }

      // 6. Calcular puntos por jugador para ESTA fecha
      const pointsMap = {};
      let total = 0;

      validIds.forEach(jId => {
        const stats = statsData.find(s => s.jugador_id === jId);
        const isCaptain = jId === currentCapitanId;
        const pts = calcularPuntosJugador(stats, isCaptain);
        pointsMap[jId] = { pts, isCaptain, hasStats: !!stats };
        // Solo sumar jugadores que estan en las 15 posiciones del equipo
        if (playerIds.includes(jId)) {
          total += pts;
        }
      });

      setPlayerPoints(pointsMap);
      setTeamTotal(total);
      setHistoricoData({
        player_ids: playerIds,
        puntos_totales: total,
        capitan_id: currentCapitanId,
        _source: source
      });

      setLoading(false);
    }
    fetchHistorico();
  }, [selectedFecha, profile]);

  if (fechas.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-neutral/20 shadow-xl max-w-2xl mx-auto mt-8 relative overflow-hidden">
        <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
           <History className="w-10 h-10 text-primary/40" />
        </div>
        <h2 className="text-2xl font-black text-primary mb-3">Sin Historial</h2>
        <p className="text-neutral font-medium mb-6">{"Todav\u00EDa no hay fechas para mostrar tu historial."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral/20 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 bg-neutral-light px-4 py-1 rounded-bl-xl border-l border-b border-neutral/20 text-[9px] font-black text-neutral/60 uppercase tracking-widest">
            Solo Lectura
         </div>
         <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
               <History className="w-6 h-6 text-primary" />
            </div>
            <div>
               <h2 className="text-2xl font-black text-primary tracking-tight leading-none">Tu Historial</h2>
               <p className="text-xs font-bold text-neutral">{"Repas\u00E1 los equipos que armaste en fechas anteriores."}</p>
            </div>
         </div>

         <select
            value={selectedFecha || ''}
            onChange={(e) => setSelectedFecha(Number(e.target.value))}
            className="bg-neutral-light border border-neutral/20 rounded-xl px-4 py-3 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none w-full md:w-auto"
         >
            {fechas.map(f => (
               <option key={f.id} value={f.id}>Fecha {f.numero_fecha} {"\u2014"} vs {f.rival}</option>
            ))}
         </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="font-black text-primary uppercase tracking-widest text-sm">Buscando en los archivos...</p>
        </div>
      ) : !historicoData ? (
         <div className="bg-white rounded-3xl p-12 text-center border border-neutral/20 shadow-sm">
           <Users className="w-16 h-16 text-neutral/20 mx-auto mb-4" />
           <p className="text-lg font-black text-primary">No armaste equipo en esta fecha.</p>
           <p className="text-sm text-neutral mt-2">{"No se encontr\u00F3 ning\u00FAn registro tuyo para este partido."}</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-[2rem] border border-neutral/20 shadow-2xl p-6 relative overflow-hidden">
               <div className="relative z-10 w-full mb-6 flex items-center justify-between px-2">
                  <h4 className="font-black text-primary text-sm uppercase tracking-[0.2em]">
                     EQUIPO DE LA FECHA
                  </h4>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${teamTotal != null && teamTotal !== 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-black uppercase">
                      {teamTotal != null ? `${teamTotal} PTS` : 'Pendiente'}
                    </span>
                  </div>
               </div>
               
               <div className="relative w-full max-w-md mx-auto opacity-90">
                  <RugbyPitch players={teamObj} />
               </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral/20 shadow-xl p-6">
               <h4 className="font-black text-primary uppercase text-sm border-b border-neutral/10 pb-4 mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-accent" /> Plantel Seleccionado
               </h4>
               <div className="space-y-2">
                  {teamObj.map((p, i) => p ? (
                     <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                       capitanId === p.id 
                         ? 'bg-yellow-50/80 border-yellow-200 ring-1 ring-yellow-300' 
                         : 'bg-neutral-light/50 border-neutral/10'
                     }`}>
                        <span className={`w-8 h-8 text-xs font-black rounded-lg flex items-center justify-center shrink-0 ${
                          capitanId === p.id ? 'bg-yellow-400 text-white' : 'bg-primary/10 text-primary'
                        }`}>
                           {capitanId === p.id ? <Crown className="w-4 h-4" /> : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-primary leading-none truncate">{p.nombre}</p>
                              {capitanId === p.id && (
                                <span className="text-[8px] font-black bg-yellow-400 text-white px-1.5 py-0.5 rounded uppercase">x2</span>
                              )}
                           </div>
                           <p className="text-[10px] text-neutral font-bold uppercase mt-1">
                             {playerPoints[p.id]?.hasStats 
                               ? (playerPoints[p.id]?.isCaptain ? 'Cap x2' : `Pos ${i+1}`)
                               : 'Sin stats'}
                           </p>
                        </div>
                        <div className={`text-right font-black text-sm ${
                          (playerPoints[p.id]?.pts || 0) > 0 ? 'text-green-600' : 
                          (playerPoints[p.id]?.pts || 0) < 0 ? 'text-red-500' : 'text-neutral/40'
                        }`}>
                           {playerPoints[p.id]?.pts ?? 0}
                        </div>
                     </div>
                  ) : null)}
               </div>

               {/* Total del equipo */}
               {teamTotal != null && (
                 <div className="mt-4 pt-4 border-t-2 border-primary/20 flex items-center justify-between">
                    <span className="font-black text-primary uppercase text-sm tracking-wider">Total Equipo</span>
                    <span className={`text-2xl font-black ${teamTotal > 0 ? 'text-green-600' : teamTotal < 0 ? 'text-red-500' : 'text-neutral/40'}`}>
                      {teamTotal} PTS
                    </span>
                 </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
}
