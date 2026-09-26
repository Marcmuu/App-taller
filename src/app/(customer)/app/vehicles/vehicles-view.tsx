"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CarFront, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/repair/status-badge";
import { VehicleFormDialog } from "@/components/customer/vehicle-form-dialog";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getCustomerVehicles } from "@/lib/data/queries";
import { vehicleName } from "@/lib/format";
import { routes } from "@/lib/routes";

export function VehiclesView() {
  const profile = useRequiredProfile();
  const [dialogOpen, setDialogOpen] = useState(useSearchParams().get("nuevo") === "1");
  const vehicles = useData((s) =>
    getCustomerVehicles(s.db, profile.id).map((vehicle) => ({
      vehicle,
      activeRepair:
        s.db.repair_orders.find((r) => r.vehicle_id === vehicle.id && r.current_status !== "closed") ?? null,
    })),
  );

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Mis vehículos</h1>
        {vehicles.length > 0 && (
          <Button variant="outline" size="lg" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden /> Añadir
          </Button>
        )}
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={CarFront}
          title="Todavía no tienes vehículos"
          description="Añade tu coche para poder pedir cita."
          action={
            <Button size="xl" onClick={() => setDialogOpen(true)}>
              <Plus aria-hidden /> Añadir vehículo
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {vehicles.map(({ vehicle, activeRepair }) => (
            <li key={vehicle.id} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CarFront className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{vehicleName(vehicle)}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {vehicle.license_plate}
                    </span>
                    {vehicle.year && <span className="ml-2">{vehicle.year}</span>}
                  </p>
                </div>
              </div>
              {activeRepair ? (
                <Link
                  href={routes.customerRepair(activeRepair.id)}
                  className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <span className="text-muted-foreground">En el taller</span>
                  <StatusBadge status={activeRepair.current_status} />
                </Link>
              ) : (
                <Button asChild variant="secondary" size="lg" className="mt-4 w-full">
                  <Link href={`/app/appointments/new?vehiculo=${vehicle.id}`}>Pedir cita para este coche</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <VehicleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
