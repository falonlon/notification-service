# Deploy Render

Servicio: Grupo 9 - Notificaciones

URL publica:

`https://notification-service-i3bn.onrender.com/`

## Configuracion

- Plataforma: Render
- Runtime: Node.js 20
- Framework HTTP: Express 4.18.2
- Lenguaje: JavaScript
- Repo: `https://github.com/bntkpp/fishmarket`
- Branch: `feature/g9-notificaciones`
- Root Directory: `services/notificaciones/notification-service`
- Build command: `npm install`
- Start command: `npm start`

## Variables

Variables configuradas directamente en Render:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

`SUPABASE_URL` debe ser la URL base del proyecto Supabase, por ejemplo `https://<project-ref>.supabase.co`, sin `/rest/v1/`.

El backend debe usar `SUPABASE_SERVICE_KEY` para persistir en `notifications`, `processed_events` y `push_subscriptions`. `SUPABASE_ANON_KEY` queda como respaldo local si no se configura service key.

El archivo `.env` real no se versiona. Para desarrollo local se usa `.env.example` como plantilla.

## Alcance actual

El deploy debe ejecutarse desde el monorepo `fishmarket` usando el root directory del servicio G9. El servicio Node.js persiste datos en Supabase. Web Push real, DLQ real y workers reales siguen fuera de alcance.
