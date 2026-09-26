"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getEstimateItems, getLatestEstimate, getRepairView } from "@/lib/data/queries";
import { vehicleName } from "@/lib/format";
import { EstimateEditor } from "./estimate-editor";
import { EstimateReadOnly } from "./estimate-read-only";
import { routes } from "@/lib/routes";

export default function WorkshopEstimatePage() {
  const estimateId = useSearchParams().get("id") ?? "";
  const profile = useRequiredProfile();
  const data = useData((s) => {
    const estimate = s.db.estimates.find((e) => e.id === estimateId);
    if (!estimate || estimate.workshop_id !== profile.workshop_id) return null;
    const view = getRepairView(s.db, estimate.repair_order_id, true);
    if (!view) return null;
    return {
      estimate,
      view,
      items: getEstimateItems(s.db, estimate.id),
      isLatest: getLatestEstimate(s.db, estimate.repair_order_id)?.id === estimate.id,
    };
  });

  if (!data) {
    return (
      <EmptyState
        icon={SearchX}
        title="No encontramos este presupuesto"
        action={
          <Button asChild variant="outline">
            <Link href="/taller">Volver al panel</Link>
          </Button>
        }
      />
    );
  }

  const { estimate, view, items, isLatest } = data;

  return (
    <div className="space-y-6">
      <Link
        href={routes.workshopRepair(view.repair.id)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> {vehicleName(view.vehicle)} · {view.vehicle.license_plate}
      </Link>

      {estimate.status === "draft" ? (
        // key: el formulario se reinicia al cambiar de presupuesto
        <EstimateEditor key={estimate.id} estimate={estimate} items={items} view={view} />
      ) : (
        <EstimateReadOnly estimate={estimate} items={items} view={view} isLatest={isLatest} />
      )}
    </div>
  );
}
