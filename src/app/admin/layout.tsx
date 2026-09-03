import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppLock } from "@/components/security/AppLock";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Administración — un clu de bordado" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-dvh pb-28">
      <AppLock />
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
      <BottomNav isAdmin />
    </div>
  );
}
