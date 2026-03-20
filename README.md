# 🏉 Gran DT Universitario

> **Fantasy rugby** para el Club Universitario de Mar del Plata. Armá tu equipo ideal, seguí el fixture y competí en el ranking con tus amigos.

---

## 📖 ¿Qué es Gran DT Universitario?

Gran DT Universitario es una aplicación web de **fantasy rugby** diseñada especialmente para los socios y simpatizantes del **Club Universitario de Mar del Plata**. Cada fecha, el staff oficial publica los planteles de las tres divisiones (Primera, Intermedia y Pre-intermedia). Los participantes eligen sus 15 jugadores ideales siguiendo la **Regla 5-5-5** y acumulan puntos según el rendimiento real de sus jugadores en la cancha.

---

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + Vite 8 |
| Estilos | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| Ruteo | React Router DOM v7 |
| Iconos | Lucide React |
| Deploy | Vercel |

---

## 🗂️ Estructura del Proyecto

```
src/
├── pages/
│   ├── Login.jsx          # Pantalla de inicio de sesión
│   ├── Signup.jsx         # Registro de nuevos usuarios
│   ├── Dashboard.jsx      # Panel principal del jugador
│   └── Admin.jsx          # Panel de administración
├── components/
│   ├── tabs/
│   │   ├── MiEquipo.jsx   # Armado del equipo (drag & drop)
│   │   ├── PlayersTab.jsx # Listado de jugadores convocados
│   │   ├── MyTeamTab.jsx  # Vista detallada del equipo guardado
│   │   └── RankingTab.jsx # Tabla de posiciones general
│   ├── admin/
│   │   ├── AdminDragDropBuilder.jsx  # Pizarra de armado oficial (admin)
│   │   ├── AdminTeamBuilder.jsx      # Gestión de planteles
│   │   ├── ResultadosAdmin.jsx       # Carga de estadísticas y resultados
│   │   └── AdminStandings.jsx        # Tabla de posiciones admin
│   ├── RugbyPitch.jsx     # Visualización gráfica de la cancha
│   ├── ProximasFechas.jsx # Fixture y próximos partidos
│   ├── EquiposOficiales.jsx # Planteles oficiales publicados
│   ├── Sidebar.jsx        # Menú lateral con perfil y reglamento
│   ├── Layout.jsx         # Layout base con navbar
│   ├── PlayerLayout.jsx   # Layout del panel de jugador
│   └── ProtectedRoute.jsx # Middleware de rutas protegidas
├── contexts/
│   └── AuthContext.jsx    # Contexto global de autenticación y rol
└── lib/
    ├── supabase.js        # Cliente de Supabase
    └── api.js             # Funciones de acceso a datos
```

---

## 🔐 Autenticación y Roles

La app cuenta con **sesiones volátiles** (no persisten al cerrar el browser) gestionadas mediante **Supabase Auth**.

El sistema reconoce dos tipos de usuarios:

| Rol | Acceso | Redirige a |
|-----|--------|-----------|
| `player` | Panel del jugador `/dashboard` | Dashboard |
| `admin` | Panel de administración `/admin` | Admin |

Al ingresar a la raíz `/`, la app detecta automáticamente el rol del usuario autenticado y lo redirige al panel correspondiente.

---

## 🎮 Panel del Jugador — Dashboard

El dashboard se organiza en **cuatro pestañas**:

### 1. 🏉 Mi Equipo
El corazón de la aplicación. Permite a cada usuario armar su 15 ideal para la fecha activa.

- **Vista de los planteles oficiales**: consultá quiénes juegan en Primera, Intermedia y Pre-intermedia con una cancha visual interactiva.
- **Pizarra interactiva (Drag & Drop)**: arrastrá jugadores desde el panel de convocados hacia los 15 casilleros de la cancha.  
  También podés hacer **clic en un número** de la cancha para seleccionar el slot, y luego hacer clic en un jugador del pool para asignarlo.
- **Regla 5-5-5**: el equipo **debe tener exactamente 5 jugadores de cada categoría** (Primera, Intermedia, Pre-intermedia). La app valida esto en tiempo real y bloquea el guardado si no se cumple.
- **Posición fija**: cada jugador solo puede ser colocado en la posición en la que fue convocado oficialmente. Si intentás ponerlo en otra posición, la app te lo avisa.
- **Guardado**: una vez que el equipo es válido, el botón **"¡GUARDAR MI EQUIPO!"** persiste la selección en la base de datos.

### 2. 👥 Jugadores
Listado completo de los jugadores convocados para la fecha activa, filtrable por categoría (Primera, Intermedia, Pre) con buscador en tiempo real.

### 3. 🏆 Ranking
Tabla de posiciones general con todos los participantes del torneo y sus puntos acumulados hasta la fecha.

### 4. 📅 Fechas
Fixture completo del torneo con los próximos partidos y rivales programados.

---

## ⚙️ Panel de Administración — Admin

Accesible únicamente para usuarios con rol `admin`, el panel se divide en dos secciones:

### 🔨 Armado
Pizarra drag & drop oficial para que el **staff** publique los planteles de cada fecha:

- Selección de la fecha (o creación de una nueva).
- Drag & drop de jugadores a las posiciones de Primera, Intermedia y Pre-intermedia.
- Publicación del plantel oficial que los jugadores verán en su dashboard.

### 📊 Estadísticas
Panel de carga de resultados por fecha:

- Registro de tries, conversiones, penales, tarjetas amarillas y rojas por jugador.
- Cálculo automático de puntos basado en el sistema de puntuación.
- Visualización de la tabla de posiciones actualizada.

---

## 📐 Sistema de Puntuación

| Acción | Puntos |
|--------|--------|
| Presencia (jugar el partido) | **+2 pts** |
| Try | **+5 pts** |
| Conversión / Penal | **+3 pts** |
| Tarjeta Amarilla | **−3 pts** |
| Tarjeta Roja | **−7 pts** |

---

## 📏 Regla 5-5-5

La regla central de la modalidad Gran DT Universitario:

> Cada equipo debe estar compuesto exactamente por **5 jugadores de Primera**, **5 de Intermedia** y **5 de Pre-intermedia**, totalizando 15 jugadores.

La app valida esta regla en tiempo real: los contadores de cada categoría se muestran en pantalla y el botón de guardado permanece bloqueado hasta cumplirla.

---

## 🏃 Instalación y desarrollo local

### Pre-requisitos
- Node.js 18+
- Una cuenta y proyecto en [Supabase](https://supabase.com)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/granDT-UNI.git
cd granDT-UNI

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crear el archivo .env.local con las claves de Supabase:
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

### Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Construye la versión de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | Analiza el código con ESLint |

---

## 🌐 Deploy

La aplicación está configurada para desplegarse en **Vercel** mediante el archivo `vercel.json`, que redirige todas las rutas al `index.html` para el correcto funcionamiento del enrutado de React.

---

## 📸 Institucional

- **Instagram**: [@clubuniversitario.mdp](https://www.instagram.com/clubuniversitario.mdp/)
- **Club**: Club Universitario de Mar del Plata

---

*Desarrollado con ❤️ para la comunidad del Club Universitario MDP.*
