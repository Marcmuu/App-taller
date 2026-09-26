"use client";

import Link from "next/link";
import { CalendarPlus, CarFront, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActiveRepairCard } from "@/components/customer/active-repair-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/repair/status-badge";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getCustomerHome } from "@/lib/data/queries";
import { issueCategoryLabel } from "@/lib/domain/appointments";
import { formatDateTime, formatDayLabel, vehicleName } from "@/lib/format";
import { routes } from "@/lib/routes";

export default function CustomerHomePage() {
  const profile = useRequiredProfile();
  const home = useData((s) => getCustomerHome(s.db, profile.id));
  const firstName = profile.full_name.split(" ")[0];
  const hasActivity = home.activeRepairs.length > 0 || home.pendingRequests.length > 0;

  return (
    <div className="space-y-6 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Hola, {firstName}</h1>

      {!home.hasVehicles ? (
        <EmptyState
          icon={CarFront}
          title="Añade tu coche para empezar"
          description="Solo necesitamos la matrícula, la marca y el modelo."
          action={
            <Button asChild size="xl">
              <Link href="/app/vehicles?nuevo=1">Añadir vehículo</Link>
            </Button>
          }
        />
      ) : (
        <>
          {home.activeRepairs.length > 0 && (
            <section className="space-y-3" aria-label="Tus coches en el taller">
              {home.activeRepairs.map((view) => (
                <ActiveRepairCard key={view.repair.id} view={view} />
              ))}
            </section>
          )}

          {home.pendingRequests.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Solicitudes enviadas</h2>
              {home.pendingRequests.map(({ appointment, vehicle }) => (
                <div key={appointment.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                  <span className="grid size-10 place-items-center rounded-full bg-amber-100 text-amber-700">
                    <Clock className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {vehicle ? vehicleName(vehicle) : "Vehículo"} · {issueCategoryLabel(appointment.issue_category)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(appointment.scheduled_at)} · Pendiente de confirmar
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {!hasActivity && (
            <EmptyState
              icon={CalendarPlus}
              title="No tienes citas"
              description="Cuando pidas cita podrás seguir aquí la reparación paso a paso."
            />
          )}

          <Button asChild size="xl" variant={hasActivity ? "outline" : "default"} className="w-full">
            <Link href="/app/appointments/new">
              <CalendarPlus aria-hidden /> Solicitar cita
            </Link>
          </Button>

          {home.pastRepairs.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <History className="size-4" aria-hidden /> Historial
              </h2>
              <ul className="divide-y rounded-2xl border bg-card">
                {home.pastRepairs.map(({ repair, vehicle }) => (
                  <li key={repair.id}>
                    <Link href={routes.customerRepair(repair.id)} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{vehicleName(vehicle)}</p>
                        <p className="text-sm text-muted-foreground">{formatDayLabel(repair.updated_at)}</p>
                      </div>
                      <StatusBadge status={repair.current_status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
