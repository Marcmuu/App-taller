"use client";

import { NotificationList } from "@/components/shared/notification-list";
import { customerNotificationHref } from "@/lib/notification-links";

export default function CustomerNotificationsPage() {
  return (
    <div className="space-y-5 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Avisos</h1>
      <NotificationList hrefFor={customerNotificationHref} />
    </div>
  );
}
