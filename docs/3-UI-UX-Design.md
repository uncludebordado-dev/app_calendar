# 3 · UI / UX Design

**Producto:** un clu de bordado — app de reservas
**Principio rector:** cálida, simple y pensada para el pulgar. Una persona debe poder reservar sin leer instrucciones.

---

## 1. Principios

1. **Móvil primero.** Se diseña desde 320 px; el escritorio es una columna centrada (máx. 28 rem).
2. **Una acción principal por pantalla.** La barra inferior con el botón central "Reservar" siempre está a mano.
3. **Estado visible, no escondido.** Lugares libres, reservas propias, cumpleaños y festivos se ven en el calendario sin entrar al día.
4. **Reglas con palabras claras.** La política de 24 h se explica antes de cancelar, en el mismo botón.
5. **Calidez artesanal.** Paleta tierra y miel, puntada como motivo decorativo, tono cercano.

## 2. Identidad visual

### Paleta

| Rol | Token (Tailwind) | Claro | Oscuro |
|---|---|---|---|
| Fondo | `crema` | `#FBF8F3` | `#201C19` |
| Superficie (tarjetas) | `surface` | `#FFFFFF` | `#2A2521` |
| Superficie suave | `lino-soft` | `#EDE8E0` | `#332E29` |
| Borde | `lino` | `#DFD7CC` | `#443C34` |
| Texto | `piedra-deep` | `#566567` | `#EDE6DD` |
| Texto secundario | `piedra` | `#77898B` | `#B1A598` |
| Texto tenue | `piedra-soft` | `#97A3A4` | `#8A8072` |
| Acento (acciones) | `ladrillo` | `#D9704A` | `#E5895F` |
| Acento fuerte (texto/hover) | `ladrillo-deep` | `#B9552F` | `#F0A583` |
| Miel (selección, destacados) | `miel` | `#F2C166` | `#E8BD6D` |
| Miel fuerte | `miel-deep` | `#E3A93F` | `#D7A850` |

El tema claro/oscuro se elige en el perfil (o sigue al sistema). Todos los colores salen de variables CSS, por lo que ambos temas se mantienen consistentes.

### Tipografía

- **DM Sans** (400, 500, 600, 700) para todo el producto.
- Escala: título de pantalla 20 px/600, subtítulo 14 px, cuerpo 14–15 px, etiquetas 11–12 px, preguntas frecuentes 16 px (preguntas) y 15 px (respuestas).

### Forma y profundidad

- Radios: botones y campos `rounded-xl`; tarjetas y bloques de resumen `rounded-xl2` (1.25 rem).
- Sombra única `shadow-soft`; el resto se separa con bordes `lino`.
- Motivo propio: **guarda de puntada corrida** (SVG) bajo el logo.

## 3. Componentes

| Componente | Variantes / comportamiento |
|---|---|
| Botón | `primary` (ladrillo), `secondary` (miel), `ghost` (borde), `danger` (borde ladrillo); tamaños `md`/`lg`; estado `loading` con spinner |
| Campo | Etiqueta asociada, ayuda y error con `aria-describedby`; contraseña con "ojito"; teléfono con selector de país (E.164) |
| Alerta | `info`, `success`, `warning`, `error` |
| Tarjeta | Borde `lino`, fondo `surface`, sombra suave |
| Barra inferior | Píldora flotante con 2 pestañas a cada lado y botón central circular; punto rojo en "News" si hay novedades |
| Calendario mensual | Grilla de 6 semanas desde el lunes; punto = hay lugar, punto gris = ya reservaste, 🎂 = cumpleaños, fondo gris = festivo |
| Acordeón de preguntas | Todas visibles; la respuesta se abre en el lugar; la lista se desplaza por dentro |
| Panel inferior (admin) | Hoja que sube desde abajo para eliminar clases |
| Interruptor ES / CAT | Píldora fija arriba a la derecha en portada, acceso y registro; también en Perfil |

### Semántica del "puntito" de cobro (admin)

| Color | Significado |
|---|---|
| Verde | Cobrada (o asistió, si la alumna es exenta) |
| Rojo ladrillo | Confirmada, sin cobrar |
| Amarillo | Baja con menos de 24 h con cargo |

## 4. Pantallas

### Pública y acceso

| Pantalla | Propósito |
|---|---|
| Portada `/` | Logo, frase del club, "Reservá tu clase", "¡Conocenos!" (Instagram), "Preguntas frecuentes" con ubicación y mapa. **Ocupa exactamente la pantalla, sin scroll** |
| Registro `/registro` | Nombre, teléfono, nacimiento, email, contraseña (o Google) |
| Acceso `/login` | Email y contraseña (o Google) |
| Completar perfil | Paso único cuando faltan nombre o teléfono; foto opcional |

### Alumna

| Pantalla | Propósito |
|---|---|
| Calendario `/calendario` | Elegir día, ver horarios y reservar; tarjeta de "Tu próxima clase"; acceso a kits; avisos de sanciones |
| Mis reservas | Próximas e historial; cancelar con confirmación que explica el cobro |
| Reservá tu kit | Tres tarjetas con foto, contenido y precio; cantidad y nota |
| News | Novedades con reacciones; activar notificaciones |
| Mi perfil | Datos, foto, notificaciones, PIN, tema, idioma, cerrar sesión |

### Admin

| Pantalla | Propósito |
|---|---|
| Dashboard | Totales, gráfico de alumnas, cumpleaños, exportar, reportes, kits, perfil |
| Calendario admin | Ver, agregar y (manteniendo presionado) eliminar clases |
| Alumnas | Lista mensual con puntitos de cobro, resumen por alumna y "EXENTA" |
| Detalle de alumna | Historial, pagos, sanciones, exención |
| Horarios | Lista completa, crear/editar/ocultar |
| Inscriptas del mes y reportes | Quién está inscripta en cada clase del mes, y reportes mensuales de ingresos |
| Kits | **Pedidos** con contacto y estado, y edición del catálogo |
| Perfil de admin | Mismos ajustes que alumna, con logo del club |

## 5. Patrones de interacción

- **Mantener presionado** un día del calendario admin abre el panel para eliminar; el toque normal sigue seleccionando.
- **Confirmar acciones destructivas** en dos pasos ("Sí, eliminar" / "No").
- **Explicar antes de cobrar**: el botón Cancelar muestra "Falta menos de 24 hs. Esta baja se te cobrará igual que una clase. ¿Continuar?".
- **Exentas sin dinero**: para una alumna exenta el puntito ofrece "Asistió / No asistió", sin importes ni medios de pago.
- **Feedback inmediato**: botones con estado de carga, mensajes de éxito y error junto a la acción.

## 6. Responsive y plataformas

| Aspecto | Decisión |
|---|---|
| Anchos probados | 320, 360, 375, 390 px |
| Alto de pantalla | Medidas en `dvh` para que la barra del navegador móvil no rompa el diseño |
| Zonas táctiles | Mínimo 48 px de alto en acordeones y acciones principales |
| iOS | Respeto de áreas seguras (notch y barra de inicio), `-webkit-text-size-adjust`, guía de instalación "Añadir a inicio" |
| Android | Prompt de instalación nativo, `touch-action: manipulation` |
| Portada | Sin scroll; con una respuesta larga, la lista se desplaza dentro de su propio contenedor |

## 7. Accesibilidad

- Etiquetas y `aria-*` en formularios, acordeones (`aria-expanded`) y navegación.
- Foco visible con anillo del color de acento.
- Contraste revisado en tema claro y oscuro.
- Mensajes de error asociados al campo.
- Pendiente: permitir zoom del usuario (hoy `maximum-scale=1`) y una revisión con lector de pantalla.

## 8. Voz y contenido

- Español rioplatense con voseo en la app ("Reservá", "Elegí"); las preguntas frecuentes mantienen el texto de la profesora.
- Catalán con trato informal ("tu").
- Mensajes cortos, con la consecuencia explícita (qué pasa, cuánto cuesta).
- Emojis solo donde ayudan al reconocimiento (🎂, 💛, 🎉).
