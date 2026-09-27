"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptProposedTime, dismissDeclinedAppointment } from "@/lib/data/actions";
import { issueCategoryLabel } from "@/lib/domain/appointments";
import { formatDateTime, formatWhen, vehicleName } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { Appointment, Vehicle } from "@/types/database";

/** Aviso de solicitud rechazada por el taller con acceso directo a elegir otra fecha. */
export function DeclinedRequest({ appointment, vehicle }: { appointment: Appointment; vehicle: Vehicle | null }) {
  const [busy, setBusy] = useState(false);

  return (
    <article className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
          <CalendarX2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">
            {appointment.proposed_at ? "El taller te propone otra hora" : "El taller no puede atenderte a esa hora"}
          </p>
          <p className="text-sm text-muted-foreground">
            {vehicle ? vehicleName(vehicle) : "Vehículo"} · {issueCategoryLabel(appointment.issue_category)} · pediste{" "}
            <span className="line-through">{formatDateTime(appointment.scheduled_at)}</span>
          </p>
          {appointment.cancellation_reason && (
            <p className="mt-2 rounded-lg bg-background/70 px-3 py-2 text-sm">«{appointment.cancellation_reason}»</p>
          )}
          {appointment.proposed_at && (
            <p className="mt-2 text-sm font-semibold">Propuesta: {formatWhen(appointment.proposed_at)}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        {appointment.proposed_at ? (
          <Button
            size="lg"
            className="h-11"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await acceptProposedTime(appointment.id);
                toast.success("¡Cita confirmada!");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "No se pudo aceptar");
                setBusy(false);
              }
            }}
          >
            Aceptar esta hora
          </Button>
        ) : (
          <Button asChild size="lg" className="h-11">
            <Link href={routes.customerReschedule(appointment.id)}>Elegir otra fecha</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          className="h-11 text-muted-foreground"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await dismissDeclinedAppointment(appointment.id);
            } catch {
              toast.error("No se pudo descartar");
              setBusy(false);
            }
          }}
        >
          Descartar
        </Button>
        {appointment.proposed_at && (
          <Link href={routes.customerReschedule(appointment.id)} className="col-span-2 text-center text-sm font-medium text-primary hover:underline">
            Prefiero elegir otra fecha
          </Link>
        )}
      </div>
    </article>
  );
}
