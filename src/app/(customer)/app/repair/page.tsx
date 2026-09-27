"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, CalendarX, Clock, Loader2, MessageCircle, SearchX } from "lucide-react";
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
import { BackHeader } from "@/components/customer/back-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaGallery } from "@/components/media/media-gallery";
import { RepairStatusTimeline } from "@/components/repair/repair-status-timeline";
import { TONE_CLASSES } from "@/components/repair/status-tone";
import { cancelAppointment } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getAppointmentMedia, getRepairHistory, getRepairView } from "@/lib/data/queries";
import { getCustomerRepairAction, shouldShowEstimatedReady } from "@/lib/domain/customer-actions";
import { getCustomerStatusCopy, REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import { issueCategoryLabel } from "@/lib/domain/appointments";
import { formatDateTime, formatEstimate, formatRelative, formatWhen, vehicleName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

export default function RepairTrackingPage() {
  const id = useSearchParams().get("id") ?? "";
  const profile = useRequiredProfile();
  const data = useData((s) => {
    const view = getRepairView(s.db, id, false);
    // Equivalente a RLS: el cliente solo ve sus reparaciones.
    if (!view || view.repair.customer_id !== profile.id) return null;
    return {
      view,
      history: getRepairHistory(s.db, id),
      media: getAppointmentMedia(s, view.repair.appointment_id),
    };
  });

  if (!data) {
    return (
      <>
        <BackHeader title="Seguimiento" />
        <EmptyState icon={SearchX} title="No encontramos esta reparación" action={<Button asChild><Link href="/app">Ir al inicio</Link></Button>} />
      </>
    );
  }

  const { view, history, media } = data;
  const { repair, vehicle, appointment } = view;
  const cancelled = appointment?.status === "cancelled";
  const meta = REPAIR_STATUS_META[repair.current_status];
  const tone = TONE_CLASSES[cancelled ? "neutral" : meta.tone];
  const copy = cancelled
    ? { label: "Cita anulada", description: "Anulaste esta cita. Puedes pedir otra cuando quieras." }
    : getCustomerStatusCopy(repair.current_status, view.estimate?.status);
  const action = getCustomerRepairAction(view);
  const isClosed = repair.current_status === "closed";

  return (
    <div className="space-y-5">
      <BackHeader title={`${vehicleName(vehicle)} · ${vehicle.license_plate}`} />

      {/* Estado actual: imposible de pasar por alto */}
      <section className={cn("rounded-3xl p-6 ring-1 ring-inset", tone.soft)} aria-live="polite">
        <p className={cn("text-sm font-medium", tone.text)}>Estado actual</p>
        <p className="mt-1 text-3xl font-semibold leading-tight tracking-tight">{copy.label}</p>
        <p className="mt-2 text-muted-foreground">{copy.description}</p>
        {repair.current_status === "appointment_confirmed" && appointment && !cancelled && (
          <p className="mt-3 inline-flex items-center gap-1.5 font-medium">
            <CalendarClock className="size-4" aria-hidden /> {formatDateTime(appointment.scheduled_at)}
          </p>
        )}
        {shouldShowEstimatedReady(view) && repair.estimated_ready_at && (
          <div className="mt-4 rounded-xl bg-background/70 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="size-4" aria-hidden /> Listo aproximadamente: {formatEstimate(repair.estimated_ready_at)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Fecha orientativa: el taller te avisará si cambia.</p>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Última actualización {formatRelative(repair.updated_at)}</p>
      </section>

      {!isClosed && (
        <div className="grid gap-2">
          {action.emphasis !== "default" && (
            <Button
              asChild
              size="xl"
              className={cn(
                "w-full",
                action.emphasis === "urgent" && "bg-amber-500 text-white hover:bg-amber-500/90",
                action.emphasis === "primary" && "bg-green-600 text-white hover:bg-green-600/90",
              )}
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          )}
          {action.emphasis === "default" && action.href !== routes.customerRepair(repair.id) && (
            <Button asChild size="xl" variant="outline" className="w-full">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          )}
          <Button asChild size="xl" variant={action.emphasis === "default" ? "default" : "outline"} className="w-full">
            <Link href={routes.customerMessages(repair.id)}>
              <MessageCircle aria-hidden /> Contactar con el taller
              {view.unreadMessages > 0 && (
                <span className="ml-1 rounded-full bg-destructive px-2 py-0.5 text-xs text-white">{view.unreadMessages}</span>
              )}
            </Link>
          </Button>
          {repair.current_status === "appointment_confirmed" && appointment && (
            <CancelAppointmentButton appointmentId={appointment.id} when={appointment.scheduled_at} />
          )}
        </div>
      )}

      {!cancelled && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-5 font-semibold">Progreso</h2>
          <RepairStatusTimeline status={repair.current_status} history={history} current={copy} />
        </section>
      )}

      {appointment && (
        <section className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Lo que nos contaste</h2>
          <p className="text-sm">
            <span className="font-medium">{issueCategoryLabel(appointment.issue_category)}.</span>{" "}
            <span className="text-muted-foreground">{appointment.issue_description}</span>
          </p>
          <MediaGallery media={media} />
        </section>
      )}

      {isClosed && (
        <Button asChild size="xl" variant="outline" className="w-full">
          <Link href={routes.customerMessages(repair.id)}>Ver conversación</Link>
        </Button>
      )}
    </div>
  );
}

function CancelAppointmentButton({ appointmentId, when }: { appointmentId: string; when: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelAppointment(appointmentId);
      toast.success("Cita anulada. Hemos avisado al taller.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo anular la cita");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="lg" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <CalendarX aria-hidden /> Anular cita
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular tu cita?</AlertDialogTitle>
            <AlertDialogDescription>
              Tenías cita {formatWhen(when)}. El taller recibirá un aviso y la hora quedará libre para otra persona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Mantener cita</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Anular cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
