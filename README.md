# EcoHome Store

Aplicación multiplataforma con **un único backend** (Node.js + Express + PostgreSQL + JWT + Socket.IO) que atiende
a un cliente **Web (React)** y a un cliente **Móvil (Flutter)**. Ambos usan los mismos endpoints REST, el mismo
servidor de chat y el mismo token JWT, sin duplicar lógica.

```
├── backend/          API REST + chat Socket.IO (Express, pg, bcryptjs, jsonwebtoken)
├── web-react/        Cliente web (React 19 + Vite + socket.io-client)
├── mobile-flutter/   Cliente móvil (Flutter + http + socket_io_client)
├── db/               init.sql (tablas + datos semilla) y migraciones SQL
└── unidad_0X/        Actividades anteriores del curso (historial; no forman parte de la app)
```

## Funcionalidades

| | Backend | Web (React) | Móvil (Flutter) |
|---|---|---|---|
| Login / registro con JWT | `POST /auth/login`, `POST /auth/signup` | ✔ | ✔ |
| Catálogo con creador (`creator.username`) | `GET /products` | ✔ tabla, búsqueda, filtros, orden | ✔ tabla |
| CRUD de productos (rol `admin`) | `POST/PUT/DELETE /products` | ✔ crear, editar y eliminar | ✔ crear |
| Indicador `Nombre (N)` | `GET /users/me/stats`, `GET /users/me` | ✔ cabecera | ✔ barra de título |
| Chat en tiempo real (últimos 10 mensajes al entrar) | Socket.IO | ✔ panel lateral | ✔ pantalla |

**Seguridad:** contraseñas con bcrypt (costo 10), todas las rutas REST de catálogo y usuario protegidas con
middleware JWT, y el handshake de Socket.IO valida el mismo JWT. El creador de un producto y el autor de un
mensaje **siempre salen del token**, nunca del cuerpo de la petición. El registro público crea únicamente
usuarios con rol `cliente`: las cuentas `admin` se crean en la base de datos.

## Requisitos

- Node.js 18 o superior
- PostgreSQL 13 o superior
- Flutter con Dart 3.5+ (solo para la app móvil)

## 1. Base de datos

Crea la base y aplica el esquema con datos semilla (`db/init.sql`, idempotente: se puede repetir sin perder datos).

**Sin `psql` instalado** (lo hace el backend; crea la base si no existe):

```bash
cd backend
cp .env.example .env      # completa las credenciales de PostgreSQL
npm install
npm run db:init
```

**Con `psql`:**

```bash
createdb -U postgres ecohome_store
psql -U postgres -d ecohome_store -f db/init.sql
```

El backend también crea las tablas que falten al arrancar; `init.sql` es la forma de cargar el seed y de preparar la
base a mano. Si vienes de una versión anterior, `init.sql` migra `messages` (`text`/`username` → `content`) y añade
`products.created_by` sin perder datos (ver `db/migrations/`).

### Esquema

| Tabla | Columnas |
|---|---|
| `users` | `id`, `username` (único), `email` (único), `password_hash`, `role` (`admin`/`cliente`), `created_at` |
| `products` | `id`, `name`, `price`, `created_by` → `users.id`, `created_at`, `updated_at` |
| `messages` | `id`, `user_id` → `users.id`, `content`, `created_at` |

`email` y `role` amplían el modelo mínimo (`id, username, password_hash, created_at`): el login es por correo y solo
el rol `admin` escribe en el catálogo.

## 2. Backend

```bash
cd backend
npm install
npm start          # o: npm run dev (nodemon)
```

Escucha en `http://localhost:4500` (REST y Socket.IO comparten puerto).

### Variables de entorno (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` / `DB_PASS` | Credenciales | `postgres` / `postgres` |
| `DB_NAME` | Base de datos | `ecohome_store` |
| `PORT` | Puerto del servidor | `4500` |
| `JWT_SECRET` | Secreto para firmar los JWT (obligatorio; usa un valor largo y aleatorio) | — |

## 3. Web (React)

```bash
cd web-react
npm install
npm run dev        # http://localhost:5173
```

Por defecto apunta a `http://localhost:4500`. Para otro backend, define `VITE_API_URL` (por ejemplo en
`web-react/.env.local`: `VITE_API_URL=https://mi-api.onrender.com`). Los accesos rápidos con las cuentas de prueba
del login solo aparecen en desarrollo (o con `VITE_SHOW_DEMO=true`).

Otros comandos: `npm run build` (producción, carpeta `dist/`) y `npm run lint`.

## 4. Móvil (Flutter)

```powershell
cd mobile-flutter
powershell -ExecutionPolicy Bypass -File .\setup.ps1   # solo la primera vez: genera android/ios y permite HTTP local
flutter run
```

`localhost` no funciona en un emulador ni en un teléfono, por eso el host se inyecta al compilar:

| Escenario | Comando |
|---|---|
| Emulador Android (por defecto, `10.0.2.2`) | `flutter run` |
| Teléfono físico en la misma Wi-Fi | `flutter run --dart-define=API_HOST=192.168.1.34` |
| Backend desplegado | `flutter run --dart-define=API_URL=https://mi-api.onrender.com` |

## Credenciales de prueba

Creadas por `db/init.sql`. El login acepta correo **o** nombre de usuario.

| Rol | Usuario | Correo | Contraseña | Puede |
|---|---|---|---|---|
| `admin` | `admin` | `admin@ecohome.com` | `Admin123!` | Ver, crear, editar y eliminar productos; chat |
| `cliente` | `cliente` | `cliente@ecohome.com` | `Cliente123!` | Ver el catálogo; chat |

## API REST

Formato de errores: `{ "error": "mensaje" }` o, en validaciones, `{ "errors": ["..."] }`.
Las rutas protegidas exigen `Authorization: Bearer <token>`: sin token → `401`; token inválido o vencido → `403`.

| Método y ruta | Auth | Cuerpo / respuesta |
|---|---|---|
| `POST /auth/signup` | — | `{ username, email, password }` → `201` con el usuario (rol `cliente`). `409` si ya existe |
| `POST /auth/login` | — | `{ email \| username, password }` → `{ token }` (JWT de 1 h con `{ id, username, role }`) |
| `GET /products` | JWT | `[ { id, name, price, created_by, created_at, updated_at, creator: { id, username } \| null } ]` |
| `GET /products/:id` | JWT | Un producto (misma forma) o `404` |
| `POST /products` | JWT + `admin` | `{ name, price }` → `201`. `created_by` = usuario del token (se ignora si viene en el cuerpo) |
| `PUT /products/:id` | JWT + `admin` | `{ name, price }` → producto actualizado (el creador no cambia) |
| `DELETE /products/:id` | JWT + `admin` | `{ message, product }` |
| `GET /users/me` | JWT | `{ id, username, email, role, created_at, productCount }` |
| `GET /users/me/stats` | JWT | `{ username, count }` (productos creados por el usuario autenticado) |

Reglas de producto: `name` no vacío y `price` numérico mayor a 0 (`400` en caso contrario). Un `id` no numérico devuelve `400`.

## Chat (Socket.IO)

Conexión al mismo puerto del backend, con el JWT en el handshake: `io(API_URL, { auth: { token } })`.
Sin token o con token inválido, el servidor rechaza la conexión (`connect_error`).

| Evento | Dirección | Payload |
|---|---|---|
| `messages` | servidor → cliente (solo al que se conecta) | Los últimos 10 mensajes, en orden cronológico |
| `new-message` | cliente → servidor | `{ content }` (máx. 500 caracteres) |
| `new-message` | servidor → todos los clientes | `{ id, user_id, username, content, created_at }` |
| `message-error` | servidor → cliente | `{ error }` si el mensaje no se pudo guardar o es demasiado largo |

Cada mensaje se guarda en `messages` antes de reenviarse; `user_id` y `username` salen del JWT del socket.

## Notas de diseño

- **Un solo backend:** el chat y el catálogo comparten servidor, base de datos, tabla `users` y JWT.
- **Solo `admin` escribe en el catálogo** (`403` para `cliente`). Por eso el contador `Nombre (N)` de un `cliente` es `0`.
- **Sesión:** web y móvil guardan el JWT en el dispositivo (`localStorage` / `shared_preferences`) y cierran la
  sesión al vencer el token.
