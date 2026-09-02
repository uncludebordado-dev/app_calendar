import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { getSessionUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Crear cuenta — un clu de bordado" };

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if (await getSessionUser()) {
    redirect(next && next.startsWith("/") ? next : ROUTES.calendario);
  }

  return <SignupForm next={next} />;
}
