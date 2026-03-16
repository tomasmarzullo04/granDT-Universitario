import { supabase } from './supabase';

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
  const { data, error } = await supabase
    .from('convocados_fecha')
    .select(`
      id,
      categoria,
      posicion_actual,
      jugadores (
        id,
        nombre,
        foto_url
      )
    `)
    .eq('fecha_id', fechaId);

  if (error) {
    console.error('Error fetching convocados:', error);
    return [];
  }

  // Mapeamos los datos para devolver un array plano de jugadores,
  // utilizando la categoría y posición de la convocatoria actual.
  return data.map(convocado => ({
    ...convocado.jugadores,
    categoria: convocado.categoria || 'Sin Categoría',
    posicion: convocado.posicion_actual || 'Jugador', // Lo mapeamos a 'posicion' para no romper PlayerCard
    // Normalizamos 'Pre-intermedia' a 'pre' y 'Primera' a 'primera'
    categoryDef: convocado.categoria === 'Pre-intermedia' ? 'pre' : (convocado.categoria ? convocado.categoria.toLowerCase() : 'primera')
  }));
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

