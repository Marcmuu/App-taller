"use client";

import { BellOff, BellRing, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InstallSteps, NO_DOWNLOAD_TEXT, useInstallApp } from "@/components/shared/install-app";
import { REMOTE_PUSH, usePushNotifications } from "@/lib/push";

/** Perfil del cliente: tener la app en el móvil y activar sus avisos. */
export function AppOnPhoneSection() {
  const { mode, install } = useInstallApp();
  const push = usePushNotifications();

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">En tu móvil</h2>
      <div className="divide-y rounded-2xl border bg-card">
        {mode !== "installed" && mode !== "desktop" && (
          <div className="space-y-3 p-4">
            <p className="flex items-center gap-3 font-medium">
              <Smartphone className="size-5 text-primary" aria-hidden /> Añadir a la pantalla de inicio
            </p>
            <p className="text-sm text-muted-foreground">{NO_DOWNLOAD_TEXT}</p>
            {mode === "prompt" ? (
              <Button variant="outline" onClick={() => void install()}>
                Añadir a pantalla de inicio
              </Button>
            ) : (
              <InstallSteps mode={mode} />
            )}
          </div>
        )}
        <PushRow state={push.state} busy={push.busy} onEnable={push.enable} onDisable={push.disable} />
      </div>
    </section>
  );
}

function PushRow({
  state,
  busy,
  onEnable,
  onDisable,
}: {
  state: ReturnType<typeof usePushNotifications>["state"];
  busy: boolean;
  onEnable: () => Promise<unknown>;
  onDisable: () => Promise<unknown>;
}) {
  const on = state === "on";
  const description = {
    on: REMOTE_PUSH ? "Te llegan al móvil aunque no tengas la app abierta." : "Te llegan al móvil mientras la app sigue abierta.",
    off: "Recibe en el móvil cuándo está listo tu coche, los presupuestos y los mensajes del taller.",
    denied: "Están bloqueados. Actívalos en los ajustes del móvil (Notificaciones) y vuelve aquí.",
    "needs-install": "En iPhone, primero añade la app a la pantalla de inicio y ábrela desde su icono.",
    unsupported: "Este navegador no permite avisos. Prueba con Chrome o Safari.",
  }[state];

  return (
    <div className="flex items-center gap-3 p-4">
      {on ? (
        <BellRing className="size-5 shrink-0 text-primary" aria-hidden />
      ) : (
        <BellOff className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">Avisos en el móvil {on ? "activados" : state === "off" ? "" : "no disponibles"}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {(state === "on" || state === "off") && (
        <Button
          variant={on ? "outline" : "default"}
          disabled={busy}
          onClick={async () => {
            if (on) {
              await onDisable();
              toast("Avisos del móvil desactivados");
            } else {
              const result = await onEnable();
              if (result === "on") toast.success("Avisos activados");
              else if (result === "denied") toast.error("Has bloqueado los avisos. Puedes activarlos en los ajustes del móvil.");
            }
          }}
        >
          {on ? "Desactivar" : "Activar"}
        </Button>
      )}
    </div>
  );
}

/** Opción del menú del taller: avisos en este dispositivo (ordenador o móvil). */
export function usePushMenuItem() {
  const push = usePushNotifications();
  if (push.state !== "on" && push.state !== "off") return null;
  return {
    label: push.state === "on" ? "Desactivar avisos en este dispositivo" : "Activar avisos en este dispositivo",
    icon: push.state === "on" ? BellOff : BellRing,
    disabled: push.busy,
    run: async () => {
      if (push.state === "on") {
        await push.disable();
        toast("Avisos desactivados en este dispositivo");
      } else {
        const result = await push.enable();
        if (result === "on") toast.success("Avisos activados en este dispositivo");
        else if (result === "denied") toast.error("Has bloqueado los avisos en el navegador. Actívalos en su configuración.");
      }
    },
  };
}
