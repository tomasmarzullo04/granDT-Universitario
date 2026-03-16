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

  console.log(`Intentando crear cuenta para ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Tomi Marzu (Admin)'
      }
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
        console.log(`El usuario ya está registrado, intentando login...`);
        const loginData = await supabase.auth.signInWithPassword({ email, password });
        if (loginData.error) {
            console.error('No se pudo loguear al usuario existente:', loginData.error.message);
            process.exit(1);
        } else {
            console.log('Login exitoso.');
            await updateRole(loginData.data.user.id);
        }
    } else {
        console.error('Error al registrar:', error.message);
        process.exit(1);
    }
  } else if (data.user) {
    console.log(`Usuario creado/registrado. ID: ${data.user.id}`);
    
    // Necesitamos esperar un momento para que el trigger de Base de Datos (si existe) genere el Profile.
    console.log('Esperando a que la base de datos cree el profile...');
    await new Promise(r => setTimeout(r, 2000));

    await updateRole(data.user.id);
  }
}

async function updateRole(userId) {
  console.log('Actualizando rol a admin...');
  const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
  
  if (error) {
    console.error('ERROR AL ACTUALIZAR ROL EN PERFIL. Posible RLS que lo impida.', error.message);
    console.log('\nSi esto ha fallado debido a permisos (RLS), deberás correr este SQL en el panel de Supabase:');
    console.log(`UPDATE profiles SET role = 'admin' WHERE id = '${userId}';`);
    process.exit(1);
  } else {
    console.log('¡ÉXITO! Se le asignó el rol de admin correctamente.');
    process.exit(0);
  }
}

main();
