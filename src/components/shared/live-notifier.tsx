"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getNotifications } from "@/lib/data/queries";
import { useData, useRequiredProfile } from "@/lib/data/hooks";

/**
 * Muestra un aviso cuando llega una notificación nueva sin recargar
 * (el equivalente visual de Supabase Realtime).
 */
export function LiveNotifier() {
  const profile = useRequiredProfile();
  const notifications = useData((s) => getNotifications(s.db, profile.id));
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(notifications.map((n) => n.id));
      return;
    }
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (!n.read_at) toast(n.title, { description: n.body });
    }
  }, [notifications]);

  return null;
}
