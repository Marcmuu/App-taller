import { Check } from "lucide-react";
import {
  CUSTOMER_TIMELINE_STEPS,
  REPAIR_STATUS_META,
  statusIndex,
} from "@/lib/domain/repair-status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RepairStatus, RepairStatusHistory } from "@/types/database";
import { TONE_CLASSES } from "./status-tone";

/** Timeline vertical tipo "seguimiento de pedido". */
export function RepairStatusTimeline({
  status,
  history,
  current,
}: {
  status: RepairStatus;
  history: RepairStatusHistory[];
  /** Texto del paso actual si difiere del genérico (p. ej. presupuesto rechazado). */
  current?: { label: string; description: string };
}) {
  const currentIndex = status === "closed" ? CUSTOMER_TIMELINE_STEPS.length : statusIndex(status);
  const tone = TONE_CLASSES[REPAIR_STATUS_META[status].tone];

  const reachedAt = (step: RepairStatus) =>
    history.filter((h) => h.to_status === step).at(-1)?.created_at ?? null;

  return (
    <ol className="relative">
      {CUSTOMER_TIMELINE_STEPS.map((step, i) => {
        // Un paso anterior solo cuenta como hecho si consta en el historial
        // (p. ej. al devolver un coche sin reparar, la reparación se salta).
        const reached = history.some((h) => h.to_status === step);
        const state =
          i < currentIndex ? (reached ? "done" : "skipped") : i === currentIndex ? "current" : "upcoming";
        const at = reachedAt(step);
        const isLast = i === CUSTOMER_TIMELINE_STEPS.length - 1;
        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0" aria-current={state === "current" ? "step" : undefined}>
            {!isLast && (
              <span
                className={cn(
                  "absolute left-3.75 top-8 h-[calc(100%-2rem)] w-0.5",
                  i < currentIndex && reached ? "bg-primary" : "bg-foreground/10",
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full",
                state === "done" && "bg-primary text-primary-foreground",
                state === "current" && cn(tone.solid, "ring-4 ring-foreground/10"),
                state === "upcoming" && "border-2 border-foreground/15 bg-background",
                state === "skipped" && "border-2 border-dashed border-foreground/15 bg-muted",
              )}
            >
              {state === "done" && <Check className="size-4" aria-hidden />}
              {state === "current" && <span className="size-2.5 animate-pulse rounded-full bg-white" aria-hidden />}
            </span>
            <div className="min-w-0 pt-1">
              <p
                className={cn(
                  "leading-tight",
                  state === "current" && "text-lg font-semibold",
                  state === "done" && "font-medium",
                  state === "upcoming" && "text-muted-foreground",
                  state === "skipped" && "text-muted-foreground line-through",
                )}
              >
                {state === "current" && current ? current.label : REPAIR_STATUS_META[step].label}
              </p>
              {state === "skipped" && <p className="mt-0.5 text-xs text-muted-foreground">No realizado</p>}
              {at && (state === "done" || state === "current") && (
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(at)}</p>
              )}
              {state === "current" && (
                <p className="mt-1 text-sm text-muted-foreground">{current?.description ?? REPAIR_STATUS_META[step].customerDescription}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
