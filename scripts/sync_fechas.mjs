import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncFields() {
  const { data, error } = await supabase
    .from('fechas')
    .update({ 
      cierre_mercado: '2026-05-02 02:59:59+00'
    })
    .eq('numero_fecha', 7);

  console.log("Sync error:", error);
  console.log("Completado.");
}

syncFields();
