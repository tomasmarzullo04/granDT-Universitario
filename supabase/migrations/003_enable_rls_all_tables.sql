-- =============================================================================
-- 003_enable_rls_all_tables.sql  —  SEC-01 / SEC-05
-- -----------------------------------------------------------------------------
-- Habilita RLS en todas las tablas faltantes y NORMALIZA las policies de las
-- que ya tenían RLS (algunas con agujeros: ej. `convocados_fecha` tenía una
-- policy ALL con USING(true) sin filtro de admin; `profiles` permitía UPDATE
-- del propio role sin restricción de columnas).
--
-- Orden:
--   0) DROP de policies preexistentes que conflictúan o son agujeros.
--   1) CREATE de las policies nuevas.
--   2) ENABLE RLS (idempotente — ya estaba en 4 tablas).
--
-- Premisas:
--   - `fn_es_admin()` (migración 001) es SECURITY DEFINER → no recursa vía RLS.
--   - `equipos_usuarios` ya tiene RLS desde migración 001 — no se toca aquí.
--   - Tablas escritas SOLO por publicación (`historico_equipos`,
--     `ranking_usuarios`): SIN policies de escritura → solo
--     `process_publication_v3` (SECURITY DEFINER, migración 004) las escribe.
--
-- DECISIÓN DE DISEÑO — SELECT público en historico_equipos y profiles:
--   * historico_equipos: el Inicio agrega métricas de "más elegido" leyendo
--     player_ids de TODOS los usuarios. Las picks no son sensibles en fantasy.
--   * profiles: ranking/historial/métricas necesitan ver full_name/team_name
--     de otros. Email queda visible — aceptable para comunidad cerrada.
-- =============================================================================


-- =====================================================================
-- 0) CLEANUP — Drop de policies preexistentes que conflictúan / abren agujeros.
--    Idempotente (DROP IF EXISTS). Verificado contra el snapshot pre-cambio.
-- =====================================================================

-- convocados_fecha: tenía una ALL con USING(true) — agujero crítico.
DROP POLICY IF EXISTS "Lectura pública convocados"             ON public.convocados_fecha;
DROP POLICY IF EXISTS "Permitir gestión total para Staff"      ON public.convocados_fecha;
DROP POLICY IF EXISTS "Permitir lectura para todos"            ON public.convocados_fecha;

-- historico_equipos: tenía 4 policies "own-only" inactivas (RLS=false);
-- al habilitar RLS romperían las métricas globales del Inicio.
DROP POLICY IF EXISTS "Enable delete for users based on user_id"      ON public.historico_equipos;
DROP POLICY IF EXISTS "Enable insert for users based on user_id"      ON public.historico_equipos;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.historico_equipos;
DROP POLICY IF EXISTS "Enable update for users based on user_id"      ON public.historico_equipos;

-- jugadores: dos policies SELECT públicas duplicadas — limpieza.
DROP POLICY IF EXISTS "Lectura pública jugadores" ON public.jugadores;
DROP POLICY IF EXISTS "Permitir lectura pública"  ON public.jugadores;

-- profiles: 5 policies preexistentes. La de UPDATE permitía cambiar el propio
-- role (SEC-03 explotable). Las reemplazamos por un set consistente + el
-- trigger BEFORE INSERT OR UPDATE que bloquea cambios privilegiados.
DROP POLICY IF EXISTS "Los perfiles pueden ser actualizados por su dueño o Admin" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles públicos son visibles por todos."                 ON public.profiles;
DROP POLICY IF EXISTS "Todos pueden leer perfiles"                                ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio comprobante_url"      ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil."              ON public.profiles;


-- =====================================================================
-- profiles
-- =====================================================================

-- Lectura: pública (ranking, perfiles públicos).
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all
  ON public.profiles
  FOR SELECT USING (true);

-- INSERT: el dueño puede crear su propia fila (failsafe de Signup).
-- El BEFORE INSERT trigger (más abajo) impide que el insert traiga
-- role != 'player' o es_competidor = true.
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: el dueño puede editar su propia fila (full_name, team_name,
-- comprobante_url, etc.). El trigger evita cambios de role / es_competidor.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ALL admin: el admin puede hacer cualquier cosa en cualquier fila.
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all
  ON public.profiles
  FOR ALL
  USING (public.fn_es_admin())
  WITH CHECK (public.fn_es_admin());

-- ---------------------------------------------------------------------
-- TRIGGER: bloquear cambios privilegiados (role / es_competidor) salvo admin.
-- Se aplica tanto a INSERT como a UPDATE para cubrir el failsafe de Signup.
-- El trigger handle_new_user() (auth.users → profiles) corre con role='player'
-- y es_competidor=NULL → pasa la guardia naturalmente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiles_block_privileged_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.fn_es_admin() THEN
    RETURN NEW;  -- admin puede cambiar todo
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NOT NULL AND NEW.role <> 'player' THEN
      RAISE EXCEPTION 'No podés crear una cuenta con role distinto a player.';
    END IF;
    IF NEW.es_competidor IS TRUE THEN
      RAISE EXCEPTION 'No podés crear una cuenta con es_competidor = true.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'No podés cambiar tu propio role.';
    END IF;
    IF NEW.es_competidor IS DISTINCT FROM OLD.es_competidor THEN
      RAISE EXCEPTION 'No podés cambiar tu propio estado de competidor.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_privileged_changes ON public.profiles;
CREATE TRIGGER profiles_block_privileged_changes
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_block_privileged_changes();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- fechas
-- =====================================================================
DROP POLICY IF EXISTS fechas_select_all ON public.fechas;
CREATE POLICY fechas_select_all
  ON public.fechas FOR SELECT USING (true);

DROP POLICY IF EXISTS fechas_admin_write ON public.fechas;
CREATE POLICY fechas_admin_write
  ON public.fechas FOR ALL
  USING (public.fn_es_admin())
  WITH CHECK (public.fn_es_admin());

ALTER TABLE public.fechas ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- convocados_fecha
-- =====================================================================
DROP POLICY IF EXISTS convocados_select_all ON public.convocados_fecha;
CREATE POLICY convocados_select_all
  ON public.convocados_fecha FOR SELECT USING (true);

DROP POLICY IF EXISTS convocados_admin_write ON public.convocados_fecha;
CREATE POLICY convocados_admin_write
  ON public.convocados_fecha FOR ALL
  USING (public.fn_es_admin())
  WITH CHECK (public.fn_es_admin());

ALTER TABLE public.convocados_fecha ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- jugadores
-- =====================================================================
DROP POLICY IF EXISTS jugadores_select_all ON public.jugadores;
CREATE POLICY jugadores_select_all
  ON public.jugadores FOR SELECT USING (true);

DROP POLICY IF EXISTS jugadores_admin_write ON public.jugadores;
CREATE POLICY jugadores_admin_write
  ON public.jugadores FOR ALL
  USING (public.fn_es_admin())
  WITH CHECK (public.fn_es_admin());

ALTER TABLE public.jugadores ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- estadisticas_partido
-- =====================================================================
DROP POLICY IF EXISTS estadisticas_select_all ON public.estadisticas_partido;
CREATE POLICY estadisticas_select_all
  ON public.estadisticas_partido FOR SELECT USING (true);

DROP POLICY IF EXISTS estadisticas_admin_write ON public.estadisticas_partido;
CREATE POLICY estadisticas_admin_write
  ON public.estadisticas_partido FOR ALL
  USING (public.fn_es_admin())
  WITH CHECK (public.fn_es_admin());

ALTER TABLE public.estadisticas_partido ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- historico_equipos
-- -----------------------------------------------------------------------
-- SELECT público (necesario para métricas agregadas del Inicio).
-- Sin policies de INSERT/UPDATE/DELETE → solo escribe la función
-- process_publication_v3 (SECURITY DEFINER, ver migración 004).
-- =====================================================================
DROP POLICY IF EXISTS historico_select_all ON public.historico_equipos;
CREATE POLICY historico_select_all
  ON public.historico_equipos FOR SELECT USING (true);

ALTER TABLE public.historico_equipos ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- ranking_usuarios
-- -----------------------------------------------------------------------
-- SELECT público (ranking se muestra a todos).
-- Sin policies de escritura → solo escribe process_publication_v3.
-- =====================================================================
DROP POLICY IF EXISTS ranking_select_all ON public.ranking_usuarios;
CREATE POLICY ranking_select_all
  ON public.ranking_usuarios FOR SELECT USING (true);

ALTER TABLE public.ranking_usuarios ENABLE ROW LEVEL SECURITY;


-- equipos_usuarios: ya tiene RLS desde la migración 001 (motor_ciclo).
-- No se toca aquí.
