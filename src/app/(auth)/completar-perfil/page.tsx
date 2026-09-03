import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { getProfile, getSessionUser, profileIsComplete } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Completá tu perfil — un clu de bordado" };

export default async function CompletarPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(ROUTES.login);

  const profile = await getProfile();
  if (profileIsComplete(profile)) {
    redirect(next && next.startsWith("/") ? next : ROUTES.calendario);
  }

  const defaultName =
    profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "");

  const target = next && next.startsWith("/") ? next : ROUTES.calendario;
  const withWelcome = `${target}${target.includes("?") ? "&" : "?"}bienvenida=1`;

  const googleAvatar =
    (typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) ||
    (typeof user.user_metadata?.picture === "string" && user.user_metadata.picture) ||
    null;

  return (
    <CompleteProfileForm
      next={withWelcome}
      defaultName={defaultName}
      defaultPhone={profile?.phone_e164 ?? ""}
      defaultBirthDate={profile?.birth_date ?? ""}
      defaultAvatar={profile?.avatar_url ?? googleAvatar}
      googleAvatar={googleAvatar}
    />
  );
}
