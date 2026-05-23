-- =============================================================================
-- 001_motor_ciclo.sql  —  MOTOR DE CICLO DE VIDA SEMANAL (GRAN DT UNI)
-- -----------------------------------------------------------------------------
-- Fuente ÚNICA de verdad para el estado del ciclo semanal.
--
-- Contiene:
--   A) VIEW     vw_fecha_activa      → 1 fila con la fecha activa y su fase.
--   B) FUNCTION fn_fase_actual()     → helper que devuelve la fase actual (text).
--   C) FUNCTION fn_es_admin()        → helper para el carve-out de RLS.
--   D) FUNCTION fn_validar_alineacion(uuid, int) → validador 5-5-5 + capitán.
--   E) POLICY   RLS sobre equipos_usuarios → bloquea escrituras fuera de
--               la fase 'mercado_abierto' (cierra la "puerta de atrás").
--   F) (Opcional) Realtime sobre la tabla fechas.
--
-- Idempotente: se puede correr varias veces sin romper nada.
--
-- NOTA sobre tipos: la tabla `fechas` usa IDs enteros (bigint/integer), por eso
-- fn_validar_alineacion recibe p_fecha_id como int (no UUID).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A) VIEW vw_fecha_activa
-- -----------------------------------------------------------------------------
-- Devuelve SIEMPRE exactamente UNA fila.
--
-- Selección de la fecha activa:
--   - La fecha con estado != 'finalizada' de MENOR numero_fecha.
--   - Si todas están finalizadas, la ÚLTIMA (mayor numero_fecha).
--   - Si no existe ninguna fecha, fila con fase_actual = 'sin_fecha_activa'.
--
-- Lógica de fase (en orden):
--   1. stats_cargadas = true  Y estado = 'finalizada'         → resultados_publicados
--   2. now() >= cierre_mercado Y stats_cargadas = false        → en_juego
--   3. now() >= inicio_semana  Y now() < cierre_mercado
--      Y convocados_cargados = true                            → mercado_abierto
--   4. cualquier otro caso (incl. timestamps NULL)             → esperando_convocados
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_fecha_activa AS
WITH activa AS (
  SELECT f.*
  FROM fechas f
  ORDER BY
    -- 1° las NO finalizadas (0) antes que las finalizadas (1)
    CASE WHEN f.estado IS DISTINCT FROM 'finalizada' THEN 0 ELSE 1 END ASC,
    -- 2° entre las activas: menor numero_fecha
    CASE WHEN f.estado IS DISTINCT FROM 'finalizada' THEN f.numero_fecha END ASC,
    -- 3° si todas finalizadas: la última
    f.numero_fecha DESC
  LIMIT 1
),
calc AS (
  SELECT
    a.id             AS fecha_id,
    a.numero_fecha   AS numero_fecha,
    a.rival          AS rival,
    a.condicion      AS condicion,
    a.inicio_semana  AS inicio_semana,
    a.cierre_mercado AS cierre_mercado,
    a.fecha_partido  AS fecha_partido,
    a.fin_fecha      AS fin_fecha,
    a.estado         AS estado,
    COALESCE(a.stats_cargadas, false) AS stats_cargadas,
    CASE
      WHEN a.id IS NULL THEN false
      ELSE EXISTS (SELECT 1 FROM convocados_fecha c WHERE c.fecha_id = a.id)
    END AS convocados_cargados
  -- LEFT JOIN contra una fila dummy garantiza 1 fila aunque `fechas` esté vacía
  FROM (SELECT 1) d(x)
  LEFT JOIN activa a ON true
)
SELECT
  c.fecha_id,
  c.numero_fecha,
  c.rival,
  c.condicion,
  c.inicio_semana,
  c.cierre_mercado,
  c.fecha_partido,
  c.fin_fecha,
  c.convocados_cargados,
  c.stats_cargadas,
  fase.fase_actual,
  CASE fase.fase_actual
    WHEN 'mercado_abierto' THEN
      GREATEST(0, EXTRACT(EPOCH FROM (c.cierre_mercado - now()))::bigint)
    WHEN 'esperando_convocados' THEN
      CASE
        WHEN c.inicio_semana IS NOT NULL AND c.inicio_semana > now()
          THEN EXTRACT(EPOCH FROM (c.inicio_semana - now()))::bigint
        ELSE NULL
      END
    WHEN 'en_juego' THEN
      CASE
        WHEN c.fin_fecha IS NOT NULL AND c.fin_fecha > now()
          THEN EXTRACT(EPOCH FROM (c.fin_fecha - now()))::bigint
        ELSE NULL
      END
    ELSE NULL
  END AS segundos_hasta_proximo_evento
FROM calc c
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN c.fecha_id IS NULL
      THEN 'sin_fecha_activa'
    WHEN c.stats_cargadas = true AND c.estado = 'finalizada'
      THEN 'resultados_publicados'
    WHEN c.cierre_mercado IS NOT NULL AND now() >= c.cierre_mercado AND c.stats_cargadas = false
      THEN 'en_juego'
    WHEN c.inicio_semana IS NOT NULL AND now() >= c.inicio_semana
         AND c.cierre_mercado IS NOT NULL AND now() < c.cierre_mercado
         AND c.convocados_cargados = true
      THEN 'mercado_abierto'
    ELSE 'esperando_convocados'
  END AS fase_actual
) fase;

-- Exponer la vista al cliente (anon + authenticated) vía PostgREST.
GRANT SELECT ON vw_fecha_activa TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- B) FUNCTION fn_fase_actual()
-- -----------------------------------------------------------------------------
-- Helper liviano para usar dentro de las policies RLS.
CREATE OR REPLACE FUNCTION fn_fase_actual()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT fase_actual FROM vw_fecha_activa LIMIT 1;
$$;


-- -----------------------------------------------------------------------------
-- C) FUNCTION fn_es_admin()
-- -----------------------------------------------------------------------------
-- Carve-out para RLS: los admins (y el flujo de publicación, ejecutado por un
-- admin) pueden escribir en equipos_usuarios fuera de 'mercado_abierto'.
-- SECURITY DEFINER para poder leer `profiles` sin depender de su RLS.
CREATE OR REPLACE FUNCTION fn_es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;


-- -----------------------------------------------------------------------------
-- D) FUNCTION fn_validar_alineacion(p_usuario_id uuid, p_fecha_id int)
-- -----------------------------------------------------------------------------
-- Valida la alineación guardada de un usuario para una fecha.
-- Devuelve UNA fila: { valido boolean, errores text[] }.
--
-- Reglas:
--   - Exactamente 15 jugadores.
--   - Exactamente 5 Primera + 5 Intermedia + 5 Pre-Intermedia.
--   - Todos los jugadores deben estar en convocados_fecha para esa fecha.
--   - Exactamente 1 capitán, y debe pertenecer al equipo.
CREATE OR REPLACE FUNCTION fn_validar_alineacion(p_usuario_id uuid, p_fecha_id int)
RETURNS TABLE (valido boolean, errores text[])
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_errores          text[] := ARRAY[]::text[];
  v_total            int;
  v_primera          int;
  v_intermedia       int;
  v_pre              int;
  v_no_convocados    int;
  v_capitanes        int;
  v_capitan_en_equipo int;
BEGIN
  -- Conteos por categoría (normalizando el texto de categoría)
  SELECT
    count(*),
    count(*) FILTER (WHERE cat = 'primera'),
    count(*) FILTER (WHERE cat = 'intermedia'),
    count(*) FILTER (WHERE cat = 'pre')
  INTO v_total, v_primera, v_intermedia, v_pre
  FROM (
    SELECT
      CASE
        WHEN lower(coalesce(c.categoria, '')) LIKE '%pre%'      THEN 'pre'
        WHEN lower(coalesce(c.categoria, '')) LIKE '%inter%'    THEN 'intermedia'
        WHEN lower(coalesce(c.categoria, '')) LIKE '%primera%'
          OR lower(coalesce(c.categoria, '')) LIKE '%superior%' THEN 'primera'
        ELSE 'otro'
      END AS cat
    FROM equipos_usuarios e
    LEFT JOIN convocados_fecha c
      ON c.jugador_id = e.jugador_id AND c.fecha_id = e.fecha_id
    WHERE e.usuario_id = p_usuario_id AND e.fecha_id = p_fecha_id
  ) s;

  -- Jugadores que NO están en la convocatoria de la fecha
  SELECT count(*)
  INTO v_no_convocados
  FROM equipos_usuarios e
  WHERE e.usuario_id = p_usuario_id AND e.fecha_id = p_fecha_id
    AND NOT EXISTS (
      SELECT 1 FROM convocados_fecha c
      WHERE c.jugador_id = e.jugador_id AND c.fecha_id = e.fecha_id
    );

  -- Capitanes distintos designados (capitan_id está denormalizado en cada fila)
  SELECT count(DISTINCT e.capitan_id)
  INTO v_capitanes
  FROM equipos_usuarios e
  WHERE e.usuario_id = p_usuario_id AND e.fecha_id = p_fecha_id
    AND e.capitan_id IS NOT NULL;

  -- ¿El capitán designado pertenece al equipo?
  SELECT count(*)
  INTO v_capitan_en_equipo
  FROM equipos_usuarios e
  WHERE e.usuario_id = p_usuario_id AND e.fecha_id = p_fecha_id
    AND e.capitan_id IS NOT NULL
    AND e.capitan_id = e.jugador_id;

  -- Armado de errores específicos
  IF v_total <> 15 THEN
    v_errores := array_append(v_errores,
      format('Debés tener exactamente 15 jugadores (tenés %s).', v_total));
  END IF;

  IF v_primera <> 5 THEN
    v_errores := array_append(v_errores,
      format('Debés tener exactamente 5 de Primera (tenés %s).', v_primera));
  END IF;

  IF v_intermedia <> 5 THEN
    v_errores := array_append(v_errores,
      format('Debés tener exactamente 5 de Intermedia (tenés %s).', v_intermedia));
  END IF;

  IF v_pre <> 5 THEN
    v_errores := array_append(v_errores,
      format('Debés tener exactamente 5 de Pre-Intermedia (tenés %s).', v_pre));
  END IF;

  IF v_no_convocados > 0 THEN
    v_errores := array_append(v_errores,
      format('%s jugador(es) no están en la convocatoria de esta fecha.', v_no_convocados));
  END IF;

  IF v_capitanes <> 1 THEN
    v_errores := array_append(v_errores,
      format('Debés designar exactamente 1 capitán (designados: %s).', v_capitanes));
  ELSIF v_capitan_en_equipo = 0 THEN
    v_errores := array_append(v_errores,
      'El capitán designado no forma parte de tu equipo.');
  END IF;

  RETURN QUERY SELECT (array_length(v_errores, 1) IS NULL), v_errores;
END;
$$;


-- -----------------------------------------------------------------------------
-- E) RLS sobre equipos_usuarios — gate de "mercado_abierto"
-- -----------------------------------------------------------------------------
-- Diseño (minimiza el riesgo de romper el comportamiento actual):
--   * Se habilita RLS.
--   * Policies PERMISIVAS que preservan el acceso amplio actual
--     (lecturas globales para métricas de mercado, escrituras de equipo).
--   * Policies RESTRICTIVAS (AND) que sólo dejan INSERT/UPDATE/DELETE cuando
--     la fase es 'mercado_abierto'  (o el actor es admin → publicación).
--
-- IMPORTANTE: el carve-out `OR fn_es_admin()` permite que el flujo de
-- publicación (process_publication_v3, ejecutado por un admin) siga vaciando
-- equipos_usuarios post-publicación SIN modificar esa función.
ALTER TABLE equipos_usuarios ENABLE ROW LEVEL SECURITY;

-- Permisivas: mantener acceso (no agregamos reglas de ownership para no romper
-- las métricas globales que leen filas de todos los usuarios).
DROP POLICY IF EXISTS equipos_usuarios_select_all ON equipos_usuarios;
CREATE POLICY equipos_usuarios_select_all
  ON equipos_usuarios
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS equipos_usuarios_write_all ON equipos_usuarios;
CREATE POLICY equipos_usuarios_write_all
  ON equipos_usuarios
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Restrictivas: el gate de mercado. Se aplican SÓLO a escrituras
-- (no a SELECT, para no bloquear lecturas fuera de la ventana).
DROP POLICY IF EXISTS equipos_usuarios_gate_insert ON equipos_usuarios;
CREATE POLICY equipos_usuarios_gate_insert
  ON equipos_usuarios
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (fn_fase_actual() = 'mercado_abierto' OR fn_es_admin());

DROP POLICY IF EXISTS equipos_usuarios_gate_update ON equipos_usuarios;
CREATE POLICY equipos_usuarios_gate_update
  ON equipos_usuarios
  AS RESTRICTIVE
  FOR UPDATE
  USING (fn_fase_actual() = 'mercado_abierto' OR fn_es_admin())
  WITH CHECK (fn_fase_actual() = 'mercado_abierto' OR fn_es_admin());

DROP POLICY IF EXISTS equipos_usuarios_gate_delete ON equipos_usuarios;
CREATE POLICY equipos_usuarios_gate_delete
  ON equipos_usuarios
  AS RESTRICTIVE
  FOR DELETE
  USING (fn_fase_actual() = 'mercado_abierto' OR fn_es_admin());


-- -----------------------------------------------------------------------------
-- F) (OPCIONAL) Realtime sobre la tabla `fechas`
-- -----------------------------------------------------------------------------
-- Permite que el frontend (hook useFechaActiva) se entere al instante cuando
-- el staff modifica un timestamp. Si la tabla ya está en la publicación, se
-- ignora silenciosamente.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE fechas;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- ya estaba agregada
  WHEN undefined_object THEN NULL;  -- la publicación no existe en este entorno
END $$;
