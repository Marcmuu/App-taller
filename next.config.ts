import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 genera una web estática en /out (demo en GitHub Pages).
 * BASE_PATH es la subcarpeta donde se publica, p. ej. "/App-taller".
 */
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(staticExport && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
