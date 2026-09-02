import { Logo } from "@/components/layout/Logo";
import { StitchDivider } from "@/components/layout/StitchDivider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 py-12">
      <Logo size={120} priority />
      <StitchDivider className="mt-5" />
      <div className="mt-8 w-full">{children}</div>
    </main>
  );
}
