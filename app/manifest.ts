import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RevScale PropertyOS",
    short_name: "RevScale",
    description: "Inteligencia comercial inmobiliaria para equipos que venden, alquilan y captan propiedades.",
    start_url: "/protected",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#eee5d7",
    theme_color: "#302d28",
    categories: ["business", "productivity"],
    lang: "es-UY",
    icons: [
      { src: "/pwa/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/pwa/maskable-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
