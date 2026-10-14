import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Cookies — un clu de bordado" };

export default function CookiesPage() {
  return (
    <>
      <h1>Cookies y almacenamiento local</h1>
      <p className="text-sm text-piedra">Última actualización: {LEGAL.updated}</p>
      <p>
        La aplicación usa <strong>solo cookies y almacenamiento técnicos</strong>, imprescindibles para que
        funcione. No usamos cookies de publicidad ni de seguimiento, por eso no te mostramos un banner de consentimiento.
      </p>

      <h2>Qué guardamos en tu dispositivo</h2>
      <ul>
        <li><strong>Sesión</strong> (cookie): mantiene tu sesión iniciada de forma segura.</li>
        <li><strong>Idioma</strong> (cookie <code>lang</code>): recuerda si prefieres español o catalán.</li>
        <li><strong>Tema</strong> (almacenamiento local): claro u oscuro.</li>
        <li><strong>Bloqueo con PIN</strong> (almacenamiento local): si lo activas, guarda un resumen cifrado de tu PIN en este dispositivo; nunca sale de él.</li>
        <li><strong>Modo sin conexión</strong> (caché del navegador): permite abrir la aplicación con mala señal.</li>
        <li><strong>Avisos descartados</strong> (almacenamiento local): recuerda que cerraste el aviso de instalación o de notificaciones.</li>
      </ul>

      <h2>Servicios de terceros</h2>
      <p>
        Al abrir la pregunta «¿Dónde queda?» se carga un mapa de Google Maps, que puede tratar datos técnicos
        según su propia política. Si usas «Continuar con Google», el inicio de sesión lo gestiona Google.
      </p>

      <h2>Cómo borrarlas</h2>
      <p>Puedes eliminar cookies y datos del sitio desde la configuración de tu navegador; tendrás que volver a iniciar sesión.</p>
      <p>Contacto: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></p>
    </>
  );
}
