import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "un clu de bordado",
    short_name: "clu de bordado",
    description:
      "Club de bordado: reservá tu clase, seguí tus reservas y sumate a la comunidad.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF8F3",
    theme_color: "#FBF8F3",
    lang: "es",
    dir: "ltr",
    categories: ["lifestyle", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Reservá tu clase",
        short_name: "Calendario",
        url: "/calendario",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Mis reservas",
        short_name: "Reservas",
        url: "/mis-reservas",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
