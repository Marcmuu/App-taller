"use client";

import { useSearchParams } from "next/navigation";
import { Phone } from "lucide-react";
import { BackHeader } from "@/components/customer/back-header";
import { CommunicationTimeline } from "@/components/repair/communication-timeline";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getDefaultWorkshop, getRepairView } from "@/lib/data/queries";
import { routes } from "@/lib/routes";

export default function CustomerMessagesPage() {
  const id = useSearchParams().get("id") ?? "";
  const profile = useRequiredProfile();
  const workshop = useData((s) => getDefaultWorkshop(s.db));
  const allowed = useData((s) => getRepairView(s.db, id, false)?.repair.customer_id === profile.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader
        title={workshop.name}
        href={routes.customerRepair(id)}
        right={
          <a
            href={`tel:${workshop.phone.replace(/\s/g, "")}`}
            className="grid size-10 place-items-center rounded-full text-primary hover:bg-muted"
            aria-label={`Llamar a ${workshop.name}`}
          >
            <Phone className="size-5" aria-hidden />
          </a>
        }
      />
      {allowed ? (
        <CommunicationTimeline repairId={id} viewer="customer" className="flex-1" />
      ) : (
        <p className="py-10 text-center text-muted-foreground">No encontramos esta conversación.</p>
      )}
    </div>
  );
}
