import { routes } from "@/lib/routes";
import type { Notification } from "@/types/database";

/**
 * Pantalla a la que lleva cada aviso (lista de avisos, aviso emergente y
 * notificación del móvil). La función send-push de Supabase repite esta
 * misma lógica: si cambias algo aquí, cámbialo también allí.
 */
export function customerNotificationHref(n: Pick<Notification, "type" | "repair_order_id">): string | null {
  if (n.repair_order_id) {
    return n.type === "message" ? routes.customerMessages(n.repair_order_id) : routes.customerRepair(n.repair_order_id);
  }
  if (n.type === "message") return routes.customerGeneralChat();
  return n.type === "appointment_cancelled" ? "/app" : null;
}

export function workshopNotificationHref(n: Pick<Notification, "type" | "repair_order_id">): string {
  if (n.repair_order_id) return routes.workshopRepair(n.repair_order_id);
  return n.type === "message" ? "/taller/communications" : "/taller";
}
