import { redirect } from "next/navigation";
import { SiteHeader, AppFooter } from "@/components/layout/SiteHeader";
import { getProfile, profileIsComplete } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) redirect(ROUTES.login);

  if (!profileIsComplete(profile)) {
    redirect(`${ROUTES.completarPerfil}?next=${encodeURIComponent(ROUTES.calendario)}`);
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader profile={profile} />
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
      <AppFooter />
    </div>
  );
}
