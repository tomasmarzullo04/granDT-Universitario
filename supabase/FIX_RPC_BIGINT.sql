-- =============================================================
-- FIX RPC: Usar BIGINT para fecha_id (la tabla fechas usa integer IDs)
-- Ejecutar en Supabase SQL Editor DESPUÉS del script de datos
-- =============================================================

-- Eliminar la función vieja (que usa UUID)
DROP FUNCTION IF EXISTS process_publication_v3(UUID, JSONB);

-- Recrear con BIGINT
CREATE OR REPLACE FUNCTION process_publication_v3(p_fecha_id BIGINT, p_stats_json JSONB)
RETURNS VOID AS $$
DECLARE
    v_user_row RECORD;
    v_total_puntos INTEGER;
    v_numero_fecha INTEGER;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_fecha_id::text));

    IF EXISTS (SELECT 1 FROM fechas WHERE id = p_fecha_id AND stats_cargadas = true) THEN
        RAISE EXCEPTION 'La fecha ya ha sido publicada.';
    END IF;

    SELECT numero_fecha INTO v_numero_fecha FROM fechas WHERE id = p_fecha_id;

    INSERT INTO estadisticas_partido (
        fecha_id, jugador_id, tries, conversiones, penales, drops, 
        amarillas, rojas, penales_hechos, knock_ons, lines_robados,
        asistencias, cortes_limpios, tackles, tackles_ofensivos, recuperaciones
    )
    SELECT 
        p_fecha_id,
        (val->>'jugador_id')::BIGINT,
        COALESCE((val->>'tries')::INTEGER, 0),
        COALESCE((val->>'conversiones')::INTEGER, 0),
        COALESCE((val->>'penales')::INTEGER, 0),
        COALESCE((val->>'drops')::INTEGER, 0),
        COALESCE((val->>'amarillas')::INTEGER, 0),
        COALESCE((val->>'rojas')::INTEGER, 0),
        COALESCE((val->>'penales_hechos')::INTEGER, 0),
        COALESCE((val->>'knock_ons')::INTEGER, 0),
        COALESCE((val->>'lines_robados')::INTEGER, 0),
        COALESCE((val->>'asistencias')::INTEGER, 0),
        COALESCE((val->>'cortes_limpios')::INTEGER, 0),
        COALESCE((val->>'tackles')::INTEGER, 0),
        COALESCE((val->>'tackles_ofensivos')::INTEGER, 0),
        COALESCE((val->>'recuperaciones')::INTEGER, 0)
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
        tackles = EXCLUDED.tackles,
        tackles_ofensivos = EXCLUDED.tackles_ofensivos,
        recuperaciones = EXCLUDED.recuperaciones;

    FOR v_user_row IN 
        SELECT usuario_id, capitan_id 
        FROM equipos_usuarios 
        WHERE fecha_id = p_fecha_id 
        GROUP BY usuario_id, capitan_id
    LOOP
        SELECT SUM(
            CASE 
                WHEN s.jugador_id = v_user_row.capitan_id THEN 
                    (
                        COALESCE(s.tries,0)*15 + COALESCE(s.conversiones,0)*3 + 
                        COALESCE(s.penales,0)*3 + COALESCE(s.drops,0)*5 + 
                        COALESCE(s.amarillas,0)*-5 + COALESCE(s.rojas,0)*-10 + 
                        COALESCE(s.penales_hechos,0)*-5 + COALESCE(s.knock_ons,0)*-3 + 
                        COALESCE(s.asistencias,0)*5 + COALESCE(s.cortes_limpios,0)*3 + 
                        COALESCE(s.tackles,0)*2 + COALESCE(s.tackles_ofensivos,0)*5 + 
                        COALESCE(s.recuperaciones,0)*5
                    ) * 2
                ELSE 
                    COALESCE(s.tries,0)*15 + COALESCE(s.conversiones,0)*3 + 
                    COALESCE(s.penales,0)*3 + COALESCE(s.drops,0)*5 + 
                    COALESCE(s.amarillas,0)*-5 + COALESCE(s.rojas,0)*-10 + 
                    COALESCE(s.penales_hechos,0)*-5 + COALESCE(s.knock_ons,0)*-3 + 
                    COALESCE(s.asistencias,0)*5 + COALESCE(s.cortes_limpios,0)*3 + 
                    COALESCE(s.tackles,0)*2 + COALESCE(s.tackles_ofensivos,0)*5 + 
                    COALESCE(s.recuperaciones,0)*5
            END
        ) INTO v_total_puntos
        FROM equipos_usuarios e
        JOIN estadisticas_partido s ON e.jugador_id = s.jugador_id AND s.fecha_id = p_fecha_id
        WHERE e.usuario_id = v_user_row.usuario_id AND e.fecha_id = p_fecha_id;

        INSERT INTO historico_equipos (user_id, numero_fecha, fecha_id, player_ids, puntos_totales)
        VALUES (
            v_user_row.usuario_id, v_numero_fecha, p_fecha_id,
            (SELECT to_jsonb(array_agg(jugador_id)) FROM equipos_usuarios WHERE usuario_id = v_user_row.usuario_id AND fecha_id = p_fecha_id),
            COALESCE(v_total_puntos, 0)
        ) ON CONFLICT (user_id, fecha_id) DO UPDATE SET
            puntos_totales = EXCLUDED.puntos_totales, player_ids = EXCLUDED.player_ids;

        INSERT INTO ranking_usuarios (usuario_id, fecha_id, puntos_fecha)
        VALUES (v_user_row.usuario_id, p_fecha_id, COALESCE(v_total_puntos, 0))
        ON CONFLICT (usuario_id, fecha_id) DO UPDATE SET puntos_fecha = EXCLUDED.puntos_fecha;
    END LOOP;

    DELETE FROM equipos_usuarios WHERE fecha_id = p_fecha_id;
    UPDATE fechas SET stats_cargadas = true, estado = 'finalizada' WHERE id = p_fecha_id;
END;
$$ LANGUAGE plpgsql;
