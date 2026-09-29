import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${base}/app/`,
    name: "Taller Martínez",
    short_name: "Taller",
    description: "Sigue la reparación de tu coche en tiempo real.",
    start_url: `${base}/app/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#2456d6",
    lang: "es",
    // PNG para Android (pide 192 y 512); los PNG se generan con scripts/make-icons.mjs
    icons: [
      { src: `${base}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
