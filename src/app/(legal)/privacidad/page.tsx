import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidad — un clu de bordado" };

export default function PrivacidadPage() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p className="text-sm text-piedra">Última actualización: {LEGAL.updated}</p>
      <p>
        En <strong>{LEGAL.brand}</strong> cuidamos tus datos. Esta política explica qué información
        guardamos cuando usas la aplicación de reservas, para qué la usamos y qué derechos tienes.
      </p>

      <h2>1. Quién es la responsable</h2>
      <ul>
        <li><strong>Responsable:</strong> {LEGAL.owner}, que opera bajo el nombre comercial «{LEGAL.brand}»</li>
        <li><strong>NIF:</strong> {LEGAL.nif}</li>
        <li><strong>Domicilio:</strong> {LEGAL.address}</li>
        <li><strong>Contacto para temas de datos:</strong> <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
      </ul>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li><strong>Identificación y contacto:</strong> nombre y apellido, teléfono, correo electrónico y fecha de nacimiento.</li>
        <li><strong>Foto de perfil</strong> (opcional), si la subes o si usas «Continuar con Google».</li>
        <li><strong>Actividad en el club:</strong> clases reservadas o canceladas, asistencia, sanciones por inasistencia y pedidos de kits.</li>
        <li><strong>Pagos:</strong> importe, fecha y medio (efectivo, Bizum o transferencia). No guardamos datos de tarjetas.</li>
        <li><strong>Preferencias:</strong> idioma, tema, avisos y, si los activas, el identificador técnico de notificaciones de tu navegador.</li>
        <li><strong>Datos técnicos:</strong> cookies de sesión y, durante un plazo breve, la dirección IP asociada a intentos de acceso para evitar abusos.</li>
      </ul>
      <p>Solo tratamos datos de personas mayores de 18 años. No pedimos ni guardamos datos de salud ni documentos de identidad.</p>

      <h2>3. Para qué los usamos y con qué base</h2>
      <ul>
        <li><strong>Gestionar tu cuenta, tus reservas, cobros y kits</strong> — necesario para prestarte el servicio que solicitas.</li>
        <li><strong>Avisarte de novedades y cumpleaños</strong> — con tu consentimiento (notificaciones) o como parte del servicio.</li>
        <li><strong>Seguridad y prevención de abusos</strong> — interés legítimo en proteger la aplicación y a las usuarias.</li>
        <li><strong>Contabilidad y obligaciones fiscales</strong> — obligación legal sobre los registros de cobro.</li>
      </ul>

      <h2>4. Cuánto tiempo los conservamos</h2>
      <ul>
        <li>Mientras tengas la cuenta activa.</li>
        <li>Si pasan <strong>{LEGAL.retentionMonths} meses sin actividad</strong>, eliminamos automáticamente tu cuenta y tus datos personales.</li>
        <li>Puedes eliminar tu cuenta cuando quieras desde <em>Mi perfil</em>.</li>
        <li>Los <strong>registros de cobro</strong> se conservan sin tu nombre durante los plazos que exige la normativa contable y fiscal.</li>
      </ul>

      <h2>5. Con quién compartimos datos</h2>
      <p>No vendemos tus datos. Usamos proveedores que los tratan por nuestra cuenta y bajo contrato:</p>
      <ul>
        <li><strong>Supabase</strong> — base de datos, autenticación y almacenamiento de fotos.</li>
        <li><strong>Vercel</strong> — alojamiento de la aplicación.</li>
        <li><strong>Resend</strong> — envío de correos de aviso al club.</li>
        <li><strong>Google</strong> — solo si eliges «Continuar con Google», y el mapa de ubicación en las preguntas frecuentes.</li>
        <li><strong>Servicios de notificaciones de tu navegador</strong> (Apple, Google, Mozilla) — solo si activas las notificaciones.</li>
      </ul>
      <p>
        Algunos proveedores pueden tratar datos fuera del Espacio Económico Europeo; lo hacen con las garantías
        previstas en el RGPD (como las cláusulas contractuales tipo).
      </p>

      <h2>6. Tus derechos</h2>
      <p>Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos.</p>
      <ul>
        <li><strong>Descargar tus datos y eliminar tu cuenta:</strong> directamente en <em>Mi perfil → Mis datos</em>.</li>
        <li><strong>Cualquier otra solicitud:</strong> escríbenos a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</li>
        <li>Si crees que no hemos tratado bien tus datos, puedes reclamar ante la <strong>Agencia Española de Protección de Datos</strong> (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).</li>
      </ul>

      <h2>7. Cómo los protegemos</h2>
      <p>
        Cada persona solo accede a sus propios datos; las acciones de administración están restringidas; las
        conexiones van cifradas; limitamos los intentos de acceso y mantenemos las claves fuera del código.
      </p>

      <h2>8. Cambios</h2>
      <p>Si actualizamos esta política de forma relevante, te lo avisaremos en la aplicación y te pediremos que la aceptes de nuevo.</p>
    </>
  );
}
