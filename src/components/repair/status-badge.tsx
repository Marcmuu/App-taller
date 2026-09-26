import { cn } from "@/lib/utils";
import { REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import type { RepairStatus } from "@/types/database";
import { TONE_CLASSES } from "./status-tone";

export function StatusBadge({
  status,
  variant = "short",
  className,
}: {
  status: RepairStatus;
  variant?: "short" | "long";
  className?: string;
}) {
  const meta = REPAIR_STATUS_META[status];
  const tone = TONE_CLASSES[meta.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tone.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
      {variant === "short" ? meta.shortLabel : meta.label}
    </span>
  );
}
