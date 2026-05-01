import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixFechas() {
  console.log("Cerrando Fecha Libre (numero_fecha = 6)...");
  
  const { data: d1, error: e1 } = await supabase
    .from('fechas')
    .update({ 
      stats_cargadas: true, 
      estado: 'finalizada' 
    })
    .eq('numero_fecha', 6);
    
  if (e1) {
    console.error("Error updating fecha 6:", e1);
    return;
  }
  
  console.log("Fecha 6 actualizada.");

  console.log("Ajustando horarios Comercial (numero_fecha = 7)...");
  
  // Viernes a la noche en Argentina (23:59:59 ART) = Sabado 02:59:59 UTC
  // Partido el Sábado a las 15:30 ART = 18:30:00 UTC
  const { data: d2, error: e2 } = await supabase
    .from('fechas')
    .update({
      fecha_cierre_equipo: '2026-05-02 02:59:59+00', 
      fecha_partido: '2026-05-02 18:30:00+00',
      fecha_limite_stats: '2026-05-06 02:59:59+00',
      estado: 'pendiente',
      stats_cargadas: false
    })
    .eq('numero_fecha', 7);

  if (e2) {
    console.error("Error updating fecha 7:", e2);
    return;
  }
  
  console.log("Fecha 7 actualizada.");
  console.log("Completado.");
}

fixFechas();
