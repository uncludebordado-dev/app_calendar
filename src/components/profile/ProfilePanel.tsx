import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { NotificationsToggle } from "@/components/profile/NotificationsToggle";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { PinSettings } from "@/components/profile/PinSettings";
import { Avatar } from "@/components/ui/Avatar";
import { Alert } from "@/components/ui/Alert";
import { signOutAction } from "@/app/(auth)/actions";
import type { Profile } from "@/types/database.types";
import { LangSwitch } from "@/components/i18n/LangSwitch";
import { getT } from "@/lib/i18n/server";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-piedra">{title}</h2>
      {children}
    </section>
  );
}

export async function ProfilePanel({
  profile,
  email,
  googleAvatar,
  savedOk,
  nextPath,
  extra,
}: {
  profile: Profile;
  email: string;
  googleAvatar: string | null;
  savedOk?: boolean;
  nextPath: string;
  extra?: React.ReactNode;
}) {
  const isAdmin = profile.role === "admin";
  const { t } = await getT(isAdmin ? "es" : undefined);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar src={profile.avatar_url} name={profile.full_name} size={64} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{profile.full_name || t("Mi perfil")}</h1>
          <p className="truncate text-sm text-piedra">{email}</p>
        </div>
      </div>

      {savedOk && <Alert tone="success">Datos actualizados.</Alert>}

      <Section title={t("Información de perfil")}>
        <CompleteProfileForm
          mode="edit"
          next={`${nextPath}?ok=1`}
          defaultName={profile.full_name}
          defaultPhone={profile.phone_e164}
          defaultBirthDate={profile.birth_date ?? ""}
          defaultAvatar={profile.avatar_url}
          googleAvatar={googleAvatar}
          isAdmin={profile.role === "admin"}
        />
      </Section>

      <Section title={t("Notificaciones")}>
        <NotificationsToggle initial={profile.notifications_enabled} />
      </Section>

      <Section title={t("Privacidad y seguridad")}>
        <PinSettings />
      </Section>

      <Section title={t("Apariencia")}>
        <ThemeToggle />
      </Section>

      {!isAdmin && (
        <Section title={t("Idioma")}>
          <LangSwitch />
        </Section>
      )}

      {extra}

      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-xl border border-ladrillo px-4 py-3 text-sm font-semibold text-ladrillo-deep hover:bg-ladrillo/10"
        >
          {t("Cerrar sesión")}
        </button>
      </form>
    </div>
  );
}
