import { test as base } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { resetDemo } from "../scripts/db-admin";

/**
 * Tras reiniciar la demo hay cientos de cambios en la base de datos y
 * Realtime los procesa en orden. Antes de empezar el test se escribe una
 * "sonda" (y se repite si hace falta) hasta recibirla: así sabemos que
 * Realtime ya está al día.
 *
 * El Realtime local (Docker) se reinicia solo de vez en cuando
 * («Rebalancing … for a closer region») y cierra los canales abiertos: si el
 * canal de la sonda se cae o no responde en 20 s, se abre otro.
 */
export async function waitForRealtimeIdle() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const t0 = Date.now();
  for (let attempt = 1; Date.now() - t0 < 150_000; attempt++) {
    const session = `probe-${Date.now()}`;
    let n = 0;
    // Las consultas de supabase-js son perezosas: sin await no se envían.
    const write = async () => {
      await admin.from("app_settings").upsert({ key: "e2e_probe", value: `${session}-${++n}` });
    };
    let resend: ReturnType<typeof setInterval> | null = null;
    const ok = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 20_000);
      const done = (value: boolean) => {
        clearTimeout(timer);
        resolve(value);
      };
      anon
        .channel(session)
        .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (payload) => {
          const row = payload.new as { key?: string; value?: string };
          if (row.key === "e2e_probe" && row.value?.startsWith(session)) done(true);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void write();
            resend = setInterval(() => void write(), 3000);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            done(false);
          }
        });
    });
    if (resend) clearInterval(resend);
    await anon.removeAllChannels();
    anon.realtime.disconnect();
    if (ok) {
      if (process.env.E2E_DEBUG) console.log(`[realtime al día en ${Date.now() - t0} ms, intento ${attempt}, ${n} sondas]`);
      return;
    }
    if (process.env.E2E_DEBUG) console.log(`[realtime: intento ${attempt} sin respuesta, reintentando]`);
    // Pausa antes de reintentar: sin ella se abren cientos de conexiones y
    // Realtime empieza a rechazarlas por límite de uso.
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error("Realtime no respondió a tiempo");
}

/**
 * `test` común de los e2e. Contra Supabase, antes de cada test se reinician
 * los datos demo en la base de datos (con la mock cada test ya empieza con
 * datos nuevos porque usa un navegador limpio).
 */
export const test = base.extend<{ resetBackend: void }>({
  resetBackend: [
    async ({ baseURL }, use) => {
      if (baseURL?.includes(":3101")) {
        await resetDemo();
        await waitForRealtimeIdle();
      }
      await use();
    },
    // La espera a Realtime no cuenta para el tiempo del test
    { auto: true, timeout: 180_000 },
  ],
});

export { expect, type Page } from "@playwright/test";
