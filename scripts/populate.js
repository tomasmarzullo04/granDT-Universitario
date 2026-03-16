import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nniwyswxojkalelavdnn.supabase.co';
const supabaseKey = 'sb_publishable_W-ZIE93YJE4_-s3i3kxKtg_5VEHI3rJ';
const supabase = createClient(supabaseUrl, supabaseKey);

const playersList = [
  { nombre: "Matias Marzullo", posicion: "Pilar", categoria: "Primera" },
  { nombre: "Ernesto Rocha", posicion: "Hooker", categoria: "Primera" },
  { nombre: "Francisco Carricart", posicion: "Segunda Línea", categoria: "Primera" },
  { nombre: "Tomas Rocco", posicion: "Tercera Línea", categoria: "Primera" },
  { nombre: "Joaquin Auzmendia", posicion: "Medio Scrum", categoria: "Primera" },
  
  { nombre: "Agustin Auzmendia", posicion: "Apertura", categoria: "Intermedia" },
  { nombre: "Jose Arregui", posicion: "Centro", categoria: "Intermedia" },
  { nombre: "Tomas Freiz", posicion: "Wing", categoria: "Intermedia" },
  { nombre: "Salvador Gerlero", posicion: "Fullback", categoria: "Intermedia" },
  { nombre: "Francisco Barreca", posicion: "Pilar", categoria: "Intermedia" },
  
  { nombre: "Benjamin Victoria", posicion: "Hooker", categoria: "Pre-intermedia" },
  { nombre: "Nicolas Blanco", posicion: "Segunda Línea", categoria: "Pre-intermedia" },
  { nombre: "Ignacio Osorno", posicion: "Tercera Línea", categoria: "Pre-intermedia" },
  { nombre: "Luca Moreno", posicion: "Medio Scrum", categoria: "Pre-intermedia" },
  { nombre: "Simon Juarez", posicion: "Centro", categoria: "Pre-intermedia" }
];

async function run() {
  let fechaId = 1;
  console.log('1. Inserting Fetch...');
  // 1. Insert Fecha
  const { data: fechaData, error: fechaError } = await supabase
    .from('fechas')
    .upsert({ id: 1, numero_fecha: 1, rival: 'Rival de Prueba', estado: 'abierta' })
    .select()
    .single();

  if (fechaError) {
    console.error('Error insertando fecha:', fechaError);
    console.log('Fall back a usar fechaId = 1 por si ya existe el ID');
  } else {
    fechaId = fechaData.id;
    console.log('Fecha inserted/updated:', fechaId);
  }

  console.log('2. Inserting Jugadores...');
  const playerIds = [];
  for (const p of playersList) {
    // Solo campo nombre en jugadores, categoria y posicion van en convocados_fecha
    const { data: playerData, error: playerError } = await supabase
      .from('jugadores')
      .insert({ nombre: p.nombre })
      .select('id')
      .single();

    if (playerError) {
        console.error('Error insertando jugador', p.nombre, ':', playerError);
        // Maybe it exists? let's filter by name
        const { data: existingPlayer } = await supabase.from('jugadores').select('id').eq('nombre', p.nombre).single();
        if (existingPlayer) {
          playerIds.push({ id: existingPlayer.id, categoria: p.categoria, posicion_actual: p.posicion });
        }
    } else {
        playerIds.push({ id: playerData.id, categoria: p.categoria, posicion_actual: p.posicion });
    }
  }
  
  console.log(`Jugadores procesados: ${playerIds.length}`);

  console.log('3. Inserting Convocados_fecha...');
  // Limpiar convocados existentes para esta fecha para no duplicar
  await supabase.from('convocados_fecha').delete().eq('fecha_id', fechaId);

  for (const { id: jugador_id, categoria, posicion_actual } of playerIds) {
    const { error: convocadoError } = await supabase
      .from('convocados_fecha')
      .insert({
        fecha_id: fechaId,
        jugador_id,
        categoria,
        posicion_actual
      });

    if (convocadoError) {
      console.error('Error insertando convocado para jugador_id', jugador_id, ':', convocadoError);
    }
  }

  console.log('¡Datos cargados correctamente en Supabase!');
}

run();
