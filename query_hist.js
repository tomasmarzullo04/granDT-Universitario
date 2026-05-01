import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let envStr = '';
try { envStr = fs.readFileSync('.env.local', 'utf8'); } catch(e) {}
if(!envStr) try { envStr = fs.readFileSync('.env', 'utf8'); } catch(e) {}

const supabase = createClient(envStr.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim(), envStr.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim());

async function test() {
  const { data: histData, error } = await supabase
    .from('historico_equipos')
    .select('player_ids')
    .eq('fecha_id', 4);
    
  let mostElegidoFecha = { nombre: 'S/D', count: 0 };
  
  if (histData && histData.length > 0) {
    const counts = {};
    histData.forEach(row => {
      let ids = row.player_ids;
      // if it's a string from supabase (sometimes jsonb parses weird in node vs browser, but it should be array)
      if (typeof ids === 'string') {
        try { ids = JSON.parse(ids); } catch(e){}
      }
      if (Array.isArray(ids)) {
        ids.forEach(id => {
          counts[id] = (counts[id] || 0) + 1;
        });
      }
    });

    console.log('Counts:', counts);

    if (Object.keys(counts).length > 0) {
      const topId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      console.log('Top ID:', topId);
      const { data: p } = await supabase.from('jugadores').select('nombre').eq('id', topId).single();
      mostElegidoFecha = { id: topId, nombre: p?.nombre || 'S/D', count: counts[topId] };
    }
  }
  console.log('Most Elegido:', mostElegidoFecha);
}

test();
