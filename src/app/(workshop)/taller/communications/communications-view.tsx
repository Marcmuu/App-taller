"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, MessagesSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { CommunicationTimeline } from "@/components/repair/communication-timeline";
import { StatusBadge } from "@/components/repair/status-badge";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getWorkshopConversations } from "@/lib/data/queries";
import { formatDayLabel, formatTime, vehicleName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isToday } from "date-fns";
import { routes } from "@/lib/routes";

export function CommunicationsView() {
  const selectedId = useSearchParams().get("repair");
  const profile = useRequiredProfile();
  const conversations = useData((s) => getWorkshopConversations(s.db, profile.workshop_id ?? ""));
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? conversations.filter((c) =>
        [c.customer.full_name, c.vehicle.license_plate, vehicleName(c.vehicle)].some((t) => t.toLowerCase().includes(q)),
      )
    : conversations;
  const selected = conversations.find((c) => c.repair.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <h1 className={cn("text-2xl font-semibold tracking-tight", selected && "hidden lg:block")}>Comunicaciones</h1>

      <div className="grid gap-4 lg:h-[calc(100dvh-10rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Lista */}
        <section className={cn("flex min-h-0 flex-col rounded-2xl border bg-card", selected && "hidden lg:flex")}>
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente o matrícula"
                aria-label="Buscar conversación"
                className="h-10 pl-9"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin resultados</p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
              {filtered.map((c) => {
                const active = c.repair.id === selectedId;
                return (
                  <li key={c.repair.id}>
                    <Link
                      href={routes.workshopConversation(c.repair.id)}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={cn("block space-y-1 px-4 py-3 hover:bg-muted/50", active && "bg-primary/5")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-sm", c.unreadMessages > 0 ? "font-semibold" : "font-medium")}>
                          {c.customer.full_name}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {isToday(new Date(c.lastActivity)) ? formatTime(c.lastActivity) : formatDayLabel(c.lastActivity)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {vehicleName(c.vehicle)} · {c.vehicle.license_plate}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-sm", c.unreadMessages > 0 ? "text-foreground" : "text-muted-foreground")}>
                          {c.lastMessage?.body ?? "Sin mensajes"}
                        </p>
                        {c.unreadMessages > 0 ? (
                          <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
                            {c.unreadMessages}
                          </span>
                        ) : (
                          <StatusBadge status={c.repair.current_status} className="shrink-0 px-2 py-0.5 text-[11px]" />
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Cronología */}
        <section className={cn("flex min-h-0 flex-col rounded-2xl border bg-card", !selected && "hidden lg:flex")}>
          {selected ? (
            <>
              <header className="flex items-center gap-3 border-b px-4 py-3">
                <Link href="/taller/communications" className="grid size-9 place-items-center rounded-full hover:bg-muted lg:hidden" aria-label="Volver a la lista">
                  <ArrowLeft className="size-5" aria-hidden />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{selected.customer.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {vehicleName(selected.vehicle)} · {selected.vehicle.license_plate}
                  </p>
                </div>
                <StatusBadge status={selected.repair.current_status} className="hidden sm:inline-flex" />
                <Link
                  href={routes.workshopRepair(selected.repair.id)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Ficha <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </header>
              <div data-scroll className="min-h-[60dvh] flex-1 overflow-y-auto px-4 pt-4 lg:min-h-0">
                <CommunicationTimeline key={selected.repair.id} repairId={selected.repair.id} viewer="workshop" />
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState icon={MessagesSquare} title="Elige una conversación" description="Aquí verás mensajes, cambios de estado y presupuestos." className="border-0" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
