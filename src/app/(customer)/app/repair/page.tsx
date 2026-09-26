"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackHeader } from "@/components/customer/back-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaGallery } from "@/components/media/media-gallery";
import { RepairStatusTimeline } from "@/components/repair/repair-status-timeline";
import { TONE_CLASSES } from "@/components/repair/status-tone";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getAppointmentMedia, getRepairHistory, getRepairView } from "@/lib/data/queries";
import { getCustomerRepairAction } from "@/lib/domain/customer-actions";
import { REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import { issueCategoryLabel } from "@/lib/domain/appointments";
import { formatRelative, vehicleName } from "@/lib/format";
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
  const meta = REPAIR_STATUS_META[repair.current_status];
  const tone = TONE_CLASSES[meta.tone];
  const action = getCustomerRepairAction(view);
  const isClosed = repair.current_status === "closed";

  return (
    <div className="space-y-5">
      <BackHeader title={`${vehicleName(vehicle)} · ${vehicle.license_plate}`} />

      {/* Estado actual: imposible de pasar por alto */}
      <section className={cn("rounded-3xl p-6 ring-1 ring-inset", tone.soft)} aria-live="polite">
        <p className={cn("text-sm font-medium", tone.text)}>Estado actual</p>
        <p className="mt-1 text-3xl font-semibold leading-tight tracking-tight">{meta.label}</p>
        <p className="mt-2 text-muted-foreground">{meta.customerDescription}</p>
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
          <Button asChild size="xl" variant={action.emphasis === "default" ? "default" : "outline"} className="w-full">
            <Link href={routes.customerMessages(repair.id)}>
              <MessageCircle aria-hidden /> Contactar con el taller
              {view.unreadMessages > 0 && (
                <span className="ml-1 rounded-full bg-destructive px-2 py-0.5 text-xs text-white">{view.unreadMessages}</span>
              )}
            </Link>
          </Button>
        </div>
      )}

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-5 font-semibold">Progreso</h2>
        <RepairStatusTimeline status={repair.current_status} history={history} />
      </section>

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
