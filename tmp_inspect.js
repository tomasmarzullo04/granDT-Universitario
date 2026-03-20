
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nniwyswxojkalelavdnn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaXd5c3d4b2prYWxlbGF2ZG5uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYwNjIzOSwiZXhwIjoyMDg5MTgyMjM5fQ.mBe8s99gtze_lm8UiVbtTHyMfUKvi6lB58SzCpxZJbc';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function inspectTable() {
  const { data, error } = await supabase.from('estadisticas_partido').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columnas encontradas:', Object.keys(data[0]));
  } else {
    console.log('La tabla está vacía.');
  }
}

inspectTable();
