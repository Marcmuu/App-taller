"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getNotifications } from "@/lib/data/queries";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { customerNotificationHref, workshopNotificationHref } from "@/lib/notification-links";
import { getPushState, showDeviceNotification, syncPush } from "@/lib/push";

/**
 * Muestra un aviso cuando llega una notificación nueva sin recargar
 * (el equivalente visual de Supabase Realtime). Con la app en segundo plano y
 * los avisos del móvil activados, sale como notificación del sistema.
 */
export function LiveNotifier() {
  const profile = useRequiredProfile();
  const notifications = useData((s) => getNotifications(s.db, profile.id));
  const seen = useRef<Set<string> | null>(null);
  const staff = profile.role !== "customer";

  // Asocia este dispositivo a quien ha entrado (si tiene los avisos activados)
  useEffect(() => {
    void syncPush();
  }, [profile.id]);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(notifications.map((n) => n.id));
      return;
    }
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read_at) continue;
      if (document.visibilityState === "hidden" && getPushState() === "on") {
        void showDeviceNotification(n, staff ? workshopNotificationHref(n) : customerNotificationHref(n));
      } else {
        toast(n.title, { description: n.body });
      }
    }
  }, [notifications, staff]);

  return null;
}
