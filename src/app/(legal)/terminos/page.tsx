import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos de uso — un clu de bordado" };

export default function TerminosPage() {
  return (
    <>
      <h1>Términos de uso</h1>
      <p className="text-sm text-piedra">Última actualización: {LEGAL.updated}</p>
      <p>
        Estos términos regulan el uso de la aplicación de reservas de <strong>{LEGAL.brand}</strong>. Al crear
        una cuenta confirmas que los has leído y aceptas.
      </p>

      <h2>1. Quién puede usarla</h2>
      <p>Personas mayores de 18 años. Los datos de tu cuenta deben ser verdaderos y mantenerse actualizados.</p>

      <h2>2. Reservas</h2>
      <ul>
        <li>Cada clase tiene un cupo limitado; la reserva se confirma al instante si hay lugar.</li>
        <li>El aporte de cada clase es de 10 € y se abona en persona, en efectivo o por Bizum, el día de la clase.</li>
        <li>Puedes cancelar sin cargo con al menos 24 horas de anticipación.</li>
        <li>Si cancelas con menos de 24 horas, la clase se cobra igualmente y se abona la próxima vez que asistas.</li>
        <li>La inasistencia sin aviso puede generar sanciones; al acumular tres se bloquea la posibilidad de reservar hasta que el club lo revise.</li>
      </ul>

      <h2>3. Kits y materiales</h2>
      <p>La reserva de un kit es una solicitud: no hay pago en línea. El club te contacta para coordinar la entrega y el pago en persona.</p>

      <h2>4. Uso adecuado</h2>
      <p>No uses la aplicación para fines ilícitos, no intentes acceder a datos de otras personas ni alteres su funcionamiento. Podemos suspender cuentas que incumplan estas reglas.</p>

      <h2>5. Contenido</h2>
      <p>Los textos, logotipos e imágenes del club pertenecen a sus titulares. La foto que subas a tu perfil sigue siendo tuya; nos autorizas solo a mostrarla en tu cuenta.</p>

      <h2>6. Responsabilidad</h2>
      <p>Hacemos lo posible por mantener la aplicación disponible, pero no garantizamos un funcionamiento ininterrumpido. Las clases se rigen por la información publicada en el calendario.</p>

      <h2>7. Cambios y ley aplicable</h2>
      <p>Podemos actualizar estos términos; si el cambio es relevante, te lo avisaremos. Se rigen por la ley española.</p>

      <h2>8. Contacto</h2>
      <p><strong>{LEGAL.owner}</strong> — <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></p>
    </>
  );
}
