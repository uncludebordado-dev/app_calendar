# Puesta en marcha — sin terminal, sólo clicks

El código ya está listo. Faltan **3 cuentas** y pegar unos valores. ~25 minutos.
Seguí los pasos en orden. Cuando termines un bloque, avisame y sigo yo con lo que puedo hacer.

---

## Parte A — Supabase (base de datos + login de usuarias)

### A1. Crear el proyecto
1. Entrá a https://supabase.com y creá una cuenta (con Google sirve).
2. **New project**. Nombre: `clu-de-bordado`. Región: **South America (São Paulo)**.
3. Poné una **Database Password** y guardala en algún lado.
4. Esperá ~2 min a que diga "Project is ready".

### A2. Crear las tablas
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abrí el archivo [`supabase/ALL_MIGRATIONS.sql`](supabase/ALL_MIGRATIONS.sql) del repo, **copiá TODO** el contenido.
3. Pegalo en el editor y apretá **Run** (abajo a la derecha).
4. Tiene que decir *"Success. No rows returned"*. Si hay error, mandámelo.

### A3. Activar el login por email
1. Menú izquierdo → **Authentication** → **Sign In / Providers**.
2. **Email**: que esté activado. Entrá y **desactivá "Confirm email"** (así las alumnas entran directo). Guardá.

### A4. Copiar las 3 llaves (las vas a pegar en Vercel)
1. Menú izquierdo → **Project Settings** (el engranaje) → **API**.
2. Anotá estos 3 valores:
   - **Project URL** → `https://xxxxx.supabase.co`
   - **API keys → `anon` `public`** → una cadena larga
   - **API keys → `service_role` `secret`** → otra cadena larga (¡es secreta!)

> Pegámelos en el chat y yo preparo el resto. La `service_role` es sensible pero
> sólo se usa del lado del servidor de Vercel; si preferís, la cargás vos en el paso B3.

---

## Parte B — Vercel (publicar la web)

### B1. Importar el repo
1. Entrá a https://vercel.com con la cuenta del proyecto `clu-de-bordado`.
2. **Add New… → Project** → **Import** el repo `uncludebordado-dev/app_calendar`.
3. Framework: detecta **Next.js** solo. No toques nada más todavía.

### B2. Cargar las variables de entorno
En la pantalla de import, sección **Environment Variables**, agregá estas 4
(Name / Value), una por una:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | el *Project URL* del paso A4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la llave *anon* del paso A4 |
| `NEXT_PUBLIC_SITE_URL` | `https://TU-PROYECTO.vercel.app` (lo sabés recién al deployar; podés poner algo y corregirlo después) |
| `SUPABASE_SERVICE_ROLE_KEY` | la llave *service_role* del paso A4 |

### B3. Deploy
1. **Deploy**. Espera ~2 min.
2. Cuando termine te da una URL tipo `https://app-calendar-xxxx.vercel.app`. Abrila.
3. Si `NEXT_PUBLIC_SITE_URL` quedó mal: **Settings → Environment Variables**, editala
   con la URL real, y **Deployments → … → Redeploy**.

### B4. Avisarle a Supabase cuál es la URL
1. Volvé a Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**: tu URL de Vercel.
3. **Redirect URLs** → Add: `https://TU-URL.vercel.app/auth/callback`
4. (para probar local también) Add: `http://localhost:3000/auth/callback`

**Con esto la app ya funciona**: registro con email, calendario, reservas, panel admin.
La dueña queda como admin automáticamente al registrarse con `uncludebordado@gmail.com`.

---

## Parte C — (después) Google y emails

No son necesarios para arrancar. Cuando quieras:

### C1. Login con Google
1. https://console.cloud.google.com → nuevo proyecto → **APIs y servicios → Pantalla de consentimiento OAuth** (External, completá lo mínimo).
2. **Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web**.
   - *URI de redireccionamiento autorizados*: `https://xxxxx.supabase.co/auth/v1/callback` (tu Project URL + `/auth/v1/callback`)
3. Copiá **Client ID** y **Client Secret**.
4. Supabase → **Authentication → Sign In / Providers → Google** → activá y pegá esos dos valores. Guardá.

### C2. Emails de confirmación (Resend)
1. https://resend.com → cuenta → **API Keys → Create** → copiá la key (`re_...`).
2. (opcional) **Domains** → agregá tu dominio y seguí los pasos DNS para enviar desde `@tudominio.com`. Sin esto, se envía desde `onboarding@resend.dev`.
3. Esto necesita un par de comandos (deploy de la función + webhook). Decime y te
   paso el detalle o lo hacemos juntos por acá.

---

## ¿Preferís no tocar nada de esto?

Si podés hacer **una sola cosa** en una terminal — copiar y pegar un comando de
login — yo hago A2, la generación de tipos y toda la Parte C por vos. Avisame y te
paso ese único comando.
