import { useState, useEffect } from 'react';
import TeamCounters from '../TeamCounters';
import PlayerCard from '../PlayerCard';
import ProximasFechas from '../ProximasFechas';
import RugbyPitch from '../RugbyPitch';
import { Save, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { getActiveFecha, getConvocados, saveEquipoSelection } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function MyTeamTab({ activeFechaGlobal }) {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!activeFechaGlobal) {
        setLoading(false);
        return;
      }
      const data = await getConvocados(activeFechaGlobal.id);
      setPlayers(data);
      setLoading(false);
    }
    loadData();
  }, [activeFechaGlobal]);

  const togglePlayer = (id, categoryDef) => {
    setError('');
    setSuccess(false);

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
      if (captainId === id) setCaptainId(null);
      return;
    }

    if (selectedIds.length >= 15) {
      setError('Ya has seleccionado el máximo de 15 jugadores.');
      return;
    }

    const currentCount = players.filter(p => selectedIds.includes(p.id) && p.categoryDef === categoryDef).length;
    if (currentCount >= 5) {
      setError(`No puedes seleccionar más de 5 jugadores de ${categoryDef}.`);
      return;
    }

    setSelectedIds([...selectedIds, id]);
  };

  const counts = {
    primera: players.filter(p => selectedIds.includes(p.id) && p.categoryDef === 'primera').length,
    intermedia: players.filter(p => selectedIds.includes(p.id) && p.categoryDef === 'intermedia').length,
    pre: players.filter(p => selectedIds.includes(p.id) && p.categoryDef === 'pre').length,
  };

  const getPlayerPrice = (categoryDef) => {
    switch(categoryDef) {
      case 'primera': return 10000000;
      case 'intermedia': return 7000000;
      case 'pre': return 5000000;
      default: return 5000000;
    }
  };

  const currentCost = selectedIds.reduce((sum, id) => {
    const p = players.find(player => player.id === id);
    return sum + (p ? getPlayerPrice(p.categoryDef) : 0);
  }, 0);
  
  const totalBudget = 100000000;
  const isOverBudget = currentCost > totalBudget;

  const isFormValid = counts.primera === 5 && counts.intermedia === 5 && counts.pre === 5 && !isOverBudget && captainId !== null;

  const handleSave = async () => {
    if (!isFormValid || !user || !activeFechaGlobal) return;
    
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      await saveEquipoSelection(user.id, activeFechaGlobal.id, selectedIds, captainId);
      setSuccess(true);
    } catch (err) {
      setError('Hubo un error al guardar tu equipo. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!activeFechaGlobal) {
    return (
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col pt-4">
        <div className="mb-4">
          <ProximasFechas />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4 p-6 bg-neutral-light rounded-2xl border border-neutral/20 mt-8">
          <AlertCircle className="w-16 h-16 text-neutral" />
          <h2 className="text-2xl font-bold text-primary">No hay fechas abiertas</h2>
          <p className="text-neutral max-w-sm">Actualmente no hay ninguna fecha activa en el sistema para armar el equipo.</p>
        </div>
      </div>
    );
  }

  const isFechaLibre = activeFechaGlobal.rival && activeFechaGlobal.rival.toUpperCase().includes('FECHA LIBRE');

  if (isFechaLibre) {
    return (
      <div className="flex-1 w-full max-w-2xl mx-auto space-y-6 pt-12">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 p-8 bg-white rounded-3xl border border-neutral/20 shadow-sm relative overflow-hidden">
          <div className="bg-primary/5 p-4 rounded-xl shadow-sm relative z-10 border border-primary/10">
            <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-primary mb-2">¡Fin de Semana Libre!</h2>
            <p className="text-neutral max-w-sm leading-relaxed text-lg">
              Esta semana no hay competencia oficial por fecha libre. Aprovechá para descansar y recargar energías.
            </p>
          </div>
          <div className="relative z-10 inline-block bg-primary mt-2 text-white px-4 py-2 rounded-xl text-sm font-bold tracking-widest uppercase shadow-sm">
            Nos vemos la próxima semana
          </div>
        </div>
      </div>
    );
  }

  if (players.length === 0 && !loading) {
    return (
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col pt-4">
        {/* Próximas Fechas siempre visible en Equipo */}
        <div className="mb-4">
          <ProximasFechas />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4 p-6 mt-8">
          <h2 className="text-2xl font-bold text-primary">Fecha {activeFechaGlobal.numero_fecha} vs {activeFechaGlobal.rival}</h2>
          <p className="text-neutral">Los convocados aún no han sido publicados por el staff.</p>
        </div>
      </div>
    );
  }

  const pitchPlayers = selectedIds.map(id => players.find(p => p.id === id)).filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-white max-w-5xl mx-auto w-full pb-32 pt-4 px-4 xl:px-0">
      {/* Selector de Jugadores Header */}
      <div className="text-center space-y-2 mb-6 mt-4 animate-fade-in relative z-20">
        <span className="inline-block bg-accent/10 text-accent px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase mb-1 border border-accent/20 shadow-sm">
          Tu Plantel Ideal
        </span>
        <h1 className="text-3xl font-black text-primary tracking-tighter flex items-center justify-center gap-2">
          Elegí a los 15
        </h1>
        <p className="text-neutral text-sm max-w-sm mx-auto">Regla de oro: 5 de cada plantel.</p>
      </div>
      
      {/* Próximas Fechas Banner solo en tab de Equipo */}
      <div className="mb-6 -mx-4">
        <ProximasFechas />
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mt-2 relative z-20">
        
        {/* Columna Izquierda: Contadores, Presupuesto y Cancha */}
        <div className="lg:w-[400px] flex-shrink-0 space-y-6 lg:sticky lg:top-[80px] self-start">
          <div className="bg-white pb-4 pt-2 shadow-sm border-b lg:border border-neutral/20 lg:p-4 lg:rounded-2xl sticky top-14 md:top-[60px] lg:static z-30 space-y-4">
            <TeamCounters counts={counts} />
            
            {/* Presupuesto Progress Bar */}
            <div className="bg-neutral-light/50 p-3 rounded-xl border border-neutral/20 shadow-inner max-w-sm mx-auto">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-neutral uppercase tracking-widest">Presupuesto</span>
                <span className={`text-sm font-black ${isOverBudget ? 'text-red-500' : 'text-primary'}`}>
                  ${(currentCost / 1000000).toFixed(0)}M / ${(totalBudget / 1000000).toFixed(0)}M
                </span>
              </div>
              <div className="h-2.5 w-full bg-neutral/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-accent'}`}
                  style={{ width: `${Math.min((currentCost / totalBudget) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            {isOverBudget && (
              <div className="text-center text-[#757575] text-sm font-medium animate-pulse">
                Límite excedido. Tienes un máximo de $100M.
              </div>
            )}
          </div>

          {/* Render Cancha Visual Solo en Desktop, en mobile ocupa mucho */}
          <div className="hidden lg:block bg-neutral-light/30 p-4 rounded-2xl border border-neutral/20">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-primary">Formación en Cancha</h3>
               <span className="text-xs font-bold bg-white px-2 py-1 rounded text-neutral border border-neutral/20">{selectedIds.length}/15</span>
             </div>
             <RugbyPitch players={pitchPlayers} />
          </div>
        </div>

        {/* Columna Derecha: Selección de Jugadores */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center gap-3 shadow-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-white border border-neutral/20 p-8 rounded-2xl text-center space-y-4 shadow-sm animate-fade-in">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-accent/20">
                    <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-primary">¡Equipo Guardado!</h2>
                  <p className="text-neutral">Tus 15 jugadores están listos para salir a la cancha y sumar puntos este fin de semana.</p>
                </div>
              )}

              {!success && ['primera', 'intermedia', 'pre'].map(cat => (
                <div key={cat} className="space-y-3 bg-white p-4 rounded-2xl border border-neutral/10 shadow-sm">
                  <h3 className="text-xl font-bold border-b border-neutral/20 pb-2 text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-80"></span>
                    {cat === 'pre' ? 'Pre-intermedia' : cat === 'intermedia' ? 'Intermedia' : 'Superior'}
                  </h3>
                  {players.filter(p => p.categoryDef === cat).length === 0 && (
                    <p className="text-neutral text-sm italic py-4">No hay jugadores convocados en este plantel aún.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {players.filter(p => p.categoryDef === cat).map(player => (
                      <PlayerCard 
                        key={player.id} 
                        player={player} 
                        isSelected={selectedIds.includes(player.id)}
                        isCaptain={captainId === player.id}
                        onToggle={() => togglePlayer(player.id, player.categoryDef)}
                        onCaptainToggle={(e) => {
                          e.stopPropagation();
                          setCaptainId(captainId === player.id ? null : player.id);
                        }}
                        disabled={counts[cat] >= 5 && !selectedIds.includes(player.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
          
          {/* Floating Action Button for Saving */}
          {!success && (
            <div className="fixed bottom-[70px] left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-neutral/20 flex justify-center pb-8 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pointer-events-none">
              <button
                onClick={handleSave}
                disabled={!isFormValid || saving}
                className={`
                  pointer-events-auto flex items-center gap-3 px-8 py-3 rounded-lg font-bold text-lg transition-colors shadow-sm
                  ${isFormValid && !saving
                    ? 'bg-primary text-white hover:bg-primary/90 cursor-pointer'
                    : 'bg-neutral-light text-neutral cursor-not-allowed border border-neutral/20 opacity-95'
                  }
                `}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {counts.primera === 5 && counts.intermedia === 5 && counts.pre === 5 && !captainId && !isOverBudget ? 'Falta elegir Capitán' : 'Guardar Equipo'}
                  </>
                )}
              </button>
            </div>
          )}
    </div>
  );
}
