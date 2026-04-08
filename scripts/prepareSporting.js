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
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function prepareSporting() {
  console.log("🚀 Simulación: Preparando Fecha 4 contra Sporting...");
  
  const now = new Date();
  
  // MERCADO ABIERTO: inició el lunes, cierra en 2 días
  const inicio = new Date(now);
  inicio.setDate(now.getDate() - 2); 
  
  const cierre = new Date(now);
  cierre.setDate(now.getDate() + 2); 
  
  const fin = new Date(now);
  fin.setDate(now.getDate() + 4); 

  try {
    const { data: sporting, error: findError } = await supabase
      .from('fechas')
      .select('id')
      .eq('numero_fecha', 4)
      .single();

    if (findError || !sporting) {
      console.log("⚠️ No se encontró la Fecha 4. Verificá tu DB.");
      return;
    }

    console.log(`✅ Actualizando Fecha ID ${sporting.id} a MERCADO_ABIERTO...`);
    const { error: updateError } = await supabase.from('fechas').update({
      inicio_semana: inicio.toISOString(),
      cierre_mercado: cierre.toISOString(),
      fin_fecha: fin.toISOString(),
      stats_cargadas: false,
      condicion: 'Visitante'
    }).eq('id', sporting.id);
    
    if (updateError) throw updateError;

    console.log("✨ ¡Motor de Estados Sincronizado!");
    console.log(`📅 Inicio Semana: ${inicio.toLocaleString()}`);
    console.log(`🔒 Cierre Mercado: ${cierre.toLocaleString()}`);
    console.log(`🏁 Fin Fecha: ${fin.toLocaleString()}`);
    
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

prepareSporting();
