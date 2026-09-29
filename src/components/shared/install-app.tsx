"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, Check, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { asset } from "@/lib/routes";
import { isIOS, isMobile, isStandalone } from "@/lib/pwa";
import { REMOTE_PUSH, usePushNotifications } from "@/lib/push";
import { cn } from "@/lib/utils";

/**
 * "Añadir a la pantalla de inicio": la web se abre desde un icono, a pantalla
 * completa y sin las barras del navegador. No se descarga ninguna app.
 *
 * - Android/Chrome: el navegador ofrece su propio botón (beforeinstallprompt).
 * - iPhone: no hay botón; se explican los dos toques en Safari.
 */

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Se escucha desde que carga el módulo: el evento puede llegar antes de pintar el aviso
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // en su lugar mostramos nuestro aviso
    deferredPrompt = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    emit();
  });
}

export type InstallMode = "installed" | "prompt" | "ios" | "manual" | "desktop";

function getInstallMode(): InstallMode {
  if (installed || isStandalone()) return "installed";
  if (deferredPrompt) return "prompt";
  if (isIOS()) return "ios";
  return isMobile() ? "manual" : "desktop";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useInstallApp() {
  const mode = useSyncExternalStore(subscribe, getInstallMode, () => "desktop" as InstallMode);
  return {
    mode,
    /** Abre el diálogo de instalación del navegador (solo en modo "prompt"). */
    install: async (): Promise<boolean> => {
      const event = deferredPrompt;
      if (!event) return false;
      deferredPrompt = null;
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") installed = true;
      emit();
      return outcome === "accepted";
    },
  };
}

// ---------------------------------------------------------------------------
// Aviso flotante (cliente)
// ---------------------------------------------------------------------------

const SNOOZE_DAYS = 7;
const INSTALL_KEY = "taller.aviso-instalar";
const PUSH_KEY = "taller.aviso-notificaciones";

function snoozed(key: string): boolean {
  try {
    const until = Number(localStorage.getItem(key) ?? 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

function snooze(key: string) {
  try {
    localStorage.setItem(key, String(Date.now() + SNOOZE_DAYS * 86_400_000));
  } catch {
    // sin almacenamiento: se vuelve a mostrar en la próxima visita
  }
}

/** Frase que tranquiliza: no es una descarga. */
export const NO_DOWNLOAD_TEXT =
  "No se descarga ninguna app: es un acceso directo a esta web. Apenas ocupa espacio (menos que una foto) y siempre está al día.";

/**
 * En el móvil, recomienda añadir la web a la pantalla de inicio. Si ya está
 * añadida, ofrece activar los avisos del móvil. Se puede cerrar y no vuelve a
 * salir en una semana.
 */
export function InstallAppBanner({ workshopName, className }: { workshopName: string; className?: string }) {
  const { mode, install } = useInstallApp();
  const push = usePushNotifications();
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState<string | null>(null);

  // Un momento de cortesía para que primero se vea la pantalla
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;

  const kind =
    mode === "installed"
      ? push.state === "off"
        ? "push"
        : null
      : mode === "desktop"
        ? null
        : "install";
  const key = kind === "push" ? PUSH_KEY : INSTALL_KEY;
  if (!kind || closed === kind || snoozed(key)) return null;

  const dismiss = () => {
    snooze(key);
    setClosed(kind);
  };

  return (
    <div
      role="region"
      aria-label={kind === "push" ? "Activar avisos" : "Añadir a la pantalla de inicio"}
      className={cn("fixed inset-x-0 z-40 px-3 animate-in fade-in slide-in-from-bottom-4", className)}
    >
      <div className="relative mx-auto max-w-lg rounded-2xl border bg-card p-4 shadow-xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-2 grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Cerrar"
        >
          <X className="size-4" aria-hidden />
        </button>

        {kind === "push" ? (
          <div className="flex gap-3 pr-8">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <BellRing className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 space-y-3">
              <div>
                <p className="font-semibold leading-snug">¿Te avisamos en el móvil?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cuando tu coche esté listo, llegue un presupuesto o te escriba el taller
                  {REMOTE_PUSH ? ", aunque no tengas la app abierta." : "."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={push.busy}
                  onClick={async () => {
                    const state = await push.enable();
                    if (state === "on") toast.success("Avisos activados");
                    else if (state === "denied") toast.error("Has bloqueado los avisos. Puedes activarlos en los ajustes del móvil.");
                    else dismiss();
                  }}
                >
                  Activar avisos
                </Button>
                <Button variant="ghost" onClick={dismiss}>
                  Ahora no
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3 pr-8">
              {/* eslint-disable-next-line @next/next/no-img-element -- icono estático, también en la exportación */}
              <img src={asset("/icon-192.png")} alt="" className="size-12 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <p className="font-semibold leading-snug">Añade {workshopName} a tu móvil</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ábrelo desde un icono, a pantalla completa como una app, y recibe los avisos del taller.
                </p>
              </div>
            </div>
            <p className="flex gap-2 rounded-xl bg-muted/60 p-3 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{NO_DOWNLOAD_TEXT}</span>
            </p>
            {mode === "prompt" ? (
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (await install()) toast.success("¡Listo! Ya la tienes en la pantalla de inicio.");
                  }}
                >
                  <SquarePlus aria-hidden /> Añadir a pantalla de inicio
                </Button>
                <Button variant="ghost" onClick={dismiss}>
                  Ahora no
                </Button>
              </div>
            ) : (
              <InstallSteps mode={mode} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pasos manuales cuando el navegador no tiene botón de instalar (iPhone, Firefox…). */
export function InstallSteps({ mode }: { mode: InstallMode }) {
  const steps =
    mode === "ios"
      ? [
          {
            text: (
              <>
                Toca <b>Compartir</b> <Share className="inline size-4 align-text-bottom" aria-label="(icono compartir)" /> en la
                barra del navegador. Si no lo ves, toca antes <b>···</b>
              </>
            ),
          },
          {
            text: (
              <>
                Elige <b>Añadir a pantalla de inicio</b> y toca <b>Añadir</b>
              </>
            ),
          },
        ]
      : [
          {
            text: (
              <>
                Abre el <b>menú del navegador</b> <EllipsisVertical className="inline size-4 align-text-bottom" aria-hidden />
              </>
            ),
          },
          {
            text: (
              <>
                Toca <b>Añadir a pantalla de inicio</b> o <b>Instalar app</b>
              </>
            ),
          },
        ];
  return (
    <ol className="space-y-2 text-sm">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {i + 1}
          </span>
          <span className="pt-0.5">{step.text}</span>
        </li>
      ))}
    </ol>
  );
}
