import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("No Supabase URL or Key found.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMasterAdmin() {
  const email = "adminuni@gmail.com";
  const password = "admin2026";
  const fullName = "Administrador Uni";
  const teamName = "Staff Oficial";
  const role = "admin";

  console.log(`🚀 Creando Cuenta Maestra de Administrador: ${email}...`);

  // 1. Registro en Auth con metadatos completos
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        team_name: teamName,
        role: role
      }
    }
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      console.log("ℹ️ El usuario ya existe en Auth. Asegurando perfil en la tabla 'profiles'...");
      
      // Si ya existe, intentamos obtener el ID logueando
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        console.error("❌ Error al acceder a la cuenta existente:", loginError.message);
        return;
      }
      
      await upsertProfile(loginData.user.id, email, fullName, teamName, role);
    } else {
      console.error("❌ Error en registro:", signUpError.message);
    }
    return;
  }

  if (data?.user) {
    console.log(`✅ Usuario creado en Auth (ID: ${data.user.id})`);
    // El trigger handle_new_user() debería encargarse del perfil automáticamente,
    // pero lo forzamos por si el trigger no está activo aún.
    await upsertProfile(data.user.id, email, fullName, teamName, role);
  }
}

async function upsertProfile(id, email, full_name, team_name, role) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id, email, full_name, team_name, role }, { onConflict: 'id' });

  if (error) {
    console.error("❌ Error al actualizar perfil:", error.message);
    console.log("\n⚠️ Si es un error de RLS, ejecuta este SQL en Supabase:");
    console.log(`INSERT INTO profiles (id, email, full_name, team_name, role) 
VALUES ('${id}', '${email}', '${full_name}', '${team_name}', '${role}')
ON CONFLICT (id) DO UPDATE SET role = '${role}', team_name = '${team_name}';`);
  } else {
    console.log("✨ Cuenta Maestra configurada correctamente.");
  }
}

createMasterAdmin();
