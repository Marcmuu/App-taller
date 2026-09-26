import type { RepairView } from "@/lib/data/queries";
import { routes } from "@/lib/routes";

export interface CustomerAction {
  label: string;
  href: string;
  /** "urgent" = requiere decisión del cliente (p. ej. presupuesto por aprobar). */
  emphasis: "urgent" | "primary" | "default";
}

/** CTA principal del cliente para una reparación, según su estado. */
export function getCustomerRepairAction(view: RepairView): CustomerAction {
  const { repair, estimate } = view;

  if (repair.current_status === "estimate_pending" && estimate?.status === "sent") {
    return { label: "Ver presupuesto", href: routes.customerEstimate(estimate.id), emphasis: "urgent" };
  }
  if (repair.current_status === "ready_for_pickup") {
    return { label: "Ver recogida", href: routes.customerPickup(repair.id), emphasis: "primary" };
  }
  return { label: "Ver seguimiento", href: routes.customerRepair(repair.id), emphasis: "default" };
}
