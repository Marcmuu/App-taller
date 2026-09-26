import Link from "next/link";
import { CalendarClock, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TONE_CLASSES } from "@/components/repair/status-tone";
import {
  CUSTOMER_TIMELINE_STEPS,
  REPAIR_STATUS_META,
  statusIndex,
} from "@/lib/domain/repair-status";
import { getCustomerRepairAction } from "@/lib/domain/customer-actions";
import type { RepairView } from "@/lib/data/queries";
import { formatDateTime, formatRelative, vehicleName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

export function ActiveRepairCard({ view }: { view: RepairView }) {
  const { repair, vehicle, appointment } = view;
  const meta = REPAIR_STATUS_META[repair.current_status];
  const tone = TONE_CLASSES[meta.tone];
  const action = getCustomerRepairAction(view);
  const step = statusIndex(repair.current_status) + 1;
  const total = CUSTOMER_TIMELINE_STEPS.length;

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <Link href={routes.customerRepair(repair.id)} className="block p-5 pb-4 hover:bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{vehicleName(vehicle)}</p>
            <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
          </div>
          <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <div className={cn("mt-4 rounded-xl p-4 ring-1 ring-inset", tone.soft)}>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", tone.dot)} />
              <span className={cn("relative inline-flex size-2.5 rounded-full", tone.dot)} />
            </span>
            <p className={cn("text-xs font-medium uppercase tracking-wide", tone.text)}>
              Paso {step} de {total}
            </p>
          </div>
          <p className="mt-1.5 text-xl font-semibold leading-tight">{meta.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{meta.customerDescription}</p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {CUSTOMER_TIMELINE_STEPS.map((s, i) => (
              <span key={s} className={cn("h-1.5 flex-1 rounded-full", i < step ? tone.dot : "bg-foreground/10")} />
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {repair.current_status === "appointment_confirmed" && appointment ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <CalendarClock className="size-3.5" aria-hidden /> Tu cita: {formatDateTime(appointment.scheduled_at)}
            </span>
          ) : (
            <span>Actualizado {formatRelative(repair.updated_at)}</span>
          )}
          {view.unreadMessages > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <MessageCircle className="size-3.5" aria-hidden />
              {view.unreadMessages} {view.unreadMessages === 1 ? "mensaje nuevo" : "mensajes nuevos"}
            </span>
          )}
        </div>
      </Link>

      <div className="border-t p-3">
        <Button
          asChild
          size="xl"
          variant={action.emphasis === "default" ? "secondary" : "default"}
          className={cn(
            "w-full",
            action.emphasis === "urgent" && "bg-amber-500 text-white hover:bg-amber-500/90",
            action.emphasis === "primary" && "bg-green-600 text-white hover:bg-green-600/90",
          )}
        >
          <Link href={action.href}>{action.label}</Link>
        </Button>
      </div>
    </article>
  );
}
