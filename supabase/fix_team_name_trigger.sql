-- 1. Asegurar que las columnas existen
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;

-- 2. Actualizar la función de trigger para capturar metadatos sociales/propio registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, team_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'player'),
    COALESCE(new.raw_user_meta_data->>'team_name', 'Mi Dream Team')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-vincular el trigger (por las dudas)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
