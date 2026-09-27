/**
 * Qué backend usa la app:
 *   - "mock": BBDD de prueba en el navegador (demo en GitHub Pages).
 *   - "supabase": base de datos real, auth, storage y realtime.
 *
 * Se elige con NEXT_PUBLIC_BACKEND. Si no hay configuración de Supabase se
 * usa "mock" para que la app siempre arranque.
 */
export const BACKEND: "mock" | "supabase" =
  process.env.NEXT_PUBLIC_BACKEND === "supabase" && !!process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "mock";

/**
 * Modo demo: muestra las cuentas de prueba, el botón «Demo» y permite
 * reiniciar los datos. En producción para un cliente real se desactiva.
 */
export const DEMO_MODE = BACKEND === "mock" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
