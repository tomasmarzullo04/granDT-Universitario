-- Añadir columna capitan_id a equipos_usuarios
-- Permite persistir el ID del jugador seleccionado como capitán por cada usuario en cada fecha.

ALTER TABLE equipos_usuarios 
ADD COLUMN IF NOT EXISTS capitan_id UUID REFERENCES jugadores(id);

-- Opcional: Si ya existe es_capitan, podemos mantenerla o usarla. 
-- Pero por especificación, añadimos capitan_id.
