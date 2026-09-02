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

  return <CompleteProfileForm next={next} defaultName={defaultName} />;
}
