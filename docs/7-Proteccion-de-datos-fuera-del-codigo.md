# 7 · Protección de datos y seguridad — lo que va FUERA del código

**Producto:** un clu de bordado · **Aplica:** RGPD y LOPDGDD (España/UE)
**Aviso:** guía práctica, no asesoramiento legal. Que una gestoría o abogada revise los textos finales.

La app ya hace su parte: aceptación de la política, mayoría de edad, descargar y eliminar datos, anonimización por inactividad, reglas de acceso, límites de intentos y cabeceras de seguridad. Lo que sigue es lo que **solo puede hacer la titular del negocio**, en este orden.

---

## 1. Completar la identidad del responsable (10 min)

Los textos legales de la app tienen marcadores `[COMPLETAR…]`.

1. Abre `src/lib/legal.ts` en el proyecto.
2. Reemplaza `owner`, `nif` y `address` con tus datos reales (nombre o razón social, NIF/NIE/CIF y domicilio).
3. Cambia `updated` a la fecha de hoy si modificas algo.
4. Pide a Claude Code que publique el cambio, o hazlo en GitHub.

> Si eres autónoma, el responsable eres tú con tu NIF. Si tienes sociedad, la razón social y su CIF.

## 2. Cuentas: verificación en dos pasos (20 min)

Activa la verificación en dos pasos (app autenticadora, no SMS) en **todas** estas cuentas y guarda los códigos de recuperación en un lugar seguro:

| Cuenta | Dónde |
|---|---|
| Google (la del mail del club y del login del admin) | myaccount.google.com → Seguridad → Verificación en 2 pasos |
| GitHub | Settings → Password and authentication → Two-factor authentication |
| Vercel | Account Settings → Security |
| Supabase | Account → Preferences / Security (MFA) |
| Resend | Settings → Security |
| Registrador del dominio (si lo compras) | Panel del proveedor |

Usa un **gestor de contraseñas** y contraseñas distintas y largas en cada servicio.

## 3. Contratos de tratamiento de datos con tus proveedores (15 min)

Supabase, Vercel y Resend tratan datos por tu cuenta. Cada uno publica un **Data Processing Addendum (DPA)** que se acepta en línea.

1. En el sitio de cada proveedor busca «Data Processing Addendum» (suele estar en el pie de página, sección *Legal*).
2. Acéptalo o fírmalo con la cuenta del club, según indique el proveedor.
3. Guarda una copia en PDF en una carpeta «Protección de datos».

## 4. Región de los datos (5 min)

1. Supabase → tu proyecto → **Project Settings → General**.
2. Mira la **Region**. Lo ideal es una región de la UE (por ejemplo Frankfurt o Irlanda).
3. Si está fuera de la UE, no cambia nada de golpe: se resuelve migrando a un proyecto nuevo. Avísame y lo planificamos.

## 5. Copias de seguridad

- En el plan gratuito de Supabase **no hay copias diarias descargables**. Dos opciones: pasar al plan de pago o hacer una exportación periódica.
- Si te quedas en el plan gratuito, programa una vez al mes: Supabase → **Database → Backups**, o pídeme un procedimiento de exportación y lo dejamos documentado.
- Guarda los respaldos cifrados y bórralos después de un tiempo prudente; contienen datos personales.

## 6. Planes y condiciones de uso

- **Vercel (plan gratuito Hobby)** es para uso personal no comercial. Un negocio debería usar el plan de pago. Revisa sus términos y decide.
- **Resend gratuito** limita mails por día; suficiente para los avisos al club.
- **Supabase gratuito** pausa proyectos inactivos y tiene límites; revisa que tu volumen entre.

## 7. Registro de actividades de tratamiento (30 min, una vez)

Es un documento interno de una página. Plantilla:

| Tratamiento | Finalidad | Datos | Personas | Base legal | Conservación | Destinatarios | Medidas |
|---|---|---|---|---|---|---|---|
| Gestión de alumnas | Reservas, asistencia, cobros | Nombre, teléfono, email, nacimiento, foto, reservas, cobros | Alumnas | Relación contractual | Cuenta activa; 24 meses sin actividad → eliminación | Supabase, Vercel, Resend | Acceso por usuaria, 2FA, cifrado en tránsito, límites de intentos |
| Kits | Gestionar pedidos | Nombre, contacto, pedido | Alumnas | Relación contractual | Con la cuenta | Supabase | Idem |
| Noticias y push | Avisos | Identificador del navegador | Alumnas | Consentimiento | Hasta que se desactive | Servicios push del navegador | Idem |
| Contabilidad | Obligación fiscal | Importe, fecha, medio (sin nombre tras eliminar cuenta) | — | Obligación legal | Plazos legales | Asesoría | Acceso restringido |

## 8. Cuando alguien ejerce un derecho

| Pedido | Qué haces | Plazo |
|---|---|---|
| Acceso o portabilidad | La alumna puede descargar sus datos en **Mi perfil → Mis datos**. Si lo pide por mail, lo descargas tú desde Supabase o le indicas el botón | 1 mes |
| Rectificación | Lo edita en Mi perfil, o lo corriges en el panel | 1 mes |
| Supresión | **Mi perfil → Eliminar mi cuenta**, o la eliminas tú desde el panel de Supabase (Authentication → Users) | 1 mes |
| Oposición o limitación | Anótalo y atiéndelo; si afecta a un servicio, explícaselo | 1 mes |

Verifica siempre la identidad de quien pide (que escriba desde el mail de su cuenta).

## 9. Si hay una filtración (brecha de seguridad)

1. **Contén**: cambia contraseñas y claves de servicio; en Supabase rota la clave `service_role` y en Vercel actualiza la variable.
2. **Evalúa**: qué datos, de cuántas personas, si hay riesgo para ellas.
3. **Notifica a la AEPD en 72 horas** si hay riesgo (sede.aepd.es). Si el riesgo es alto, avisa a las personas afectadas.
4. **Documenta** qué pasó, qué hiciste y qué cambiaste.

## 10. Textos legales y tranquilidad

1. Lee la política y los términos publicados en la app (`/privacidad`, `/terminos`, `/cookies`).
2. La AEPD ofrece **Facilita RGPD**, una herramienta gratuita para negocios pequeños que revisa y genera documentación. Úsala para contrastar.
3. Si puedes, una consulta corta con tu gestoría para validar el texto.
4. Si algún día añades analítica, publicidad o formularios de marketing, avísame: cambia el aviso de cookies y hace falta consentimiento.

## 11. Mantenimiento recurrente

| Cuándo | Qué |
|---|---|
| Cada mes | Revisar el resultado del proceso de cuentas inactivas (Vercel → Cron Jobs) y los errores de `email_events` |
| Cada trimestre | Revisar accesos: quién tiene acceso a Supabase, Vercel y GitHub; quitar a quien ya no deba |
| Cada año | Revisar la política, la lista de proveedores y la región de datos |
| Siempre | Actualizar dependencias y revisar avisos de seguridad |
