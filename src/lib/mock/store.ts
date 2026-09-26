"use client";

import { createSeed, MOCK_SCHEMA_VERSION } from "./seed";
import type { MockState } from "./types";

/**
 * BBDD falsa en el navegador.
 *
 * - Se guarda en localStorage, así los cambios sobreviven a recargas.
 * - Todas las pestañas comparten los datos: un cambio en una pestaña llega a
 *   las demás mediante el evento `storage` (simula Supabase Realtime).
 * - La sesión es por pestaña (sessionStorage), así puedes tener el cliente en
 *   una pestaña y el taller en otra.
 *
 * Esta capa desaparecerá al conectar Supabase: solo la usan `lib/data/*`.
 */

const DB_KEY = "taller:mock-db";
const SESSION_KEY_BASE = "taller:mock-session";

/**
 * Los iframes de /demo comparten sessionStorage con la pestaña; usamos su
 * `window.name` para que cliente y taller tengan cada uno su sesión.
 */
function sessionKey(): string {
  return window.name ? `${SESSION_KEY_BASE}:${window.name}` : SESSION_KEY_BASE;
}

type Listener = () => void;

let state: MockState | null = null;
const listeners = new Set<Listener>();
let storageListenerAttached = false;

function emit() {
  for (const listener of listeners) listener();
}

function load(): MockState {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockState;
      if (parsed.schema_version === MOCK_SCHEMA_VERSION) return parsed;
    }
  } catch {
    // Datos corruptos o storage bloqueado: regeneramos el seed.
  }
  const seed = createSeed();
  persist(seed);
  return seed;
}

function persist(next: MockState) {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(next));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error(
        "No queda espacio para guardar datos de prueba. Borra fotos o reinicia los datos demo.",
      );
    }
    // Storage bloqueado (modo privado estricto): seguimos solo en memoria.
  }
}

function attachStorageListener() {
  if (storageListenerAttached) return;
  storageListenerAttached = true;
  window.addEventListener("storage", (event) => {
    if (event.key === DB_KEY && event.newValue) {
      try {
        state = JSON.parse(event.newValue) as MockState;
        emit();
      } catch {
        // Ignoramos escrituras a medias.
      }
    }
  });
}

export function getState(): MockState {
  if (!state) state = load();
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  attachStorageListener();
  return () => listeners.delete(listener);
}

/**
 * Ejecuta una mutación de forma atómica: trabaja sobre una copia y solo la
 * publica si la función termina sin lanzar error.
 */
export function transact<T>(mutate: (draft: MockState) => T): T {
  const draft = structuredClone(getState());
  const result = mutate(draft);
  persist(draft);
  state = draft;
  emit();
  return result;
}

export function resetMockDatabase() {
  const seed = createSeed();
  persist(seed);
  state = seed;
  emit();
}

// ---------------------------------------------------------------------------
// Sesión (por pestaña)
// ---------------------------------------------------------------------------

const sessionListeners = new Set<Listener>();
let sessionUserId: string | null | undefined;

export function getSessionUserId(): string | null {
  if (sessionUserId === undefined) {
    try {
      sessionUserId = window.sessionStorage.getItem(sessionKey());
    } catch {
      sessionUserId = null;
    }
  }
  return sessionUserId;
}

export function setSessionUserId(userId: string | null) {
  sessionUserId = userId;
  try {
    if (userId) window.sessionStorage.setItem(sessionKey(), userId);
    else window.sessionStorage.removeItem(sessionKey());
  } catch {
    // Solo en memoria.
  }
  for (const listener of sessionListeners) listener();
}

export function subscribeSession(listener: Listener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

/** Genera uuids también fuera de contextos seguros (p. ej. móvil por IP local). */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ ((Math.random() * 16) >> (Number(c) / 4))).toString(16),
  );
}
