import Link from "next/link";
import { isToday } from "date-fns";
import { Clock, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/repair/status-badge";
import { NextRepairActionButton } from "@/components/repair/next-repair-action-button";
import { getNextRepairAction } from "@/lib/domain/repair-status";
import type { RepairView } from "@/lib/data/queries";
import { formatDateTime, formatEstimate, formatTime, vehicleName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

/** Tarjeta del dashboard: se puede actuar sin abrir la reparación. */
export function RepairCard({ view }: { view: RepairView }) {
  const { repair, vehicle, customer, appointment, estimate } = view;
  const action = getNextRepairAction(repair.current_status, { estimateStatus: estimate?.status });
  const when = appointment?.scheduled_at;
  // Resaltar solo cuando el cliente ha respondido y el taller tiene que actuar.
  const needsAttention =
    repair.current_status === "estimate_pending" &&
    (estimate?.status === "question" || estimate?.status === "accepted");
  const rejected = repair.current_status === "estimate_pending" && estimate?.status === "rejected";
  const showEstimate =
    repair.estimated_ready_at && repair.current_status === "repair_in_progress";

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-card shadow-xs transition hover:shadow-md",
        needsAttention && "border-amber-300 ring-1 ring-amber-200",
        rejected && "border-red-200 bg-red-50/30",
      )}
    >
      <Link href={routes.workshopRepair(repair.id)} className="flex-1 space-y-3 rounded-t-2xl p-5 hover:bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{vehicleName(vehicle)}</h3>
            <p className="mt-0.5 inline-block rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{vehicle.license_plate}</p>
          </div>
          <StatusBadge status={repair.current_status} estimateStatus={estimate?.status} />
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate font-medium">{customer.full_name}</span>
          {when && (
            <span className="inline-flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {isToday(new Date(when)) ? formatTime(when) : formatDateTime(when)}
            </span>
          )}
        </div>
        {showEstimate && repair.estimated_ready_at && (
          <p className="text-xs text-muted-foreground">
            Entrega prevista: <span className="font-medium text-foreground">{formatEstimate(repair.estimated_ready_at)}</span>
          </p>
        )}
        {(action.hint || view.unreadMessages > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {action.hint && (
              <span className={cn("font-medium", needsAttention ? "text-amber-700" : rejected ? "text-red-700" : "text-muted-foreground")}>{action.hint}</span>
            )}
            {view.unreadMessages > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <MessageCircle className="size-3.5" aria-hidden /> {view.unreadMessages} sin leer
              </span>
            )}
          </div>
        )}
      </Link>
      <div className="p-3 pt-0">
        <NextRepairActionButton repair={repair} estimate={estimate} size="lg" className="h-11 text-sm font-semibold" />
      </div>
    </article>
  );
}
