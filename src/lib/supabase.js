import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://example.supabase.co')

if (!isConfigured) {
  console.error("Supabase credentials are missing or invalid.")
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

// Exportar flag de configuración para uso en la UI
supabase.isConfigured = isConfigured;

// En dev, exponemos el cliente en window para poder ejecutar tests rápidos
// desde la Console del navegador (chequeos de RLS, etc.). NO se incluye en
// el bundle de producción gracias a import.meta.env.DEV.
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.supabase = supabase;
}
