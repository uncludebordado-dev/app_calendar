export type KitId = "basico" | "medium" | "pro";

export interface KitInfo {
  id: KitId;
  name: string;
  tagline: string;
  items: string[];
  accent: string; // clase de fondo del ilustrativo
}

export const KITS: KitInfo[] = [
  {
    id: "basico",
    name: "Kit Básico",
    tagline: "Para empezar a bordar hoy",
    items: [
      "Bastidor de madera 15 cm",
      "Aguja de bordar",
      "Hilos en 5 colores",
      "Tela de algodón",
      "Guía de puntadas impresa",
    ],
    accent: "bg-miel/30",
  },
  {
    id: "medium",
    name: "Kit Medium",
    tagline: "El más elegido del clu",
    items: [
      "Bastidor de madera 20 cm",
      "Set de 3 agujas",
      "Hilos en 12 colores",
      "2 telas (algodón y lino)",
      "Tijera de bordado",
      "Guía + patrón para calcar",
    ],
    accent: "bg-ladrillo/15",
  },
  {
    id: "pro",
    name: "Kit Pro",
    tagline: "Todo lo que necesitás y más",
    items: [
      "Bastidor 25 cm con soporte de mesa",
      "Set completo de agujas + enhebrador",
      "Hilos en 24 colores",
      "Telas variadas",
      "Tijera de bordado",
      "Librito de puntadas",
      "Bolso para llevar tu bordado",
    ],
    accent: "bg-piedra/15",
  },
];

export const kitById = (id: string): KitInfo | undefined => KITS.find((k) => k.id === id);
