-- 1. Actualizar Sporting (Fecha 4)
UPDATE fechas SET 
  rival = 'Sporting',
  condicion = 'Visitante',
  inicio_semana = '2026-04-06 00:00:00+00',
  cierre_mercado = '2026-04-10 23:59:59+00',
  fin_fecha = '2026-04-12 23:59:59+00',
  stats_cargadas = false
WHERE numero_fecha = 4;

-- 2. Asegurar Fecha 5 (Libre)
INSERT INTO fechas (numero_fecha, rival, condicion, inicio_semana, cierre_mercado, fin_fecha, stats_cargadas)
SELECT 5, 'FECHA LIBRE', 'Local', '2026-04-13 00:00:00+00', '2026-04-17 23:59:59+00', '2026-04-19 23:59:59+00', true
WHERE NOT EXISTS (SELECT 1 FROM fechas WHERE numero_fecha = 5);

-- 3. Actualizar Comercial (Fecha 7)
UPDATE fechas SET 
  rival = 'Comercial',
  condicion = 'Local',
  inicio_semana = '2026-04-27 00:00:00+00',
  cierre_mercado = '2026-05-01 23:59:59+00',
  fin_fecha = '2026-05-03 23:59:59+00',
  stats_cargadas = false
WHERE numero_fecha = 7;
