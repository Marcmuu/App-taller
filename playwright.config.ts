import { defineConfig } from "@playwright/test";

/**
 * Tests:
 *   npm run test:unit           → lógica de dominio (sin navegador)
 *   npm run test:e2e            → la app completa con la BBDD de prueba (mock) en :3100
 *   npm run test:e2e:supabase   → la misma batería contra Supabase local (npx supabase start) en :3101
 *   npm run test:db             → seguridad de la base de datos (RLS) contra Supabase local
 *
 * Usa el Chrome instalado (channel: "chrome"). Si no lo tienes:
 *   npx playwright install chromium   y quita `channel`.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local: solo tests con mock
}

const SUPABASE = process.env.E2E_BACKEND === "supabase";
// Los proyectos unit y db no abren la web: si solo se piden esos, no se arranca servidor.
const projectsAsked = process.argv.filter((a) => a.startsWith("--project=")).map((a) => a.slice("--project=".length));
const NEEDS_SERVER = projectsAsked.length === 0 || projectsAsked.some((p) => p !== "unit" && p !== "db");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !SUPABASE,
  // Contra Supabase los tests comparten base de datos: uno detrás de otro.
  workers: SUPABASE ? 1 : process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: SUPABASE ? 90_000 : 60_000,
  expect: { timeout: SUPABASE ? 10_000 : 7_000 },
  use: {
    channel: "chrome",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "unit", testMatch: /.*\.unit\.spec\.ts/ },
    { name: "db", testMatch: /.*\.db\.spec\.ts/ },
    { name: "e2e", testMatch: /.*\.e2e\.spec\.ts/, use: { baseURL: "http://localhost:3100" } },
    { name: "e2e-supabase", testMatch: /.*\.e2e\.spec\.ts/, use: { baseURL: "http://localhost:3101" } },
  ],
  webServer: !NEEDS_SERVER
    ? undefined
    : SUPABASE
    ? {
        command: "npx next build && npx next start -p 3101",
        url: "http://localhost:3101",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { NEXT_PUBLIC_BACKEND: "supabase", NEXT_PUBLIC_DEMO_MODE: "true", NEXT_DIST_DIR: ".next-e2e-supabase" },
      }
    : {
        command: "npx next build && npx next start -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { NEXT_PUBLIC_BACKEND: "mock", NEXT_DIST_DIR: ".next-e2e-mock" },
      },
});
