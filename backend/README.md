# Backend - GigaChat

Documentacion inicial del backend enfocada en lo que hoy esta funcional:

- Registro de usuarios
- Login de usuarios con JWT en cookie HttpOnly
- Middleware de autenticacion por cookie (`requireAuth`)
- Endpoint de sesion actual (`GET /me`)
- Logout real (limpia cookie)
- Base de datos PostgreSQL en Docker
- Scripts relacionados a base de datos y ejecucion en desarrollo

## 1) Requisitos

- Node.js 20+
- npm 10+
- Docker + Docker Compose

## 2) Configuracion de entorno

1. Desde la carpeta `backend`, copia el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Ajusta las variables en `backend/.env`:
   - `API_PORT`: puerto del backend (default `3000`)
   - `NODE_ENV`: entorno (`development` o `production`)
   - `FRONTEND_ORIGIN`: origen del frontend permitido por CORS (ej: `http://localhost:5173`)
   - `DB_HOST`: host de postgres (en local, normalmente `localhost`)
   - `DB_PORT`: puerto expuesto por postgres (default `5432`)
   - `DB_NAME`: nombre de la base de datos
   - `DB_USER`: usuario de la base de datos
   - `DB_PASSWORD`: password de la base de datos
   - `JWT_SECRET`: secreto para firmar y verificar JWT

## 3) Levantar la base de datos con Docker

Desde `backend/`:

```bash
npm run db:up
```

Este script ejecuta `docker compose` con `backend/docker-compose.yml` y usa las variables de `backend/.env`.

Detalles importantes del servicio `db`:

- Imagen: `postgres:16-alpine`
- Puerto: `${DB_PORT}:5432`
- Volumen persistente: `../volumes/postgres/data`
- Healthcheck con `pg_isready`
- Monta `backend/db/migrations` en `/docker-entrypoint-initdb.d`

Para apagar la base:

```bash
npm run db:down
```

## 4) Migraciones de base de datos

Las migraciones se administran con un runner propio: `backend/scripts/run-migrations.js`.

Comportamiento:

- Crea la tabla `schema_migrations` si no existe
- Lee los archivos `.sql` de `backend/db/migrations`
- Aplica solo migraciones no ejecutadas (por version)
- Ejecuta cada migracion en transaccion (`BEGIN/COMMIT/ROLLBACK`)

Ejecutar migraciones manualmente:

```bash
npm run migrate
```

Migraciones actuales:

- `03232026_2159_init.sql`: crea `roles`, `users`, indices y trigger `updated_at`
- `03242026_1353_add_username_to_users.sql`: agrega `username` obligatorio, indice unico case-insensitive y constraint de formato

## 5) Levantar backend en desarrollo

Desde `backend/`:

```bash
npm run dev
```

Este script hace:

1. `npm run migrate`
2. inicia servidor con `nodemon src/index.js`

En produccion local/simple:

```bash
npm run start
```

Tambien ejecuta migraciones antes de iniciar (`node src/index.js`).

## 6) Endpoints funcionales actuales

Las rutas se registran en `backend/src/auth/routes.js`.

### `POST /register`

Valida payload con Zod (`registerSchema`) y crea usuario en `users`.

Body esperado:

```json
{
  "name": "Nombre Apellido",
  "username": "usuario_123",
  "email": "correo@dominio.com",
  "password": "password_segura"
}
```

Respuesta exitosa (`201`):

```json
{
  "id": "uuid",
  "name": "Nombre Apellido",
  "username": "usuario_123",
  "email": "correo@dominio.com",
  "created_at": "2026-03-24T00:00:00.000Z"
}
```

Errores comunes:

- `400` si falla validacion
- `400` si email o username ya existen

### `POST /login`

Valida payload con Zod (`loginSchema`), busca usuario por email, compara hash con `bcrypt` y setea cookie `access_token` (HttpOnly).

Body esperado:

```json
{
  "email": "correo@dominio.com",
  "password": "password_segura"
}
```

Respuesta exitosa (`200`):

```json
{
  "user": {
    "id": "uuid",
    "username": "usuario_123",
    "email": "correo@dominio.com"
  }
}
```

Ademas, el backend envia `Set-Cookie` con `access_token`.

Error comun:

- `401` con `Invalid credentials` si email no existe o password es incorrecta

### `POST /logout`

Limpia la cookie `access_token` y cierra la sesion del lado cliente.

Respuesta exitosa (`200`):

```json
{
  "message": "Logout successful"
}
```

### `GET /me`

Ruta protegida por middleware `requireAuth`. Lee la cookie `access_token`, verifica JWT y devuelve el usuario autenticado.

Respuesta exitosa (`200`):

```json
{
  "user": {
    "id": "uuid",
    "username": "usuario_123",
    "email": "correo@dominio.com"
  }
}
```

Errores comunes:

- `401` si no hay cookie o el token es invalido/expirado

## 7) Scripts utiles (backend)

En `backend/package.json`:

- `db:up`: levanta postgres en Docker
- `db:down`: detiene postgres
- `migrate`: ejecuta migraciones pendientes
- `dev`: migra y levanta backend con recarga (`nodemon`)
- `start`: migra y levanta backend sin recarga
- `lint`: revisa codigo con ESLint

## 8) Flujo recomendado en entorno de desarrollo

Paso a paso:

1. Configurar `backend/.env`
2. Ejecutar `npm run db:up`
3. Ejecutar `npm run dev`
4. Probar `POST /register`
5. Probar `POST /login`
6. Probar `GET /me` con la cookie devuelta por login
7. Probar `POST /logout`

## 9) Ejemplos rapidos con cURL

Registro:

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","username":"ana_01","email":"ana@mail.com","password":"12345678"}'
```

Login:

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"ana@mail.com","password":"12345678"}'
```

Sesion actual (`/me`) usando cookie guardada:

```bash
curl -X GET http://localhost:3000/me \
  -b cookies.txt
```

Logout usando cookie guardada:

```bash
curl -X POST http://localhost:3000/logout \
  -b cookies.txt
```

## 10) Estado actual y alcance

- `register`, `login`, `logout` y `me` estan operativos con persistencia en PostgreSQL.
- La autenticacion web actual usa JWT en cookie HttpOnly.
- Para frontend en otro origen, CORS esta habilitado con credenciales mediante `FRONTEND_ORIGIN`.
