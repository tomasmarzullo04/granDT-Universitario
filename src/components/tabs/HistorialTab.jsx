import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAllFechas } from '../../lib/api';
import { History, CalendarDays, Users, Trophy, Loader2 } from 'lucide-react';
import RugbyPitch from '../RugbyPitch';

export default function HistorialTab() {
  const { profile } = useAuth();
  const [fechas, setFechas] = useState([]);
  const [selectedFecha, setSelectedFecha] = useState(null);
  const [historicoData, setHistoricoData] = useState(null);
  const [teamObj, setTeamObj] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const allFechas = await getAllFechas();
      // Mostrar TODAS las fechas para poder ver el equipo actual y anteriores
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

      // 1. Intentar desde historico_equipos (snapshot archivado)
      const { data: historial } = await supabase
        .from('historico_equipos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('fecha_id', selectedFecha)
        .maybeSingle();

      if (historial && historial.player_ids) {
        setHistoricoData(historial);
        
        const { data: players } = await supabase
          .from('jugadores')
          .select('id, nombre, precio')
          .in('id', historial.player_ids);

        if (players) {
           const mappedTeam = Array(15).fill(null);
           historial.player_ids.forEach((pid, idx) => {
              const p = players.find(x => x.id === pid);
              if (p) mappedTeam[idx] = p;
           });
           setTeamObj(mappedTeam);
        }
      } else {
        // 2. FALLBACK: Buscar en equipos_usuarios (equipo activo, aún no archivado)
        const { data: equipoActivo } = await supabase
          .from('equipos_usuarios')
          .select('jugador_id, posicion_cancha, capitan_id')
          .eq('usuario_id', profile.id)
          .eq('fecha_id', selectedFecha)
          .order('posicion_cancha', { ascending: true });

        if (equipoActivo && equipoActivo.length > 0) {
          const playerIds = equipoActivo.map(e => e.jugador_id).filter(Boolean);
          
          const { data: players } = await supabase
            .from('jugadores')
            .select('id, nombre, precio')
            .in('id', playerIds);

          if (players) {
            const mappedTeam = Array(15).fill(null);
            equipoActivo.forEach(e => {
              const p = players.find(x => x.id === e.jugador_id);
              if (p && e.posicion_cancha >= 1 && e.posicion_cancha <= 15) {
                mappedTeam[e.posicion_cancha - 1] = p;
              }
            });
            setTeamObj(mappedTeam);
            setHistoricoData({
              player_ids: playerIds,
              puntos_totales: null,
              capitan_id: equipoActivo[0]?.capitan_id || null,
              _source: 'equipos_usuarios'
            });
          }
        }
      }
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
        <p className="text-neutral font-medium mb-6">Todavía no hay fechas para mostrar tu historial.</p>
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
               <p className="text-xs font-bold text-neutral">Repasá los equipos que armaste en fechas anteriores.</p>
            </div>
         </div>

         <select
            value={selectedFecha || ''}
            onChange={(e) => setSelectedFecha(Number(e.target.value))}
            className="bg-neutral-light border border-neutral/20 rounded-xl px-4 py-3 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none w-full md:w-auto"
         >
            {fechas.map(f => (
               <option key={f.id} value={f.id}>Fecha {f.numero_fecha} â€” vs {f.rival}</option>
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
           <p className="text-sm text-neutral mt-2">No se encontró ningún registro tuyo para este partido.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-[2rem] border border-neutral/20 shadow-2xl p-6 relative overflow-hidden">
               <div className="relative z-10 w-full mb-6 flex items-center justify-between px-2">
                  <h4 className="font-black text-primary text-sm uppercase tracking-[0.2em]">
                     {historicoData._source === 'equipos_usuarios' ? 'EQUIPO ACTUAL' : 'EQUIPO ARCHIVADO'}
                  </h4>
                  <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full border border-yellow-200">
                    <Trophy className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase">
                      Puntos: {historicoData.puntos_totales != null ? historicoData.puntos_totales : 'Pendiente'}
                    </span>
                  </div>
               </div>
               
               <div className="relative w-full max-w-md mx-auto opacity-90 grayscale-[30%]">
                  <RugbyPitch players={teamObj} />
               </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral/20 shadow-xl p-6">
               <h4 className="font-black text-primary uppercase text-sm border-b border-neutral/10 pb-4 mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-accent" /> Plantel Seleccionado
               </h4>
               <div className="space-y-2">
                  {teamObj.map((p, i) => p ? (
                     <div key={i} className="flex items-center gap-3 p-3 bg-neutral-light/50 rounded-xl border border-neutral/10">
                        <span className="w-8 h-8 bg-primary/10 text-primary text-xs font-black rounded-lg flex items-center justify-center shrink-0">
                           {i + 1}
                        </span>
                        <div>
                           <p className="text-sm font-black text-primary leading-none">{p.nombre}</p>
                           <p className="text-[10px] text-neutral font-bold uppercase mt-1">
                             {historicoData._source === 'equipos_usuarios' ? 'Titular Activo' : 'Titular Histórico'}
                           </p>
                        </div>
                     </div>
                  ) : null)}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
