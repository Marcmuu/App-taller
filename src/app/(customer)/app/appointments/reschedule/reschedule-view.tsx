"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, Loader2, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BackHeader } from "@/components/customer/back-header";
import { SlotPicker } from "@/components/customer/slot-picker";
import { EmptyState } from "@/components/shared/empty-state";
import {
  acceptProposedTime,
  rescheduleConfirmedAppointment,
  rescheduleDeclinedAppointment,
  SlotUnavailableError,
} from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { issueCategoryLabel } from "@/lib/domain/appointments";
import { formatDateTime, formatLongDate, formatTime, formatWhen, vehicleName } from "@/lib/format";
import { routes } from "@/lib/routes";

/**
 * Elegir otra hora para una cita:
 *  - solicitud rechazada por el taller (con o sin hora propuesta por él);
 *  - cita ya confirmada que el cliente quiere cambiar (el coche aún no ha llegado).
 * Se reutiliza todo lo que el cliente ya contó (motivo, descripción, fotos).
 */
export function RescheduleView() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const profile = useRequiredProfile();
  const data = useData((s) => {
    const appointment = s.db.appointments.find((a) => a.id === id && a.customer_id === profile.id);
    if (!appointment) return null;
    return {
      appointment,
      vehicle: s.db.vehicles.find((v) => v.id === appointment.vehicle_id) ?? null,
      repair: s.db.repair_orders.find((r) => r.appointment_id === appointment.id) ?? null,
    };
  });
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ at: string; confirmed: boolean; repairId?: string } | null>(null);

  if (done) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 py-10 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-green-100 text-green-700">
          <CalendarCheck className="size-10" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{done.confirmed ? "¡Cita confirmada!" : "¡Nueva hora enviada!"}</h1>
          <p className="text-muted-foreground">
            {done.confirmed ? "Te esperamos el " : "Has pedido el "}
            <strong className="text-foreground">{formatLongDate(done.at)}</strong> a las{" "}
            <strong className="text-foreground">{formatTime(done.at)}</strong>.
            {done.confirmed ? " Hemos avisado al taller." : " El taller te la confirmará en breve."}
          </p>
        </div>
        <Button asChild size="xl" className="w-full">
          <Link href={done.repairId ? routes.customerRepair(done.repairId) : "/app"}>
            {done.repairId ? "Ver mi cita" : "Volver al inicio"}
          </Link>
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <>
        <BackHeader title="Elegir otra fecha" />
        <EmptyState icon={SearchX} title="No encontramos esta cita" action={<Button asChild><Link href="/app">Ir al inicio</Link></Button>} />
      </>
    );
  }

  const { appointment, vehicle, repair } = data;
  const declined = appointment.status === "cancelled" && appointment.cancelled_by === "workshop";
  const changeConfirmed = appointment.status === "confirmed" && (!repair || repair.current_status === "appointment_confirmed");

  if (!declined && !changeConfirmed) {
    return (
      <>
        <BackHeader title="Elegir otra fecha" />
        <EmptyState
          icon={CalendarCheck}
          title="Esta cita ya no se puede cambiar"
          description={appointment.status === "requested" ? `Pendiente de confirmar para ${formatDateTime(appointment.scheduled_at)}.` : "Si necesitas algo, escribe al taller."}
          action={<Button asChild><Link href="/app">Ir al inicio</Link></Button>}
        />
      </>
    );
  }

  const submit = async () => {
    if (!scheduledAt) return;
    setBusy(true);
    try {
      if (changeConfirmed) {
        await rescheduleConfirmedAppointment(appointment.id, scheduledAt);
        setDone({ at: scheduledAt, confirmed: true, repairId: repair?.id });
      } else {
        await rescheduleDeclinedAppointment(appointment.id, scheduledAt);
        setDone({ at: scheduledAt, confirmed: false });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar");
      if (error instanceof SlotUnavailableError) setScheduledAt(null);
    } finally {
      setBusy(false);
    }
  };

  const acceptProposal = async () => {
    if (!appointment.proposed_at) return;
    setBusy(true);
    try {
      const repairId = await acceptProposedTime(appointment.id);
      setDone({ at: appointment.proposed_at, confirmed: true, repairId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aceptar la hora");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={changeConfirmed ? "Cambiar fecha" : "Elegir otra fecha"} onBack={() => router.back()} />
      <div className="mb-5 space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{changeConfirmed ? "¿Cuándo te viene mejor?" : "Elige otra hora"}</h2>
        <p className="text-sm text-muted-foreground">
          {vehicle ? vehicleName(vehicle) : "Vehículo"} · {issueCategoryLabel(appointment.issue_category)}.{" "}
          {changeConfirmed
            ? `Ahora tienes cita ${formatWhen(appointment.scheduled_at)}. La cita seguirá confirmada con la nueva hora.`
            : "Mantenemos lo que nos contaste y tus fotos; solo cambia la hora."}
        </p>
        {declined && appointment.cancellation_reason && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            El taller dijo: «{appointment.cancellation_reason}»
          </p>
        )}
        {declined && appointment.proposed_at && (
          <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="font-medium">El taller te propone {formatWhen(appointment.proposed_at)}</p>
            <Button size="lg" className="w-full" disabled={busy} onClick={acceptProposal}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Aceptar esta hora
            </Button>
            <p className="text-center text-xs text-muted-foreground">o elige otra más abajo</p>
          </div>
        )}
      </div>
      <div className="flex-1">
        <SlotPicker value={scheduledAt} onChange={setScheduledAt} />
      </div>
      <div className="sticky bottom-0 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur pb-safe">
        <Button size="xl" className="w-full" disabled={!scheduledAt || busy} onClick={submit}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {scheduledAt ? `${changeConfirmed ? "Cambiar a" : "Enviar nueva hora"} · ${formatDateTime(scheduledAt)}` : "Elige una hora"}
        </Button>
      </div>
    </div>
  );
}
