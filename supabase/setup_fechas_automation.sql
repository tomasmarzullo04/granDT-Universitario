-- SCRIPT DE AUTOMATIZACIÓN DE CICLO DE VIDA (GRAN DT UNI)
-- Ejecutar este script en el SQL Editor de Supabase para habilitar fechas dinámicas.

-- 1. Agregar nuevas columnas a la tabla 'fechas'
ALTER TABLE fechas ADD COLUMN IF NOT EXISTS inicio_semana TIMESTAMPTZ;
ALTER TABLE fechas ADD COLUMN IF NOT EXISTS cierre_mercado TIMESTAMPTZ;
ALTER TABLE fechas ADD COLUMN IF NOT EXISTS fin_fecha TIMESTAMPTZ;
ALTER TABLE fechas ADD COLUMN IF NOT EXISTS stats_cargadas BOOLEAN DEFAULT false;
ALTER TABLE fechas ADD COLUMN IF NOT EXISTS condicion TEXT DEFAULT 'Local';

-- 2. Configuración inicial para la Fecha 4 (Sporting)
-- Asumiendo que Sporting es el Sábado 11 de Abril de 2026.
-- El mercado abre el Lunes 6 y cierra el Viernes 10 a las 23:59.
UPDATE fechas SET 
  condicion = 'Visitante',
  inicio_semana = '2026-04-06 00:00:00+00',
  cierre_mercado = '2026-04-10 23:59:59+00',
  fin_fecha = '2026-04-12 23:59:59+00',
  stats_cargadas = false
WHERE numero_fecha = 4;

-- 3. Comentarios de estructura
COMMENT ON COLUMN fechas.inicio_semana IS 'Momento en que la fecha se vuelve visible en la Home.';
COMMENT ON COLUMN fechas.cierre_mercado IS 'Límite absoluto para guardar el equipo por parte del usuario.';
COMMENT ON COLUMN fechas.fin_fecha IS 'Momento estimado del fin de los partidos.';
COMMENT ON COLUMN fechas.stats_cargadas IS 'Flag que define si los resultados ya fueron publicados por el admin.';
