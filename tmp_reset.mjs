import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
  console.log('Borrando estadisticas_partido (reinicia puntos de jugadores a 0)...');
  const { error: err1 } = await supabase.from('estadisticas_partido').delete().neq('id', 0);
  if (err1) console.error('Error 1:', err1.message);

  console.log('Borrando ranking_usuarios (reinicia ranking general a 0)...');
  const { error: err2 } = await supabase.from('ranking_usuarios').delete().neq('fecha_id', 0);
  if (err2) console.error('Error 2:', err2.message);
  
  console.log('Borrando historico_equipos (historia de 0)...');
  const { error: err3 } = await supabase.from('historico_equipos').delete().neq('fecha_id', 0);
  if (err3) console.error('Error 3:', err3.message);

  console.log('Reset complete. Todos los puntajes se mostraron en 0.');
}

reset();
