import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { getProfile, getSessionUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Admin — un clu de bordado" };

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

  const links = [
    { href: "/admin/horarios", label: "Lista de horarios" },
    { href: "/admin/reservas", label: "Inscriptas del mes" },
    { href: "/chat", label: "Chat de la comunidad" },
  ];

  return (
    <ProfilePanel
      profile={profile}
      email={user.email ?? ""}
      googleAvatar={googleAvatar}
      savedOk={!!ok}
      nextPath="/admin/perfil"
      extra={
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-piedra">
            Herramientas
          </h2>
          <ul className="divide-y divide-lino">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex items-center justify-between py-2.5 text-sm font-medium text-piedra-deep hover:text-ladrillo-deep"
                >
                  {l.label}
                  <span aria-hidden className="text-piedra">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      }
    />
  );
}
