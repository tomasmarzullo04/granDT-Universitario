import { supabase } from './supabase';

export const SCORING = {
  TRY: 5,
  CONVERSION: 2,
  PENAL: 2,
  DROP: 3,
  AMARILLA: -3,
  ROJA: -7,
  PRESENCIA: 0,
  PENALES_HECHOS: -2,
  KNOCK_ON: -1,
  LINES_ROBADOS: 2,
  ASISTENCIA: 2,
  CORTE_LIMPIO: 1,
  TACKLE: 1,
};

/**
 * Calcula los puntos de un jugador dadas sus estadísticas.
 * Maneja valores null/undefined en cualquier campo (incluido drops).
 */
export function calcularPuntosJugador(s) {
  if (!s) return 0;
  return (
    ((s.tries || 0) * SCORING.TRY) +
    ((s.conversiones || 0) * SCORING.CONVERSION) +
    ((s.penales || 0) * SCORING.PENAL) +
    ((s.drops || 0) * SCORING.DROP) +
    ((s.amarillas || 0) * SCORING.AMARILLA) +
    ((s.rojas || 0) * SCORING.ROJA) +
    ((s.penales_hechos || 0) * SCORING.PENALES_HECHOS) +
    ((s.knock_ons || 0) * SCORING.KNOCK_ON) +
    ((s.lines_robados || 0) * SCORING.LINES_ROBADOS) +
    ((s.asistencias || 0) * SCORING.ASISTENCIA) +
    ((s.cortes_limpios || 0) * SCORING.CORTE_LIMPIO) +
    ((s.tackles || 0) * SCORING.TACKLE) +
    SCORING.PRESENCIA
  );
}

// ==========================================
// FECHAS
// ==========================================

export async function getActiveFecha() {
  // 1. Intentar traer la abierta (para armar equipo)
  let { data: abierta } = await supabase
    .from('fechas')
    .select('*')
    .eq('estado', 'abierta')
    .order('numero_fecha', { ascending: true })
    .limit(1)
    .single();

  if (abierta) return abierta;

  // 2. Intentar la que está 'en_juego' (bloqueada)
  let { data: enJuego } = await supabase
    .from('fechas')
    .select('*')
    .eq('estado', 'en_juego')
    .order('numero_fecha', { ascending: true })
    .limit(1)
    .single();

  if (enJuego) return enJuego;

  // 3. Por último, la más reciente finalizada
  let { data: finalizada } = await supabase
    .from('fechas')
    .select('*')
    .eq('estado', 'finalizada')
    .order('numero_fecha', { ascending: false })
    .limit(1)
    .single();

  return finalizada || null;
}

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

// ==========================================
// CONVOCADOS
// ==========================================

export async function getConvocados(fechaId) {
  const { data, error: fetchErr } = await supabase
    .from('convocados_fecha')
    .select(`
      categoria,
      posicion_actual,
      jugadores (
        id,
        nombre,
        precio
      )
    `)
    .eq('fecha_id', fechaId);

  if (fetchErr) {
    console.error('Error fetching convocados (Supabase):', fetchErr);
    return [];
  }

  try {
    return data
      .filter(convocado => convocado.jugadores !== null)
      .map(convocado => {
        const playerInfo = Array.isArray(convocado.jugadores)
          ? convocado.jugadores[0]
          : convocado.jugadores;

        return {
          ...playerInfo,
          categoria: convocado.categoria || 'Sin Categoría',
          posicion: convocado.posicion_actual || 'Jugador',
          categoryDef:
            convocado.categoria === 'Pre-intermedia'
              ? 'pre'
              : convocado.categoria
              ? convocado.categoria.toLowerCase()
              : 'primera',
        };
      });
  } catch (err) {
    console.error('Error mapping convocados data:', err);
    return [];
  }
}

// ==========================================
// EQUIPOS DE USUARIOS
// ==========================================

export async function saveEquipoSelection(userId, fechaId, selectedPlayerIds, captainId) {
  await supabase
    .from('equipos_usuarios')
    .delete()
    .match({ usuario_id: userId, fecha_id: fechaId });

  const inserts = selectedPlayerIds.map(jugadorId => ({
    usuario_id: userId,
    fecha_id: fechaId,
    jugador_id: jugadorId,
    es_capitan: jugadorId === captainId,
  }));

  const { data, error } = await supabase.from('equipos_usuarios').insert(inserts);

  if (error) {
    console.error('Error saving team selection:', error);
    throw error;
  }
  return data;
}

/**
 * ARCHIVADO HISTÓRICO: Crea un "Snapshot" del equipo de un usuario al cerrar la fecha.
 * Toma los IDs del equipo y el puntaje de la fecha (si ya se calculó, sino 0)
 * y los guarda en 'historico_equipos'.
 */
export async function archiveTeamSnapshot(userId, numeroFecha, fechaId, playerIds, puntosTotales = 0) {
  if (!playerIds || playerIds.length === 0) return null;

  // Verificar si ya existe un snapshot para esta fecha y usuario
  const { data: existing, error: checkErr } = await supabase
    .from('historico_equipos')
    .select('id')
    .eq('user_id', userId)
    .eq('fecha_id', fechaId)
    .maybeSingle();

  if (checkErr) {
    console.error('Error checking existing snapshot:', checkErr);
    throw checkErr;
  }

  // Si ya existe, no hacemos nada para no sobreescribir y mantener el primer snapshot
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('historico_equipos')
    .insert([{
      user_id: userId,
      numero_fecha: numeroFecha,
      fecha_id: fechaId,
      player_ids: playerIds,
      puntos_totales: puntosTotales
    }]);

  if (error) {
    console.error('Error archiving team snapshot:', error);
    throw error;
  }

  return data;
}

/**
 * Obtiene el equipo histórico de un usuario para una fecha dada.
 */
export async function getHistoricalTeam(userId, fechaId) {
  const { data, error } = await supabase
    .from('historico_equipos')
    .select('*')
    .eq('user_id', userId)
    .eq('fecha_id', fechaId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching historical team:', error);
    return null;
  }

  return data;
}

// ==========================================
// ESTADÍSTICAS POR PARTIDO

// ==========================================

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

/**
 * Guarda (upsert) las estadísticas de UNA CATEGORÍA de forma parcial.
 * Elimina solo los registros de los jugadores enviados en el array y los re-inserta.
 * Esto permite guardar una categoría sin afectar a las otras.
 */
export async function upsertEstadisticasCategoria(statsArray) {
  if (!statsArray || statsArray.length === 0) return true;

  const jugadorIds = statsArray.map(s => s.jugador_id);
  const fechaId = statsArray[0].fecha_id;

  // Borrar solo los jugadores de esta categoría para esta fecha
  const { error: deleteError } = await supabase
    .from('estadisticas_partido')
    .delete()
    .eq('fecha_id', fechaId)
    .in('jugador_id', jugadorIds);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from('estadisticas_partido')
    .insert(statsArray);

  if (insertError) throw insertError;
  return true;
}

/**
 * Guarda TODAS las estadísticas de una fecha (reemplaza todo).
 * Usado al publicar resultados finales.
 */
export async function upsertEstadisticas(statsArray) {
  if (statsArray.length === 0) return true;

  const fechaId = statsArray[0].fecha_id;

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

/**
 * PUBLICAR RESULTADOS FINALES:
 * 1. Guarda todas las stats de la fecha en estadisticas_partido.
 * 2. Calcula los puntos de cada usuario (sus 15 elegidos) en ranking_usuarios.
 * 3. Marca la fecha como 'finalizada'.
 */
export async function publicarResultadosFecha(fechaId, allStatsArray) {
  // 1. Guardar todas las estadísticas
  await upsertEstadisticas(allStatsArray);

  // 2. Leer equipos de todos los usuarios para esta fecha
  const { data: equipos, error: eqErr } = await supabase
    .from('equipos_usuarios')
    .select('usuario_id, jugador_id')
    .eq('fecha_id', fechaId);

  if (eqErr) throw eqErr;

  // 3. Leer estadísticas ya guardadas de esta fecha
  const { data: statsData, error: stErr } = await supabase
    .from('estadisticas_partido')
    .select('*')
    .eq('fecha_id', fechaId);

  if (stErr) throw stErr;

  // 4. Agrupar jugadores por usuario
  const usuariosMap = {};
  (equipos || []).forEach(row => {
    if (!usuariosMap[row.usuario_id]) usuariosMap[row.usuario_id] = [];
    usuariosMap[row.usuario_id].push(row.jugador_id);
  });
  // 5. Calcular puntos por usuario
  const rankingInserts = Object.entries(usuariosMap).map(([usuario_id, jugadorIds]) => {
    const puntosTotal = jugadorIds.reduce((sum, jId) => {
      const st = (statsData || []).find(s => s.jugador_id === jId);
      return sum + calcularPuntosJugador(st);
    }, 0);

    return {
      usuario_id,
      fecha_id: fechaId,
      puntos_fecha: puntosTotal,
    };
  });

  // 6. Upsert en ranking_usuarios
  if (rankingInserts.length > 0) {
    // Borramos los registros de esta fecha para asegurar que no haya duplicados
    await supabase
      .from('ranking_usuarios')
      .delete()
      .eq('fecha_id', fechaId);

    const { error: insRankErr } = await supabase
      .from('ranking_usuarios')
      .insert(rankingInserts);

    if (insRankErr) {
      console.error('Error insertando en ranking_usuarios:', insRankErr.message);
      throw insRankErr;
    }
  }

  // 7. Marcar fecha como finalizada
  const { error: fechaErr } = await supabase
    .from('fechas')
    .update({ estado: 'finalizada' })
    .eq('id', fechaId);

  if (fechaErr) throw fechaErr;

  return true;
}

// ==========================================
// RANKING
// ==========================================

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, team_name');

  if (error) {
    console.error('Error fetching perfiles:', error);
    return [];
  }
  return data;
}

/**
 * Obtiene el ranking completo de usuarios sumando sus puntos
 * desde ranking_usuarios (optimizado). Si la tabla no existe o está vacía,
 * hace fallback a cálculo on-the-fly desde equipos_usuarios + estadisticas_partido.
 */
export async function getRankingCompleto() {
  // 1. Obtener puntos acumulados por usuario de ranking_usuarios
  const { data: rankingData, error: rErr } = await supabase
    .from('ranking_usuarios')
    .select('usuario_id, puntos_fecha');

  if (rErr) return [];

  // Agrupar puntos por usuario_id
  const totalPuntosMap = (rankingData || []).reduce((acc, curr) => {
    acc[curr.usuario_id] = (acc[curr.usuario_id] || 0) + curr.puntos_fecha;
    return acc;
  }, {});

  // 2. Obtener perfiles para nombres
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, team_name')
    .eq('role', 'player');

  if (pErr) return [];

  return profiles.map(p => ({
    ...p,
    puntos: totalPuntosMap[p.id] || 0
  })).sort((a, b) => b.puntos - a.puntos);
}

// ==========================================
// RESUMEN DE FECHA (para el Dashboard del Player)
// ==========================================

/**
 * Devuelve los 15 jugadores del usuario para una fecha específica
 * con sus estadísticas y puntos individuales.
 */
export async function getResumenFecha(fechaId, userId) {
  // 1. Jugadores elegidos por el usuario
  const { data: equipo, error: eqErr } = await supabase
    .from('equipos_usuarios')
    .select('jugador_id, posicion_cancha')
    .eq('fecha_id', fechaId)
    .eq('usuario_id', userId);

  if (eqErr || !equipo || equipo.length === 0) return null;

  // 2. Estadísticas de esos jugadores
  const jugadorIds = equipo.map(e => e.jugador_id);

  const { data: statsData } = await supabase
    .from('estadisticas_partido')
    .select('*')
    .eq('fecha_id', fechaId)
    .in('jugador_id', jugadorIds);

  // 3. Info de los jugadores (nombre)
  const { data: jugadoresInfo } = await supabase
    .from('jugadores')
    .select('id, nombre')
    .in('id', jugadorIds);

  // 4. Posiciones de convocatoria (para mostrar categoría)
  const { data: convocados } = await supabase
    .from('convocados_fecha')
    .select('jugador_id, categoria, posicion_actual')
    .eq('fecha_id', fechaId)
    .in('jugador_id', jugadorIds);

  // 5. Armar respuesta consolidada
  const items = equipo.map(e => {
    const info = (jugadoresInfo || []).find(j => j.id === e.jugador_id) || {};
    const stats = (statsData || []).find(s => s.jugador_id === e.jugador_id) || null;
    const conv = (convocados || []).find(c => c.jugador_id === e.jugador_id) || {};

    return {
      jugador_id: e.jugador_id,
      posicion_cancha: e.posicion_cancha,
      nombre: info.nombre || 'Jugador',
      categoria: conv.categoria || 'Sin Categoría',
      posicion_oficial: conv.posicion_actual || '',
      stats: {
        tries: stats?.tries || 0,
        conversiones: stats?.conversiones || 0,
        penales: stats?.penales || 0,
        drops: stats?.drops || 0,
        amarillas: stats?.amarillas || 0,
        rojas: stats?.rojas || 0,
        penales_hechos: stats?.penales_hechos || 0,
        knock_ons: stats?.knock_ons || 0,
        lines_robados: stats?.lines_robados || 0,
        asistencias: stats?.asistencias || 0,
        cortes_limpios: stats?.cortes_limpios || 0,
        tackles: stats?.tackles || 0,
      },
      puntos: calcularPuntosJugador(stats),
    };
  });

  const puntosTotal = items.reduce((sum, i) => sum + i.puntos, 0);

  return { items, puntosTotal };
}

// ==========================================
// ESTADÍSTICAS GLOBALES DE JUGADORES
// ==========================================

export async function getPlayersStatistics() {
  const { data: players, error: pError } = await supabase.from('jugadores').select('*');
  if (pError) {
    console.error('Error fetching players:', pError);
    return [];
  }

  const { data: stats } = await supabase.from('estadisticas_partido').select('*');
  const { data: convocatorias } = await supabase
    .from('convocados_fecha')
    .select('jugador_id, categoria, fecha_id')
    .order('fecha_id', { ascending: false });

  return players.map(player => {
    const playerStats = (stats || []).filter(s => s.jugador_id === player.id);
    const totalPoints = playerStats.reduce((acc, s) => acc + calcularPuntosJugador(s), 0);
    const mostRecentConv = (convocatorias || []).find(c => c.jugador_id === player.id);

    return {
      ...player,
      puntos: totalPoints,
      categoria: mostRecentConv?.categoria || 'Sin Categoría',
    };
  });
}

/**
 * Actualiza el precio de un jugador.
 */
export async function updatePlayerPrice(playerId, newPrice) {
  const { data, error } = await supabase
    .from('jugadores')
    .update({ precio: newPrice })
    .eq('id', playerId);

  if (error) {
    console.error('Error updating player price:', error);
    throw error;
  }
  return data;
}

