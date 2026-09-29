/**
 * La web como "app" del móvil: detectar si está añadida a la pantalla de
 * inicio, en qué móvil estamos y registrar el service worker (public/sw.js)
 * que muestra las notificaciones.
 *
 * Solo funciones del navegador, sin datos de la app (lo usan también las
 * acciones de Supabase al cerrar sesión).
 */

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Abierta desde el icono de la pantalla de inicio (sin barras del navegador). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone o iPad (el iPad moderno se presenta como Mac con pantalla táctil). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return isIOS() || /Android|Mobi/i.test(navigator.userAgent);
}

/** El navegador puede mostrar notificaciones del sistema (en iPhone, solo con la app en la pantalla de inicio). */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

/** Además puede recibirlas con la app cerrada (Web Push). */
export function pushSupported(): boolean {
  return notificationsSupported() && "PushManager" in window;
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  registration ??= navigator.serviceWorker
    .register(`${base}/sw.js`, { scope: `${base}/`, updateViaCache: "none" })
    .then(() => navigator.serviceWorker.ready)
    .catch(() => null);
  return registration;
}

/** Suscripción push de este dispositivo, si la tiene. */
export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(`${base}/`).catch(() => undefined);
  return (await reg?.pushManager.getSubscription().catch(() => null)) ?? null;
}
