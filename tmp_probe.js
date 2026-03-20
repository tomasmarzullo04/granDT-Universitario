
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nniwyswxojkalelavdnn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaXd5c3d4b2prYWxlbGF2ZG5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwNjIzOSwiZXhwIjoyMDg5MTgyMjM5fQ.mBe8s99gtze_lm8UiVbtTHyMfUKvi6lB58SzCpxZJbc';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function probeColumns() {
  const fields = ['try', 'tries', 'conversion', 'conversiones', 'penal', 'penales', 'drop', 'drops', 'amarilla', 'amarillas', 'roja', 'rojas'];
  console.log('--- PROBANDO COLUMNAS ---');
  for (const field of fields) {
    const { error } = await supabase.from('estadisticas_partido').insert({
      fecha_id: 1,
      jugador_id: 34,
      [field]: 0
    });
    if (error && error.message.includes('Could not find')) {
      console.log(`❌ ${field}: No existe`);
    } else if (error) {
       console.log(`⚠️ ${field}: Error diferente: ${error.message}`);
    } else {
      console.log(`✅ ${field}: Ok`);
      // Boring clean up
      await supabase.from('estadisticas_partido').delete().match({ fecha_id: 1, jugador_id: 34, [field]: 0 });
    }
  }
}

probeColumns();
