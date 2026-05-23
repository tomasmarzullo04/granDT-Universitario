import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Fases del ciclo semanal. Espejan el enum `fase_actual` de la vista
 * `vw_fecha_activa` (única fuente de verdad en el backend).
 */
export const FASES = {
  ESPERANDO_CONVOCADOS: 'esperando_convocados',
  MERCADO_ABIERTO: 'mercado_abierto',
  EN_JUEGO: 'en_juego',
  RESULTADOS_PUBLICADOS: 'resultados_publicados',
  SIN_FECHA_ACTIVA: 'sin_fecha_activa',
};

const POLL_NORMAL_MS = 60000;   // refresco normal cada 60s
const POLL_INMINENTE_MS = 10000; // refresco cada 10s cuando el evento está cerca
const UMBRAL_INMINENTE_S = 300;  // "cerca" = faltan menos de 5 minutos

/**
 * useFechaActiva — Hook que consume `vw_fecha_activa` y la mantiene fresca.
 *
 * Re-fetch automático:
 *   - Al montar.
 *   - Cada 60s mientras la pestaña esté visible.
 *   - Al volver la pestaña a visible (visibilitychange).
 *   - Cada 10s cuando faltan < 5 min para el próximo cambio de fase.
 *   - Al instante si el staff modifica la tabla `fechas` (Supabase Realtime).
 *
 * @returns {{
 *   fechaActiva: object|null,  // fila completa de vw_fecha_activa
 *   fase: string|null,         // fase_actual (uno de FASES)
 *   loading: boolean,
 *   error: object|null,
 *   refetch: () => Promise<void>
 * }}
 */
export function useFechaActiva() {
  const [fechaActiva, setFechaActiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);

  const fetchFecha = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('vw_fecha_activa')
      .select('*')
      .maybeSingle();

    if (!mountedRef.current) return;

    if (err) {
      setError(err);
    } else {
      setFechaActiva(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  // Efecto de montaje: fetch inicial + visibilitychange + Realtime sobre `fechas`.
  // fetchFecha es estable (useCallback []), así que esto corre una sola vez.
  useEffect(() => {
    mountedRef.current = true;
    fetchFecha();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchFecha();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const channel = supabase
      .channel('fechas-lifecycle')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fechas' },
        () => fetchFecha()
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      supabase.removeChannel(channel);
    };
  }, [fetchFecha]);

  // Cadencia adaptativa: 10s si el próximo evento es inminente, 60s en general.
  // Sólo depende del "bucket" de cadencia, no del valor exacto en segundos,
  // para no recrear el intervalo en cada refresco.
  const segundos = fechaActiva?.segundos_hasta_proximo_evento;
  const cadencia =
    typeof segundos === 'number' && segundos >= 0 && segundos <= UMBRAL_INMINENTE_S
      ? POLL_INMINENTE_MS
      : POLL_NORMAL_MS;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchFecha();
    }, cadencia);
    return () => clearInterval(id);
  }, [cadencia, fetchFecha]);

  return {
    fechaActiva,
    fase: fechaActiva?.fase_actual ?? (loading ? null : FASES.SIN_FECHA_ACTIVA),
    loading,
    error,
    refetch: fetchFecha,
  };
}

export default useFechaActiva;
