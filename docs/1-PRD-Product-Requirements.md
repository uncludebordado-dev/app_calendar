# 1 · PRD — Product Requirements Document

**Producto:** un clu de bordado — app de reservas
**Negocio:** taller de bordado en Barcelona (@uncludebordado), a cargo de una sola profesora
**Versión del documento:** octubre 2026 · estado del producto: en producción

---

## 1. Resumen

Un clu de bordado es una Progressive Web App (PWA) que reemplaza la gestión
de clases por mensajes sueltos (WhatsApp/Instagram) por un calendario real:
las alumnas reservan su lugar, la profesora controla cupos, asistencia y
cobros, y el club comunica novedades sin intermediarios.

## 2. Problema

| Antes | Dolor |
|---|---|
| Reservas por mensaje | Se pierden, se pisan, no hay cupo visible |
| Asistencia y cobros en la cabeza / en papel | No hay historial ni totales |
| Cancelaciones de último momento | Se pierde el lugar y el ingreso |
| Pedidos de materiales por chat | Sin registro ni seguimiento |
| Novedades dispersas | No llegan a todas |

## 3. Objetivos

1. Que una alumna pueda **reservar y cancelar sola**, en menos de un minuto, desde el celular.
2. Que la profesora vea **quién viene, quién pagó y cuánto recaudó** sin planillas.
3. **Reducir cancelaciones tardías** con una regla clara y automática (24 h).
4. Que la profesora reciba **un aviso por cada movimiento** (reserva, cancelación, alta, pedido de kit) en su mail.
5. Que el club pueda **comunicar novedades** con notificación push.
6. Que una alumna catalana pueda usar la parte de alumnas en **catalán**.

### No-objetivos (decisiones tomadas)

- Sin pagos en línea: el pago es en persona (efectivo o Bizum).
- Sin lista de espera ni reservas recurrentes.
- Sin multi-profesora ni multi-sede.
- Panel de administración y mails solo en español.
- Sin chat interno activo (la tabla existe en la base, sin pantalla).

## 4. Usuarias

| Perfil | Quién es | Qué necesita |
|---|---|---|
| **Alumna** | Persona que asiste a las clases, hispanohablante o catalanohablante | Ver días con lugar, reservar, cancelar, pedir un kit, enterarse de novedades |
| **Admin** | La profesora y dueña del club (un único usuario con rol `admin`) | Agendar clases, marcar asistencia y cobro, gestionar alumnas y kits, ver ingresos, comunicar |

## 5. Reglas de negocio

| Regla | Valor |
|---|---|
| Cupo máximo por clase | **6** |
| Precio de la clase | **10 €**, se paga en persona (efectivo o Bizum) |
| Cancelación gratuita | Con **24 h o más** de anticipación |
| Cancelación tardía | **Menos de 24 h**: se libera el lugar, pero la clase **se cobra igual** (10 €) |
| Sanciones (strikes) | Solo por **inasistencia** (no presentarse), cargadas a mano por la admin |
| Bloqueo | A las **3 sanciones** no se puede reservar; la admin puede perdonar |
| Alumna exenta de pago | Se marca asistencia pero nunca genera cobro ni suma a los totales de dinero |
| Inicio de temporada | Septiembre 2026 (el panel no muestra meses anteriores) |
| Zona horaria | Europe/Madrid |
| Feriados | Se marcan los festivos de Catalunya en los calendarios |
| Kits | 3 modelos (Básico, Medium, Pro); nombre, descripción, contenido, precio y foto editables por la admin; sin pago online |

## 6. Requisitos funcionales

### Alumna

| ID | Requisito |
|---|---|
| A-01 | Registrarse con email y contraseña (o con Google, desactivable) indicando nombre, teléfono y fecha de nacimiento |
| A-02 | Iniciar sesión y mantener la sesión |
| A-03 | Ver un calendario mensual con días con lugar, mis reservas, cumpleaños y festivos |
| A-04 | Reservar una clase con cupo disponible (atómico: nunca sobrevende) |
| A-05 | Ver mis reservas próximas e historial; cancelar con aviso claro de si se cobra |
| A-06 | Pedir un kit (modelo, cantidad, nota opcional) |
| A-07 | Leer noticias del club, reaccionar con emoji y recibir notificación push |
| A-08 | Editar perfil (foto, teléfono, cumpleaños), notificaciones, tema claro/oscuro, bloqueo con PIN |
| A-09 | Cambiar el idioma entre español y catalán |
| A-10 | Consultar preguntas frecuentes y ubicación con mapa desde la portada |
| A-11 | Instalar la app en el celular (PWA) |

### Admin

| ID | Requisito |
|---|---|
| D-01 | Crear, editar, ocultar y eliminar clases (solo si no tienen inscriptas) |
| D-02 | Eliminar una clase manteniendo presionado el día en el calendario |
| D-03 | Ver inscriptas por clase con datos de contacto |
| D-04 | Marcar asistencia y cobro desde el "puntito" de cada reserva (con semántica distinta para exentas) |
| D-05 | Cobrar o descobrar una baja tardía |
| D-06 | Gestionar alumnas: exención de pago, sanciones, perdón, detalle individual |
| D-07 | Ver pedidos de kits con contacto y cambiar su estado (pendiente, contactada, entregada, cancelada) |
| D-08 | Editar el catálogo de kits |
| D-09 | Publicar noticias (con push a todas las suscriptas) |
| D-10 | Dashboard: recaudado histórico y mensual, clases, asistencias, altas, gráfico de alumnas, cumpleaños próximos |
| D-11 | Reporte mensual automático (mail + panel) |
| D-12 | Exportar planilla CSV por mes o histórica |
| D-13 | Recibir un mail por reserva, cancelación, alta de alumna y pedido de kit |

## 7. Requisitos no funcionales

- **Móvil primero**: pensado desde 320 px de ancho; portada sin scroll.
- **Seguridad**: datos de cada alumna aislados por reglas en la base (RLS); acciones de admin verificadas en tres capas.
- **Disponibilidad**: alojamiento gestionado (Vercel + Supabase), sin servidores propios.
- **Privacidad**: sin pasarela de pago ni datos financieros en la app.
- **Accesibilidad básica**: etiquetas, foco visible, contraste en tema claro y oscuro, zonas táctiles de 48 px.

## 8. Estado actual y limitaciones conocidas

| Tema | Estado |
|---|---|
| Entrega de mails a alumnas | **No operativa**: la cuenta de mail transaccional no tiene dominio verificado, por eso todos los avisos van solo a la casilla de la admin |
| WhatsApp (Twilio) | Descartado; queda un disparador inactivo en la base |
| Tests automatizados | No hay; la verificación es manual con datos descartables |
| Dependencia con aviso (postcss, vía Next.js) | Sin riesgo real para la app; requiere salto a Next 16 |
| Cuenta de admin | Un único usuario; el rol se asigna por el email del dueño al registrarse |

## 9. Métricas de éxito (propuestas, aún no medidas)

- % de reservas hechas por la app vs. por mensaje.
- Cancelaciones tardías por mes (debería bajar).
- Clases con cupo completo vs. clases publicadas.
- Alumnas activas por mes y altas nuevas.
- Pedidos de kit atendidos en menos de 48 h.

## 10. Preguntas abiertas

1. ¿Se adquiere un dominio propio para que los mails lleguen a las alumnas?
2. ¿Se necesita lista de espera cuando una clase está completa?
3. ¿Se quiere ofrecer más idiomas o ampliar el catalán al panel de admin?
4. ¿Se sumará una segunda persona con rol admin?
