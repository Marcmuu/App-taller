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
}: {
  status: RepairStatus;
  history: RepairStatusHistory[];
}) {
  const currentIndex = status === "closed" ? CUSTOMER_TIMELINE_STEPS.length : statusIndex(status);
  const tone = TONE_CLASSES[REPAIR_STATUS_META[status].tone];

  const reachedAt = (step: RepairStatus) =>
    history.filter((h) => h.to_status === step).at(-1)?.created_at ?? null;

  return (
    <ol className="relative">
      {CUSTOMER_TIMELINE_STEPS.map((step, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        const at = reachedAt(step);
        const isLast = i === CUSTOMER_TIMELINE_STEPS.length - 1;
        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0" aria-current={state === "current" ? "step" : undefined}>
            {!isLast && (
              <span
                className={cn(
                  "absolute left-3.75 top-8 h-[calc(100%-2rem)] w-0.5",
                  i < currentIndex ? "bg-primary" : "bg-foreground/10",
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
                )}
              >
                {REPAIR_STATUS_META[step].label}
              </p>
              {at && state !== "upcoming" && (
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(at)}</p>
              )}
              {state === "current" && (
                <p className="mt-1 text-sm text-muted-foreground">{REPAIR_STATUS_META[step].customerDescription}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
