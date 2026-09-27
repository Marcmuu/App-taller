"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { changeRepairStatus, getOrCreateDraftEstimate } from "@/lib/data/actions";
import {
  getNextRepairAction,
  REPAIR_STATUS_META,
  type RepairAction,
} from "@/lib/domain/repair-status";
import type { Estimate, RepairOrder } from "@/types/database";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

/**
 * Acción principal del taller para una reparación. El sistema decide cuál es
 * el siguiente paso lógico; el trabajador solo pulsa. Si hay una alternativa
 * (p. ej. devolver sin reparar), se muestra debajo como botón secundario.
 */
export function NextRepairActionButton({
  repair,
  estimate,
  size = "xl",
  className,
}: {
  repair: RepairOrder;
  estimate: Estimate | null;
  size?: "lg" | "xl";
  className?: string;
}) {
  const action = getNextRepairAction(repair.current_status, { estimateStatus: estimate?.status });
  if (action.type === "none") return null;

  return (
    <div className="grid gap-2">
      <ActionButton action={action} repair={repair} size={size} className={className} />
      {action.secondary && (
        <ActionButton action={action.secondary} repair={repair} size={size} variant="outline" className={className} />
      )}
    </div>
  );
}

function ActionButton({
  action,
  repair,
  size,
  variant = "default",
  className,
}: {
  action: RepairAction;
  repair: RepairOrder;
  size: "lg" | "xl";
  variant?: "default" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (action.type === "wait_customer") {
    return (
      <Button size={size} variant="secondary" disabled className={cn("w-full disabled:opacity-100", className)}>
        <Clock aria-hidden /> {action.label}
      </Button>
    );
  }

  const run = async () => {
    setBusy(true);
    try {
      if (action.type === "open_estimate") {
        const estimateId = await getOrCreateDraftEstimate(repair.id);
        router.push(routes.workshopEstimate(estimateId));
        return;
      }
      if (action.nextStatus) {
        const previous = repair.current_status;
        await changeRepairStatus(repair.id, action.nextStatus, { note: action.note });
        toast.success(REPAIR_STATUS_META[action.nextStatus].label, {
          action: {
            label: "Deshacer",
            onClick: () => {
              changeRepairStatus(repair.id, previous, { manual: true, note: "deshacer" }).catch((error: unknown) =>
                toast.error(error instanceof Error ? error.message : "No se pudo deshacer"),
              );
            },
          },
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const title = action.label.charAt(0) + action.label.slice(1).toLowerCase();

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={cn("w-full", className)}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (action.requiresConfirmation) setConfirming(true);
          else void run();
        }}
      >
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        {action.label}
      </Button>
      {action.requiresConfirmation && (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿{title}?</AlertDialogTitle>
              <AlertDialogDescription>{action.confirmText}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                {busy && <Loader2 className="animate-spin" aria-hidden />}
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
