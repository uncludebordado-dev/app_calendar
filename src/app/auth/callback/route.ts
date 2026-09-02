import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";

/**
 * Callback de OAuth (Google) y de los magic links de confirmación de email.
 * Intercambia el `code` por una sesión y redirige.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? ROUTES.calendario;
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : ROUTES.calendario;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${ROUTES.login}?error=auth`);
}
