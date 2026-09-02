# un clu de bordado — app de reservas

App de reservas de clases de bordado para **@uncludebordado**.
Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + Edge Functions) + Resend.

- **Admin** (dueña): publica franjas horarias con cupo (máx. 6) y ve las inscriptas con datos de contacto.
- **Alumna**: se registra, ve un calendario mensual y reserva su lugar. Cancela hasta 48 h antes sin sanción.

---

## 1. Requisitos

- Node 20+
- Una cuenta de [Supabase](https://supabase.com) y otra de [Resend](https://resend.com)
- La CLI de Supabase (`npm i -g supabase`) para aplicar migraciones

## 2. Puesta en marcha local

```bash
npm install
cp .env.example .env.local   # completá los valores (ver sección 4)
npm run dev
```

## 3. Base de datos

Las migraciones están en `supabase/migrations/` y son idempotentes en orden:

| archivo | contenido |
|---|---|
| `…_schema.sql` | tablas `profiles`, `availability_slots`, `bookings`, `email_events`, `rate_limits` |
| `…_functions.sql` | `book_slot`, `cancel_booking`, `mark_no_show`, `reset_strikes`, `check_rate_limit`, trigger de alta de usuario y de emails |
| `…_rls.sql` | Row Level Security en **todas** las tablas |
| `…_admin.sql` | lecturas de administración (`admin_rosters_between`, `admin_list_students`) |

Aplicarlas al proyecto hosteado:

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

O pegá los archivos en orden en el **SQL Editor** del dashboard.

> La dueña queda como `admin` automáticamente cuando se registra con
> `uncludebordado@gmail.com` (lo resuelve el trigger `handle_new_user`).
> Para cambiar ese email, editá la constante en `…_functions.sql` y en
> `src/lib/constants.ts`.

## 4. Variables de entorno

### Vercel / local (`.env.local`)

| var | dónde | qué es |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente | anon key (pública, segura) |
| `NEXT_PUBLIC_SITE_URL` | cliente | `https://tu-dominio.vercel.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | service role. Sólo se usa en el rate limiter. Nunca `NEXT_PUBLIC_*`. |

### Edge Function (se cargan con `supabase secrets set`, NO en Vercel)

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxx \
  RESEND_FROM="un clu de bordado <reservas@tudominio.com>" \
  ADMIN_EMAIL=uncludebordado@gmail.com \
  EMAIL_WEBHOOK_SECRET=$(openssl rand -hex 24)
```

## 5. Autenticación

En **Supabase → Authentication → Providers**:

1. **Email**: activá "Enable Email provider". Para que la reserva sea sin fricción,
   desactivá "Confirm email" (si lo dejás activo, la app muestra "revisá tu correo"
   y el alta se completa al confirmar).
2. **Google**: creá credenciales OAuth en Google Cloud, cargá client id/secret y
   agregá como *Authorized redirect URL*:
   `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`
3. En **Authentication → URL Configuration** agregá a *Redirect URLs*:
   `http://localhost:3000/auth/callback` y `https://tu-dominio.vercel.app/auth/callback`

## 6. Emails transaccionales

1. Deploy de la función:
   ```bash
   supabase functions deploy send-booking-emails --no-verify-jwt
   ```
2. En **Database → Webhooks → Create a new hook**:
   - Tabla: `public.email_events` — evento: **Insert**
   - Tipo: **Supabase Edge Functions** → `send-booking-emails`
   - HTTP Header: `x-webhook-secret: <EMAIL_WEBHOOK_SECRET>`
3. Cada reserva/cancelación encola una fila en `email_events`; la función manda
   un mail a la alumna y otro a la admin (a `ADMIN_EMAIL`). Errores quedan en
   `email_events.error`.

Verificá el dominio en Resend para poder enviar desde `@tudominio.com`
(mientras tanto sirve `onboarding@resend.dev`).

## 7. Deploy en Vercel

1. Importá el repo `uncludebordado-dev/app_calendar`.
2. Cargá las 4 variables de la sección 4 (Production + Preview).
3. Framework preset: **Next.js**. Sin overrides.

## 8. Reglas de negocio

- Cupo máximo por franja: **6** (`MAX_CAPACITY`).
- Reserva atómica: `book_slot()` hace `UPDATE … WHERE booked_count < capacity`;
  si dos personas toman el último lugar a la vez, una recibe `slot_full`.
- Cancelación:
  - **+48 h** → libera el cupo, sin penalidad.
  - **−48 h** o inasistencia → libera/registra el cupo y suma **1 sanción**.
  - **3 sanciones** → bloqueo automático de nuevas reservas. La admin puede
    perdonarlas desde `/admin/alumnas`.

## 9. Seguridad

- RLS activo en todas las tablas. Una alumna sólo lee su perfil y sus reservas.
- `bookings` no acepta INSERT/UPDATE directos: todo pasa por funciones
  `SECURITY DEFINER` con validación server-side.
- Datos de contacto de terceras personas: sólo vía funciones que chequean
  `is_admin()`. No se listan en ninguna vista pública.
- Sin secretos en el cliente: `service_role` y `RESEND_API_KEY` viven en el
  servidor / en la Edge Function.
- Rate limiting por IP (registro) y por usuaria (reservas) en Postgres.
- Validación con `zod` en cliente (feedback) y servidor (fuente de verdad).

## 10. Estructura

```
src/
  app/
    (auth)/         login, registro, completar-perfil + server actions
    (app)/          calendario, mis-reservas  (require sesión + perfil completo)
    admin/          panel protegido (require rol admin, chequeado en middleware + layout)
    auth/           callback y signout (route handlers)
  components/       ui/ · auth/ · calendar/ · bookings/ · admin/ · layout/
  lib/             supabase/ · validation/ · phone · date · policy · rate-limit
  types/           database.types.ts
supabase/
  migrations/       esquema + RLS + funciones
  functions/        send-booking-emails (Deno / Resend)
```
