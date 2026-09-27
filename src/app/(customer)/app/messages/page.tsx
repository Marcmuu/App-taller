"use client";

import Link from "next/link";
import { isToday } from "date-fns";
import { ChevronRight, MessageCircleQuestion, Wrench } from "lucide-react";
import { BackHeader } from "@/components/customer/back-header";
import { StatusBadge } from "@/components/repair/status-badge";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getCustomerConversations, getDefaultWorkshop } from "@/lib/data/queries";
import { formatDayLabel, formatTime, vehicleName } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Bandeja del cliente: consulta general con el taller y conversación de cada reparación. */
export default function CustomerInboxPage() {
  const profile = useRequiredProfile();
  const workshop = useData((s) => getDefaultWorkshop(s.db));
  const conversations = useData((s) => getCustomerConversations(s.db, profile.id));

  return (
    <div className="space-y-4">
      <BackHeader title="Mensajes" href="/app" />
      <p className="text-sm text-muted-foreground">
        Habla con {workshop.name}. Te responderá cualquier persona del taller y lo verás aquí.
      </p>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {conversations.map((c) => {
          const general = c.thread.repairId === null;
          const href = general ? routes.customerGeneralChat() : routes.customerMessages(c.thread.repairId ?? "");
          return (
            <li key={c.key}>
              <Link href={href} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full",
                    general ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {general ? <MessageCircleQuestion className="size-5" aria-hidden /> : <Wrench className="size-5" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate", c.unreadMessages > 0 ? "font-semibold" : "font-medium")}>
                      {general ? "Consulta con el taller" : c.vehicle ? vehicleName(c.vehicle) : "Reparación"}
                    </p>
                    {c.lastMessage && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {isToday(new Date(c.lastMessage.created_at)) ? formatTime(c.lastMessage.created_at) : formatDayLabel(c.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", c.unreadMessages > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {c.lastMessage?.body ?? (general ? "Pregunta lo que quieras: precios, dudas, citas…" : "Sin mensajes")}
                    </p>
                    {c.unreadMessages > 0 ? (
                      <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
                        {c.unreadMessages}
                      </span>
                    ) : (
                      c.repair && <StatusBadge status={c.repair.current_status} className="shrink-0 px-2 py-0.5 text-[11px]" />
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
