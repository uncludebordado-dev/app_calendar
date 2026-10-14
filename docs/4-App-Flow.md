# 4 · App Flow

**Producto:** un clu de bordado — app de reservas
Este documento describe cómo se mueven las personas por la app y qué pasa por detrás en cada paso.

---

## 1. Mapa de navegación

```mermaid
flowchart TD
  H["/ Portada"] --> R["Reservá tu clase"]
  H --> I["¡Conocenos! (Instagram)"]
  H --> F["Preguntas frecuentes + mapa"]
  R -->|sin sesión| L["/login"]
  L --> G["/registro"]
  G --> P["/completar-perfil (si falta)"]
  L -->|alumna| C["/calendario"]
  P --> C
  L -->|admin| A["/admin"]
  C --- MR["/mis-reservas"]
  C --- N["/news"]
  C --- K["/reserva-kit"]
  C --- PF["/mi-perfil"]
  A --- AC["/admin/calendario"]
  A --- AA["/admin/alumnas"]
  A --- AK["/admin/kits"]
  A --- AR["/admin/reportes"]
  A --- AH["/admin/horarios"]
  A --- AP["/admin/perfil"]
```

**Redirecciones automáticas**

| Situación | Destino |
|---|---|
| Ruta privada sin sesión | `/login?next=<ruta>` |
| Sesión sin nombre o teléfono | `/completar-perfil` |
| Admin entra a `/calendario` o `/mis-reservas` | `/admin/calendario` o `/admin` |
| No-admin entra a `/admin` | `/calendario` |
| Sesión activa en `/login` o `/registro` | `/calendario` (o la ruta `next`) |

## 2. Flujos de la alumna

### 2.1 Alta y primer ingreso

```mermaid
flowchart TD
  A[Portada] --> B[Registro]
  B --> C{Método}
  C -->|Email + contraseña| D[Validación zod + límite de registros]
  C -->|Google| E[OAuth → /auth/callback]
  D --> F[Crea usuario en Supabase Auth]
  E --> F
  F --> G[Trigger crea el perfil]
  G --> H{Perfil completo?}
  H -->|No| I[Completar perfil]
  H -->|Sí| J[Calendario con bienvenida]
  I --> J
  G -.-> K[Aviso a la admin: nueva alumna]
```

1. La alumna elige idioma (ES/CAT) en la portada, si lo necesita.
2. Completa nombre y apellido, teléfono (con país), nacimiento, email y contraseña.
3. Si el proyecto exige confirmar email, ve "Revisá tu correo"; si no, entra directo.
4. Se crea el perfil por trigger; la admin recibe el aviso de alta.

### 2.2 Reservar una clase

```mermaid
sequenceDiagram
  participant A as Alumna
  participant App as App (server action)
  participant DB as Postgres
  participant E as Edge Function
  A->>App: Toca "Reservar" en un horario
  App->>App: Valida sesión y límite (12/h)
  App->>DB: book_slot(slot_id)
  DB->>DB: Perfil completo, no bloqueada, cupo libre, clase futura
  DB-->>App: Reserva creada (o error estable)
  DB->>E: email_events → aviso a la admin
  App-->>A: "Tenés tu lugar reservado"
```

Errores posibles y su mensaje: perfil incompleto, cuenta bloqueada, ya reservada, clase llena, clase pasada, demasiados intentos.

### 2.3 Cancelar una reserva

```mermaid
flowchart TD
  A[Mis reservas → Cancelar] --> B{Faltan 24 h o más?}
  B -->|Sí| C["¿Confirmás la baja? Se libera tu lugar"]
  B -->|No| D["Falta menos de 24 hs. Se te cobrará igual que una clase. ¿Continuar?"]
  C --> E[cancel_booking]
  D --> E
  E --> F{Menos de 24 h?}
  F -->|Sí| G[Libera cupo + marca baja con cargo]
  F -->|No| H[Libera cupo, sin cargo]
  G --> I[Aviso a la admin]
  H --> I
```

La baja tardía **no** suma sanción: solo se cobra la clase (10 €) en la próxima visita.

### 2.4 Pedir un kit

1. `Reservá tu kit` → elige modelo, cantidad (1–20) y nota opcional (300 caracteres).
2. La app valida sesión, kit y límite (6/h) e inserta en `kit_orders`.
3. Un trigger encola el aviso; la admin recibe nombre, teléfono, email, kit y nota.
4. La admin coordina entrega y pago en persona.

### 2.5 Noticias y notificaciones

1. `News` muestra el feed; el punto rojo en la barra indica novedades sin leer.
2. La alumna puede activar notificaciones (permiso del navegador + suscripción push).
3. Puede reaccionar con ❤️ 😊 😂 😢 (una reacción por noticia).

### 2.6 Preguntas frecuentes y ubicación

Portada → "Preguntas frecuentes" → lista de 6 preguntas → al tocar una se despliega; "¿Dónde queda?" incluye zonas, metro, buses y mapa de Google con enlace "Abrir en Google Maps".

## 3. Flujos de la admin

### 3.1 Agendar y eliminar clases

```mermaid
flowchart TD
  A[Calendario admin] --> B[Elegir día]
  B --> C[+ Agregar clase: hora, cupo, tema, visible]
  C --> D[createSlotAction → availability_slots]
  A --> E[Mantener presionado un día con clases]
  E --> F[Panel con fecha y tacho]
  F --> G{Tiene inscriptas?}
  G -->|Sí| H[Tacho deshabilitado + aviso]
  G -->|No| I[Confirmar → eliminar]
```

La eliminación se verifica contra la tabla real de reservas (no contra el contador).

### 3.2 Asistencia y cobro

```mermaid
flowchart TD
  A[Alumnas → puntito de una clase] --> B{Alumna exenta?}
  B -->|No| C[Pagó / No pagó + medio de pago]
  B -->|Sí| D[Asistió / No asistió]
  C --> E[Crea o borra el pago de 10 €]
  D --> F[Marca asistencia, sin dinero]
  E --> G[Actualiza totales y dashboard]
  F --> G
```

Para una baja con cargo (punto amarillo), la admin marca si ya la cobró; si la alumna es exenta, no hay cobro posible.

### 3.3 Pedidos de kit

1. Dashboard o `Kits` → lista de pedidos pendientes y en curso.
2. Contacta por teléfono, WhatsApp o mail directamente desde la tarjeta.
3. Cambia el estado: `Ya la contacté` → `Entregada`, o `Cancelar`.
4. Lo cerrado pasa al historial plegable.

### 3.4 Gestión de alumnas

- Marcar o quitar **exención de pago** (la lista muestra "EXENTA" mientras esté activa).
- Ver y perdonar **sanciones**; el bloqueo se activa solo a las 3.
- Registrar una **inasistencia** manualmente.

### 3.5 Reportes y exportación

- **Reporte mensual**: automático el último día del mes; llega por mail y se ve en `Reportes`.
- **Exportar**: selector de mes o "Todos los meses" → descarga CSV (abre con Excel).

### 3.6 Publicar una noticia

Composer en `News` → Publicar → trigger → push a todas las suscriptas.

## 4. Flujos automáticos

| Disparador | Qué ocurre |
|---|---|
| Nueva reserva | Aviso a la admin |
| Cancelación | Aviso a la admin con si fue tardía y si se cobra |
| Alta de alumna | Aviso a la admin |
| Pedido de kit | Aviso a la admin con contacto y detalle |
| Día 1 de cada mes | Aviso de cumpleaños del mes |
| Último día del mes | Reporte mensual por mail |
| Noticia publicada | Push a las suscriptas |

## 5. Estados de una reserva

```mermaid
stateDiagram-v2
  [*] --> confirmed: book_slot
  confirmed --> cancelled: cancel_booking (≥24 h: sin cargo)
  confirmed --> cancelled_fee: cancel_booking (<24 h: con cargo)
  confirmed --> attended: la admin marca asistencia
  confirmed --> no_show: la admin marca inasistencia (+1 sanción)
  cancelled_fee --> cancelled_fee_paid: la admin registra el cobro
```

(`cancelled_fee` = `status = cancelled` con `penalty_fee = true`.)
