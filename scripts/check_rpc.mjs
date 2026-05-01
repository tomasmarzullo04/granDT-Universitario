import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRPC() {
  const { data, error } = await supabase.rpc('get_tournament_lifecycle_context');
  console.log("RPC Data:", JSON.stringify(data, null, 2));
  console.log("RPC Error:", error);
}

checkRPC();
