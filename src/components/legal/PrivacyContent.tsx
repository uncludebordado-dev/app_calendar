import { LEGAL } from "@/lib/legal";
import type { Lang } from "@/lib/i18n/config";

const AEPD = "https://www.aepd.es";

function Es() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p className="text-sm text-piedra">Última actualización: {LEGAL.updated}</p>
      <p>
        En <strong>{LEGAL.brand}</strong> cuidamos tus datos. Esta política explica qué información guardamos
        cuando usas la aplicación de reservas, para qué la usamos y qué derechos tienes.
      </p>

      <h2>1. Quién es la responsable</h2>
      <ul>
        <li><strong>Responsable:</strong> {LEGAL.owner}, que opera bajo el nombre comercial «{LEGAL.brand}»</li>
        <li><strong>NIF:</strong> {LEGAL.nif}</li>
        <li><strong>Domicilio:</strong> {LEGAL.address}</li>
        <li><strong>Contacto para temas de datos:</strong> <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
      </ul>

      <h2>2. Qué datos tratamos</h2>
      <p>Solo los datos mínimos para gestionar las clases:</p>
      <ul>
        <li><strong>Identificación y contacto:</strong> nombre y apellido, teléfono y correo electrónico.</li>
        <li>
          <strong>Fecha de nacimiento:</strong> la usamos para comprobar que eres mayor de 18 años y para saludarte y
          celebrar tu cumpleaños. En el calendario se muestra tu nombre y el día (no el año) de tu cumpleaños a las
          demás alumnas. Puedes borrar la fecha desde <em>Mi perfil</em> cuando quieras y dejará de mostrarse.
        </li>
        <li><strong>Foto de perfil</strong> (opcional), si la subes o si usas «Continuar con Google».</li>
        <li><strong>Actividad en el club:</strong> clases reservadas o canceladas, asistencia, sanciones por inasistencia y pedidos de kits.</li>
        <li>
          <strong>Pagos:</strong> no hay pasarela de pago ni guardamos datos bancarios o de tarjetas. Las clases y los
          kits se pagan en persona (efectivo, Bizum o transferencia) y la profesora solo anota que se cobró (importe,
          fecha y medio).
        </li>
        <li><strong>Preferencias:</strong> idioma, tema, avisos y, si los activas, el identificador técnico de notificaciones de tu navegador.</li>
        <li><strong>Datos técnicos:</strong> cookies de sesión y, durante un plazo breve, la dirección IP asociada a intentos de acceso para evitar abusos.</li>
      </ul>
      <p>No pedimos ni guardamos datos de salud ni documentos de identidad, y no tratamos datos de menores de edad.</p>

      <h2>3. Para qué los usamos y con qué base</h2>
      <ul>
        <li><strong>Gestionar tu cuenta, tus reservas, cobros y kits</strong> — necesario para prestarte el servicio que solicitas.</li>
        <li><strong>Comprobar tu mayoría de edad y saludarte por tu cumpleaños</strong> — necesario para el servicio y, en lo que se muestra a otras alumnas, con tu consentimiento.</li>
        <li><strong>Avisarte de novedades</strong> — con tu consentimiento (notificaciones) o como parte del servicio.</li>
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
      <p>No vendemos tus datos. Las demás alumnas solo ven tu nombre y el día de tu cumpleaños. Usamos proveedores que los tratan por nuestra cuenta y bajo contrato:</p>
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
        <li>Si crees que no hemos tratado bien tus datos, puedes reclamar ante la <strong>Agencia Española de Protección de Datos</strong> (<a href={AEPD} target="_blank" rel="noopener noreferrer">aepd.es</a>).</li>
      </ul>

      <h2>7. Menores de edad</h2>
      <p>La aplicación es solo para mayores de 18 años. No aceptamos menores; si detectamos una cuenta de una persona menor de edad, la eliminaremos.</p>

      <h2>8. Cómo los protegemos</h2>
      <p>
        Cada persona solo accede a sus propios datos; las acciones de administración están restringidas; las
        conexiones van cifradas; limitamos los intentos de acceso y mantenemos las claves fuera del código.
      </p>

      <h2>9. Cambios</h2>
      <p>Si actualizamos esta política de forma relevante, te lo avisaremos en la aplicación y te pediremos que la aceptes de nuevo.</p>
    </>
  );
}

function Ca() {
  return (
    <>
      <h1>Política de privacitat</h1>
      <p className="text-sm text-piedra">Darrera actualització: {LEGAL.updatedCa}</p>
      <p>
        A <strong>{LEGAL.brand}</strong> tenim cura de les teves dades. Aquesta política explica quina informació
        guardem quan fas servir l&apos;aplicació de reserves, per a què la fem servir i quins drets tens.
      </p>

      <h2>1. Qui n&apos;és la responsable</h2>
      <ul>
        <li><strong>Responsable:</strong> {LEGAL.owner}, que opera sota el nom comercial «{LEGAL.brand}»</li>
        <li><strong>NIF:</strong> {LEGAL.nif}</li>
        <li><strong>Domicili:</strong> {LEGAL.address}</li>
        <li><strong>Contacte per a temes de dades:</strong> <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
      </ul>

      <h2>2. Quines dades tractem</h2>
      <p>Només les dades mínimes per gestionar les classes:</p>
      <ul>
        <li><strong>Identificació i contacte:</strong> nom i cognoms, telèfon i correu electrònic.</li>
        <li>
          <strong>Data de naixement:</strong> la fem servir per comprovar que ets major de 18 anys i per felicitar-te i
          celebrar el teu aniversari. Al calendari es mostra el teu nom i el dia (no l&apos;any) del teu aniversari a la
          resta d&apos;alumnes. Pots esborrar la data des del teu <em>Perfil</em> quan vulguis i deixarà de mostrar-se.
        </li>
        <li><strong>Foto de perfil</strong> (opcional), si la puges o si fas servir «Continua amb Google».</li>
        <li><strong>Activitat al club:</strong> classes reservades o cancel·lades, assistència, sancions per inassistència i comandes de kits.</li>
        <li>
          <strong>Pagaments:</strong> no hi ha passarel·la de pagament ni guardem dades bancàries ni de targetes. Les
          classes i els kits es paguen en persona (en efectiu, Bizum o transferència) i la professora només anota que
          s&apos;ha cobrat (import, data i mitjà).
        </li>
        <li><strong>Preferències:</strong> idioma, tema, avisos i, si els actives, l&apos;identificador tècnic de notificacions del teu navegador.</li>
        <li><strong>Dades tècniques:</strong> galetes de sessió i, durant un termini breu, l&apos;adreça IP associada als intents d&apos;accés per evitar abusos.</li>
      </ul>
      <p>No demanem ni guardem dades de salut ni documents d&apos;identitat, i no tractem dades de menors d&apos;edat.</p>

      <h2>3. Per a què les fem servir i amb quina base</h2>
      <ul>
        <li><strong>Gestionar el teu compte, les reserves, els cobraments i els kits</strong> — necessari per prestar-te el servei que sol·licites.</li>
        <li><strong>Comprovar que ets major d&apos;edat i felicitar-te pel teu aniversari</strong> — necessari per al servei i, pel que es mostra a la resta d&apos;alumnes, amb el teu consentiment.</li>
        <li><strong>Avisar-te de novetats</strong> — amb el teu consentiment (notificacions) o com a part del servei.</li>
        <li><strong>Seguretat i prevenció d&apos;abusos</strong> — interès legítim a protegir l&apos;aplicació i les usuàries.</li>
        <li><strong>Comptabilitat i obligacions fiscals</strong> — obligació legal sobre els registres de cobrament.</li>
      </ul>

      <h2>4. Quant de temps les conservem</h2>
      <ul>
        <li>Mentre tinguis el compte actiu.</li>
        <li>Si passen <strong>{LEGAL.retentionMonths} mesos sense activitat</strong>, eliminem automàticament el teu compte i les teves dades personals.</li>
        <li>Pots eliminar el teu compte quan vulguis des del teu <em>Perfil</em>.</li>
        <li>Els <strong>registres de cobrament</strong> es conserven sense el teu nom durant els terminis que exigeix la normativa comptable i fiscal.</li>
      </ul>

      <h2>5. Amb qui compartim dades</h2>
      <p>No venem les teves dades. La resta d&apos;alumnes només veuen el teu nom i el dia del teu aniversari. Fem servir proveïdors que les tracten per compte nostre i sota contracte:</p>
      <ul>
        <li><strong>Supabase</strong> — base de dades, autenticació i emmagatzematge de fotos.</li>
        <li><strong>Vercel</strong> — allotjament de l&apos;aplicació.</li>
        <li><strong>Resend</strong> — enviament de correus d&apos;avís al club.</li>
        <li><strong>Google</strong> — només si tries «Continua amb Google», i el mapa d&apos;ubicació a les preguntes freqüents.</li>
        <li><strong>Serveis de notificacions del teu navegador</strong> (Apple, Google, Mozilla) — només si actives les notificacions.</li>
      </ul>
      <p>
        Alguns proveïdors poden tractar dades fora de l&apos;Espai Econòmic Europeu; ho fan amb les garanties previstes
        al RGPD (com les clàusules contractuals tipus).
      </p>

      <h2>6. Els teus drets</h2>
      <p>Pots demanar accés, rectificació, supressió, oposició, limitació i portabilitat de les teves dades.</p>
      <ul>
        <li><strong>Descarregar les teves dades i eliminar el teu compte:</strong> directament a <em>Perfil → Les meves dades</em>.</li>
        <li><strong>Qualsevol altra sol·licitud:</strong> escriu-nos a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</li>
        <li>Si creus que no hem tractat bé les teves dades, pots reclamar davant l&apos;<strong>Agència Espanyola de Protecció de Dades</strong> (<a href={AEPD} target="_blank" rel="noopener noreferrer">aepd.es</a>).</li>
      </ul>

      <h2>7. Menors d&apos;edat</h2>
      <p>L&apos;aplicació és només per a majors de 18 anys. No acceptem menors; si detectem un compte d&apos;una persona menor d&apos;edat, l&apos;eliminarem.</p>

      <h2>8. Com les protegim</h2>
      <p>
        Cada persona només accedeix a les seves pròpies dades; les accions d&apos;administració estan restringides; les
        connexions van xifrades; limitem els intents d&apos;accés i mantenim les claus fora del codi.
      </p>

      <h2>9. Canvis</h2>
      <p>Si actualitzem aquesta política de forma rellevant, t&apos;ho avisarem a l&apos;aplicació i et demanarem que l&apos;acceptis de nou.</p>
    </>
  );
}

export function PrivacyContent({ lang }: { lang: Lang }) {
  return lang === "ca" ? <Ca /> : <Es />;
}
