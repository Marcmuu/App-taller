"use client";

import { useState } from "react";
import { CarFront, Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { AppointmentRequestCard } from "@/components/workshop/appointment-request-card";
import { RepairCard } from "@/components/workshop/repair-card";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getWorkshopBoard, type RepairView } from "@/lib/data/queries";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RepairStatus } from "@/types/database";

const isRejected = (r: RepairView) =>
  r.repair.current_status === "estimate_pending" && r.estimate?.status === "rejected";
const inStatus = (...statuses: RepairStatus[]) => (r: RepairView) => statuses.includes(r.repair.current_status);

const FILTERS: Array<{ key: string; label: string; match: (r: RepairView) => boolean }> = [
  { key: "all", label: "Todos", match: () => true },
  { key: "appointments", label: "Citas", match: inStatus("appointment_confirmed") },
  { key: "received", label: "Recibidos", match: inStatus("vehicle_received") },
  { key: "diagnosis", label: "Diagnóstico", match: inStatus("diagnosis") },
  // Los rechazados van aparte para que no abulten los pendientes.
  { key: "estimate", label: "Presupuesto", match: (r) => inStatus("estimate_pending")(r) && !isRejected(r) },
  { key: "repair", label: "Reparación", match: inStatus("repair_in_progress") },
  { key: "ready", label: "Listos", match: inStatus("ready_for_pickup") },
  { key: "rejected", label: "Rechazados", match: isRejected },
];

export default function WorkshopDashboardPage() {
  const profile = useRequiredProfile();
  const board = useData((s) => getWorkshopBoard(s, profile.workshop_id ?? ""));
  const [filter, setFilter] = useState("all");

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const count = (match: (r: RepairView) => boolean) => board.repairs.filter(match).length;
  // En "Todos", los rechazados se muestran al final.
  const visible = board.repairs
    .filter(active.match)
    .sort((a, b) => Number(isRejected(a)) - Number(isRejected(b)));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{formatLongDate(new Date())}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Vehículos en el taller</h1>
      </div>

      {board.requests.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Inbox className="size-4 text-primary" aria-hidden />
            Solicitudes de cita
            <span className="rounded-full bg-primary px-2 text-xs leading-5 text-primary-foreground">{board.requests.length}</span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {board.requests.map((request) => (
              <AppointmentRequestCard key={request.appointment.id} request={request} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2" role="tablist" aria-label="Filtrar por estado">
            {FILTERS.map((f) => {
              const n = count(f.match);
              const selected = f.key === filter;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
                    selected ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/30",
                  )}
                >
                  {f.label}
                  <span className={cn("tabular-nums", selected ? "text-background/70" : "text-muted-foreground")}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={CarFront}
            title={filter === "all" ? "No hay vehículos activos" : `Nada en «${active.label}»`}
            description={filter === "all" ? "Cuando confirmes una cita aparecerá aquí." : "Prueba con otro filtro."}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((view) => (
              <RepairCard key={view.repair.id} view={view} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
