import { NextResponse } from "next/server";

/**
 * Diagnóstico de variables de entorno. NO expone valores: solo forma y sanidad.
 * Borrar esta ruta una vez que todo funcione.
 */
export const dynamic = "force-dynamic";

function inspect(raw: string | undefined) {
  if (!raw) return { present: false };
  const badChars = [...raw]
    .map((ch, i) => ({ i, code: ch.codePointAt(0)! }))
    .filter((c) => c.code > 126 || c.code < 32);
  return {
    present: true,
    length: raw.length,
    firstChars: raw.slice(0, 8),
    lastChars: raw.slice(-6),
    hasWhitespace: /\s/.test(raw),
    nonAsciiCount: badChars.length,
    firstBadChar: badChars[0] ?? null,
  };
}

const JWT_RE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: {
      ...inspect(url),
      looksValid: !!url && /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url.trim()),
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      ...inspect(anon),
      looksValid: !!anon && JWT_RE.test(anon.trim()),
    },
    NEXT_PUBLIC_SITE_URL: {
      ...inspect(site),
      looksValid: !!site && /^https?:\/\/[^\s]+$/.test(site.trim()),
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      ...inspect(service),
      looksValid: !!service && JWT_RE.test(service.trim()),
    },
  });
}
