
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nniwyswxojkalelavdnn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaXd5c3d4b2prYWxlbGF2ZG5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwNjIzOSwiZXhwIjoyMDg5MTgyMjM5fQ.mBe8s99gtze_lm8UiVbtTHyMfUKvi6lB58SzCpxZJbc';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testIntegrity() {
  try {
    console.log('--- INICIANDO TEST DE INTEGRIDAD ---');

    // 1. Obtener una fecha activa
    const { data: fechas, error: fErr } = await supabase.from('fechas').select('*').eq('estado', 'abierta').limit(1);
    if (fErr) throw fErr;
    if (!fechas?.length) {
      console.log('No hay fechas abiertas para el test.');
      return;
    }
    const fechaId = fechas[0].id;
    console.log(`Fecha seleccionada: ${fechaId} (vs ${fechas[0].rival})`);

    // 2. Buscar un equipo de usuario para esa fecha
    const { data: equipo, error: eErr } = await supabase.from('equipos_usuarios').select('*').eq('fecha_id', fechaId).limit(1);
    if (eErr) throw eErr;
    if (!equipo?.length) {
      console.log('No hay equipos de usuarios para esta fecha. Realizá una selección primero.');
      return;
    }
    const userId = equipo[0].usuario_id;
    const jugadorId = equipo[0].jugador_id;
    console.log(`Usuario en prueba: ${userId}`);
    console.log(`Jugador en prueba: ${jugadorId}`);

    // 3. Simular carga de un Try (5 pts)
    console.log('Simulando Try (5 pts)...');
    await supabase.from('estadisticas_partido').delete().match({ fecha_id: fechaId, jugador_id: jugadorId });
    const { error: statErr } = await supabase.from('estadisticas_partido').insert({
      fecha_id: fechaId,
      jugador_id: jugadorId,
      tries: 1,
      conversiones: 0,
      penales: 0,
      drops: 0, // Asegurémonos de incluir todos los campos por si acaso
      amarillas: 0,
      rojas: 0
    });
    if (statErr) {
      console.error('Error al insertar stats:', statErr);
      throw statErr;
    }

    // 4. Ejecutar calculo de ranking (Simular Publicar)
    console.log('Recalculando ranking...');
    
    // Traer todos los equipos de la fecha
    const { data: todosLosEquipos, error: allEqErr } = await supabase.from('equipos_usuarios').select('usuario_id, jugador_id').eq('fecha_id', fechaId);
    if (allEqErr) throw allEqErr;
    
    const { data: todasLasStats, error: allStErr } = await supabase.from('estadisticas_partido').select('*').eq('fecha_id', fechaId);
    if (allStErr) throw allStErr;

    const SCORING = { TRY: 5, CONVERSION: 2, PENAL: 3, DROP: 3, AMARILLA: -3, ROJA: -10, PRESENCIA: 0 };
    
    const usuariosMap = {};
    todosLosEquipos.forEach(row => {
      if (!usuariosMap[row.usuario_id]) usuariosMap[row.usuario_id] = [];
      usuariosMap[row.usuario_id].push(row.jugador_id);
    });

    const rankingInserts = Object.entries(usuariosMap).map(([usuario_id, jugadorIds]) => {
      const puntosTotal = jugadorIds.reduce((sum, jId) => {
        const s = todasLasStats.find(st => st.jugador_id === jId);
        if (!s) return sum;
        return sum + (
          ((s.tries || 0) * SCORING.TRY) + 
          ((s.conversiones || 0) * SCORING.CONVERSION) + 
          ((s.penales || 0) * SCORING.PENAL) + 
          ((s.drops || 0) * SCORING.DROP) + 
          ((s.amarillas || 0) * SCORING.AMARILLA) + 
          ((s.rojas || 0) * SCORING.ROJA) + 
          SCORING.PRESENCIA
        );
      }, 0);
      return { usuario_id, fecha_id: fechaId, puntos_fecha: puntosTotal };
    });

    if (rankingInserts.length > 0) {
      const { error: delRankErr } = await supabase.from('ranking_usuarios').delete().eq('fecha_id', fechaId);
      if (delRankErr) throw delRankErr;
      
      const { error: insRankErr } = await supabase.from('ranking_usuarios').insert(rankingInserts);
      if (insRankErr) {
        console.error('Error insertando ranking:', insRankErr);
        throw insRankErr;
      }
    }

    // 5. Verificar resultado del usuario específico
    const { data: resultado, error: resErr } = await supabase.from('ranking_usuarios').select('puntos_fecha').eq('usuario_id', userId).eq('fecha_id', fechaId).single();
    if (resErr) throw resErr;
    
    console.log('--- RESULTADO ---');
    console.log(`Puntos finales del usuario para la fecha: ${resultado?.puntos_fecha}`);
    if (resultado?.puntos_fecha >= 5) {
      console.log('✅ TEST EXITOSO: El ranking se actualizó correctamente con los puntos del try.');
    } else {
      console.log('❌ TEST FALLIDO: Los puntos no coinciden.');
    }
  } catch (error) {
    console.error('ERROR CRITICO EN EL TEST:', error);
  }
}

testIntegrity();
