# Auditoría Pre-Producción — Gran DT UNI

**Fecha:** 2026-05-23
**Alcance:** React + Vite + Tailwind + Supabase + n8n + Vercel
**Tipo:** Diagnóstico (solo lectura, sin cambios de código)

> ⚠️ **Limitación importante:** esta auditoría se basa en el **código y los archivos SQL del repositorio**. No tengo acceso a la base de datos de producción, por lo que el **estado real de RLS, índices, triggers y publicaciones debe confirmarse en el dashboard de Supabase**. Donde aplica, lo marco como _"verificar en vivo"_.

---

## Resumen ejecutivo

El proyecto es funcional y el flujo de publicación de resultados está bien resuelto (función transaccional con advisory lock). **Sin embargo, hay agujeros de seguridad que son bloqueantes para un lanzamiento con usuarios reales**: una API key filtrada en el frontend, escalada de privilegios a admin, y RLS ausente en casi todas las tablas. Estos deben resolverse antes de salir. El resto son mejoras de robustez/UX priorizables.

---

# 🔒 ÁREA 1 — SEGURIDAD Y RLS

### Estado de RLS por tabla (según el repo)

| Tabla | RLS habilitado | Políticas en el repo | Riesgo |
|---|---|---|---|
| `equipos_usuarios` | ✅ Sí (migración `001_motor_ciclo.sql`) | select_all, write_all + gate de mercado (insert/update/delete) | Cubierto (verificar en vivo) |
| `fechas` | ❌ No consta | Ninguna | **Cualquiera puede modificar el calendario** |
| `convocados_fecha` | ❌ No consta | Ninguna | **Cualquiera puede cargar/borrar convocados** |
| `jugadores` | ❌ No consta | Ninguna | Lectura OK; escritura abierta |
| `historico_equipos` | ❌ No consta | Ninguna | Manipulación de historial |
| `ranking_usuarios` | ❌ No consta | Ninguna | **Cualquiera puede editar el ranking** |
| `profiles` | ❌ No consta | Ninguna | **Auto-promoción a admin / auto-aprobación** |
| `estadisticas_partido` | ❌ No consta | Ninguna | Manipulación de puntajes |

No existe ningún `CREATE POLICY` ni `ENABLE ROW LEVEL SECURITY` en el repo salvo en `migrations/001_motor_ciclo.sql` (solo `equipos_usuarios`).

---

### [SEGURIDAD] - RLS ausente en tablas críticas
**Severidad:** 🔴 Crítica
**Descripción:** Salvo `equipos_usuarios`, ninguna tabla tiene políticas RLS en el repo. Si RLS está deshabilitado (lo más probable, dado que la app escribe libremente), cualquier usuario autenticado —e incluso `anon`— puede leer y escribir cualquier tabla vía la API PostgREST de Supabase (`supabase.from('fechas').update(...)` desde la consola del navegador).
**Impacto:** Un usuario puede modificar el fixture, cargar convocados falsos, editar el ranking, ver/editar equipos ajenos y alterar estadísticas. Rompe la integridad de toda la competencia.
**Sugerencia de fix:** Habilitar RLS en todas las tablas. Lectura pública donde corresponda (`jugadores`, `fechas`, `convocados_fecha`, `ranking_usuarios`, `estadisticas_partido`); escritura **solo admin** (helper `fn_es_admin()` ya existe en migración 001) para `fechas`/`convocados_fecha`/`jugadores`/`estadisticas_partido`; `ranking_usuarios`/`historico_equipos` sin escritura directa (solo vía RPC `SECURITY DEFINER`); `profiles` editable solo por su dueño y **sin** permitir cambiar `role`/`es_competidor`.
**Esfuerzo estimado:** M (3-8h, incluyendo pruebas para no romper publicación).

### [SEGURIDAD] - API key de Resend hardcodeada en el frontend
**Severidad:** 🔴 Crítica
**Descripción:** `src/components/admin/AprobacionesAdmin.jsx:64` contenía `const RESEND_API_KEY = "re_REDACTED..."`. Al ser código de cliente, se incluía en el bundle y quedaba visible para cualquiera que abriera DevTools en producción.
**Impacto:** Robo de la credencial → un tercero puede enviar emails desde tu cuenta Resend (spam/phishing con tu marca), agotar la cuota y comprometer reputación de dominio.
**Sugerencia de fix:** **Rotar la key ya** (está comprometida por estar en el repo). Mover el envío a una **Edge Function de Supabase** (la key vive como secret del servidor); el cliente solo invoca la función. Ya existe `EMAIL_WEBHOOK_SETUP.sql` apuntando a `send-welcome-email` — ese es el patrón correcto.
**Esfuerzo estimado:** S (1-3h).

### [SEGURIDAD] - Escalada de privilegios a admin (rol auto-asignado)
**Severidad:** 🔴 Crítica
**Descripción:** El trigger `handle_new_user` (`fix_team_name_trigger.sql`, `DEFINITIVE_FIX.sql`) toma el rol de `raw_user_meta_data->>'role'`. Un atacante puede llamar directamente `supabase.auth.signUp({ ..., options:{ data:{ role:'admin' }}})` desde la consola, evitando el formulario. Además, sin RLS en `profiles`, puede simplemente `update profiles set role='admin' where id = <su id>`.
**Impacto:** Acceso total al panel admin: publicar resultados, cargar convocados, aprobar pagos, editar todo.
**Sugerencia de fix:** No derivar `role` de metadata del usuario; el trigger debe **forzar `'player'`** siempre. La promoción a admin se hace manualmente en DB. Combinar con RLS en `profiles` que impida a un usuario cambiar su propio `role`/`es_competidor`.
**Esfuerzo estimado:** S (1-3h).

### [SEGURIDAD] - Auto-aprobación de pago (es_competidor)
**Severidad:** 🟠 Alta
**Descripción:** `AprobacionesAdmin.handleAprobar` hace `update profiles set es_competidor=true` desde el cliente. Sin RLS en `profiles`, cualquier usuario puede auto-aprobarse y saltear el pago.
**Impacto:** Usuarios juegan sin pagar; se pierde el control de inscripción.
**Sugerencia de fix:** RLS en `profiles`: el dueño puede editar `full_name`/`team_name`/`comprobante_url` pero **no** `es_competidor`/`role`. La aprobación solo vía admin (policy con `fn_es_admin()`).
**Esfuerzo estimado:** S (1-3h).

### [SEGURIDAD] - Código de admin hardcodeado en cliente
**Severidad:** 🟠 Alta
**Descripción:** `Signup.jsx:22` valida `adminCode !== 'UNI2026'` en el cliente. Aunque el `signUp` actual fuerza `role:'player'` (mitiga el alta de admin por UI), el secreto queda expuesto en el bundle y el patrón es inseguro.
**Impacto:** Filtra un secreto de la organización; refuerza el vector de SEC-03 si se reactiva el flujo.
**Sugerencia de fix:** Quitar el flujo de "registro admin" del cliente por completo. Admins se crean a mano en DB.
**Esfuerzo estimado:** XS (< 1h).

### [SEGURIDAD] - Overlay global de errores visible en producción
**Severidad:** 🟡 Media
**Descripción:** `index.html:22-52` inyecta una barra roja con `msg`, archivo, línea y **stack trace** ante cualquier error JS, para todos los usuarios.
**Impacto:** Divulgación de detalles internos + experiencia poco profesional ante el primer bug en prod.
**Sugerencia de fix:** Quitar el overlay en producción (o limitarlo a `import.meta.env.DEV`). Reemplazar por un error boundary discreto.
**Esfuerzo estimado:** XS (< 1h).

### [SEGURIDAD] - Identificación del rol staff/admin
**Severidad:** 🟢 Baja (informativo)
**Descripción:** El rol se determina por la columna `profiles.role === 'admin'` (no por email allowlist ni claim JWT). Es un enfoque válido **siempre que** `profiles` tenga RLS que impida auto-edición del rol (ver SEC-03/05).
**Impacto:** Correcto si se cierra RLS; inseguro hoy.
**Sugerencia de fix:** Mantener `profiles.role` + RLS estricta. Opcional: custom claim para checks server-side más robustos.
**Esfuerzo estimado:** XS (documentación).

---

# 🔄 ÁREA 2 — INTEGRIDAD DEL CICLO DE DATOS

### [INTEGRIDAD] - La publicación de resultados ES atómica ✅
**Severidad:** 🟢 Baja (hallazgo positivo)
**Descripción:** `process_publication_v3` (`FIX_RPC_BIGINT.sql`, versión vigente) es **una función PL/pgSQL** = una transacción única. Incluye `pg_advisory_xact_lock` (anti-concurrencia) y guardia de idempotencia (`IF EXISTS ... stats_cargadas=true RAISE`). Hace en orden: upsert de stats, cálculo de puntos (con x2 capitán), snapshot a `historico_equipos`, upsert a `ranking_usuarios`, `DELETE` de `equipos_usuarios` y marca `finalizada`. Si algo falla, hace rollback de todo.
**Impacto:** Bien resuelto; no deja la BD a medias.
**Sugerencia de fix:** Sin acción. Mantener.
**Esfuerzo estimado:** —

### [INTEGRIDAD] - Versiones duplicadas y contradictorias del RPC de publicación
**Severidad:** 🟠 Alta
**Descripción:** Hay 3 definiciones de `process_publication_v3` en el repo: tipo `UUID` en `V3_ROBUST_LIFECYCLE.sql` y `ADD_KNOCK_ON.sql`, y tipo `BIGINT` en `FIX_RPC_BIGINT.sql`. La tabla `fechas` usa IDs enteros, así que la vigente es la BIGINT.
**Impacto:** Re-ejecutar por error `ADD_KNOCK_ON.sql` o `V3_ROBUST_LIFECYCLE.sql` recrea la versión UUID y **rompe la publicación** (incompatibilidad de tipos). Riesgo alto en una corrida de mantenimiento apurada.
**Sugerencia de fix:** Borrar/archivar los `.sql` obsoletos y dejar un único script canónico. Documentar cuál es el vigente.
**Esfuerzo estimado:** XS (< 1h).

### [INTEGRIDAD] - Falta UNIQUE en `equipos_usuarios(usuario_id, fecha_id, jugador_id)`
**Severidad:** 🟠 Alta
**Descripción:** No existe constraint único. El guardado en `MiEquipo` hace `delete`+`insert`, lo que lo mitiga, pero a nivel DB nada impide duplicar un jugador en un equipo (por un bug, doble submit o escritura directa).
**Impacto:** Posibles puntajes inflados (un jugador contado dos veces) y datos inconsistentes en publicación.
**Sugerencia de fix:** `ALTER TABLE equipos_usuarios ADD CONSTRAINT uq_equipo UNIQUE (usuario_id, fecha_id, jugador_id);` (limpiar duplicados antes).
**Esfuerzo estimado:** XS (< 1h).

### [INTEGRIDAD] - La "tendencia" del ranking no es real
**Severidad:** 🟠 Alta
**Descripción:** `ranking_usuarios` solo guarda `puntos_fecha` (no posición histórica ni tendencia). `RankingTab` muestra flecha up/down/equal según el **signo de los puntos**, no el movimiento de posición entre fechas.
**Impacto:** Indicador engañoso para el usuario (muestra "subió/bajó" sin reflejar cambios de ranking).
**Sugerencia de fix:** O bien quitar el indicador, o persistir la posición por fecha y calcular el delta real en la publicación.
**Esfuerzo estimado:** M (3-8h si se implementa tendencia real; XS si se quita).

### [INTEGRIDAD] - Interacción RLS ↔ publicación al endurecer seguridad
**Severidad:** 🟠 Alta (coordinación)
**Descripción:** `process_publication_v3` es `SECURITY INVOKER`. Hoy funciona porque las tablas que toca (`estadisticas_partido`, `historico_equipos`, `ranking_usuarios`) no tienen RLS. Cuando se resuelva SEC-01 y se habilite RLS en esas tablas, **la publicación fallará** salvo que la función pase a `SECURITY DEFINER` (o se agreguen policies de admin).
**Impacto:** Si se cierra RLS sin coordinar, el admin no podrá publicar resultados.
**Sugerencia de fix:** Al habilitar RLS, convertir `process_publication_v3` a `SECURITY DEFINER` (manteniendo idéntica la lógica) o agregar policies con `fn_es_admin()`. Probar publicación de punta a punta.
**Esfuerzo estimado:** S (1-3h).

### [INTEGRIDAD] - Dependencia de orden en la publicación Realtime
**Severidad:** 🟡 Media
**Descripción:** `ONBOARDING_MIGRATION.sql` hace `DROP PUBLICATION supabase_realtime` y la recrea **solo con `profiles`**. La migración 001 agrega `fechas`. Si se corre el onboarding después, se pierde el realtime de `fechas`.
**Impacto:** El hook `useFechaActiva` dejaría de refrescar al instante (rompe el criterio de "<10s" al cambiar timestamps).
**Sugerencia de fix:** Verificar en vivo qué tablas están en `supabase_realtime` (deben estar `profiles` **y** `fechas`). Consolidar en un script idempotente.
**Esfuerzo estimado:** XS (< 1h).

---

# 🧪 ÁREA 3 — CASOS BORDE

### [CASOS BORDE] - `vw_fecha_activa` puede elegir una "FECHA LIBRE" como activa
**Severidad:** 🟡 Media
**Descripción:** La vista toma la fecha no finalizada de menor `numero_fecha`, sin excluir las "FECHA LIBRE". Hay varias fechas LIBRE en la tabla. Si una LIBRE no está marcada `finalizada`, queda como activa y bloquea el ciclo en "esperando_convocados".
**Impacto:** La home/Mi Equipo podrían quedar trabadas en una fecha sin rival.
**Sugerencia de fix:** Marcar las LIBRE como `estado='finalizada'`, o excluir LIBRE en la selección de la vista.
**Esfuerzo estimado:** XS (< 1h).

### [CASOS BORDE] - Jugador convocado en dos categorías en la misma fecha
**Severidad:** 🟡 Media
**Descripción:** `getConvocados` devuelve una fila por registro en `convocados_fecha`. Si un jugador queda en Primera **e** Intermedia la misma fecha, aparece dos veces y `categoryKey` se vuelve ambiguo, pudiendo romper el conteo 5-5-5. No consta un UNIQUE en `convocados_fecha(fecha_id, jugador_id)`.
**Impacto:** Conteo de categorías incorrecto; jugador elegible en dos cupos.
**Sugerencia de fix:** UNIQUE en `convocados_fecha(fecha_id, jugador_id)` y/o de-duplicar en `getConvocados`.
**Esfuerzo estimado:** S (1-3h).

### [CASOS BORDE] - Equipo incompleto / sin equipo / capitán inválido
**Severidad:** 🟢 Baja
**Descripción:** Se permite "guardar progreso" con <15 (intencional). Existe `fn_validar_alineacion` (5-5-5, capitán, convocados) **pero no se invoca** en el guardado. Usuario sin equipo no entra al loop de publicación → no genera puntos de esa fecha (aparece con 0 vía `getRankingCompleto`). Capitán que no jugó → x2 de 0 = 0 (OK). Capitán fuera del equipo/no convocado no es bloqueado a nivel guardado.
**Impacto:** Casos manejados aceptablemente; falta validación dura opcional en cierre.
**Sugerencia de fix:** Invocar `fn_validar_alineacion` al menos como advertencia al confirmar el equipo final.
**Esfuerzo estimado:** S (1-3h).

### [CASOS BORDE] - Desempate en el ranking
**Severidad:** 🟢 Baja
**Descripción:** `RankingTab` ordena por puntos desc y desempata **alfabéticamente** por nombre. Determinístico pero arbitrario.
**Impacto:** Para premios reales, un desempate alfabético puede ser cuestionado.
**Sugerencia de fix:** Definir y documentar el criterio oficial (p. ej., mejor puntaje en una sola fecha, fecha de registro).
**Esfuerzo estimado:** XS (decisión) / S (implementación).

### [CASOS BORDE] - Sesión activa cuando el admin publica ✅
**Severidad:** 🟢 Baja (positivo)
**Descripción:** Tras el Prompt 1, `useFechaActiva` se suscribe a Realtime de `fechas`. Al publicar (`fechas.estado='finalizada'`), el hook refresca y la vista pasa a `resultados_publicados` en vivo (Inicio y Mi Equipo). Depende de que `fechas` siga en `supabase_realtime` (ver CYC-06).
**Impacto:** Buena UX en vivo.
**Sugerencia de fix:** Sin acción (verificar publicación realtime).
**Esfuerzo estimado:** —

### [CASOS BORDE] - Mercado abierto con `convocados_fecha` vacía ✅
**Severidad:** 🟢 Baja (positivo)
**Descripción:** `vw_fecha_activa` requiere `convocados_cargados=true` para pasar a `mercado_abierto`; sin convocados, la fase es `esperando_convocados` y el frontend muestra el estado correcto.
**Impacto:** Manejado.
**Sugerencia de fix:** Sin acción.
**Esfuerzo estimado:** —

---

# ⚡ ÁREA 4 — PERFORMANCE Y QUERIES

### [PERFORMANCE] - Sin índices en columnas de filtro frecuente
**Severidad:** 🟠 Alta
**Descripción:** No hay ningún `CREATE INDEX` en el repo. Postgres indexa PK y UNIQUE, pero **no las foreign keys**. Faltan índices en `equipos_usuarios(usuario_id)`, `equipos_usuarios(fecha_id)`, `convocados_fecha(fecha_id)`, `historico_equipos(user_id)`, `estadisticas_partido(fecha_id)`, `ranking_usuarios(usuario_id, fecha_id)`.
**Impacto:** Con pocos usuarios el impacto es bajo, pero las policies RLS (que evalúan `fn_fase_actual()` por sentencia) y los joins de publicación pueden degradarse al crecer. Barato de prevenir.
**Sugerencia de fix:** Crear índices en esas FKs. Esfuerzo mínimo, beneficio claro.
**Esfuerzo estimado:** XS (< 1h).

### [PERFORMANCE] - Sin React Query/SWR; `useEffect` crudo + cache manual
**Severidad:** 🟡 Media
**Descripción:** Todo el data-fetching usa `useEffect` directo. El único cache es un objeto módulo-global en `Resumenes.jsx` sin invalidación por mutación.
**Impacto:** Refetches redundantes y posible data stale tras mutaciones. No bloqueante para el tamaño del club.
**Sugerencia de fix:** A futuro, adoptar React Query (cache, invalidación, reintentos). No prioritario para el lanzamiento.
**Esfuerzo estimado:** L (1+ día) — diferible.

### [PERFORMANCE] - N+1 menor en métricas de mercado
**Severidad:** 🟢 Baja
**Descripción:** `getMarketMetrics`/`getEntrenadorDeLaFecha` hacen varias queries single-row de `jugadores` por métrica. No es N+1 por fila, pero son llamadas secuenciales.
**Impacto:** Bajo. El resto (`getPlayersStatistics`, `getRankingCompleto`) trae lotes y agrega en JS (sin N+1).
**Sugerencia de fix:** Opcional: resolver nombres en una sola query con `in()`.
**Esfuerzo estimado:** S (1-3h).

---

# 📱 ÁREA 5 — MOBILE Y UX

### [MOBILE] - Drag & drop HTML5 en el armador admin falla en touch
**Severidad:** 🟡 Media
**Descripción:** `AdminDragDropBuilder.jsx` usa `draggable`/`onDragStart`/`onDrop`, que no funcionan en touch (iPad/Android sin mouse). Mitigado por un drawer de selección por tap en `<768px`.
**Impacto:** Acotado: es panel admin y hay fallback en mobile. En iPad en horizontal podría confundir.
**Sugerencia de fix:** Confiar en el drawer en touch; opcionalmente unificar con click-to-assign.
**Esfuerzo estimado:** M (si se unifica) / XS (documentar).

### [MOBILE] - Cancha del usuario: OK en touch ✅
**Severidad:** 🟢 Baja (positivo)
**Descripción:** En `MiEquipo`, además del drag, hay flujo click→selector (modal/bottom-sheet) que funciona en touch. `RugbyPitch` es read-only.
**Impacto:** Usuarios en celular pueden armar equipo sin drag.
**Sugerencia de fix:** Sin acción.
**Esfuerzo estimado:** —

### [MOBILE] - Posible scroll horizontal en la barra de tabs
**Severidad:** 🟡 Media
**Descripción:** `Navigation.jsx` usa `overflow-x-auto` + `min-w-max` en mobile; con 6 tabs puede generar scroll lateral en pantallas de 360px.
**Impacto:** Sensación de "se sale de la pantalla". Verificar en 360px.
**Sugerencia de fix:** Reducir padding/ìconos en mobile o permitir wrap.
**Esfuerzo estimado:** S (1-3h).

### [UX] - Solo spinners, sin skeletons
**Severidad:** 🟡 Media
**Descripción:** Todos los estados de carga son spinners; no hay skeletons.
**Impacto:** Percepción de lentitud, pero funcional.
**Sugerencia de fix:** Opcional: skeletons en Inicio/Ranking. Diferible.
**Esfuerzo estimado:** M — diferible.

### [UX] - Estados de error inconsistentes / Supabase caído
**Severidad:** 🟡 Media
**Descripción:** Varios componentes (`HistorialTab`, `PlayersTab`) solo hacen `console.error` sin UI de error. El `AuthProvider` tiene safety timeout (evita spinner infinito global) y pantalla de error de conexión.
**Impacto:** Si Supabase cae, algunas pestañas quedan vacías sin explicación.
**Sugerencia de fix:** Estado de error con botón "Reintentar" consistente (como ya tienen `AprobacionesAdmin`/`RankingTab`).
**Esfuerzo estimado:** S (1-3h).

### [UX] - Email de bienvenida va a un correo hardcodeado
**Severidad:** 🟡 Media
**Descripción:** `AprobacionesAdmin.jsx:67` envía siempre a `tomasmarzullo04@gmail.com` (modo test de Resend sin dominio verificado).
**Impacto:** Los usuarios reales **no reciben** el email de aprobación.
**Sugerencia de fix:** Verificar dominio en Resend y enviar a `userEmail` (junto con mover la key al backend — SEC-02).
**Esfuerzo estimado:** S (1-3h, incluye verificación de dominio).

### [UX] - `ProximasFechas` retorna `null` sin placeholder
**Severidad:** 🟢 Baja
**Descripción:** Si no hay próximas fechas, el componente no renderiza nada (sin mensaje).
**Impacto:** Sección que "desaparece"; menor.
**Sugerencia de fix:** Mostrar estado vacío explícito.
**Esfuerzo estimado:** XS (< 1h).

---

# 🌐 ÁREA 6 — INFRAESTRUCTURA Y DEPLOY

### [INFRA] - Secreto en el cliente (Resend)
**Severidad:** 🔴 Crítica
**Descripción:** Ver **SEC-02**. Clave de API en el bundle.
**Impacto:** Robo de credencial.
**Sugerencia de fix:** Rotar + mover a Edge Function.
**Esfuerzo estimado:** S.

### [INFRA] - Sin observabilidad
**Severidad:** 🟠 Alta
**Descripción:** No hay Sentry/LogRocket. Solo `console.error` y el overlay casero de `index.html`.
**Impacto:** En producción no vas a enterarte de los errores que sufren los usuarios.
**Sugerencia de fix:** Integrar Sentry (free tier) para frontend; capturar errores y rejections.
**Esfuerzo estimado:** S (1-3h).

### [INFRA] - Variables de entorno
**Severidad:** 🟡 Media
**Descripción:** El cliente usa `import.meta.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (correcto). Hay URL de Supabase hardcodeada en `scripts/populate.js` (script de dev) y la URL pública del logo (OK).
**Impacto:** Verificar que las env vars estén cargadas en Vercel (sin ellas, pantalla de "error de conexión").
**Sugerencia de fix:** Confirmar variables en Vercel; no commitear `.env`.
**Esfuerzo estimado:** XS (verificación).

### [INFRA] - `.gitignore` no excluye `.env` explícitamente
**Severidad:** 🟡 Media
**Descripción:** Ignora `*.local` (cubre `.env.local`) pero no `.env`.
**Impacto:** Riesgo de commitear secretos si alguien crea `.env`.
**Sugerencia de fix:** Agregar `.env` y `.env*` al `.gitignore`.
**Esfuerzo estimado:** XS (< 1h).

### [INFRA] - Backups, n8n y dominio: no verificable desde el repo
**Severidad:** 🟡 Media (verificar en vivo)
**Descripción:** No hay workflows de n8n ni documentación en el repo. No se puede confirmar backups de Supabase ni el dominio. El email apunta a `https://grandtuni.com` (dominio custom intencionado).
**Impacto:** Si n8n se cae o no hay backups, riesgo operativo desconocido.
**Sugerencia de fix:** Confirmar: (a) backups automáticos activos en Supabase + snapshot reciente; (b) qué hacen los workflows de n8n y su tolerancia a fallos (¿el ciclo depende de n8n o ya es autónomo vía `vw_fecha_activa`?); (c) dominio `grandtuni.com` configurado en Vercel o ajustar el link del email.
**Esfuerzo estimado:** S (verificación + documentación).

---

# 📝 ÁREA 7 — ONBOARDING Y COMUNICACIÓN

### [ONBOARDING] - Tutorial y reglamento presentes ✅
**Severidad:** 🟢 Baja (positivo)
**Descripción:** `OnboardingScreen` tiene un flujo de 4 pasos + tabla de scoring. El Sidebar incluye "Reglamento" (5-5-5, cierres, scoring). El estado "Esperando convocados" se comunica en la franja/banner.
**Impacto:** Buena base de onboarding.
**Sugerencia de fix:** Sin acción crítica.
**Esfuerzo estimado:** —

### [ONBOARDING] - Sin canal de soporte directo
**Severidad:** 🟠 Alta
**Descripción:** Solo hay link a Instagram (`@clubuniversitario.mdp`). No hay WhatsApp ni email de soporte visible.
**Impacto:** En el lanzamiento, los usuarios con problemas (pago, login) no tienen a dónde escribir → frustración y carga sobre canales informales.
**Sugerencia de fix:** Agregar un contacto visible (WhatsApp/mail) en Sidebar/Login/Onboarding.
**Esfuerzo estimado:** XS (< 1h).

### [ONBOARDING] - Sin notificaciones de apertura de mercado
**Severidad:** 🟡 Media
**Descripción:** Solo existe el email de aprobación (roto por el correo hardcodeado). No hay aviso cuando abre el mercado.
**Impacto:** Menor retención: usuarios que no entran a tiempo a armar equipo. Opcional.
**Sugerencia de fix:** Email/push al pasar a `mercado_abierto` (vía n8n o Edge Function escuchando `fechas`).
**Esfuerzo estimado:** M (3-8h) — diferible post-lanzamiento.

---

# 📊 Tabla resumen (ordenada por severidad)

| ID | Área | Hallazgo | Severidad | Esfuerzo |
|---|---|---|---|---|
| SEC-01 | Seguridad | RLS ausente en tablas críticas | 🔴 Crítica | M |
| SEC-02 / INF-01 | Seguridad/Infra | Resend API key en el frontend | 🔴 Crítica | S |
| SEC-03 | Seguridad | Escalada de privilegios (role en metadata) | 🔴 Crítica | S |
| SEC-05 | Seguridad | Auto-aprobación de pago (`es_competidor`) | 🟠 Alta | S |
| SEC-04 | Seguridad | Código admin `UNI2026` en cliente | 🟠 Alta | XS |
| CYC-03 | Integridad | Versiones duplicadas del RPC de publicación | 🟠 Alta | XS |
| CYC-01 | Integridad | Falta UNIQUE en `equipos_usuarios` | 🟠 Alta | XS |
| CYC-04 | Integridad | "Tendencia" del ranking no es real | 🟠 Alta | M/XS |
| CYC-05 | Integridad | RLS ↔ publicación (coordinar al cerrar RLS) | 🟠 Alta | S |
| PERF-01 | Performance | Sin índices en FKs | 🟠 Alta | XS |
| INF-02 | Infra | Sin observabilidad (Sentry) | 🟠 Alta | S |
| ONB-02 | Onboarding | Sin canal de soporte directo | 🟠 Alta | XS |
| SEC-06 / INF-06 | Seguridad/Infra | Overlay de errores en prod | 🟡 Media | XS |
| CYC-06 | Integridad | Orden de publicación Realtime (`fechas`) | 🟡 Media | XS |
| EDG-01 | Casos borde | `vw_fecha_activa` puede tomar FECHA LIBRE | 🟡 Media | XS |
| EDG-02 | Casos borde | Jugador en dos categorías misma fecha | 🟡 Media | S |
| UX-01 | Mobile | Drag&drop admin falla en touch (mitigado) | 🟡 Media | M/XS |
| UX-03 | Mobile | Scroll horizontal en tabs (360px) | 🟡 Media | S |
| UX-04 | UX | Solo spinners, sin skeletons | 🟡 Media | M |
| UX-05 | UX | Estados de error inconsistentes | 🟡 Media | S |
| UX-07 | UX | Email de bienvenida a correo hardcodeado | 🟡 Media | S |
| INF-03 | Infra | Verificar env vars en Vercel | 🟡 Media | XS |
| INF-04 | Infra | Backups / n8n / dominio sin verificar | 🟡 Media | S |
| INF-05 | Infra | `.gitignore` sin `.env` | 🟡 Media | XS |
| ONB-03 | Onboarding | Claridad "Esperando convocados" | 🟡 Media | XS |
| ONB-04 | Onboarding | Sin aviso de apertura de mercado | 🟡 Media | M |
| PERF-02 | Performance | Sin React Query (useEffect crudo) | 🟡 Media | L |
| EDG-04 | Casos borde | Validación 5-5-5 no se invoca al guardar | 🟢 Baja | S |
| EDG-08 | Casos borde | Empate ranking (desempate alfabético) | 🟢 Baja | XS |
| PERF-03 | Performance | N+1 menor en métricas | 🟢 Baja | S |
| UX-06 | UX | `ProximasFechas` sin placeholder | 🟢 Baja | XS |
| CYC-02 | Integridad | Publicación atómica | 🟢 Positivo | — |
| EDG-03/05/06/07 | Casos borde | Sin equipo / capitán / registro / mercado vacío | 🟢 OK | — |

---

# 🚨 Top 5 bloqueantes para salir a producción

1. **SEC-02 — Rotar y sacar la API key de Resend del frontend.** Está comprometida hoy mismo (en el repo y el bundle). Rotar la key y moverla a una Edge Function.
2. **SEC-01 — Habilitar RLS en todas las tablas.** Sin esto, cualquier usuario puede editar ranking, fechas, convocados y equipos ajenos desde la consola del navegador.
3. **SEC-03 — Cerrar la escalada de privilegios.** Forzar `role='player'` en el trigger y bloquear el cambio de `role`/`es_competidor` vía RLS en `profiles`. Hoy alguien puede volverse admin.
4. **SEC-05 — Bloquear la auto-aprobación de pago.** Parte de la RLS de `profiles`: aprobar solo vía admin.
5. **CYC-05 + CYC-03 — Coordinar RLS con la publicación y limpiar los RPC duplicados.** Al cerrar RLS, pasar `process_publication_v3` a `SECURITY DEFINER` y dejar un único script canónico, para que endurecer la seguridad no rompa la publicación de resultados.

> **Nota de secuencia:** SEC-01, SEC-03, SEC-05 y CYC-05 están entrelazados (todos giran alrededor de RLS + `profiles` + publicación). Conviene resolverlos en un único bloque de trabajo con prueba de punta a punta: registro → armar equipo → cerrar mercado → cargar stats → publicar → ranking.

---

### Quick wins (alto impacto / bajo esfuerzo, XS)
- Rotar key Resend (SEC-02 — la parte de rotación).
- Quitar flujo admin de `Signup` (SEC-04).
- Quitar overlay de errores de `index.html` (SEC-06).
- Crear índices en FKs (PERF-01).
- UNIQUE en `equipos_usuarios` (CYC-01).
- Marcar FECHAS LIBRE como `finalizada` (EDG-01).
- Agregar contacto de soporte (ONB-02).
- Archivar SQL obsoletos del RPC (CYC-03).
- `.env` al `.gitignore` (INF-05).

---

# ✅ Fixes aplicados — Bloque de Seguridad (SEC-01 / SEC-03 / SEC-05 / CYC-05)

Implementado en la rama `claude/bold-wozniak-C3C1J` (working tree). **Pendiente de deploy** (Edge Function + 3 migraciones SQL).

### Archivos creados/modificados

| Archivo | Tipo | Propósito |
|---|---|---|
| `supabase/functions/send-email/index.ts` | nuevo | Edge Function que envía emails vía Resend con la API key del lado del servidor. Valida JWT, exige admin para correos a terceros, rate limit 10/min/usuario. |
| `supabase/functions/send-email/deno.json` | nuevo | Imports mínimos de Deno. |
| `supabase/migrations/002_lock_handle_new_user.sql` | nuevo | Hardcodea `role='player'` en el trigger; ignora `raw_user_meta_data->>'role'`. |
| `supabase/migrations/003_enable_rls_all_tables.sql` | nuevo | Habilita RLS en `profiles`, `fechas`, `convocados_fecha`, `jugadores`, `estadisticas_partido`, `historico_equipos`, `ranking_usuarios`. Trigger `BEFORE INSERT OR UPDATE` en `profiles` para bloquear cambios de `role`/`es_competidor` salvo admin. |
| `supabase/migrations/004_process_publication_security_definer.sql` | nuevo | `process_publication_v3` ahora es `SECURITY DEFINER` + `SET search_path=public`, con check de admin (`fn_es_admin()`) al inicio. Misma lógica de negocio (advisory lock, idempotencia, cálculo de puntos, snapshot, vaciado, marca finalizada). Tipo `BIGINT` consistente con `fechas.id`. |
| `src/components/admin/AprobacionesAdmin.jsx` | modificado | Elimina la constante `RESEND_API_KEY` y la llamada directa a Resend; ahora invoca `supabase.functions.invoke('send-email', { body })`. |
| `supabase/V3_ROBUST_LIFECYCLE.sql` | header | Marcado como **OBSOLETO** (la versión UUID de `process_publication_v3` no debe re-ejecutarse). |
| `supabase/ADD_KNOCK_ON.sql` | header | Marcado como **OBSOLETO** por la misma razón. |
| `supabase/FIX_RPC_BIGINT.sql` | header | Marcado como **SUPERSEDED** por la migración 004. |

### Desviaciones respecto a la plantilla del prompt

1. **`alias` → `full_name`/`team_name`.** El prompt usaba la columna `alias`; el schema real de `profiles` usa `full_name` y `team_name`. Se respetaron las columnas reales.
2. **`role` default `'user'` → `'player'`.** Toda la app (Signup, ProtectedRoute, RankingTab, etc.) chequea `'admin'` o `'player'`. Cambiar a `'user'` rompía esos flujos. La migración 002 hardcodea `'player'`.
3. **`historico_equipos.SELECT` público (no "solo dueño + admin").** El dashboard de Inicio agrega métricas de "más elegido" leyendo `player_ids` de todos los usuarios. En un fantasy las picks no son sensibles. Mantener SELECT global preserva esa feature sin abrir escritura (no hay policies de INSERT/UPDATE → solo `process_publication_v3` SECURITY DEFINER escribe).
4. **Bloqueo de cambios privilegiados vía trigger, no en policy.** Comparar `OLD` vs `NEW` no es posible dentro de una policy. Se implementó con un `BEFORE INSERT OR UPDATE` trigger en `profiles` que usa `fn_es_admin()` para el carve-out de admin.
5. **No se borraron los archivos SQL "duplicados"**, solo se agregó un header de "OBSOLETO" que documenta su estado, para preservar la referencia histórica del schema (column adds, `get_fecha_status`, `get_tournament_lifecycle_context`).

### Promoción a admin después del fix

A partir de ahora **un usuario solo puede ser admin si el dueño del proyecto lo hace manualmente desde Supabase SQL Editor**:

```sql
-- Promover a admin (correr como dueño del proyecto en Supabase SQL Editor):
UPDATE public.profiles SET role = 'admin' WHERE email = '<email>';
```

El cliente ya no puede asignarse `role='admin'` ni a través de `raw_user_meta_data` (bloqueado por el trigger de 002) ni vía `UPDATE` directo a `profiles` (bloqueado por el trigger de 003).

