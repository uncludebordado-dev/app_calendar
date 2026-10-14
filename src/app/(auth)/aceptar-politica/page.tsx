import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AcceptPolicyForm } from "@/components/auth/AcceptPolicyForm";
import { getProfile, getSessionUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Política de privacidad — un clu de bordado" };

export default async function AceptarPoliticaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(ROUTES.login);

  const profile = await getProfile();
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : ROUTES.calendario;
  if (!profile || profile.role === "admin" || profile.privacy_accepted_at) redirect(target);

  return <AcceptPolicyForm next={target} />;
}
