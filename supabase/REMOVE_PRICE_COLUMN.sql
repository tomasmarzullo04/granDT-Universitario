-- ELIMINACIÓN DE COLUMNA PRECIO
-- Gran DT Universitario - Misión: Juego sin presupuestos

ALTER TABLE public.jugadores 
DROP COLUMN IF EXISTS precio;
