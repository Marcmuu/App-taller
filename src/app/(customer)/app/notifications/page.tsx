"use client";

import { NotificationList } from "@/components/shared/notification-list";
import { routes } from "@/lib/routes";

export default function CustomerNotificationsPage() {
  return (
    <div className="space-y-5 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Avisos</h1>
      <NotificationList
        hrefFor={(n) =>
          n.repair_order_id
            ? n.type === "message"
              ? routes.customerMessages(n.repair_order_id)
              : routes.customerRepair(n.repair_order_id)
            : n.type === "message"
              ? routes.customerGeneralChat()
              : n.type === "appointment_cancelled"
                ? "/app"
                : null
        }
      />
    </div>
  );
}
