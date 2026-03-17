-- DEFINITIVE FIX FOR TEAM NAME
-- Execute this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, team_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'team_name',
    COALESCE(new.raw_user_meta_data->>'role', 'player')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- Ensure the trigger is linked
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
