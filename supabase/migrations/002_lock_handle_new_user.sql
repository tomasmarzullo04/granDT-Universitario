-- =============================================================================
-- 002_lock_handle_new_user.sql  —  SEC-03
-- -----------------------------------------------------------------------------
-- Bloquea la escalada de privilegios a admin vía raw_user_meta_data.
-- El trigger ahora ignora cualquier `role` enviado por el cliente y hardcodea
-- `'player'`. Para promover a admin, el dueño del proyecto edita `profiles`
-- manualmente desde el SQL Editor de Supabase.
--
-- Schema real de `profiles` (no `alias` — usa full_name y team_name).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, team_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'team_name', 'Mi Dream Team'),
    'player'  -- HARDCODED. Ignora cualquier role enviado por el cliente.
  );
  RETURN NEW;
END;
$$;

-- Asegurar que el trigger sigue conectado a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
