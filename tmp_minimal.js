
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nniwyswxojkalelavdnn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaXd5c3d4b2prYWxlbGF2ZG5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwNjIzOSwiZXhwIjoyMDg5MTgyMjM5fQ.mBe8s99gtze_lm8UiVbtTHyMfUKvi6lB58SzCpxZJbc';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testMinimal() {
  const { data, error } = await supabase.from('estadisticas_partido').insert({
    fecha_id: 1,
    jugador_id: 34,
    tries: 1
  });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Inserción exitosa de tries.');
    // Ahora intentar con penales
    const { error: error2 } = await supabase.from('estadisticas_partido').insert({
        fecha_id: 1,
        jugador_id: 35,
        penales: 1
    });
    if (error2) console.error('Error en penales:', error2.message);
    else console.log('Inserción exitosa de penales.');
  }
}

testMinimal();
