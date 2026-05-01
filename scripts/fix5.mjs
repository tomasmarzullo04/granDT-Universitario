import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix5() {
  const { data, error } = await supabase
    .from('fechas')
    .update({ 
      stats_cargadas: true, 
      estado: 'finalizada' 
    })
    .eq('numero_fecha', 5);

  console.log("Fix error:", error);
  console.log("Completado.");
}

fix5();
