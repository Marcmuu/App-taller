import type { RepairView } from "@/lib/data/queries";
import { routes } from "@/lib/routes";
import type { RepairStatus } from "@/types/database";

export interface CustomerAction {
  label: string;
  href: string;
  /** "urgent" = requiere decisión del cliente (p. ej. presupuesto por aprobar). */
  emphasis: "urgent" | "primary" | "default";
}

/** CTA principal del cliente para una reparación, según su estado. */
export function getCustomerRepairAction(view: RepairView): CustomerAction {
  const { repair, estimate } = view;

  if (repair.current_status === "estimate_pending" && estimate) {
    if (estimate.status === "sent") {
      return { label: "Ver presupuesto", href: routes.customerEstimate(estimate.id), emphasis: "urgent" };
    }
    if (estimate.status === "question" || estimate.status === "rejected") {
      return { label: "Ver presupuesto", href: routes.customerEstimate(estimate.id), emphasis: "default" };
    }
  }
  if (repair.current_status === "ready_for_pickup") {
    return { label: "Ver recogida", href: routes.customerPickup(repair.id), emphasis: "primary" };
  }
  return { label: "Ver seguimiento", href: routes.customerRepair(repair.id), emphasis: "default" };
}

/** Estados en los que tiene sentido mostrar la fecha estimada de entrega. */
const SHOW_ESTIMATED: RepairStatus[] = ["estimate_pending", "repair_in_progress", "repair_completed"];

export function shouldShowEstimatedReady(view: RepairView): boolean {
  if (!view.repair.estimated_ready_at || !SHOW_ESTIMATED.includes(view.repair.current_status)) return false;
  // Con el presupuesto rechazado la fecha ya no aplica.
  return !(view.repair.current_status === "estimate_pending" && view.estimate?.status === "rejected");
}
