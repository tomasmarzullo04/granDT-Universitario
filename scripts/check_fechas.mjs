import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('fechas')
    .select('*')
    .in('numero_fecha', [6, 7])
    .order('numero_fecha');

  console.log(JSON.stringify(data, null, 2));
}

check();
