import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppLock } from "@/components/security/AppLock";
import { getProfile, profileIsComplete } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) redirect(ROUTES.login);
  if (!profileIsComplete(profile)) {
    redirect(`${ROUTES.completarPerfil}?next=${encodeURIComponent(ROUTES.calendario)}`);
  }

  return (
    <div className="min-h-dvh pb-28">
      <AppLock />
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
      <BottomNav isAdmin={profile.role === "admin"} />
    </div>
  );
}
