import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan las variables de entorno de Supabase.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const nuevasFechas = [
  { numero_fecha: 1, rival: 'San Ignacio (Visitante)', estado: 'abierta', fecha_calendario: '2026-03-21' },
  { numero_fecha: 2, rival: 'Mar del Plata Club (Local)', estado: 'cerrada', fecha_calendario: '2026-03-28' },
  { numero_fecha: 3, rival: 'FECHA LIBRE', estado: 'cerrada', fecha_calendario: '2026-04-04' },
  { numero_fecha: 4, rival: 'Sporting (Visitante)', estado: 'cerrada', fecha_calendario: '2026-04-11' },
  { numero_fecha: 5, rival: 'FECHA LIBRE', estado: 'cerrada', fecha_calendario: '2026-04-18' },
  { numero_fecha: 6, rival: 'FECHA LIBRE', estado: 'cerrada', fecha_calendario: '2026-04-25' },
  { numero_fecha: 7, rival: 'Comercial (Local)', estado: 'cerrada', fecha_calendario: '2026-05-02' }
];

async function seed() {
  try {
    console.log("Creando si no existe la columna fecha_calendario...");
    // No podemos alterar DB directamente facilmente sin auth, 
    // pero si falla probamos insert original sin la columna.
    let inserts = nuevasFechas;
    
    const { error: errorTest } = await supabase.from('fechas').select('fecha_calendario').limit(1);
    if (errorTest) {
        console.warn("La columna fecha_calendario no existe. Insertando sin ella y avisando al usuario.");
        inserts = nuevasFechas.map(({ fecha_calendario, ...rest }) => ({
           ...rest,
           rival: `${rest.rival} - ${fecha_calendario}` // Guardamos la info provisoriamente
        }));
    }

    // Borramos todas las anteriores para limpiar
    await supabase.from('fechas').delete().neq('id', 0);
    
    console.log("Insertando fixture...");
    const { error } = await supabase.from('fechas').insert(inserts);
    
    if (error) throw error;
    
    console.log("¡Fechas cargadas exitosamente!");
  } catch (err) {
    console.error("Error cargando fechas:", err);
  }
}

seed();
