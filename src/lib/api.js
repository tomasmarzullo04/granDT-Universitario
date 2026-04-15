import { supabase } from './supabase';

export const SCORING = {
  TRY: 15,
  CONVERSION: 3,
  PENAL: 3,
  DROP: 5,
  AMARILLA: -5,
  ROJA: -10,
  PRESENCIA: 0,
  PENALES_HECHOS: -5,
  KNOCK_ON: -3,
  LINES_ROBADOS: 0,
  ASISTENCIA: 5,
  CORTE_LIMPIO: 3,
  TACKLE: 2,
  TACKLE_OFENSIVO: 5,
  RECUPERACION: 5,
};

/**
 * Calcula los puntos de un jugador dadas sus estadísticas.
 * Maneja valores null/undefined en cualquier campo.
 */
export function calcularPuntosJugador(s, isCaptain = false) {
  if (!s) return 0;
  const basePoints = (
    ((s.tries || 0) * SCORING.TRY) +
    ((s.conversiones || 0) * SCORING.CONVERSION) +
    ((s.penales || 0) * SCORING.PENAL) +
    ((s.drops || 0) * SCORING.DROP) +
    ((s.amarillas || 0) * SCORING.AMARILLA) +
    ((s.rojas || 0) * SCORING.ROJA) +
    ((s.penales_hechos || 0) * SCORING.PENALES_HECHOS) +
    ((s.asistencias || 0) * SCORING.ASISTENCIA) +
    ((s.cortes_limpios || 0) * SCORING.CORTE_LIMPIO) +
    ((s.tackles || 0) * SCORING.TACKLE) +
    ((s.tackles_ofensivos || 0) * SCORING.TACKLE_OFENSIVO) +
    ((s.recuperaciones || 0) * SCORING.RECUPERACION) +
    ((s.knock_ons || 0) * SCORING.KNOCK_ON)
  );
  return isCaptain ? basePoints * 2 : basePoints;
}

// ==========================================
// FECHAS (CICLO DE VIDA DINÁMICO)
// ==========================================

export const APP_STATUS = {
  ESPERANDO_PLANTELES: 'ESPERANDO_PLANTELES',
  ARMADO_EQUIPO: 'ARMADO_EQUIPO',
  FECHA_EN_JUEGO: 'FECHA_EN_JUEGO',
  ESPERANDO_STATS: 'ESPERANDO_STATS',
  RESULTADOS_PUBLICADOS: 'RESULTADOS_PUBLICADOS'
};

/**
 * Determina dinámicamente el estado del torneo desde el backend (RPC).
 */
export async function getLiveStatus() {
  const { data, error } = await supabase.rpc('get_tournament_lifecycle_context');
  
  if (error) {
    console.error('Error fetching live status:', error);
    // Fallback básico si falla el RPC (poco probable si la DB está ok)
    return { activeMatchday: null, status: APP_STATUS.FECHA_EN_JUEGO };
  }

  // EXCEPCIÓN TEMPORAL: Sábado 11/04 hasta las 13:00 hs
  const now = new Date();
  const deadline = new Date('2026-04-11T13:00:00-03:00');
  
  let finalStatus = data.status;
  if (now < deadline) {
    // Si estamos antes de las 13:00 de hoy, forzamos mercado abierto para permitir cambios
    finalStatus = APP_STATUS.ARMADO_EQUIPO;
  }

  return {
    activeMatchday: data.activeMatchday,
    status: finalStatus
  };
}

/**
 * Retorna la última fecha que tiene resultados publicados oficialmente.
 * Excluye FECHA LIBRE ya que no tiene datos significativos.
 */
export async function getLastPublishedFecha() {
  const { data, error } = await supabase
    .from('fechas')
    .select('*')
    .eq('stats_cargadas', true)
    .order('numero_fecha', { ascending: false });
  
  if (error || !data || data.length === 0) return null;
  
  // Filtrar FECHA LIBRE
  const meaningful = data.filter(f => {
    const rival = (f.rival || '').toUpperCase();
    return !rival.includes('FECHA LIBRE') && !rival.includes('LIBRE');
  });
  
  return meaningful.length > 0 ? meaningful[0] : data[0];
}


export async function getActiveFecha() {
  // Priorizar automatización
  const { activeMatchday } = await getLiveStatus();
  if (activeMatchday) return activeMatchday;

  // Fallback manual (legacy)
  let { data: abierta } = await supabase
    .from('fechas')
    .select('*')
    .eq('estado', 'abierta')
    .order('numero_fecha', { ascending: true })
    .limit(1)
    .single();

  if (abierta) return abierta;

  let { data: enJuego } = await supabase
    .from('fechas')
    .select('*')
    .eq('estado', 'en_juego')
    .order('numero_fecha', { ascending: true })
    .limit(1)
    .single();

  if (enJuego) return enJuego;

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
        nombre
      )
    `)
    .eq('fecha_id', fechaId);

  if (fetchErr) {
    console.error('Error fetching convocados (Supabase):', fetchErr);
    return [];
  }

  try {
    return data
      .filter(convocado => convocado && convocado.jugadores)
      .map(convocado => {
        const playerInfo = Array.isArray(convocado.jugadores)
          ? convocado.jugadores[0]
          : convocado.jugadores;

        if (!playerInfo) return null;

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
      })
      .filter(Boolean); // Remover nulls
  } catch (err) {
    console.error('Error mapping convocados data:', err);
    return [];
  }
}

// ==========================================
// EQUIPOS DE USUARIOS
// ==========================================

export async function saveEquipoSelection(userId, fechaId, selectedPlayerIds, captainId) {
  // SEGURIDAD: Validar cierre de mercado
  const { data: fecha } = await supabase.from('fechas').select('cierre_mercado').eq('id', fechaId).single();
  
  // EXCEPCIÓN TEMPORAL: Sábado 11/04 hasta las 13:00 hs
  const now = new Date();
  const deadline = new Date('2026-04-11T13:00:00-03:00');
  const isExceptionalWindow = now < deadline;

  if (!isExceptionalWindow && fecha && fecha.cierre_mercado) {
    if (new Date() >= new Date(fecha.cierre_mercado)) {
      throw new Error('MERCADO_CERRADO');
    }
  }

  await supabase
    .from('equipos_usuarios')
    .delete()
    .match({ usuario_id: userId, fecha_id: fechaId });

  const currentCaptainInTeam = selectedPlayerIds.includes(captainId);
  const finalCaptainId = currentCaptainInTeam ? captainId : null;

  const inserts = selectedPlayerIds.map((jugadorId, idx) => ({
    usuario_id: userId,
    fecha_id: fechaId,
    jugador_id: jugadorId,
    posicion_cancha: idx + 1,
    capitan_id: finalCaptainId,
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
// ESTADÍSTICAS ADMIN
// ==========================================

export async function getAdminStatsData(fechaId) {
  try {
    console.log('AdminStats: Iniciando carga para fecha:', fechaId);
    
    // 1. Obtener convocados para esta fecha específica con su categoría
    const [convRes, statsRes] = await Promise.all([
      supabase.from('convocados_fecha')
        .select(`
          categoria,
          jugadores (*)
        `)
        .eq('fecha_id', fechaId),
      supabase.from('estadisticas_partido').select('*').eq('fecha_id', fechaId)
    ]);

    if (convRes.error) {
      console.error('AdminStats: Error en convocados:', convRes.error);
      throw new Error(`Error Convocados: ${convRes.error.message}`);
    }
    if (statsRes.error) {
      console.error('AdminStats: Error en stats:', statsRes.error);
      throw new Error(`Error Stats: ${statsRes.error.message}`);
    }

    // Aplanar los datos de convocados para que tengan el formato de jugador + categoría
    const jugadoresConvocados = (convRes.data || []).map(c => {
      const playerInfo = Array.isArray(c.jugadores) ? c.jugadores[0] : c.jugadores;
      if (!playerInfo) return null;
      return {
        ...playerInfo,
        categoria: c.categoria || 'Sin Categoría'
      };
    }).filter(Boolean);

    // Fallback: Si no hay convocados, intentamos traer todos por si es una carga manual legacy
    // Pero el comportamiento deseado es cargar lo citado.
    let listFinal = jugadoresConvocados;
    if (listFinal.length === 0) {
      const { data: allPlayers } = await supabase.from('jugadores').select('*').order('nombre');
      listFinal = (allPlayers || []).map(p => ({ ...p, categoria: 'Sin Categoría (Global)' }));
    }

    console.log('AdminStats: Jugadores procesados:', listFinal.length);

    // Convertir array de stats en un objeto indexado por jugador_id
    const statsMap = {};
    (statsRes.data || []).forEach(s => {
      statsMap[s.jugador_id] = s;
    });

    return {
      jugadores: listFinal,
      stats: statsMap,
      error: null
    };
  } catch (err) {
    console.error('Error detallado en getAdminStatsData:', err);
    return { jugadores: [], stats: {}, error: err.message };
  }
}

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
 * Llama al procedimiento almacenado V3 (Transaccional, Idempotente, Atómico).
 */
export async function publicarResultadosFecha(fechaId, allStatsArray) {
  // allStatsArray debe ser mapeado al formato esperado por el JSONB de Postgres
  const statsPayload = allStatsArray.map(s => ({
    jugador_id: s.jugador_id,
    tries: parseInt(s.tries || 0),
    conversiones: parseInt(s.conversiones || 0),
    penales: parseInt(s.penales || 0),
    drops: parseInt(s.drops || 0),
    amarillas: parseInt(s.amarillas || 0),
    rojas: parseInt(s.rojas || 0),
    penales_hechos: parseInt(s.penales_hechos || 0),
    knock_ons: parseInt(s.knock_ons || 0),
    lines_robados: parseInt(s.lines_robados || 0),
    asistencias: parseInt(s.asistencias || 0),
    cortes_limpios: parseInt(s.cortes_limpios || 0),
    tackles: parseInt(s.tackles || 0),
    tackles_ofensivos: parseInt(s.tackles_ofensivos || 0),
    recuperaciones: parseInt(s.recuperaciones || 0)
  }));

  const { data, error } = await supabase.rpc('process_publication_v3', {
    p_fecha_id: fechaId,
    p_stats_json: statsPayload
  });

  if (error) {
    console.error('Error in publication RPC:', error);
    throw error;
  }

  return data;
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

  let totalPuntosMap = {};

  if (!rErr && rankingData && rankingData.length > 0) {
    // Caso A: Usar tabla procesada (Rápido)
    totalPuntosMap = (rankingData || []).reduce((acc, curr) => {
      acc[curr.usuario_id] = (acc[curr.usuario_id] || 0) + curr.puntos_fecha;
      return acc;
    }, {});
  } else {
    // Caso B: Cálculo on-the-fly (Automático)
    const now = new Date();
    const [statsRes, teamsRes, fechasRes] = await Promise.all([
      supabase.from('estadisticas_partido').select('*'),
      supabase.from('equipos_usuarios').select('usuario_id, jugador_id, capitan_id, fecha_id'),
      supabase.from('fechas').select('*')
    ]);

    if (!statsRes.error && !teamsRes.error && !fechasRes.error) {
      // Crear mapa de fechas para acceso rápido
      const fechasMap = (fechasRes.data || []).reduce((acc, f) => {
        acc[f.id] = f;
        return acc;
      }, {});

      // Filtrar partidos terminados y no libres en JS
      const filteredStats = (statsRes.data || []).filter(s => {
        const fecha = fechasMap[s.fecha_id];
        if (!fecha) return false;
        const fin = new Date(fecha.fin_fecha);
        const isLibre = fecha.rival?.toUpperCase().includes('FECHA LIBRE');
        return now > fin && !isLibre;
      });

      const statsMap = filteredStats.reduce((acc, s) => {
        const key = `${s.fecha_id}_${s.jugador_id}`;
        acc[key] = s;
        return acc;
      }, {});

      (teamsRes.data || []).forEach(sel => {
        const stat = statsMap[`${sel.fecha_id}_${sel.jugador_id}`];
        if (stat) {
          const isCaptain = sel.jugador_id === sel.capitan_id;
          const pts = calcularPuntosJugador(stat, isCaptain);
          totalPuntosMap[sel.usuario_id] = (totalPuntosMap[sel.usuario_id] || 0) + pts;
        }
      });
    }
  }

  // 2. Obtener perfiles para nombres
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, team_name')
    .eq('role', 'player');

  if (pErr) return [];

  return profiles.filter(p => {
    const isTest = (p.team_name?.toLowerCase().includes('test')) || (p.full_name?.toLowerCase().includes('test'));
    return !isTest;
  }).map(p => ({
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
  // 1. Intentar obtener equipo actual (fecha aún no publicada)
  const { data: equipo, error: eqErr } = await supabase
    .from('equipos_usuarios')
    .select('jugador_id, posicion_cancha, capitan_id')
    .eq('fecha_id', fechaId)
    .eq('usuario_id', userId);

  let jugadorIds = [];
  let capitanId = null;
  let posicionMap = {};

  if (!eqErr && equipo && equipo.length > 0) {
    // Caso A: Fecha aún no publicada, datos en equipos_usuarios
    jugadorIds = equipo.map(e => e.jugador_id);
    capitanId = equipo[0]?.capitan_id || null;
    equipo.forEach(e => { posicionMap[e.jugador_id] = e.posicion_cancha; });
  } else {
    // Caso B: Fecha ya publicada, datos en historico_equipos
    const { data: historico, error: hErr } = await supabase
      .from('historico_equipos')
      .select('player_ids, puntos_totales')
      .eq('user_id', userId)
      .eq('fecha_id', fechaId)
      .maybeSingle();

    if (hErr || !historico || !historico.player_ids || historico.player_ids.length === 0) {
      return null;
    }

    jugadorIds = historico.player_ids;
    // Asignar posiciones secuenciales como fallback
    jugadorIds.forEach((id, idx) => { posicionMap[id] = idx + 1; });
  }

  if (jugadorIds.length === 0) return null;

  // 2. Estadísticas de esos jugadores
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

  // 5. Obtener capitán de historico si no lo tenemos de equipos_usuarios
  if (!capitanId) {
    // Intentar obtener de equipos_usuarios por si hay datos parciales
    const { data: capData } = await supabase
      .from('equipos_usuarios')
      .select('capitan_id')
      .eq('fecha_id', fechaId)
      .eq('usuario_id', userId)
      .limit(1)
      .maybeSingle();
    capitanId = capData?.capitan_id || null;
  }

  // 6. Armar respuesta consolidada
  const items = jugadorIds.map(jId => {
    const info = (jugadoresInfo || []).find(j => j.id === jId) || {};
    const stats = (statsData || []).find(s => s.jugador_id === jId) || null;
    const conv = (convocados || []).find(c => c.jugador_id === jId) || {};

    const isCaptain = jId === capitanId;
    return {
      jugador_id: jId,
      posicion_cancha: posicionMap[jId] || 0,
      nombre: info.nombre || 'Jugador',
      categoria: conv.categoria || 'Sin Categoría',
      posicion_oficial: conv.posicion_actual || '',
      es_capitan: isCaptain,
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
        tackles_ofensivos: stats?.tackles_ofensivos || 0,
        recuperaciones: stats?.recuperaciones || 0,
      },
      puntos: calcularPuntosJugador(stats, isCaptain),
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

  const [statsRes, fechasRes] = await Promise.all([
    supabase.from('estadisticas_partido').select('*'),
    supabase.from('fechas').select('*')
  ]);

  const now = new Date();
  const fechasMap = (fechasRes.data || []).reduce((acc, f) => {
    acc[f.id] = f;
    return acc;
  }, {});

  // Filtrar stats en JS para asegurar que la fecha ya terminó
  const filteredStats = (statsRes.data || []).filter(s => {
    const fecha = fechasMap[s.fecha_id];
    if (!fecha) return false;
    const fin = new Date(fecha.fin_fecha);
    const isLibre = fecha.rival?.toUpperCase().includes('FECHA LIBRE');
    return now > fin && !isLibre;
  });

  const { data: convocatorias } = await supabase
    .from('convocados_fecha')
    .select('jugador_id, categoria, fecha_id')
    .order('fecha_id', { ascending: false });

  // Deduplicar stats: mantener solo una fila por (fecha_id, jugador_id)
  // Esto previene puntajes inflados si hay duplicados en la base
  const dedupedStats = Object.values(
    filteredStats.reduce((acc, s) => {
      const key = `${s.fecha_id}_${s.jugador_id}`;
      acc[key] = s; // Mantiene la última
      return acc;
    }, {})
  );

  return players.map(player => {
    const playerStats = dedupedStats.filter(s => s.jugador_id === player.id);
    const totalPoints = playerStats.reduce((acc, s) => acc + calcularPuntosJugador(s), 0);
    const mostRecentConv = (convocatorias || []).find(c => c.jugador_id === player.id);

    return {
      ...player,
      puntos: totalPoints,
      categoria: mostRecentConv?.categoria || 'Sin Categoría',
    };
  });
}

// ==========================================
// MÉTRICAS GLOBALES DEL MERCADO
// ==========================================

/**
 * Obtiene los "Most Picked" de la fecha activa y del histórico.
 */
export async function getMarketMetrics(activeFechaId) {
  // 1. Más elegido de la fecha activa
  let mostElegidoFecha = null;
  if (activeFechaId) {
    const { data: feData } = await supabase
      .from('equipos_usuarios')
      .select('jugador_id')
      .eq('fecha_id', activeFechaId);
    
    if (feData && feData.length > 0) {
      const counts = feData.reduce((acc, curr) => {
        acc[curr.jugador_id] = (acc[curr.jugador_id] || 0) + 1;
        return acc;
      }, {});
      const topId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      const { data: p } = await supabase.from('jugadores').select('nombre').eq('id', topId).single();
      mostElegidoFecha = { id: topId, nombre: p?.nombre || 'S/D', count: counts[topId] };
    }
  }

  // 2. Más elegido Histórico
  let mostElegidoHist = null;
  const { data: histData } = await supabase
    .from('equipos_usuarios')
    .select('jugador_id');
  
  if (histData && histData.length > 0) {
    const counts = histData.reduce((acc, curr) => {
      acc[curr.jugador_id] = (acc[curr.jugador_id] || 0) + 1;
      return acc;
    }, {});
    const topId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    const { data: p } = await supabase.from('jugadores').select('nombre').eq('id', topId).single();
    mostElegidoHist = { id: topId, nombre: p?.nombre || 'S/D', count: counts[topId] };
  }

  // 3. Capitán más elegido Histórico
  let mostCapitanHist = null;
  const { data: capData } = await supabase
    .from('equipos_usuarios')
    .select('capitan_id')
    .not('capitan_id', 'is', null);

  if (capData && capData.length > 0) {
    const counts = capData.reduce((acc, curr) => {
      acc[curr.capitan_id] = (acc[curr.capitan_id] || 0) + 1;
      return acc;
    }, {});
    const topId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    const { data: p } = await supabase.from('jugadores').select('nombre').eq('id', topId).single();
    mostCapitanHist = { id: topId, nombre: p?.nombre || 'S/D', count: counts[topId] };
  }

  // 4. Más Tarjetas (Por puntos negativos)
  let mostPenalized = null;
  const { data: stats } = await supabase
    .from('estadisticas_partido')
    .select('jugador_id, amarillas, rojas');
  
  if (stats && stats.length > 0) {
    const penaltyPointsMap = stats.reduce((acc, curr) => {
      const points = ((curr.amarillas || 0) * Math.abs(SCORING.AMARILLA)) + ((curr.rojas || 0) * Math.abs(SCORING.ROJA));
      acc[curr.jugador_id] = (acc[curr.jugador_id] || 0) + points;
      return acc;
    }, {});
    const topId = Object.keys(penaltyPointsMap).reduce((a, b) => penaltyPointsMap[a] > penaltyPointsMap[b] ? a : b);
    if (penaltyPointsMap[topId] > 0) {
      const { data: p } = await supabase.from('jugadores').select('nombre').eq('id', topId).single();
      mostPenalized = { id: topId, nombre: p?.nombre || 'S/D', penaltyPoints: penaltyPointsMap[topId] };
    }
  }

  return {
    mostElegidoFecha,
    mostElegidoHist,
    mostCapitanHist,
    mostPenalized
  };
}

/**
 * Obtiene el nombre del usuario con mayor puntaje en una fecha específica.
 */
export async function getEntrenadorDeLaFecha(fechaId) {
  if (!fechaId) return null;

  // 1. Intentar obtener de ranking_usuarios (oficial)
  const { data: ranking, error } = await supabase
    .from('ranking_usuarios')
    .select('usuario_id, puntos_fecha, profiles(full_name)')
    .eq('fecha_id', fechaId)
    .order('puntos_fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ranking) {
    const profile = Array.isArray(ranking.profiles) ? ranking.profiles[0] : ranking.profiles;
    return {
      nombre: profile?.full_name || 'S/D',
      puntos: ranking.puntos_fecha
    };
  }

  // 2. Fallback: Cálculo on-the-fly para esta fecha específica
  const [statsRes, teamsRes] = await Promise.all([
    supabase.from('estadisticas_partido').select('*').eq('fecha_id', fechaId),
    supabase.from('equipos_usuarios').select('usuario_id, jugador_id, capitan_id').eq('fecha_id', fechaId)
  ]);

  if (statsRes.error || teamsRes.error || !teamsRes.data.length) return null;

  // 3. Obtener perfiles por separado para evitar errores de relación (Robusto)
  const userIds = [...new Set(teamsRes.data.map(t => t.usuario_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
  const profilesMap = (profiles || []).reduce((acc, p) => {
    acc[p.id] = p.full_name;
    return acc;
  }, {});

  const statsMap = (statsRes.data || []).reduce((acc, s) => {
    acc[s.jugador_id] = s;
    return acc;
  }, {});

  const scoresMap = {};
  const namesMap = {};

  teamsRes.data.forEach(sel => {
    const stat = statsMap[sel.jugador_id];
    const isCaptain = sel.jugador_id === sel.capitan_id;
    const pts = calcularPuntosJugador(stat, isCaptain);
    scoresMap[sel.usuario_id] = (scoresMap[sel.usuario_id] || 0) + pts;
    const name = profilesMap[sel.usuario_id];
    if (name) namesMap[sel.usuario_id] = name;
  });

  const topUserId = Object.keys(scoresMap).reduce((a, b) => scoresMap[a] > scoresMap[b] ? a : b, null);

  if (!topUserId) return null;

  return {
    nombre: namesMap[topUserId] || 'S/D',
    puntos: scoresMap[topUserId]
  };
}

