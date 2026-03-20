
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nniwyswxojkalelavdnn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaXd5c3d4b2prYWxlbGF2ZG5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwNjIzOSwiZXhwIjoyMDg5MTgyMjM5fQ.mBe8s99gtze_lm8UiVbtTHyMfUKvi6lB58SzCpxZJbc';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function getSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name_input: 'estadisticas_partido' });
  if (error) {
    // If RPC doesn't exist, try raw SQL if possible (unlikely via JS client without RPC)
    // Alternative: Try to fetch a record and see the keys (already tried, table empty)
    // Alternative: Just try different names for rojas and penales
    console.error('RPC Error:', error.message);
    
    // Let's try to insert a record with only ID and Fecha to see if it works, then inspect
    console.log('Intentando inserción mínima para ver columnas por defecto...');
    const { data: insData, error: insErr } = await supabase.from('estadisticas_partido').insert({ fecha_id: 1, jugador_id: 34 }).select();
    if (insErr) console.error('Insert Error:', insErr.message);
    else console.log('Columnas:', Object.keys(insData[0]));
  } else {
    console.log('Columnas:', data);
  }
}

getSchema();
