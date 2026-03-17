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

async function main() {
  const email = "tomimarzu2004@gmail.com";
  const password = "admin2026";
  const fullName = "Tomás Marzullo";

  console.log(`Intentando crear/asegurar cuenta para ${email}...`);

  // 1. Registro (Auth): Utilizar supabase.auth.signUp
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  let userId = null;

  if (error) {
    if (error.message.includes('already registered')) {
      console.log(`El usuario ya está registrado en Auth. Procediendo a asegurar el perfil...`);
      // Si ya existe, necesitamos el ID. Intentamos loguear para obtenerlo.
      const loginData = await supabase.auth.signInWithPassword({ email, password });
      if (loginData.error) {
        console.error('Error al obtener usuario existente:', loginData.error.message);
        process.exit(1);
      }
      userId = loginData.data.user.id;
    } else {
      console.error('Error al registrar en Auth:', error.message);
      process.exit(1);
    }
  } else if (data.user) {
    console.log(`Usuario creado/registrado en Auth. ID: ${data.user.id}`);
    userId = data.user.id;
  }

  if (userId) {
    await upsertProfile(userId, email, fullName);
  }
}

async function upsertProfile(userId, email, fullName) {
  console.log(`Insertando/Actualizando (upsert) perfil para ID: ${userId}...`);
  
  // 2. Perfil (Profiles): id, email, role: 'admin', full_name
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      role: 'admin',
      full_name: fullName
    }, { onConflict: 'id' });

  if (error) {
    console.error('ERROR AL HACER UPSERT EN PROFILES. Posible RLS que lo impida.', error.message);
    console.log('\nSi esto ha fallado debido a permisos (RLS), deberás correr este SQL en el panel de Supabase:');
    console.log(`INSERT INTO profiles (id, email, role, full_name) 
VALUES ('${userId}', '${email}', 'admin', '${fullName}')
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = '${fullName}';`);
    process.exit(1);
  } else {
    console.log('¡ÉXITO! El proceso fue exitoso. El usuario es administrador.');
    process.exit(0);
  }
}

main();
