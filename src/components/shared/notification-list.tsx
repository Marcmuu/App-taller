"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { markNotificationsRead } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getNotifications } from "@/lib/data/queries";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Lista de avisos del usuario. Se marcan como leídos tras unos segundos en
 * pantalla, para que dé tiempo a ver cuáles eran nuevos.
 */
export function NotificationList({ hrefFor }: { hrefFor: (repairId: string) => string }) {
  const profile = useRequiredProfile();
  const notifications = useData((s) => getNotifications(s.db, profile.id));

  useEffect(() => {
    const timer = setTimeout(markNotificationsRead, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (notifications.length === 0) {
    return <EmptyState icon={BellOff} title="No tienes avisos" description="Aquí verás cada novedad sobre tu coche." />;
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {notifications.map((n) => {
        const content = (
          <div className="flex gap-3 p-4">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={cn("leading-snug", !n.read_at && "font-semibold")}>{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatRelative(n.created_at)}</p>
            </div>
          </div>
        );
        return (
          <li key={n.id}>
            {n.repair_order_id ? (
              <Link href={hrefFor(n.repair_order_id)} className="block hover:bg-muted/40">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
