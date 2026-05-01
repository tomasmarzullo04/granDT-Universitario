import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check5() {
  const { data, error } = await supabase
    .from('fechas')
    .select('*')
    .order('numero_fecha');

  console.log(JSON.stringify(data, null, 2));
}

check5();
