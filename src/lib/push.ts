"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { deletePushSubscription, savePushSubscription } from "@/lib/data/actions";
import { BACKEND } from "@/lib/data/backend";
import {
  currentPushSubscription,
  isIOS,
  isStandalone,
  notificationsSupported,
  pushSupported,
  registerServiceWorker,
} from "@/lib/pwa";

/**
 * Avisos en el móvil (notificaciones del sistema).
 *
 * - Con Supabase y claves VAPID: Web Push, llegan aunque la app esté cerrada.
 * - Sin servidor (demo): se muestran mientras la app sigue abierta o en
 *   segundo plano.
 *
 * El usuario los activa con un toque (los navegadores exigen un gesto) y la
 * preferencia se guarda en este dispositivo.
 */

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

const PREF_KEY = "taller.avisos-movil";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Hay servidor que envía avisos con la app cerrada. */
export const REMOTE_PUSH = BACKEND === "supabase" && VAPID_PUBLIC_KEY !== "";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function writePref(on: boolean) {
  try {
    if (on) localStorage.setItem(PREF_KEY, "on");
    else localStorage.removeItem(PREF_KEY);
  } catch {
    // sin almacenamiento (modo privado): la preferencia dura lo que la pestaña
  }
  emit();
}

export function getPushState(): PushState {
  if (!notificationsSupported()) return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && readPref() ? "on" : "off";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  document.addEventListener("visibilitychange", listener); // p. ej. vuelve de cambiar el permiso en Ajustes
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Crea (o reutiliza) la suscripción push y la guarda en el servidor para el usuario actual. */
async function saveRemoteSubscription(): Promise<void> {
  if (!REMOTE_PUSH || !pushSupported()) return;
  const reg = await registerServiceWorker();
  if (!reg) return;
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  await savePushSubscription({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent,
  });
}

/** Pide permiso y activa los avisos en este dispositivo. Devuelve el estado final. */
export async function enablePush(): Promise<PushState> {
  if (!notificationsSupported()) return getPushState();
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    emit();
    return getPushState();
  }
  await registerServiceWorker();
  writePref(true);
  try {
    await saveRemoteSubscription();
  } catch (error) {
    // Sin push remoto seguimos mostrando los avisos mientras la app esté abierta
    console.warn("No se pudo activar el aviso con la app cerrada", error);
  }
  return getPushState();
}

export async function disablePush(): Promise<PushState> {
  writePref(false);
  const subscription = await currentPushSubscription();
  if (subscription) {
    await deletePushSubscription(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe().catch(() => false);
  }
  return getPushState();
}

/**
 * Al abrir la app con los avisos activados: registra el service worker y
 * vuelve a asociar este dispositivo al usuario que ha entrado.
 */
export async function syncPush(): Promise<void> {
  if (getPushState() !== "on") return;
  await registerServiceWorker();
  await saveRemoteSubscription().catch(() => undefined);
}

/**
 * Notificación del sistema para un aviso que llega con la app en segundo plano.
 * Usa el id del aviso como etiqueta: si también llega por Web Push, se ve una sola.
 */
export async function showDeviceNotification(n: { id: string; title: string; body: string }, href: string | null) {
  if (getPushState() !== "on" || document.visibilityState === "visible") return;
  const reg = await registerServiceWorker();
  if (!reg) return;
  const scope = reg.scope;
  await reg
    .showNotification(n.title, {
      body: n.body,
      tag: n.id,
      icon: `${scope}icon-192.png`,
      badge: `${scope}badge-96.png`,
      data: { url: (href ?? "").replace(/^\//, "") },
    })
    .catch(() => undefined);
}

export function usePushNotifications() {
  const state = useSyncExternalStore(subscribe, getPushState, () => "unsupported" as PushState);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<PushState>) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
      emit();
    }
  }, []);
  return {
    state,
    busy,
    enable: useCallback(() => run(enablePush), [run]),
    disable: useCallback(() => run(disablePush), [run]),
  };
}
