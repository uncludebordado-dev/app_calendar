export type KitId = "basico" | "medium" | "pro";

export interface KitInfo {
  id: KitId;
  name: string;
  tagline: string;
  items: string[];
}

/** Fondo del ilustrativo por kit — es sólo estética, no forma parte de la info editable. */
export const KIT_ACCENT: Record<KitId, string> = {
  basico: "bg-miel/30",
  medium: "bg-ladrillo/15",
  pro: "bg-piedra/15",
};

export const KIT_IDS: KitId[] = ["basico", "medium", "pro"];

export function isKitId(v: string): v is KitId {
  return (KIT_IDS as string[]).includes(v);
}
