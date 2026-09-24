import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { LangProvider } from "@/components/i18n/LangProvider";
import { getT } from "@/lib/i18n/server";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
  title: t("un clu de bordado — reservá tu clase"),
  description: t("Un clu para bordar, compartir y hacer red. Reservá tu lugar en la próxima clase."),
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "un clu de bordado",
  appleWebApp: {
    capable: true,
    title: "un clu de bordado",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "un clu de bordado",
    description: t("Reservá tu lugar en la próxima clase de bordado."),
    type: "website",
  },
  robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#201C19" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await getT();
  return (
    <html lang={lang === "ca" ? "ca" : "es-AR"} className={dmSans.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        <LangProvider lang={lang}>
          <ThemeProvider>
            <InstallPrompt />
            {children}
          </ThemeProvider>
        </LangProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
