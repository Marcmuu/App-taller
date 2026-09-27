"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isToday } from "date-fns";
import { ArrowLeft, ExternalLink, MessageCircleQuestion, MessagesSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { CommunicationTimeline } from "@/components/repair/communication-timeline";
import { StatusBadge } from "@/components/repair/status-badge";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getWorkshopConversations, type Conversation } from "@/lib/data/queries";
import { formatDayLabel, formatTime, vehicleName } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

function subtitle(c: Conversation): string {
  return c.vehicle ? `${vehicleName(c.vehicle)} · ${c.vehicle.license_plate}` : "Consulta general";
}

function hrefFor(c: Conversation): string {
  return c.thread.repairId ? routes.workshopConversation(c.thread.repairId) : routes.workshopGeneralConversation(c.thread.customerId);
}

export function CommunicationsView() {
  const params = useSearchParams();
  const selectedRepair = params.get("repair");
  const selectedCustomer = params.get("cliente");
  const profile = useRequiredProfile();
  const conversations = useData((s) => getWorkshopConversations(s.db, profile.workshop_id ?? ""));
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? conversations.filter((c) =>
        [c.customer.full_name, c.vehicle?.license_plate ?? "", c.vehicle ? vehicleName(c.vehicle) : "consulta general"].some((t) =>
          t.toLowerCase().includes(q),
        ),
      )
    : conversations;
  const selected =
    conversations.find((c) =>
      selectedRepair
        ? c.thread.repairId === selectedRepair
        : selectedCustomer
          ? c.thread.repairId === null && c.thread.customerId === selectedCustomer
          : false,
    ) ?? null;

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
                const active = c.key === selected?.key;
                return (
                  <li key={c.key}>
                    <Link
                      href={hrefFor(c)}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={cn("block space-y-1 px-4 py-3 hover:bg-muted/50", active && "bg-primary/5")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-sm", c.unreadMessages > 0 ? "font-semibold" : "font-medium")}>
                          {c.customer.full_name}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {c.lastActivity ? (isToday(new Date(c.lastActivity)) ? formatTime(c.lastActivity) : formatDayLabel(c.lastActivity)) : ""}
                        </span>
                      </div>
                      <p className={cn("flex items-center gap-1 truncate text-xs", c.repair ? "text-muted-foreground" : "font-medium text-primary")}>
                        {!c.repair && <MessageCircleQuestion className="size-3.5" aria-hidden />}
                        {subtitle(c)}
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
                          c.repair && <StatusBadge status={c.repair.current_status} className="shrink-0 px-2 py-0.5 text-[11px]" />
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Conversación */}
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
                    {subtitle(selected)} · {selected.customer.phone}
                  </p>
                </div>
                {selected.repair && (
                  <>
                    <StatusBadge status={selected.repair.current_status} className="hidden sm:inline-flex" />
                    <Link
                      href={routes.workshopRepair(selected.repair.id)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Ficha <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  </>
                )}
              </header>
              <div data-scroll className="min-h-[60dvh] flex-1 overflow-y-auto px-4 pt-4 lg:min-h-0">
                <CommunicationTimeline key={selected.key} thread={selected.thread} viewer="workshop" />
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
