// Genera la demo estática para GitHub Pages en ./out
//   npm run build:pages            → https://<usuario>.github.io/App-taller/
//   BASE_PATH=/otro npm run build:pages
import { execSync } from "node:child_process";

const env = {
  ...process.env,
  STATIC_EXPORT: "1",
  // La demo de GitHub Pages siempre funciona sin servidor
  NEXT_PUBLIC_BACKEND: "mock",
  BASE_PATH: process.env.BASE_PATH ?? "/App-taller",
  MSYS_NO_PATHCONV: "1",
};

execSync("npx next build", { stdio: "inherit", env });
execSync("node scripts/fix-static-export.mjs out", { stdio: "inherit" });
