import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Loader2, Star } from 'lucide-react';

export default function PlayersTab() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayers() {
      const { data, error } = await supabase.from('jugadores').select('*').order('nombre');
      if (!error && data) {
        // Filtrar duplicados por nombre (soluciona la carga doble múltiple en BD)
        const uniquePlayers = Array.from(new Set(data.map(p => p.nombre)))
          .map(name => data.find(p => p.nombre === name));
          
        setPlayers(uniquePlayers);
      }
      setLoading(false);
    }
    fetchPlayers();
  }, []);

  return (
    <div className="p-4 flex flex-col h-full bg-white max-w-2xl mx-auto w-full pb-24">
      <div className="flex items-center gap-3 mb-6 sticky top-0 bg-white p-4 -mx-4 z-10 border-b border-neutral/20">
        <div className="bg-primary p-2.5 rounded-xl text-white">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-primary px-1 tracking-tight">Plantel Completo</h2>
          <p className="text-xs text-accent font-bold uppercase tracking-widest px-1">Estadísticas del Torneo</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
             <div key={player.id} className="bg-white border border-neutral/20 rounded-xl p-4 transition-colors hover:bg-neutral-light shadow-sm">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-neutral-light rounded-full flex items-center justify-center overflow-hidden border border-neutral/20 shadow-sm">
                       {player.foto_url ? (
                         <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover" />
                       ) : (
                         <span className="text-primary font-bold text-lg tracking-tighter">
                           {player.nombre.split(' ').map(n=>n[0]).join('').substring(0,2)}
                         </span>
                       )}
                    </div>
                    <div>
                      <h4 className="font-bold text-primary text-base tracking-tight leading-tight">{player.nombre}</h4>
                      <p className="text-xs text-neutral font-medium mt-0.5">Universitario MDP</p>
                    </div>
                 </div>

                 <div className="flex flex-col items-end">
                    <div className="bg-neutral-light px-3 py-1.5 rounded-lg border border-neutral/20 flex items-center gap-1.5 shadow-sm">
                      <Star className="w-3 h-3 text-accent" />
                      <span className="font-bold text-primary text-sm">0 pts</span>
                    </div>
                 </div>
               </div>
             </div>
          ))}
          
          {players.length === 0 && (
             <div className="text-center p-8 text-neutral border border-solid border-neutral/20 bg-neutral-light rounded-xl">
               No hay jugadores cargados en la base de datos.
             </div>
          )}
        </div>
      )}
    </div>
  );
}
