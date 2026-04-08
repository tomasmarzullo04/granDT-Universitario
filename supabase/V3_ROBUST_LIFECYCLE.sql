-- 1. NORMALIZACIÓN DE COLUMNAS EN LA TABLA 'FECHAS'
ALTER TABLE fechas ADD COLUMN IF NOT EXISTS fecha_partido TIMESTAMPTZ;
ALTER TABLE fechas ADD COLUMN IF NOT EXISTS fecha_cierre_equipo TIMESTAMPTZ;
ALTER TABLE fechas ADD COLUMN IF NOT EXISTS fecha_limite_stats TIMESTAMPTZ;

-- 2. CONFIGURACIÓN DE FECHAS (Sporting y Comercial)
-- Sporting (11/04)
UPDATE fechas SET 
  fecha_partido = '2026-04-11 15:30:00+00',
  fecha_cierre_equipo = '2026-04-10 23:59:59+00',
  fecha_limite_stats = '2026-04-15 23:59:59+00',
  estado = 'pendiente',
  stats_cargadas = false
WHERE numero_fecha = 4;

-- Comercial (02/05)
UPDATE fechas SET 
  fecha_partido = '2026-05-02 15:30:00+00',
  fecha_cierre_equipo = '2026-05-01 23:59:59+00',
  fecha_limite_stats = '2026-05-06 23:59:59+00',
  estado = 'pendiente',
  stats_cargadas = false
WHERE numero_fecha = 7;

-- 3. RESTRICCIÓN DE INTEGRIDAD PARA HISTÓRICO
-- Garantiza idempotencia a nivel de base de datos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_historico_user_fecha') THEN
        ALTER TABLE historico_equipos ADD CONSTRAINT uq_historico_user_fecha UNIQUE(user_id, fecha_id);
    END IF;
END $$;

-- 4. FUNCIÓN PARA OBTENER ESTADO DERIVADO (GET_FECHA_STATUS)
CREATE OR REPLACE FUNCTION get_fecha_status(p_fecha_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
    v_cierre TIMESTAMPTZ;
    v_partido TIMESTAMPTZ;
    v_stats_exist BOOLEAN;
    v_convocados_exist BOOLEAN;
BEGIN
    -- Obtener timestamps de la fecha
    SELECT fecha_cierre_equipo, fecha_partido 
    INTO v_cierre, v_partido
    FROM fechas 
    WHERE id = p_fecha_id;

    -- Verificar si hay convocados cargados
    SELECT EXISTS (SELECT 1 FROM convocados_fecha WHERE fecha_id = p_fecha_id) INTO v_convocados_exist;
    
    -- Verificar si hay estadísticas cargadas
    SELECT EXISTS (SELECT 1 FROM estadisticas_partido WHERE fecha_id = p_fecha_id) INTO v_stats_exist;

    -- Lógica de Machine State Automático
    IF NOT v_convocados_exist THEN
        RETURN 'ESPERANDO_PLANTELES';
    ELSIF v_now < v_cierre THEN
        RETURN 'ARMADO_EQUIPO';
    ELSIF v_now >= v_cierre AND v_now < v_partido THEN
        RETURN 'FECHA_EN_JUEGO';
    ELSIF v_now >= v_partido AND NOT v_stats_exist THEN
        RETURN 'ESPERANDO_STATS';
    ELSE
        RETURN 'RESULTADOS_PUBLICADOS';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. FUNCIÓN DE CONTEXTO GLOBAL (RPC)
-- Retorna el objeto completo de la fecha activa y su estado derivado
CREATE OR REPLACE FUNCTION get_tournament_lifecycle_context()
RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
    v_active_fecha RECORD;
    v_status TEXT;
BEGIN
    -- 1. Buscar la fecha activa (la próxima que no esté cerrada o que sea la actual en juego)
    -- Definimos 'activa' como la primera cuya fecha_partido no haya pasado + 1 día (margen para stats)
    -- o simplemente la primera que no tenga stats_cargadas.
    SELECT * INTO v_active_fecha 
    FROM fechas 
    WHERE stats_cargadas = false
    ORDER BY numero_fecha ASC 
    LIMIT 1;

    -- Si no hay fechas sin publicar, devolver la última
    IF NOT FOUND THEN
        SELECT * INTO v_active_fecha FROM fechas ORDER BY numero_fecha DESC LIMIT 1;
        v_status := 'RESULTADOS_PUBLICADOS';
    ELSE
        v_status := get_fecha_status(v_active_fecha.id);
    END IF;

    RETURN jsonb_build_object(
        'activeMatchday', to_jsonb(v_active_fecha),
        'status', v_status
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. FUNCIÓN TRANSACCIONAL DE PUBLICACIÓN Y SNAPSHOT (RPC)
-- Incluye advisory locks e idempotencia redundante.
CREATE OR REPLACE FUNCTION process_publication_v3(p_fecha_id UUID, p_stats_json JSONB)
RETURNS VOID AS $$
DECLARE
    v_user_row RECORD;
    v_player_row RECORD;
    v_total_puntos INTEGER;
    v_numero_fecha INTEGER;
BEGIN
    -- A. Bloqueo Consultivo (Advisory Lock) para evitar ejecuciones paralelas
    -- Usamos el hash del UUID para el lock
    PERFORM pg_advisory_xact_lock(hashtext(p_fecha_id::text));

    -- B. Cláusula de Guardia (Idempotencia Lógica)
    IF EXISTS (SELECT 1 FROM fechas WHERE id = p_fecha_id AND stats_cargadas = true) THEN
        RAISE EXCEPTION 'La fecha ya ha sido publicada.';
    END IF;

    -- C. Obtener el número de fecha para el registro histórico
    SELECT numero_fecha INTO v_numero_fecha FROM fechas WHERE id = p_fecha_id;

    -- D. Upsert de estadísticas (p_stats_json esperado como array de objetos)
    -- Asumimos p_stats_json tiene: {jugador_id, tries, tackles, etc.}
    INSERT INTO estadisticas_partido (fecha_id, jugador_id, tries, conversiones, penales, drops, amarillas, rojas, penales_hechos, knock_ons, lines_robados, asistencias, cortes_limpios, tackles)
    SELECT 
        p_fecha_id,
        (val->>'jugador_id')::UUID,
        (val->>'tries')::INTEGER,
        (val->>'conversiones')::INTEGER,
        (val->>'penales')::INTEGER,
        (val->>'drops')::INTEGER,
        (val->>'amarillas')::INTEGER,
        (val->>'rojas')::INTEGER,
        (val->>'penales_hechos')::INTEGER,
        (val->>'knock_ons')::INTEGER,
        (val->>'lines_robados')::INTEGER,
        (val->>'asistencias')::INTEGER,
        (val->>'cortes_limpios')::INTEGER,
        (val->>'tackles')::INTEGER
    FROM jsonb_array_elements(p_stats_json) AS val
    ON CONFLICT (fecha_id, jugador_id) DO UPDATE SET
        tries = EXCLUDED.tries,
        conversiones = EXCLUDED.conversiones,
        penales = EXCLUDED.penales,
        drops = EXCLUDED.drops,
        amarillas = EXCLUDED.amarillas,
        rojas = EXCLUDED.rojas,
        penales_hechos = EXCLUDED.penales_hechos,
        knock_ons = EXCLUDED.knock_ons,
        lines_robados = EXCLUDED.lines_robados,
        asistencias = EXCLUDED.asistencias,
        cortes_limpios = EXCLUDED.cortes_limpios,
        tackles = EXCLUDED.tackles;

    -- E. Generar Snapshot Histórico y Limpieza
    FOR v_user_row IN 
        SELECT usuario_id, capitan_id 
        FROM equipos_usuarios 
        WHERE fecha_id = p_fecha_id 
        GROUP BY usuario_id, capitan_id
    LOOP
        -- Calcular puntos para este usuario en esta transacción
        SELECT SUM(
            CASE 
                WHEN s.jugador_id = v_user_row.capitan_id THEN 
                    (COALESCE(s.tries,0)*5 + COALESCE(s.conversiones,0)*2 + COALESCE(s.penales,0)*2 + COALESCE(s.drops,0)*3 + COALESCE(s.amarillas,0)*-3 + COALESCE(s.rojas,0)*-7 + COALESCE(s.penales_hechos,0)*-2 + COALESCE(s.knock_ons,0)*-1 + COALESCE(s.lines_robados,0)*2 + COALESCE(s.asistencias,0)*2 + COALESCE(s.cortes_limpios,0)*1 + COALESCE(s.tackles,0)*1) * 2
                ELSE 
                    (COALESCE(s.tries,0)*5 + COALESCE(s.conversiones,0)*2 + COALESCE(s.penales,0)*2 + COALESCE(s.drops,0)*3 + COALESCE(s.amarillas,0)*-3 + COALESCE(s.rojas,0)*-7 + COALESCE(s.penales_hechos,0)*-2 + COALESCE(s.knock_ons,0)*-1 + COALESCE(s.lines_robados,0)*2 + COALESCE(s.asistencias,0)*2 + COALESCE(s.cortes_limpios,0)*1 + COALESCE(s.tackles,0)*1)
            END
        ) INTO v_total_puntos
        FROM equipos_usuarios e
        JOIN estadisticas_partido s ON e.jugador_id = s.jugador_id AND s.fecha_id = p_fecha_id
        WHERE e.usuario_id = v_user_row.usuario_id AND e.fecha_id = p_fecha_id;

        -- Guardar en histórico (UNIQUE constraint evitará duplicados físicos)
        INSERT INTO historico_equipos (user_id, numero_fecha, fecha_id, player_ids, puntos_totales)
        VALUES (
            v_user_row.usuario_id,
            v_numero_fecha,
            p_fecha_id,
            (SELECT array_agg(jugador_id) FROM equipos_usuarios WHERE usuario_id = v_user_row.usuario_id AND fecha_id = p_fecha_id),
            COALESCE(v_total_puntos, 0)
        ) ON CONFLICT (user_id, fecha_id) DO NOTHING;

        -- Registramos también en ranking_usuarios para liderazgo global
        INSERT INTO ranking_usuarios (usuario_id, fecha_id, puntos_fecha)
        VALUES (v_user_row.usuario_id, p_fecha_id, COALESCE(v_total_puntos, 0))
        ON CONFLICT (usuario_id, fecha_id) DO UPDATE SET puntos_fecha = EXCLUDED.puntos_fecha;
    END LOOP;

    -- F. Limpieza de equipos_usuarios para esta fecha
    DELETE FROM equipos_usuarios WHERE fecha_id = p_fecha_id;

    -- G. Marca de finalización
    UPDATE fechas SET stats_cargadas = true, estado = 'finalizada' WHERE id = p_fecha_id;

END;
$$ LANGUAGE plpgsql;
