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
import { rescheduleDeclinedAppointment, SlotUnavailableError } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { issueCategoryLabel } from "@/lib/domain/appointments";
import { formatDateTime, formatLongDate, formatTime, vehicleName } from "@/lib/format";

/**
 * Nueva hora para una solicitud que el taller no pudo atender. Se reutiliza
 * todo lo que el cliente ya contó (motivo, descripción, fotos).
 */
export function RescheduleView() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const profile = useRequiredProfile();
  const data = useData((s) => {
    const appointment = s.db.appointments.find((a) => a.id === id && a.customer_id === profile.id);
    if (!appointment) return null;
    return { appointment, vehicle: s.db.vehicles.find((v) => v.id === appointment.vehicle_id) ?? null };
  });
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 py-10 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-green-100 text-green-700">
          <CalendarCheck className="size-10" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">¡Nueva hora enviada!</h1>
          <p className="text-muted-foreground">
            Has pedido el <strong className="text-foreground">{formatLongDate(done)}</strong> a las{" "}
            <strong className="text-foreground">{formatTime(done)}</strong>. El taller te la confirmará en breve.
          </p>
        </div>
        <Button asChild size="xl" className="w-full">
          <Link href="/app">Volver al inicio</Link>
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

  const { appointment, vehicle } = data;
  const declined = appointment.status === "cancelled" && appointment.cancelled_by === "workshop";

  if (!declined) {
    return (
      <>
        <BackHeader title="Elegir otra fecha" />
        <EmptyState
          icon={CalendarCheck}
          title="Esta cita ya está gestionada"
          description={appointment.status === "requested" ? `Pendiente de confirmar para ${formatDateTime(appointment.scheduled_at)}.` : undefined}
          action={<Button asChild><Link href="/app">Ir al inicio</Link></Button>}
        />
      </>
    );
  }

  const submit = async () => {
    if (!scheduledAt) return;
    setBusy(true);
    try {
      await rescheduleDeclinedAppointment(appointment.id, scheduledAt);
      setDone(scheduledAt);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar");
      if (error instanceof SlotUnavailableError) setScheduledAt(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="Elegir otra fecha" onBack={() => router.push("/app")} />
      <div className="mb-5 space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Elige otra hora</h2>
        <p className="text-sm text-muted-foreground">
          {vehicle ? vehicleName(vehicle) : "Vehículo"} · {issueCategoryLabel(appointment.issue_category)}. Mantenemos lo que nos contaste y tus
          fotos; solo cambia la hora.
        </p>
        {appointment.cancellation_reason && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            El taller dijo: «{appointment.cancellation_reason}»
          </p>
        )}
      </div>
      <div className="flex-1">
        <SlotPicker value={scheduledAt} onChange={setScheduledAt} />
      </div>
      <div className="sticky bottom-0 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur pb-safe">
        <Button size="xl" className="w-full" disabled={!scheduledAt || busy} onClick={submit}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {scheduledAt ? `Enviar nueva hora · ${formatDateTime(scheduledAt)}` : "Elige una hora"}
        </Button>
      </div>
    </div>
  );
}
