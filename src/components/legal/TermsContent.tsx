import { LEGAL } from "@/lib/legal";
import type { Lang } from "@/lib/i18n/config";

function Es() {
  return (
    <>
      <h1>Términos de uso</h1>
      <p className="text-sm text-piedra">Última actualización: {LEGAL.updated}</p>
      <p>
        Estos términos regulan el uso de la aplicación de reservas de <strong>{LEGAL.brand}</strong>. Al crear
        una cuenta y aceptarlos confirmas que los has leído.
      </p>

      <h2>1. Quién puede usarla</h2>
      <p>
        Solo personas mayores de 18 años; no aceptamos menores de edad. Los datos de tu cuenta deben ser
        verdaderos y mantenerse actualizados.
      </p>

      <h2>2. Reservas</h2>
      <ul>
        <li>Cada clase tiene un cupo limitado; la reserva se confirma al instante si hay lugar.</li>
        <li>Puedes ver y cancelar tus reservas desde <em>Mis reservas</em>.</li>
      </ul>

      <h2>3. Pago de las clases</h2>
      <ul>
        <li>El aporte de cada clase es de 10 €.</li>
        <li>
          Se paga <strong>en persona</strong>, el mismo día que asistes, en efectivo o por Bizum (o transferencia, si
          lo acuerdas con la profesora).
        </li>
        <li>La aplicación no procesa pagos: no hay pasarela de pago ni se guardan datos bancarios.</li>
      </ul>

      <h2>4. Cancelaciones y clase no avisada</h2>
      <ul>
        <li><strong>Con 24 horas o más de anticipación:</strong> puedes cancelar sin ningún cargo y el lugar queda libre.</li>
        <li>
          <strong>Con menos de 24 horas, o si no avisas y no asistes:</strong> la clase se cobra <strong>completa</strong>{" "}
          (10 €), como si la hubieras tomado, y se abona la próxima vez que vengas.
        </li>
        <li>
          No presentarse sin avisar suma una sanción. Al acumular <strong>tres</strong> no podrás hacer nuevas
          reservas hasta que el club lo revise.
        </li>
      </ul>

      <h2>5. Kits y materiales</h2>
      <p>
        Reservar un kit es una solicitud, no una compra en línea: no hay pago por la aplicación. La profesora te
        contacta para coordinar la entrega y el pago en persona.
      </p>

      <h2>6. Uso adecuado</h2>
      <p>No uses la aplicación para fines ilícitos, no intentes acceder a datos de otras personas ni alteres su funcionamiento. Podemos suspender cuentas que incumplan estas reglas.</p>

      <h2>7. Cumpleaños</h2>
      <p>Tu nombre y el día de tu cumpleaños pueden mostrarse a las demás alumnas en el calendario, para saludarte y celebrar. Puedes borrar tu fecha de nacimiento desde <em>Mi perfil</em> cuando quieras.</p>

      <h2>8. Contenido</h2>
      <p>Los textos, logotipos e imágenes del club pertenecen a sus titulares. La foto que subas a tu perfil sigue siendo tuya; nos autorizas solo a mostrarla en tu cuenta.</p>

      <h2>9. Responsabilidad</h2>
      <p>Hacemos lo posible por mantener la aplicación disponible, pero no garantizamos un funcionamiento ininterrumpido. Las clases se rigen por la información publicada en el calendario.</p>

      <h2>10. Cambios y ley aplicable</h2>
      <p>Podemos actualizar estos términos; si el cambio es relevante, te lo avisaremos. Se rigen por la ley española.</p>

      <h2>11. Contacto</h2>
      <p><strong>{LEGAL.owner}</strong> (nombre comercial «{LEGAL.brand}») — <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></p>
    </>
  );
}

function Ca() {
  return (
    <>
      <h1>Termes d&apos;ús</h1>
      <p className="text-sm text-piedra">Darrera actualització: {LEGAL.updatedCa}</p>
      <p>
        Aquests termes regulen l&apos;ús de l&apos;aplicació de reserves de <strong>{LEGAL.brand}</strong>. En crear un
        compte i acceptar-los confirmes que els has llegit.
      </p>

      <h2>1. Qui pot fer-la servir</h2>
      <p>
        Només persones majors de 18 anys; no acceptem menors d&apos;edat. Les dades del teu compte han de ser
        veritables i mantenir-se actualitzades.
      </p>

      <h2>2. Reserves</h2>
      <ul>
        <li>Cada classe té un nombre limitat de places; la reserva es confirma a l&apos;instant si hi ha lloc.</li>
        <li>Pots veure i cancel·lar les teves reserves des de <em>Les meves reserves</em>.</li>
      </ul>

      <h2>3. Pagament de les classes</h2>
      <ul>
        <li>L&apos;aportació de cada classe és de 10 €.</li>
        <li>
          Es paga <strong>en persona</strong>, el mateix dia que hi assisteixes, en efectiu o per Bizum (o per
          transferència, si ho acordes amb la professora).
        </li>
        <li>L&apos;aplicació no processa pagaments: no hi ha passarel·la de pagament ni es guarden dades bancàries.</li>
      </ul>

      <h2>4. Cancel·lacions i classe no avisada</h2>
      <ul>
        <li><strong>Amb 24 hores o més d&apos;antelació:</strong> pots cancel·lar sense cap càrrec i el lloc queda lliure.</li>
        <li>
          <strong>Amb menys de 24 hores, o si no avises i no hi assisteixes:</strong> la classe es cobra{" "}
          <strong>sencera</strong> (10 €), com si l&apos;haguessis feta, i s&apos;abona la propera vegada que vinguis.
        </li>
        <li>
          No presentar-se sense avisar suma una sanció. En acumular-ne <strong>tres</strong> no podràs fer noves
          reserves fins que el club ho revisi.
        </li>
      </ul>

      <h2>5. Kits i materials</h2>
      <p>
        Reservar un kit és una sol·licitud, no una compra en línia: no hi ha pagament per l&apos;aplicació. La
        professora et contacta per coordinar el lliurament i el pagament en persona.
      </p>

      <h2>6. Ús adequat</h2>
      <p>No facis servir l&apos;aplicació per a finalitats il·lícites, no intentis accedir a dades d&apos;altres persones ni alteris el seu funcionament. Podem suspendre comptes que incompleixin aquestes regles.</p>

      <h2>7. Aniversaris</h2>
      <p>El teu nom i el dia del teu aniversari es poden mostrar a la resta d&apos;alumnes al calendari, per felicitar-te i celebrar. Pots esborrar la teva data de naixement des del teu <em>Perfil</em> quan vulguis.</p>

      <h2>8. Contingut</h2>
      <p>Els textos, logotips i imatges del club pertanyen als seus titulars. La foto que pugis al teu perfil continua sent teva; ens autoritzes només a mostrar-la al teu compte.</p>

      <h2>9. Responsabilitat</h2>
      <p>Fem el possible per mantenir l&apos;aplicació disponible, però no garantim un funcionament ininterromput. Les classes es regeixen per la informació publicada al calendari.</p>

      <h2>10. Canvis i llei aplicable</h2>
      <p>Podem actualitzar aquests termes; si el canvi és rellevant, t&apos;ho avisarem. Es regeixen per la llei espanyola.</p>

      <h2>11. Contacte</h2>
      <p><strong>{LEGAL.owner}</strong> (nom comercial «{LEGAL.brand}») — <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></p>
    </>
  );
}

export function TermsContent({ lang }: { lang: Lang }) {
  return lang === "ca" ? <Ca /> : <Es />;
}
