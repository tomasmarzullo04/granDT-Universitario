import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, UserCheck, Image as ImageIcon, AlertCircle } from 'lucide-react';

export default function AprobacionesAdmin() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendientes();
  }, []);

  const fetchPendientes = async () => {
    try {
      setLoading(true);
      setError(null);
      // Traer usuarios que NO son competidores pero que tienen comprobante cargado
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, nombre, email, comprobante_url')
        .eq('es_competidor', false)
        .not('comprobante_url', 'is', null);

      if (fetchError) throw fetchError;
      setPendientes(data || []);
    } catch (err) {
      console.error('Error fetching pendientes:', err);
      setError('Error al cargar la lista de comprobantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (userId) => {
    try {
      setProcessingId(userId);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ es_competidor: true })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Remover el aprobado de la lista local
      setPendientes(pendientes.filter(p => p.id !== userId));
    } catch (err) {
      console.error('Error al aprobar:', err);
      alert('Hubo un error al aprobar al usuario. Intenta nuevamente.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-neutral mt-4 font-medium">Cargando comprobantes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-2xl flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
        <button onClick={fetchPendientes} className="ml-auto underline font-bold">Reintentar</button>
      </div>
    );
  }

  if (pendientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-neutral-light/50 rounded-2xl border border-dashed border-neutral/30">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-neutral shadow-sm mb-4">
          <UserCheck className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-dark mb-1">¡Todo al día!</h3>
        <p className="text-neutral">No hay jugadores pendientes de aprobación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-dark flex items-center gap-2">
          Comprobantes en Revisión <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{pendientes.length}</span>
        </h2>
        <button 
          onClick={fetchPendientes}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Refrescar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendientes.map(user => (
          <div key={user.id} className="bg-white border border-neutral/20 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-dark truncate text-sm">{user.nombre || 'Jugador Sin Nombre'}</h4>
                <p className="text-xs text-neutral truncate">{user.email}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 group">
              <a 
                href={user.comprobante_url} 
                target="_blank" 
                rel="noreferrer"
                className="relative w-full aspect-video flex items-center justify-center"
              >
                <img 
                  src={user.comprobante_url} 
                  alt="Comprobante" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-sm">
                  <span className="flex items-center gap-1 font-semibold text-sm">
                    <ImageIcon className="w-4 h-4" /> Ver Completo
                  </span>
                </div>
              </a>
            </div>

            <button
              onClick={() => handleAprobar(user.id)}
              disabled={processingId === user.id}
              className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all 
                ${processingId === user.id 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                }`}
            >
              {processingId === user.id ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Aprobando...</>
              ) : (
                <><UserCheck className="w-4 h-4" /> APROBAR JUGADOR</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
