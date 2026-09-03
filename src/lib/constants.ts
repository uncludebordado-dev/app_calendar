/** Constantes de negocio compartidas cliente + servidor. */

export const TIMEZONE = "America/Argentina/Buenos_Aires";

/** Cupo máximo por franja (regla del taller). */
export const MAX_CAPACITY = 6;

/** Horas de anticipación para cancelar sin sanción. */
export const FREE_CANCEL_HOURS = 48;

/** Strikes que provocan el bloqueo automático de reservas. */
export const STRIKE_BLOCK_THRESHOLD = 3;

export const INSTAGRAM_URL = "https://instagram.com/uncludebordado";

/**
 * Mostrar el botón "Continuar con Google". Google OAuth ya está configurado en
 * Supabase. Para ocultarlo, poner NEXT_PUBLIC_GOOGLE_ENABLED=false en Vercel.
 */
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== "false";

export const ADMIN_EMAIL = "uncludebordado@gmail.com";

/** Rate limiting (ventanas). */
export const RATE_LIMITS = {
  signup: { max: 5, windowSeconds: 60 * 60 }, // 5 registros / hora / IP
  booking: { max: 12, windowSeconds: 60 * 60 }, // 12 reservas o intentos / hora / usuaria
} as const;

/** Rutas. */
export const ROUTES = {
  home: "/",
  login: "/login",
  registro: "/registro",
  completarPerfil: "/completar-perfil",
  calendario: "/calendario",
  misReservas: "/mis-reservas",
  miPerfil: "/mi-perfil",
  admin: "/admin",
} as const;
