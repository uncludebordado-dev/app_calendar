# un clu de bordado — app de reservas

App de reservas de clases de bordado para **@uncludebordado** (Barcelona).
Next.js 15 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth +
Storage + Edge Functions) + Resend + Web Push. Progressive Web App (PWA):
se instala en el celular sin pasar por App Store ni Google Play.

- **Admin** (la profesora): agenda clases, marca asistencia y cobro, gestiona
  alumnas (exenciones de pago, sanciones), edita el catálogo de kits, publica
  noticias, revisa reportes de ingresos y exporta planillas.
- **Alumna**: se registra, reserva su lugar en un calendario mensual (cupo
  máx. 6 por clase), pide kits de bordado, recibe noticias con push, y puede
  usar la app en español o catalán.

---

## 1. Requisitos

- Node 20+
- Una cuenta de [Supabase](https://supabase.com) y otra de [Resend](https://resend.com)
- La CLI de Supabase (`npm i -g supabase`), opcional — también se puede
  trabajar pegando el SQL directo en el **SQL Editor** del dashboard

## 2. Puesta en marcha local

```bash
npm install
cp .env.example .env.local   # completá los valores (ver sección 4)
npm run dev
```

```bash
npm run typecheck   # tsc --noEmit
npm run build        # build de producción (Next.js)
npm run lint          # eslint
```

## 3. Base de datos

Las migraciones viven en `supabase/migrations/`, numeradas por fecha y
pensadas para aplicarse **en orden**; cada una usa `create or replace` /
`if not exists`, así que son re-ejecutables sin romper nada.

`supabase/ALL_MIGRATIONS.sql` es la concatenación de todas, en orden, útil
para levantar una base nueva de una sola vez (pegándolo en el SQL Editor) o
como referencia rápida de "qué existe hoy". Se regenera a mano cada vez que
se agrega una migración — si alguna vez lo ves desactualizado respecto a
`supabase/migrations/`, esa carpeta es la que manda.

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

> La dueña queda como `admin` automáticamente al registrarse con
> `uncludebordado@gmail.com` (lo resuelve un trigger de alta de usuario).
> Para cambiar ese email hay que editarlo en la migración correspondiente
> y en `src/lib/constants.ts` (`ADMIN_EMAIL`).

Algunos archivos sueltos en `supabase/` (`CONECTAR_EMAILS.sql`,
`CONECTAR_PUSH.sql`) son guías paso a paso para conectar una integración
puntual (mail, push) con su secreto — se corren una sola vez, después de
desplegar la Edge Function correspondiente. Nunca llevan el secreto real
adentro cuando están en el repo: siempre un placeholder.

## 4. Variables de entorno

### Vercel / local (`.env.local`)

| var | dónde | qué es |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente | clave pública (anon/publishable) |
| `NEXT_PUBLIC_SITE_URL` | cliente | `https://tu-dominio.vercel.app` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | cliente | clave pública VAPID para push (no es secreta) |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | cliente | `"false"` para ocultar el botón de Google; cualquier otro valor lo muestra |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | service role. Rate limiting y alguna operación administrativa puntual. Marcar como **Sensitive** en Vercel |
| `CRON_SECRET` | **solo servidor** | protege los cron jobs (`/api/cron/*`). Marcar como **Sensitive** en Vercel |

### Edge Functions (se cargan con `supabase secrets set` o desde el dashboard
→ Edge Functions → *nombre* → Secrets — **nunca en Vercel ni en el repo**)

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxx \
  RESEND_FROM="un clu de bordado <onboarding@resend.dev>" \
  ADMIN_EMAIL=uncludebordado@gmail.com \
  EMAIL_WEBHOOK_SECRET=$(openssl rand -hex 24) \
  PUSH_WEBHOOK_SECRET=$(openssl rand -hex 24) \
  VAPID_PUBLIC_KEY=... \
  VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT="mailto:uncludebordado@gmail.com" \
  SITE_URL=https://tu-dominio.vercel.app
```

> Los secretos de Edge Functions son **por proyecto**, no por función — los
> ven todas las funciones desplegadas. Cambiar un secreto no alcanza: hay
> que **redesplegar** la función para que lo tome.

## 5. Autenticación

En **Supabase → Authentication → Providers**:

1. **Email**: activá "Enable Email provider". Para que el alta sea sin
   fricción, desactivá "Confirm email" (si lo dejás activo, la app pide
   "revisá tu correo" y el alta se completa al confirmar el link).
2. **Google** (opcional): creá credenciales OAuth en Google Cloud, cargá
   client id/secret y agregá como *Authorized redirect URL*:
   `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`
3. En **Authentication → URL Configuration** agregá a *Redirect URLs*:
   `http://localhost:3000/auth/callback` y `https://tu-dominio.vercel.app/auth/callback`

## 6. Emails, push y otras integraciones

| integración | para qué sirve |
|---|---|
| **Supabase** | base de datos, autenticación, Storage (fotos de perfil) y Edge Functions |
| **Vercel** | hosting del frontend + Cron Jobs (`vercel.json`: aviso mensual de cumpleaños y reporte mensual) |
| **Resend** | mails transaccionales (reservas, cancelaciones, kits, reportes). Sin dominio propio verificado en Resend, sólo entrega de forma confiable a la casilla del admin — el resto puede caer en spam |
| **Web Push (VAPID)** | notificaciones push del navegador para las noticias del club, sin depender del mail |
| **Google OAuth** | login alternativo, opcional — se apaga con `NEXT_PUBLIC_GOOGLE_ENABLED=false` |

Cada reserva/cancelación/pedido de kit/alta de alumna encola una fila en
`email_events`; la Edge Function `send-booking-emails` la procesa y manda
el mail correspondiente. Errores quedan registrados en `email_events.error`.

```bash
supabase functions deploy send-booking-emails
supabase functions deploy send-news-push
```

## 7. Deploy en Vercel

1. Importá el repo.
2. Cargá las variables de la sección 4 (Production + Preview) — marcá
   `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` como **Sensitive**; las
   `NEXT_PUBLIC_*` como **Config/Plaintext** (igual terminan en el bundle
   público, así que ocultarlas no suma nada).
3. Framework preset: **Next.js**. Sin overrides.
4. Verificá en **Deployments** que el build quede en verde.

## 8. Reglas de negocio

- Cupo máximo por franja: **6** (`MAX_CAPACITY`).
- Reserva atómica: `book_slot()` hace `UPDATE … WHERE booked_count < capacity`;
  si dos personas toman el último lugar a la vez, una recibe `slot_full`.
- **Cancelación**: con **24 horas o más** de anticipación, libera el cupo sin
  cobro. Con **menos de 24 horas**, libera el cupo pero la clase se cobra
  igual (10 €) — sin sanción.
- **Sanciones (strikes)**: sólo las carga la admin manualmente, por
  inasistencia (no presentarse a una clase reservada). **3 sanciones**
  bloquean nuevas reservas; la admin puede perdonarlas desde
  `/admin/alumnas`.
- **Alumnas exentas de pago**: su asistencia se marca igual, pero nunca
  generan un cobro real ni entran en los totales de dinero recaudado.

## 9. Seguridad

- **RLS activo en el 100 % de las tablas** (13/13). Verificado en vivo:
  con la clave pública y sin sesión, cualquier lectura a perfiles, reservas,
  pagos o pedidos de kit devuelve vacío.
- Cada acción de administrador se valida en **tres capas** independientes:
  middleware (redirige si no es admin), servidor (cada server action vuelve
  a chequear) y base de datos (las funciones `SECURITY DEFINER` llaman a
  `is_admin()`). Si una falla, las otras dos igual bloquean el acceso.
- `bookings` no acepta INSERT/UPDATE directos: todo pasa por funciones
  `SECURITY DEFINER` (`book_slot`, `cancel_booking`, etc.) con validación
  server-side.
- **Rate limiting** en Postgres para login, registro, reservar, cancelar y
  pedir un kit (por IP o por usuaria según el caso).
- **Sin secretos en el cliente ni en git**: `service_role`, claves de Resend,
  VAPID y los webhooks viven en variables de entorno del servidor o en
  `private.app_secrets` (tabla sin permisos para `anon`/`authenticated`,
  sólo la leen funciones `SECURITY DEFINER`).
- **Cabeceras HTTP de seguridad** (`next.config.mjs`): `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Cron jobs y webhooks entre Postgres y las Edge Functions exigen un
  secreto compartido (`CRON_SECRET`, `EMAIL_WEBHOOK_SECRET`,
  `PUSH_WEBHOOK_SECRET`); sin él, el pedido se rechaza.
- Validación con `zod` en cliente (feedback inmediato) y en servidor
  (fuente de verdad); límites de longitud/cantidad en formularios y pedidos.

## 10. Calidad

- `npm run typecheck` (TypeScript estricto) y `npm run build` deben quedar
  limpios antes de cada cambio que se suba.
- Sin suite de tests automatizados todavía: la verificación de flujos
  (reservas, cancelaciones, pagos, mails) se hace con datos de prueba
  desechables contra el proyecto de Supabase, creados y borrados en la
  misma sesión de trabajo.
- Cambios de UI se prueban en el navegador a tamaño de celular antes de
  darlos por hechos.

## 11. Estructura

```
src/
  app/
    (auth)/         login, registro, completar-perfil + server actions
    (app)/          calendario, mis-reservas, news, reserva-kit, mi-perfil
                     (requieren sesión + perfil completo)
    admin/           panel protegido (requiere rol admin: middleware + layout)
    api/cron/        birthdays y monthly-report (Vercel Cron, protegidos por CRON_SECRET)
    auth/            callback y signout (route handlers)
  components/        ui/ · auth/ · calendar/ · bookings/ · kits/ · news/
                      profile/ · security/ · pwa/ · i18n/ · admin/ · layout/
  lib/                supabase/ · validation/ · i18n/ · phone · date · calendar
                      · holidays · policy · rate-limit · kits · pin
  types/              database.types.ts
supabase/
  migrations/         esquema + RLS + funciones, en orden
  functions/          send-booking-emails, send-news-push (Deno / Resend / Web Push)
```

## 12. Idioma

La parte de alumnas (portada, acceso/registro, calendario, reservas, kits,
noticias, perfil) tiene selector **ES / CAT**, guardado en una cookie. Las
traducciones al catalán están en `src/lib/i18n/ca.ts`; si falta una clave,
se muestra el español — nunca rompe la pantalla. El panel de admin y todos
los mails quedan siempre en español.

---

**Desarrollo y QA:** Claude Code (Anthropic), en colaboración directa con
la dueña de @uncludebordado.
