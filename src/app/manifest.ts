import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
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
    icons: [
      { src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: `${base}/icon-maskable.svg`, sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
