-- Migración para el Onboarding Gate y validación de pagos

-- 1. Agregamos las columnas necesarias a "profiles" 
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS es_competidor BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS comprobante_url TEXT;

-- 2. Habilitamos Replica Identity para poder escuchar cambios en REALTIME en la tabla profiles.
-- Esto permite que supabase detecte cuando el admin cambia "es_competidor" a true y se mande por websocket.
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- 3. Cargar la definicion en la publicacion supabase_realtime
-- Esto asegura que los cambios en "profiles" viajen por los websockets de auth
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
