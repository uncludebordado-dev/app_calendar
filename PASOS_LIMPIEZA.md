# Pasos de limpieza — hacer en este orden

Esto es lo que quedó pendiente de tu lado después de la limpieza del
repositorio. Son 3 pasos, todos cortos.

---

## 1. Borrar la función de WhatsApp en Supabase (si está desplegada)

El código de `send-kit-whatsapp` ya se borró del repositorio, pero si
llegaste a desplegarla en algún momento, sigue viva en Supabase hasta que
la borres ahí también.

1. Entrá a [supabase.com](https://supabase.com) → tu proyecto.
2. En el menú de la izquierda, **Edge Functions**.
3. Si ves `send-kit-whatsapp` en la lista: hacé clic en ella → botón
   **Delete function** (o los tres puntos `⋮` → **Delete**) → confirmá.
4. Si no aparece en la lista, no hay nada que hacer acá.

**Opcional, para dejarlo bien limpio:** en la misma sección de Edge
Functions, entrá a **Manage secrets** (o a cualquier función → **Secrets**)
y, si ves alguno de estos, borralo — ya no los usa nada:
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`,
`ADMIN_WHATSAPP_TO`, `KIT_WHATSAPP_SECRET`.

## 2. (Opcional) Cargar el SQL actualizado

Si en algún momento necesitás levantar una base nueva desde cero, usá
`supabase/ALL_MIGRATIONS.sql` — ya está al día con todas las migraciones.
Para una base que ya está funcionando (como la de producción, hoy) **no
hace falta correr nada**: todo lo que contiene ya se aplicó, migración por
migración, durante el trabajo de estas semanas.

## 3. Hacer privado el repositorio `app_calendar`

GitHub no deja poner el perfil entero en privado, pero sí cada repositorio.
Hacé esto último, después de confirmar que el resto quedó bien:

1. Entrá a [github.com/uncludebordado-dev/app_calendar](https://github.com/uncludebordado-dev/app_calendar).
2. Pestaña **Settings** (arriba, junto a Code/Issues/Pull requests).
3. Bajá hasta el final, a la zona roja **Danger Zone**.
4. Hacé clic en **Change visibility** → **Change to private**.
5. Te va a pedir escribir el nombre del repositorio (`app_calendar`) para
   confirmar. Escribilo y confirmá.

## 4. Confirmar que el sitio sigue funcionando

Este paso es automático, solo hay que mirarlo:

1. Entrá a [vercel.com](https://vercel.com) → tu proyecto → pestaña
   **Deployments**.
2. Buscá el despliegue más reciente (el de arriba de todo). Tiene que
   tener un tilde verde y decir **Ready**.
3. Si dice **Error** o queda gris mucho rato, avisame y lo reviso.

Con eso, listo.
