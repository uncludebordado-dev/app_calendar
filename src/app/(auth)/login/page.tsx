import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Iniciar sesión — un clu de bordado" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  if (await getSessionUser()) {
    redirect(next && next.startsWith("/") ? next : ROUTES.calendario);
  }

  return <LoginForm next={next} authError={error} />;
}
