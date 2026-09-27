"use client";

import { Phone } from "lucide-react";
import { BackHeader } from "@/components/customer/back-header";
import { CommunicationTimeline } from "@/components/repair/communication-timeline";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getDefaultWorkshop } from "@/lib/data/queries";
import { routes } from "@/lib/routes";

/** Consulta general con el taller, sin necesidad de tener una reparación abierta. */
export default function CustomerGeneralChatPage() {
  const profile = useRequiredProfile();
  const workshop = useData((s) => getDefaultWorkshop(s.db));

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader
        title={`${workshop.name} · Consulta`}
        href={routes.customerInbox()}
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
      <CommunicationTimeline thread={{ customerId: profile.id, repairId: null }} viewer="customer" className="flex-1" />
    </div>
  );
}
