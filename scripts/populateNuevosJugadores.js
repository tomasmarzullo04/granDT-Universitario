import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const rawNames = [
  "Parra Videla, Juan Cruz",
  "Victoria, Benjamin",
  "Salomon, Lautaro",
  "Carricart Acosta, Francisco",
  "Blanco, Nicolás Walter",
  "Auzmendia, Agustin",
  "Barreca, Francisco",
  "Pfister, Gonzalo",
  "Arregui, Jose",
  "Soler Villen, Benito",
  "Freiz Di Meglio, Tomas Agustin",
  "Calvo Atlante, Bautista",
  "Rodriguez Reinoso, Franco",
  "Gerlero, Salvador",
  "Rocco, Tomas",
  "De Angeli, Mauro",
  "Zabaleta, Bautista",
  "Esposito Ressia, Gianfranco",
  "Anamiodi Vila, Santiago",
  "Poletti, Fausto",
  "Victoria, Juan Bautista",
  "Rocha, Ernesto",
  "Osorno, Ignacio",
  "Victoria, Manuel",
  "Giorgi Games, Francisco",
  "Moraza, Tomas",
  "Layral Sanchis, Ramon",
  "Bustos, Gonzalo",
  "Ely, Francisco",
  "Otamendi, Felipe",
  "Letamendía, Juan",
  "Bruno, Octavio",
  "Anamiodi, Nicolas",
  "Duarte Méndez, Benjamín Darío",
  "Miqueleiz, Francisco",
  "Martin, Bernardo",
  "Ledesma, Facundo",
  "Juarez, Simon",
  "Ruberto, Eduardo Fermin",
  "Belardo, Ignacio",
  "Rosenthal, Tomas",
  "Barbero, Santos",
  "Tigero, Bruno",
  "Moraza Tizeira, Mateo Joaquin",
  "Lastra, Alejo",
  "Ricaldoni, Ramiro",
  "Dursi, Valentin"
];

function formatName(raw) {
    if (raw.includes(',')) {
        const parts = raw.split(',');
        return `${parts[1].trim()} ${parts[0].trim()}`;
    }
    return raw;
}

const uniqueNames = [...new Set(rawNames.map(formatName))];

async function run() {
    console.log('Eliminando equipos de usuarios antiguos para evitar problemas de FK...');
    await supabase.from('equipos_usuarios').delete().not('fecha_id', 'is', null);
    
    console.log('Eliminando estadísticas antiguas...');
    await supabase.from('estadisticas_partido').delete().not('fecha_id', 'is', null);

    console.log('Eliminando convocados antiguos...');
    await supabase.from('convocados_fecha').delete().not('fecha_id', 'is', null);
    
    console.log('Eliminando jugadores...');
    const { error: delErr } = await supabase.from('jugadores').delete().not('id', 'is', null);
    
    if (delErr) {
        console.error('Error al limpiar jugadores', delErr);
        return;
    }
    
    console.log('Insertando nuevos jugadores (Total: ' + uniqueNames.length + ')');
    
    const inserts = uniqueNames.map(nombre => ({
        nombre
    }));
    
    // Split inserts in chunks if needed, but 47 is small enough
    const { error: insErr } = await supabase.from('jugadores').insert(inserts);
    
    if (insErr) {
        console.error('Error insertando', insErr);
    } else {
        console.log('Jugadores agregados correctamente.');
    }
}

run();
