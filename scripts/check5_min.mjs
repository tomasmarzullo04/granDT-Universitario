import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check5_min() {
  const { data, error } = await supabase
    .from('fechas')
    .select('id, numero_fecha, rival, stats_cargadas, estado')
    .order('numero_fecha');

  console.log(JSON.stringify(data, null, 2));
}

check5_min();
