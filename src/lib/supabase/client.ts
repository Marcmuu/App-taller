"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_MODE } from "@/lib/data/backend";

/**
 * Cliente de Supabase para el navegador. Solo usa la clave pública
 * (publishable/anon): la seguridad la ponen las políticas RLS de Postgres.
 * La clave de servicio nunca llega al navegador.
 *
 * Sesión:
 *  - Producción: se guarda en localStorage (sigues dentro al volver a abrir la app).
 *  - Demo: por pestaña (sessionStorage), para poder tener cliente y taller a la
 *    vez en dos pestañas o en la vista doble (/demo).
 */
let client: SupabaseClient | null = null;

function perTabStorage() {
  const prefix = window.name ? `${window.name}:` : "";
  return {
    getItem: (key: string) => window.sessionStorage.getItem(prefix + key),
    setItem: (key: string, value: string) => window.sessionStorage.setItem(prefix + key, value),
    removeItem: (key: string) => window.sessionStorage.removeItem(prefix + key),
  };
}

/**
 * Identificador de esta pestaña (o iframe de /demo). Supabase sincroniza la
 * sesión entre pestañas que usan la misma clave; con una clave por pestaña
 * cada una mantiene su propia cuenta.
 */
function tabId(): string {
  const key = `taller-tab${window.name ? `:${window.name}` : ""}`;
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...(DEMO_MODE ? { storage: perTabStorage(), storageKey: `taller-auth-${tabId()}` } : {}),
    },
  });
  return client;
}
