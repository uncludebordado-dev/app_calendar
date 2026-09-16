/**
 * Festivos oficiales de Catalunya. Fuente: Departament de Treball, Generalitat
 * de Catalunya — Ordre EMT/66/2025 (calendari laboral 2026).
 * https://treball.gencat.cat/ca/ambits/relacions_laborals/ci/calendari_laboral/calendari-festes-2026/
 * Sumá el año que haga falta cuando arranque 2027.
 */
export const CATALONIA_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "Cap d'Any",
  "2026-01-06": "Reis",
  "2026-04-03": "Divendres Sant",
  "2026-04-06": "Dilluns de Pasqua Florida",
  "2026-05-01": "Festa del Treball",
  "2026-06-24": "Sant Joan",
  "2026-08-15": "L'Assumpció",
  "2026-09-11": "Diada Nacional de Catalunya",
  "2026-10-12": "Festa Nacional d'Espanya",
  "2026-12-08": "La Immaculada",
  "2026-12-25": "Nadal",
  "2026-12-26": "Sant Esteve",
};

/** Nombre del festivo catalán en esa fecha (YYYY-MM-DD), o null si no lo es. */
export function catalanHoliday(dateKey: string): string | null {
  return CATALONIA_HOLIDAYS[dateKey] ?? null;
}
