import type { Metadata } from "next";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { NotificationsToggle } from "@/components/profile/NotificationsToggle";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { PinSettings } from "@/components/profile/PinSettings";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { getProfile, getSessionUser } from "@/lib/auth";
import { signOutAction } from "@/app/(auth)/actions";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Mi perfil — un clu de bordado" };

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-piedra">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function MiPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect(ROUTES.login);
  const profile = await getProfile();
  if (!profile) redirect(ROUTES.login);

  const { ok } = await searchParams;
  const googleAvatar =
    (typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) ||
    (typeof user.user_metadata?.picture === "string" && user.user_metadata.picture) ||
    null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar src={profile.avatar_url} name={profile.full_name} size={64} />
        <div>
          <h1 className="text-lg font-semibold">{profile.full_name || "Mi perfil"}</h1>
          <p className="text-sm text-piedra">{user.email}</p>
        </div>
      </div>

      {ok && <Alert tone="success">Datos actualizados.</Alert>}

      <Section title="Información de perfil">
        <CompleteProfileForm
          mode="edit"
          next="/mi-perfil?ok=1"
          defaultName={profile.full_name}
          defaultPhone={profile.phone_e164}
          defaultBirthDate={profile.birth_date ?? ""}
          defaultAvatar={profile.avatar_url}
          googleAvatar={googleAvatar}
        />
      </Section>

      <Section title="Notificaciones">
        <NotificationsToggle initial={profile.notifications_enabled} />
      </Section>

      <Section title="Privacidad y seguridad">
        <PinSettings />
      </Section>

      <Section title="Apariencia">
        <ThemeToggle />
      </Section>

      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-xl border border-ladrillo px-4 py-3 text-sm font-semibold text-ladrillo-deep hover:bg-ladrillo/10"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
