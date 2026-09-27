"use client";

import Link from "next/link";
import { CalendarPlus, CarFront, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActiveRepairCard } from "@/components/customer/active-repair-card";
import { PendingRequest } from "@/components/customer/pending-request";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/repair/status-badge";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getCustomerHome } from "@/lib/data/queries";
import { formatDayLabel, vehicleName } from "@/lib/format";
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
                <PendingRequest key={appointment.id} appointment={appointment} vehicle={vehicle} />
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
                {home.pastRepairs.map(({ repair, vehicle, appointment }) => (
                  <li key={repair.id}>
                    <Link href={routes.customerRepair(repair.id)} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{vehicleName(vehicle)}</p>
                        <p className="text-sm text-muted-foreground">{formatDayLabel(repair.updated_at)}</p>
                      </div>
                      {appointment?.status === "cancelled" ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Anulada</span>
                      ) : (
                        <StatusBadge status={repair.current_status} />
                      )}
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
