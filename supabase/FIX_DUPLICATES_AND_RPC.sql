-- =============================================================
-- FIX FINAL v3: Ejecutar en Supabase SQL Editor
-- Cada paso es independiente para evitar que un error bloquee los demás
-- =============================================================

-- PASO 1: Marcar fechas viejas como finalizadas
UPDATE fechas 
SET stats_cargadas = true, estado = 'finalizada' 
WHERE numero_fecha < 4;

-- PASO 2: Fecha 4 queda como activa sin publicar
UPDATE fechas 
SET stats_cargadas = false 
WHERE numero_fecha = 4;

-- PASO 3: Limpiar equipos viejos
DELETE FROM equipos_usuarios 
WHERE fecha_id IN (SELECT id FROM fechas WHERE numero_fecha < 4);

-- PASO 4: Limpiar stats viejas
DELETE FROM estadisticas_partido 
WHERE fecha_id IN (SELECT id FROM fechas WHERE numero_fecha < 4);

-- PASO 5: Limpiar ranking
DELETE FROM ranking_usuarios;

-- PASO 6: Limpiar histórico
DELETE FROM historico_equipos;

-- PASO 7: Eliminar duplicados en stats de fecha 4
DELETE FROM estadisticas_partido
WHERE id NOT IN (
    SELECT MAX(id)
    FROM estadisticas_partido
    GROUP BY fecha_id, jugador_id
);

-- PASO 8: Agregar columnas faltantes
ALTER TABLE estadisticas_partido ADD COLUMN IF NOT EXISTS lines_robados INTEGER DEFAULT 0;
ALTER TABLE estadisticas_partido ADD COLUMN IF NOT EXISTS knock_ons INTEGER DEFAULT 0;
ALTER TABLE estadisticas_partido ADD COLUMN IF NOT EXISTS tackles_ofensivos INTEGER DEFAULT 0;
ALTER TABLE estadisticas_partido ADD COLUMN IF NOT EXISTS recuperaciones INTEGER DEFAULT 0;

-- PASO 9: UNIQUE constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_estadisticas_fecha_jugador'
    ) THEN
        ALTER TABLE estadisticas_partido 
        ADD CONSTRAINT uq_estadisticas_fecha_jugador UNIQUE (fecha_id, jugador_id);
    END IF;
END $$;
