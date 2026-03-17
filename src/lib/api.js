import { supabase } from './supabase';

export const SCORING = {
  TRY: 5,
  CONVERSION: 2,
  PENAL: 3,
  AMARILLA: -3,
  ROJA: -10,
  PRESENCIA: 2 // Assuming presence still counts 2 from previous logic or general rugby fantasy rules
};

// Obtiene la fecha que esté "abierta" actualmente
export async function getActiveFecha() {
  const { data, error } = await supabase
    .from('fechas')
    .select('*')
    .eq('estado', 'abierta')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active fecha:', error);
    return null;
  }
  return data;
}

// Obtiene los jugadores convocados para una fecha específica
export async function getConvocados(fechaId) {
  const { data, error: fetchErr } = await supabase
    .from('convocados_fecha')
    .select(`
      categoria,
      posicion_actual,
      jugadores (
        id,
        nombre,
        foto_url
      )
    `)
    .eq('fecha_id', fechaId);

  if (fetchErr) {
    console.error('Error fetching convocados (Supabase):', fetchErr);
    console.error('Error Details:', fetchErr.details, fetchErr.hint, fetchErr.message);
    return [];
  }

  // Mapeamos los datos para devolver un array plano de jugadores,
  // utilizando la categoría y posición de la convocatoria actual.
  try {
    return data
      .filter(convocado => convocado.jugadores !== null)
      .map(convocado => {
        // Manejar caso donde jugadores venga como objeto o como array de un elemento
        const playerInfo = Array.isArray(convocado.jugadores) ? convocado.jugadores[0] : convocado.jugadores;
        
        return {
          ...playerInfo,
          categoria: convocado.categoria || 'Sin Categoría',
          posicion: convocado.posicion_actual || 'Jugador',
          // Normalizamos para lógica interna
          categoryDef: convocado.categoria === 'Pre-intermedia' ? 'pre' : (convocado.categoria ? convocado.categoria.toLowerCase() : 'primera')
        };
      });
  } catch (err) {
    console.error('Error mapping convocados data:', err);
    return [];
  }
}

// Guarda la selección de 15 jugadores para un usuario en una fecha
export async function saveEquipoSelection(userId, fechaId, selectedPlayerIds, captainId) {
  // 1. Borrar equipo anterior si existe para evitar duplicados en la DB
  await supabase
    .from('equipos_usuarios')
    .delete()
    .match({ usuario_id: userId, fecha_id: fechaId });

  // 2. Insertar nueva selección
  const inserts = selectedPlayerIds.map(jugadorId => ({
    usuario_id: userId,
    fecha_id: fechaId,
    jugador_id: jugadorId,
    es_capitan: jugadorId === captainId
  }));

  const { data, error } = await supabase
    .from('equipos_usuarios')
    .insert(inserts);

  if (error) {
    console.error('Error saving team selection:', error);
    throw error;
  }

  return data;
}

//===========================================
// METODOS PUBLICOS DE RANKING Y PERFILES
//===========================================

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role');
    
  if (error) {
    console.error('Error fetching perfiles:', error);
    return [];
  }
  return data;
}

// ==========================================
// MÉTODOS DE ADMINISTRADOR Y ESTADÍSTICAS
// ==========================================

export async function getAllFechas() {
  const { data, error } = await supabase
    .from('fechas')
    .select('*')
    .order('numero_fecha', { ascending: false });
    
  if (error) {
    console.error('Error fetching fechas:', error);
    return [];
  }
  return data;
}

// Obtiene estadísticas previas si ya habían sido cargadas
export async function getEstadisticasPartido(fechaId) {
  const { data, error } = await supabase
    .from('estadisticas_partido')
    .select('*')
    .eq('fecha_id', fechaId);
    
  if (error) {
    console.error('Error fetching estadisticas:', error);
    return [];
  }
  return data;
}

export async function upsertEstadisticas(statsArray) {
  if (statsArray.length === 0) return true;
  
  const fechaId = statsArray[0].fecha_id;
  
  // Limpiamos los existentes para la fecha enviada
  const { error: deleteError } = await supabase
    .from('estadisticas_partido')
    .delete()
    .eq('fecha_id', fechaId);
    
  if (deleteError) throw deleteError;
    
  const { error: insertError } = await supabase
    .from('estadisticas_partido')
    .insert(statsArray);
    
  if (insertError) throw insertError;
  return true;
}

export async function getPlayersStatistics() {
  // 1. Obtener todos los jugadores
  const { data: players, error: pError } = await supabase.from('jugadores').select('*');
  if (pError) {
    console.error('Error fetching players:', pError);
    return [];
  }

  // 2. Obtener todas las estadísticas
  const { data: stats, error: sError } = await supabase.from('estadisticas_partido').select('*');
  if (sError) {
    console.error('Error fetching stats:', sError);
  }

  // 3. Obtener convocatorias para determinar la categoría más reciente
  const { data: convocatorias, error: cError } = await supabase
    .from('convocados_fecha')
    .select('jugador_id, categoria, fecha_id')
    .order('fecha_id', { ascending: false });
    
  if (cError) {
    console.error('Error fetching convocatorias:', cError);
  }

  // 4. Procesar y consolidar
  return players.map(player => {
    const playerStats = (stats || []).filter(s => s.jugador_id === player.id);
    
    // Calculamos puntos acumulados
    const totalPoints = playerStats.reduce((acc, s) => {
      return acc + (
        (s.tries * SCORING.TRY) +
        (s.conversiones * SCORING.CONVERSION) +
        (s.penales * SCORING.PENAL) +
        (s.amarillas * SCORING.AMARILLA) +
        (s.rojas * SCORING.ROJA) +
        SCORING.PRESENCIA
      );
    }, 0);

    // Buscamos la categoría más reciente en la que fue convocado
    const mostRecentConv = (convocatorias || []).find(c => c.jugador_id === player.id);
    
    return {
      ...player,
      puntos: totalPoints,
      categoria: mostRecentConv?.categoria || 'Sin Categoría',
    };
  });
}

