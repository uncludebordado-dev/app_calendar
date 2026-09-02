import type { Metadata } from "next";
import { SiteHeader, AppFooter } from "@/components/layout/SiteHeader";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Administración — un clu de bordado" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-dvh">
      <SiteHeader profile={profile} />
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
      <AppFooter />
    </div>
  );
}
