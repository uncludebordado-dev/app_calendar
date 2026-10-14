import { LEGAL } from "@/lib/legal";
import type { Lang } from "@/lib/i18n/config";

function Es() {
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

function Ca() {
  return (
    <>
      <h1>Galetes i emmagatzematge local</h1>
      <p className="text-sm text-piedra">Darrera actualització: {LEGAL.updatedCa}</p>
      <p>
        L&apos;aplicació fa servir <strong>només galetes i emmagatzematge tècnics</strong>, imprescindibles perquè
        funcioni. No fem servir galetes de publicitat ni de seguiment, per això no et mostrem cap bàner de consentiment.
      </p>

      <h2>Què guardem al teu dispositiu</h2>
      <ul>
        <li><strong>Sessió</strong> (galeta): manté la teva sessió iniciada de manera segura.</li>
        <li><strong>Idioma</strong> (galeta <code>lang</code>): recorda si prefereixes castellà o català.</li>
        <li><strong>Tema</strong> (emmagatzematge local): clar o fosc.</li>
        <li><strong>Bloqueig amb PIN</strong> (emmagatzematge local): si l&apos;actives, guarda un resum xifrat del teu PIN en aquest dispositiu; mai en surt.</li>
        <li><strong>Mode sense connexió</strong> (memòria cau del navegador): permet obrir l&apos;aplicació amb mala cobertura.</li>
        <li><strong>Avisos descartats</strong> (emmagatzematge local): recorda que has tancat l&apos;avís d&apos;instal·lació o de notificacions.</li>
      </ul>

      <h2>Serveis de tercers</h2>
      <p>
        En obrir la pregunta «On queda?» es carrega un mapa de Google Maps, que pot tractar dades tècniques segons
        la seva pròpia política. Si fas servir «Continua amb Google», l&apos;inici de sessió el gestiona Google.
      </p>

      <h2>Com esborrar-les</h2>
      <p>Pots eliminar les galetes i les dades del lloc des de la configuració del teu navegador; hauràs de tornar a iniciar la sessió.</p>
      <p>Contacte: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></p>
    </>
  );
}

export function CookiesContent({ lang }: { lang: Lang }) {
  return lang === "ca" ? <Ca /> : <Es />;
}
