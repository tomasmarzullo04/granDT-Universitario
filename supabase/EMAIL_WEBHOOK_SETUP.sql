-- 1. Habilitar extensiones necesarias (si no lo están)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Crear un WEBHOOK para la tabla profiles
-- Este trigger llamará a tu Edge Function automáticamente.
-- Reemplaza "TU_PROJECT_REF" con el ID de tu proyecto de Supabase.

CREATE OR REPLACE TRIGGER on_player_approved
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.es_competidor = false AND NEW.es_competidor = true)
EXECUTE FUNCTION supabase_functions.http_request(
  'https://TU_PROJECT_REF.supabase.co/functions/v1/send-welcome-email',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer TU_ANON_KEY"}',
  '{}', -- El payload completo del registro se enviará automáticamente
  '1000'
);

-- NOTA: Aunque el SQL de arriba es la forma "manual", 
-- es MUCHO MÁS FÁCIL configurarlo desde la interfaz de Supabase:
-- 1. Ve a Database -> Webhooks -> Create a new webhook.
-- 2. Nombre: "send-welcome-email-webhook".
-- 3. Tabla: "profiles".
-- 4. Eventos de trigger: "Update" (Solamente).
-- 5. Webhook URL: Elegí "Supabase Edge Function" y seleccioná "send-welcome-email".
-- 6. ¡Listo! Supabase manejará la seguridad por vos.
