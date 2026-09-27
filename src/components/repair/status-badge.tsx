import { cn } from "@/lib/utils";
import { REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import type { EstimateStatus, RepairStatus } from "@/types/database";
import { TONE_CLASSES } from "./status-tone";

/** Matiz del estado "presupuesto" según la respuesta del cliente. */
const ESTIMATE_VARIANTS: Partial<Record<EstimateStatus, { short: string; long: string; badge: string; dot: string }>> = {
  rejected: { short: "Rechazado", long: "Presupuesto rechazado", badge: "bg-red-100 text-red-800 ring-red-200", dot: "bg-red-500" },
  question: { short: "Consulta", long: "Consulta del cliente", badge: "bg-amber-100 text-amber-900 ring-amber-200", dot: "bg-amber-500" },
  accepted: { short: "Aceptado", long: "Presupuesto aceptado", badge: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
};

export function StatusBadge({
  status,
  estimateStatus,
  variant = "short",
  className,
}: {
  status: RepairStatus;
  /** Si se indica y la reparación espera presupuesto, se muestra su matiz. */
  estimateStatus?: EstimateStatus | null;
  variant?: "short" | "long";
  className?: string;
}) {
  const meta = REPAIR_STATUS_META[status];
  const tone = TONE_CLASSES[meta.tone];
  const special = status === "estimate_pending" && estimateStatus ? ESTIMATE_VARIANTS[estimateStatus] : undefined;
  const label = special ? (variant === "short" ? special.short : special.long) : variant === "short" ? meta.shortLabel : meta.label;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        special?.badge ?? tone.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", special?.dot ?? tone.dot)} aria-hidden />
      {label}
    </span>
  );
}
