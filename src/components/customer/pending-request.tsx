"use client";

import { useState } from "react";
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
import { cancelAppointment } from "@/lib/data/actions";
import { issueCategoryLabel } from "@/lib/domain/appointments";
import { formatDateTime, formatWhen, vehicleName } from "@/lib/format";
import type { Appointment, Vehicle } from "@/types/database";

/** Solicitud de cita aún sin confirmar, con opción de anularla. */
export function PendingRequest({ appointment, vehicle }: { appointment: Appointment; vehicle: Vehicle | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelAppointment(appointment.id);
      toast.success("Solicitud anulada");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo anular");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
        <Clock className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {vehicle ? vehicleName(vehicle) : "Vehículo"} · {issueCategoryLabel(appointment.issue_category)}
        </p>
        <p className="text-sm text-muted-foreground">{formatDateTime(appointment.scheduled_at)} · Pendiente de confirmar</p>
      </div>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        Anular
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular la solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              La hora que pediste ({formatWhen(appointment.scheduled_at)}) quedará libre. Podrás pedir otra cita cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Mantener</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Anular solicitud
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
