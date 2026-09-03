import type { Metadata } from "next";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { requireCompleteProfile } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Mi perfil — un clu de bordado" };

export default async function MiPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const profile = await requireCompleteProfile(ROUTES.misReservas);
  const { ok } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-4">
      {ok && <Alert tone="success">Datos actualizados.</Alert>}
      <CompleteProfileForm
        mode="edit"
        next="/mi-perfil?ok=1"
        defaultName={profile.full_name}
        defaultPhone={profile.phone_e164}
        defaultBirthDate={profile.birth_date ?? ""}
      />
    </div>
  );
}
