import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { getProfile, getSessionUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Mi perfil — Administración" };

export default async function AdminPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect(ROUTES.login);
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect(ROUTES.calendario);

  const { ok } = await searchParams;
  const googleAvatar =
    (typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) ||
    (typeof user.user_metadata?.picture === "string" && user.user_metadata.picture) ||
    null;

  return (
    <ProfilePanel
      profile={profile}
      email={user.email ?? ""}
      googleAvatar={googleAvatar}
      savedOk={!!ok}
      nextPath="/admin/perfil"
    />
  );
}
