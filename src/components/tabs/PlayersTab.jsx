import { useState, useEffect, useMemo } from 'react';
import { getPlayersStatistics } from '../../lib/api';
import { Users, Loader2, Trophy, Medal, Search, Filter } from 'lucide-react';

export default function PlayersTab() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todas'); // 'Todas' | 'Primera' | 'Intermedia' | 'Pre-intermedia'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getPlayersStatistics();
        // Ordenar por puntos de mayor a menor por defecto
        data.sort((a, b) => b.puntos - a.puntos);
        setPlayers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchFilter = filter === 'Todas' || p.categoria === filter;
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [players, filter, searchTerm]);

  const maxPoints = useMemo(() => {
    if (players.length === 0) return 0;
    return Math.max(...players.map(p => p.puntos));
  }, [players]);

  const categories = ['Todas', 'Primera', 'Intermedia', 'Pre-intermedia'];

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'Primera': return 'bg-primary/10 text-primary border-primary/20';
      case 'Intermedia': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pre-intermedia': return 'bg-sky-50 text-sky-700 border-sky-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-neutral font-bold animate-pulse uppercase tracking-widest text-[10px]">Cargando Plantel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-5xl mx-auto w-full pb-20">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral/20 shadow-sm flex flex-col md:flex-row gap-4 sticky top-[145px] z-30">
        <div className="relative flex-1 group">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-light border border-neutral/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all placeholder:text-neutral/50"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap border-2 ${
                filter === cat 
                ? 'bg-primary border-primary text-white shadow-md' 
                : 'bg-white border-neutral/10 text-neutral hover:border-neutral/30'
              }`}
            >
              {cat === 'Pre-intermedia' ? 'Pre' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Players */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map((player) => {
          const isTopScorer = player.puntos > 0 && player.puntos === maxPoints;
          
          return (
            <div 
              key={player.id} 
              className={`
                bg-white border-2 rounded-3xl p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl relative overflow-hidden group
                ${isTopScorer ? 'border-yellow-400 bg-yellow-50/10' : 'border-neutral/10 hover:border-primary/20'}
              `}
            >
              {/* Top Scorer Badge */}
              {isTopScorer && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-white pl-4 pr-3 py-1.5 rounded-bl-3xl shadow-sm z-10 flex items-center gap-1.5 animate-bounce-subtle">
                  <Trophy className="w-4 h-4 fill-white" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Goleador</span>
                </div>
              )}
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-inner overflow-hidden transition-transform duration-500 group-hover:rotate-3
                  ${isTopScorer ? 'bg-white border-yellow-200' : 'bg-neutral-light border-neutral/10'}
                `}>
                  {player.foto_url ? (
                    <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center">
                       <span className="text-xl font-black text-primary/40 tracking-tighter">
                        {player.nombre.split(' ').map(n=>n[0]).join('').substring(0,2)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-primary text-lg leading-none truncate group-hover:text-accent transition-colors mb-1">
                    {player.nombre}
                  </h4>
                  <span className={`
                    inline-block text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider
                    ${getCategoryColor(player.categoria)}
                  `}>
                    {player.categoria}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-neutral/10 flex justify-between items-end relative z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Medal className={`w-3.5 h-3.5 ${player.puntos > 0 ? 'text-accent' : 'text-neutral/20'}`} />
                    <span className="text-[9px] font-black text-neutral/60 uppercase tracking-widest">Puntos Totales</span>
                  </div>
                  <div className="h-1 w-8 bg-accent/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (player.puntos / (maxPoints || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className={`text-3xl font-black leading-none ${isTopScorer ? 'text-yellow-600' : 'text-primary'}`}>
                    {player.puntos}
                  </span>
                </div>
              </div>
              
              {/* Subtle background icon */}
              <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-500 scale-125 pointer-events-none">
                <Users className="w-24 h-24 text-primary" />
              </div>
            </div>
          );
        })}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-neutral/20 animate-fade-in shadow-inner">
          <div className="w-20 h-20 bg-neutral-light rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-neutral/30" />
          </div>
          <h3 className="text-2xl font-black text-primary mb-2">Sin resultados</h3>
          <p className="text-neutral font-medium max-w-xs mx-auto">No encontramos jugadores que coincidan con tu búsqueda en esta categoría.</p>
          <button 
            onClick={() => {setSearchTerm(''); setFilter('Todas');}}
            className="mt-6 text-accent font-black uppercase text-xs tracking-widest hover:text-primary transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
