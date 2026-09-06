/** Constantes de negocio compartidas cliente + servidor. */

/** Zona horaria del taller. Los horarios de clase se interpretan en esta zona. */
export const TIMEZONE = "Europe/Madrid";

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

/**
 * El sistema arranca en septiembre de 2026. Toda la lógica temporal (selector
 * de mes, métricas, gráfico de barras) se calcula desde acá en adelante.
 */
export const SEASON_START_YEAR = 2026;
export const SEASON_START_MONTH = 8; // 0-based: septiembre
export const SEASON_START_YM = "2026-09";

/** Costo fijo por clase, en euros. */
export const CLASS_PRICE_EUR = 10;

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
