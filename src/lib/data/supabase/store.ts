"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { asset } from "@/lib/routes";
import type { MockState, StorageObject } from "@/lib/mock/types";
import type { Database } from "@/types/database";

/**
 * Estado de la app cuando el backend es Supabase.
 *
 * Carga las tablas que el usuario puede ver (las políticas RLS de Postgres
 * filtran qué filas llegan) y se suscribe a Realtime: cuando algo cambia en
 * la base de datos —desde otro móvil, otra pestaña o el taller— se vuelve a
 * leer esa tabla y la pantalla se actualiza sola.
 *
 * Expone la misma forma de datos que la BBDD de prueba, así las pantallas y
 * las consultas (lib/data/queries.ts) no cambian.
 */

export const TABLES = [
  "workshops",
  "profiles",
  "vehicles",
  "appointments",
  "appointment_media",
  "repair_orders",
  "repair_status_history",
  "estimates",
  "estimate_items",
  "messages",
  "notifications",
  "workshop_availability",
  "workshop_closures",
] as const satisfies ReadonlyArray<keyof Database>;
type TableName = (typeof TABLES)[number];

export const MEDIA_BUCKET = "repair-media";
const SIGNED_URL_SECONDS = 60 * 60 * 6;

type Listener = () => void;

let state: MockState | null = null;
let sessionUserId: string | null | undefined;
let initialized = false;
let channel: RealtimeChannel | null = null;
/** Recarga completa en curso y si algo cambió mientras tanto (hay que repetirla). */
let reloading: Promise<void> | null = null;
let dirtyDuringReload = false;
/** Última lectura pedida por tabla: una respuesta vieja no pisa a una nueva. */
const tableSeq = new Map<string, number>();
let occupancySeq = 0;
const listeners = new Set<Listener>();
const sessionListeners = new Set<Listener>();
const urlCache = new Map<string, StorageObject>();

function emit() {
  for (const l of listeners) l();
}
function emitSession() {
  for (const l of sessionListeners) l();
}

// ---------------------------------------------------------------------------
// Normalización (Postgres → forma de la app)
// ---------------------------------------------------------------------------

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;

function normalizeRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && TIMESTAMP.test(value)) out[key] = new Date(value).toISOString();
    else if (typeof value === "string" && (key === "start_time" || key === "end_time")) out[key] = value.slice(0, 5);
    else if (typeof value === "string" && /^(subtotal|tax_rate|tax_amount|total|quantity|unit_price)$/.test(key)) out[key] = Number(value);
    else out[key] = value;
  }
  // Columnas internas que la app no usa
  delete out.is_demo;
  delete out.plate_key;
  return out;
}

async function fetchTable(table: TableName) {
  const { data, error } = await getSupabase().from(table).select("*");
  if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>));
}

/** Enlaces firmados (temporales) para las fotos privadas del bucket. */
async function resolveStorage(db: Database): Promise<Record<string, StorageObject>> {
  const paths = new Set<string>();
  for (const m of db.appointment_media) paths.add(m.storage_path);
  for (const m of db.messages) if (m.attachment_path) paths.add(m.attachment_path);

  const storage: Record<string, StorageObject> = {};
  const toSign: string[] = [];
  for (const path of paths) {
    if (path.startsWith("demo/")) {
      // Imágenes de ejemplo de los datos demo (están en /public/mock)
      storage[path] = { url: asset(`/mock/${path.slice(5)}`), mime_type: "image/svg+xml" };
    } else if (urlCache.has(path)) {
      storage[path] = urlCache.get(path)!;
    } else {
      toSign.push(path);
    }
  }
  if (toSign.length) {
    const { data } = await getSupabase().storage.from(MEDIA_BUCKET).createSignedUrls(toSign, SIGNED_URL_SECONDS);
    for (const item of data ?? []) {
      if (!item.path || !item.signedUrl) continue;
      const media = db.appointment_media.find((m) => m.storage_path === item.path);
      const obj = { url: item.signedUrl, mime_type: media?.media_type === "video" ? "video/mp4" : "image/jpeg" };
      urlCache.set(item.path, obj);
      storage[item.path] = obj;
    }
  }
  return storage;
}

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

async function fetchOccupancy(): Promise<MockState["occupancy"]> {
  const { data, error } = await getSupabase().from("booked_slots").select("workshop_id, scheduled_at");
  if (error) return [];
  return (data ?? []).map((r) => ({ workshop_id: r.workshop_id as string, scheduled_at: new Date(r.scheduled_at as string).toISOString() }));
}

/**
 * Relee todo. Las recargas van de una en una: si mientras tanto llega un
 * cambio (o se pide otra recarga), al terminar se hace otra, para que nunca
 * quede en pantalla una foto anterior al último cambio.
 */
export function reloadAll(): Promise<void> {
  if (reloading) {
    dirtyDuringReload = true;
    return reloading;
  }
  reloading = (async () => {
    try {
      do {
        dirtyDuringReload = false;
        const userAtStart = sessionUserId;
        const [results, occupancy] = await Promise.all([Promise.all(TABLES.map(fetchTable)), fetchOccupancy()]);
        const db = Object.fromEntries(TABLES.map((t, i) => [t, results[i]])) as unknown as Database;
        const storage = await resolveStorage(db);
        if (userAtStart !== sessionUserId) {
          dirtyDuringReload = true; // cambió el usuario: estos datos son del anterior
          continue;
        }
        state = { schema_version: 0, db, auth_users: [], storage, occupancy };
        emit();
      } while (dirtyDuringReload);
    } finally {
      reloading = null;
    }
  })();
  return reloading;
}

async function refreshOccupancy() {
  if (reloading || !state) {
    dirtyDuringReload = true;
    return;
  }
  const seq = ++occupancySeq;
  const occupancy = await fetchOccupancy();
  if (!state || seq !== occupancySeq) return;
  state = { ...state, occupancy };
  emit();
}

/** Vuelve a leer solo algunas tablas (tras una acción o un aviso de Realtime). */
export async function refreshTables(tables: readonly TableName[]): Promise<void> {
  if (!state || reloading) return reloadAll();
  const unique = Array.from(new Set(tables));
  if (unique.includes("appointments")) void refreshOccupancy();
  const seqs = unique.map((t) => {
    const next = (tableSeq.get(t) ?? 0) + 1;
    tableSeq.set(t, next);
    return next;
  });
  const results = await Promise.all(unique.map(fetchTable));
  if (!state) return;
  const db = { ...state.db } as Record<string, unknown>;
  unique.forEach((t, i) => {
    if (tableSeq.get(t) === seqs[i]) db[t] = results[i];
  });
  const storage = unique.some((t) => t === "appointment_media" || t === "messages")
    ? await resolveStorage(db as unknown as Database)
    : state.storage;
  state = { ...state, db: db as unknown as Database, storage };
  emit();
}

const pending = new Set<TableName>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRefresh(table: string) {
  if (table === "booked_slots") {
    refreshOccupancy().catch(() => undefined);
    return;
  }
  if (!(TABLES as readonly string[]).includes(table)) return;
  pending.add(table as TableName);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const tables = Array.from(pending);
    pending.clear();
    refreshTables(tables).catch(() => undefined);
  }, 120);
}

/**
 * Canal de Realtime con la identidad del usuario actual (Postgres filtra por
 * RLS qué cambios le llegan). Cada vez que el canal queda conectado —al
 * entrar, al cambiar de usuario o tras un corte de red— se releen los datos
 * para no perder lo que ocurriera mientras no estaba conectado.
 */
function subscribeRealtime() {
  if (channel) return;
  const supabase = getSupabase();
  const current = supabase
    .channel(`taller-db-${Date.now()}`)
    .on("postgres_changes", { event: "*", schema: "public" }, (payload) => scheduleRefresh(payload.table))
    .subscribe((status) => {
      if (current !== channel) return;
      if (status === "SUBSCRIBED") {
        // Siempre: lo que pasara antes de quedar conectado no llega por Realtime.
        reloadAll().catch(() => undefined);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        // Reintento (p. ej. el móvil perdió la conexión o el servidor cerró el canal)
        setTimeout(() => {
          if (current !== channel) return;
          void resubscribeRealtime();
        }, 2000);
      }
    });
  channel = current;
}

async function resubscribeRealtime() {
  const supabase = getSupabase();
  if (channel) {
    const old = channel;
    channel = null;
    await supabase.removeChannel(old);
  }
  subscribeRealtime();
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const supabase = getSupabase();
  supabase.auth.getSession().then(({ data }) => {
    sessionUserId = data.session?.user.id ?? null;
    emitSession();
    reloadAll().catch(() => undefined);
    subscribeRealtime();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    if (sessionUserId === undefined || id === sessionUserId) return;
    sessionUserId = id;
    // Otro usuario: se vacía el estado hasta tener sus datos (evita mezclar).
    state = null;
    urlCache.clear();
    emit();
    emitSession();
    // Canal nuevo con el token del usuario (el anterior tenía otra identidad)
    void supabase.realtime.setAuth(session?.access_token ?? null).then(() => resubscribeRealtime());
    reloadAll().catch(() => undefined);
  });
  // Al volver a la app (móvil bloqueado, otra pestaña) pueden haberse perdido
  // eventos de tiempo real: se recarga y se comprueba el canal.
  let lastWake = 0;
  const wake = () => {
    if (document.visibilityState !== "visible" || Date.now() - lastWake < 5000) return;
    lastWake = Date.now();
    if (state) reloadAll().catch(() => undefined);
    const status = channel?.state;
    if (!channel || (status !== "joined" && status !== "joining")) void resubscribeRealtime();
  };
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("online", wake);
  // Al cerrar la pestaña o la app se sale del canal: si no, el servidor lo
  // mantiene un tiempo y le sigue enviando cambios (cuentan para su límite).
  window.addEventListener("pagehide", () => {
    const old = channel;
    channel = null;
    if (old) void supabase.removeChannel(old);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      lastWake = 0;
      wake();
    }
  });
}

// ---------------------------------------------------------------------------
// API igual que la BBDD de prueba
// ---------------------------------------------------------------------------

export function getState(): MockState | null {
  init();
  return state;
}

export function subscribe(listener: Listener): () => void {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionUserId(): string | null | undefined {
  init();
  return sessionUserId;
}

export function subscribeSession(listener: Listener): () => void {
  init();
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

/** Espera a que estén cargados los datos del usuario que acaba de entrar. */
export async function waitForProfile(userId: string, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (sessionUserId === userId && state?.db.profiles.some((p) => p.id === userId)) {
      return state.db.profiles.find((p) => p.id === userId)!;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  // Por si el evento de sesión no llegó: forzar
  sessionUserId = userId;
  emitSession();
  await reloadAll();
  const profile = state?.db.profiles.find((p) => p.id === userId);
  if (!profile) throw new Error("No se pudo cargar tu perfil.");
  return profile;
}
