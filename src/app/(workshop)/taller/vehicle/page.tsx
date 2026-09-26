"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Mail, Phone, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaGallery } from "@/components/media/media-gallery";
import { CommunicationTimeline } from "@/components/repair/communication-timeline";
import { ManualStatusDialog } from "@/components/repair/manual-status-dialog";
import { NextRepairActionButton } from "@/components/repair/next-repair-action-button";
import { StatusBadge } from "@/components/repair/status-badge";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import {
  getAppointmentMedia,
  getEstimateItems,
  getProfile,
  getRepairHistory,
  getRepairView,
} from "@/lib/data/queries";
import { DRIVABLE_LABELS, issueCategoryLabel } from "@/lib/domain/appointments";
import { ESTIMATE_STATUS_META } from "@/lib/domain/estimate";
import { getNextRepairAction, REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import { formatCurrency, formatDateTime, vehicleName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

export default function WorkshopRepairDetailPage() {
  const repairId = useSearchParams().get("id") ?? "";
  const profile = useRequiredProfile();
  const data = useData((s) => {
    const view = getRepairView(s.db, repairId, true);
    // Equivalente a RLS: solo reparaciones del propio taller.
    if (!view || view.repair.workshop_id !== profile.workshop_id) return null;
    return {
      view,
      email: s.auth_users.find((u) => u.id === view.customer.id)?.email ?? null,
      media: getAppointmentMedia(s, view.repair.appointment_id),
      history: getRepairHistory(s.db, repairId).map((h) => ({ ...h, actor: getProfile(s.db, h.changed_by) })),
      estimateLines: view.estimate ? getEstimateItems(s.db, view.estimate.id).length : 0,
    };
  });

  if (!data) {
    return (
      <EmptyState
        icon={SearchX}
        title="No encontramos esta reparación"
        action={
          <Button asChild variant="outline">
            <Link href="/taller">Volver al panel</Link>
          </Button>
        }
      />
    );
  }

  const { view, email, media, history, estimateLines } = data;
  const { repair, vehicle, customer, appointment, estimate } = view;
  const action = getNextRepairAction(repair.current_status, { estimateStatus: estimate?.status });

  return (
    <div className="space-y-6">
      <Link href="/taller" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Vehículos
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          {/* Cabecera + acción rápida */}
          <section className="rounded-2xl border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{vehicleName(vehicle)}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{vehicle.license_plate}</span>
                  {vehicle.year && <span>{vehicle.year}</span>}
                  {appointment && <span>· Cita {formatDateTime(appointment.scheduled_at)}</span>}
                </p>
              </div>
              <StatusBadge status={repair.current_status} variant="long" className="text-sm" />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="sm:w-80">
                <NextRepairActionButton repair={repair} estimate={estimate} />
              </div>
              {action.hint && (
                <p className={cn("text-sm font-medium", action.type === "wait_customer" ? "text-muted-foreground" : "text-amber-700")}>
                  {action.hint}
                </p>
              )}
              <div className="sm:ml-auto">
                <ManualStatusDialog repairId={repair.id} current={repair.current_status} />
              </div>
            </div>
          </section>

          {/* Problema */}
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="mb-3 font-semibold">Problema indicado por el cliente</h2>
            {appointment ? (
              <div className="space-y-3">
                <p>
                  <span className="font-medium">{issueCategoryLabel(appointment.issue_category)}</span>
                  {appointment.drivable_status && (
                    <span className="ml-2 text-sm text-muted-foreground">· {DRIVABLE_LABELS[appointment.drivable_status]}</span>
                  )}
                </p>
                <p className="text-muted-foreground">{appointment.issue_description || "Sin descripción."}</p>
                <MediaGallery media={media} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Reparación abierta sin cita previa.</p>
            )}
          </section>

          {/* Presupuesto */}
          <section className="rounded-2xl border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Presupuesto</h2>
              {estimate && (
                <Button asChild variant="outline" size="lg">
                  <Link href={routes.workshopEstimate(estimate.id)}>
                    <FileText aria-hidden /> {estimate.status === "draft" ? "Continuar borrador" : "Ver presupuesto"}
                  </Link>
                </Button>
              )}
            </div>
            {estimate ? (
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Estado" value={ESTIMATE_STATUS_META[estimate.status].label} highlight={estimate.status === "accepted" ? "green" : estimate.status === "rejected" ? "red" : estimate.status === "question" ? "amber" : undefined} />
                <Stat label="Versión" value={`v${estimate.version}`} />
                <Stat label="Líneas" value={String(estimateLines)} />
                <Stat label="Total" value={formatCurrency(estimate.total)} />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Sin presupuesto todavía.
                {repair.current_status === "diagnosis" ? " Pulsa CREAR PRESUPUESTO cuando termines el diagnóstico." : ""}
              </p>
            )}
          </section>

          {/* Historial de estados */}
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Historial</h2>
            <ol className="space-y-3">
              {[...history].reverse().map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", h.note?.startsWith("Corrección") ? "bg-amber-500" : "bg-primary")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{REPAIR_STATUS_META[h.to_status].label}</span>
                      {h.actor && <span className="text-muted-foreground"> · {h.actor.full_name}</span>}
                    </p>
                    {h.note && <p className="text-muted-foreground">{h.note}</p>}
                  </div>
                  <time className="shrink-0 text-xs tabular-nums text-muted-foreground" dateTime={h.created_at}>
                    {formatDateTime(h.created_at)}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="mb-3 font-semibold">Cliente</h2>
            <p className="text-lg font-medium">{customer.full_name}</p>
            <div className="mt-3 grid gap-2 text-sm">
              <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-primary hover:underline">
                <Phone className="size-4" aria-hidden /> {customer.phone}
              </a>
              {email && (
                <a href={`mailto:${email}`} className="inline-flex items-center gap-2 text-primary hover:underline">
                  <Mail className="size-4" aria-hidden /> {email}
                </a>
              )}
            </div>
          </section>

          <section className="flex max-h-160 flex-col rounded-2xl border bg-card">
            <h2 className="border-b px-6 py-4 font-semibold">Comunicación</h2>
            <div data-scroll className="flex-1 overflow-y-auto px-4 pt-4">
              <CommunicationTimeline repairId={repair.id} viewer="workshop" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "amber" }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-semibold tabular-nums",
          highlight === "green" && "text-green-700",
          highlight === "red" && "text-red-700",
          highlight === "amber" && "text-amber-700",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
