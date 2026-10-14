# 6 · Implementation Plan

**Producto:** un clu de bordado — app de reservas
**Estado:** el producto base está en producción. Este documento recoge **lo que se construyó, en qué orden**, y **el plan de lo que sigue**.

---

## 1. Historia de construcción (lo ya entregado)

| Fase | Fechas | Entregables |
|---|---|---|
| **0 · Base** | 2 sep 2026 | Esquema inicial (perfiles, clases, reservas, cola de mails), funciones `book_slot` / `cancel_booking`, RLS, panel admin mínimo, login y registro |
| **1 · Panel y métricas** | 3 sep | Dashboard, pagos manuales, cumpleaños, zona horaria Madrid, mejoras de UX, avisos por mail |
| **2 · Operación diaria** | 6 sep | News con reacciones, "puntito" de asistencia y cobro, temporada desde sept 2026, medios de pago, fotos de perfil, total recaudado |
| **3 · Seguridad** | 14 sep | Endurecimiento: secretos en tabla privada, webhooks con secreto, rotación de claves, parche de Next.js, límites de intentos |
| **4 · Reglas de negocio** | 16–18 sep | Cobro de baja tardía, alumnas exentas, kits editables con precio y foto, notificaciones push, reporte mensual |
| **5 · Pulido y datos** | 19–22 sep | Regla única de 24 h (sin sanción por cancelar), exentas solo asistencia, cumpleaños de la admin en calendario, feriados de Catalunya |
| **6 · Comunicación y alcance** | 23 sep – 14 oct | Preguntas frecuentes con mapa, catalán (ES/CAT), portada sin scroll, eliminación de clases por pulsación larga, pantalla de pedidos de kit, tipografía para móviles |
| **7 · Orden del repositorio** | 28 sep | Limpieza de archivos obsoletos, README y migraciones consolidadas |

## 2. Estado actual

| Área | Estado |
|---|---|
| Reservas y cancelaciones | Completo |
| Cobros y asistencia | Completo |
| Kits (catálogo y pedidos) | Completo |
| Noticias y push | Completo |
| Reportes y exportación | Completo |
| Catalán (alumnas) | Completo; pendiente de revisión por una hablante nativa |
| Mails a la admin | Operativo |
| Mails a las alumnas | **Bloqueado** (sin dominio verificado) |
| Pruebas automatizadas | No existen |

## 3. Plan hacia adelante

### Fase A · Cierre operativo (1–2 semanas)

| # | Tarea | Resultado esperado | Esfuerzo |
|---|---|---|---|
| A1 | Revisión de las traducciones al catalán con una persona nativa | `ca.ts` validado | S |
| A2 | Probar con alumnas reales el flujo completo en Android y iPhone | Lista de fricciones | S |
| A3 | Hacer privado el repositorio y confirmar despliegue en verde | Código protegido | XS |
| A4 | Borrar de Supabase la función WhatsApp y secrets de Twilio si existen | Sin configuración muerta | XS |
| A5 | Revisar perfiles con nombres dudosos y restos de datos de prueba | Base limpia | XS |

### Fase B · Comunicación con alumnas (2–3 semanas)

| # | Tarea | Resultado esperado | Esfuerzo |
|---|---|---|---|
| B1 | Registrar un dominio y verificarlo en Resend | Los mails salen a cualquier dirección | M |
| B2 | Restituir los mails de confirmación a la alumna (reserva, cancelación, bienvenida) | Confirmación por mail | M |
| B3 | Recordatorio automático 24 h antes de la clase (mail y push) | Menos inasistencias | M |
| B4 | Elegir si el recordatorio es opt-in en Perfil (ya existe el interruptor de avisos) | Control de la alumna | S |

### Fase C · Calidad y operación (2–3 semanas)

| # | Tarea | Resultado esperado | Esfuerzo |
|---|---|---|---|
| C1 | Tests de las reglas críticas en la base (reserva, cancelación 24 h, cupo, exentas) | Red de seguridad | M |
| C2 | Prueba de extremo a extremo de los flujos principales (Playwright) | Regresiones detectadas antes de publicar | M |
| C3 | Enlazar la CLI de Supabase y aplicar migraciones desde el repo | Sin pasos manuales | S |
| C4 | CI en GitHub (typecheck + build + tests en cada push) | Despliegues más seguros | S |
| C5 | Alertas ante errores en `email_events` | Fallos visibles | S |
| C6 | Revisión de accesibilidad con lector de pantalla y permitir zoom | Mejor accesibilidad | S |

### Fase D · Producto (según prioridad del negocio)

| # | Idea | Valor | Esfuerzo |
|---|---|---|---|
| D1 | Lista de espera por clase completa | Aprovechar bajas | M |
| D2 | Paquetes o abonos de clases | Ingresos previsibles | L |
| D3 | Pago online (Bizum / tarjeta) | Menos efectivo | L |
| D4 | Segundo rol de administración | Delegar | M |
| D5 | Registro de auditoría de acciones de la admin | Trazabilidad | M |
| D6 | Galería o proyectos de las alumnas | Comunidad | M |
| D7 | Panel de admin en catalán | Alcance | M |

Esfuerzo: XS < 1 h · S ≈ medio día · M ≈ 1–3 días · L ≈ 1 semana o más.

## 4. Riesgos y dependencias

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mails de alumnas caen en spam o no salen | Alta (hoy) | Medio | Dominio propio verificado (B1) |
| Regresión en reglas de cobro al cambiar políticas | Media | Alto | Tests de base (C1) |
| Una migración se aplica a mano y se olvida | Media | Medio | CLI enlazada y CI (C3, C4) |
| Pérdida de acceso al único usuario admin | Baja | Alto | Segundo admin (D4) y respaldo de credenciales |
| Cambios de Next.js / Supabase rompen el build | Baja | Medio | Versiones fijadas y CI |
| Datos de alumnas expuestos por un error de política | Baja | Alto | Pruebas de RLS con clave pública (parte de C1) |

## 5. Proceso de trabajo recomendado

1. **Cambio de código**: ramas cortas → `npm run typecheck` y `npm run build` → push a `main` → Vercel despliega.
2. **Cambio de base**: nueva migración numerada por fecha, re-ejecutable (`create or replace`, `if not exists`) → aplicar en SQL Editor → sumar a `ALL_MIGRATIONS.sql`.
3. **Cambio de Edge Function**: editar en el repo → pegar y desplegar en Supabase → si cambia un secreto, redesplegar.
4. **Verificación**: datos de prueba descartables, borrados al terminar; revisar en celular real antes de dar por cerrado un cambio de interfaz.
5. **Seguridad**: ningún secreto en git; claves en Vercel (Sensitive) y secrets de Supabase.

## 6. Definición de "terminado"

- Compila sin errores y pasa el chequeo de tipos.
- La regla de negocio afectada está documentada (PRD) y probada contra la base.
- Se ve bien en 320, 375 y 390 px, en tema claro y oscuro.
- El texto de alumnas tiene su versión en catalán (o cae al español sin romper).
- No quedan datos de prueba en producción.
