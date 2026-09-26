"use client";

import { NotificationList } from "@/components/shared/notification-list";
import { routes } from "@/lib/routes";

export default function CustomerNotificationsPage() {
  return (
    <div className="space-y-5 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Avisos</h1>
      <NotificationList hrefFor={(repairId) => routes.customerRepair(repairId)} />
    </div>
  );
}
