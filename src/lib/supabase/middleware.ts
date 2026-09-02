import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { ROUTES } from "@/lib/constants";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refresca la sesión de Supabase y protege rutas privadas / de admin
 * en el servidor (no sólo en el cliente).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPrivate =
    pathname.startsWith("/calendario") ||
    pathname.startsWith("/mis-reservas") ||
    pathname.startsWith("/completar-perfil") ||
    pathname.startsWith("/admin");

  if (isPrivate && !user) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && user) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.calendario;
      return NextResponse.redirect(url);
    }
  }

  return response;
}
