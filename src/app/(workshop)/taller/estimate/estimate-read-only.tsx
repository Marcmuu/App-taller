"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleHelp, CircleX, Clock, FilePlus2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EstimateSummary } from "@/components/estimate/estimate-summary";
import { getOrCreateDraftEstimate } from "@/lib/data/actions";
import type { RepairView } from "@/lib/data/queries";
import { ESTIMATE_STATUS_META } from "@/lib/domain/estimate";
import { formatDateTime } from "@/lib/format";
import type { Estimate, EstimateItem } from "@/types/database";
import { routes } from "@/lib/routes";

export function EstimateReadOnly({
  estimate,
  items,
  view,
  isLatest,
}: {
  estimate: Estimate;
  items: EstimateItem[];
  view: RepairView;
  isLatest: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const closed = view.repair.current_status === "closed";

  const newVersion = async () => {
    setBusy(true);
    try {
      const id = await getOrCreateDraftEstimate(view.repair.id);
      router.push(routes.workshopEstimate(id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la versión");
      setBusy(false);
    }
  };

  const banner = {
    sent: { icon: <Clock className="size-5" aria-hidden />, cls: "bg-muted text-foreground ring-border", text: `Enviado ${estimate.sent_at ? formatDateTime(estimate.sent_at) : ""}. Esperando respuesta del cliente.` },
    accepted: { icon: <CircleCheck className="size-5" aria-hidden />, cls: "bg-green-50 text-green-900 ring-green-200", text: `Aceptado por el cliente ${estimate.accepted_at ? formatDateTime(estimate.accepted_at) : ""} (versión ${estimate.version}).` },
    rejected: { icon: <CircleX className="size-5" aria-hidden />, cls: "bg-red-50 text-red-900 ring-red-200", text: `Rechazado por el cliente ${estimate.rejected_at ? formatDateTime(estimate.rejected_at) : ""}. Revisa los mensajes y, si procede, envía una nueva versión.` },
    question: { icon: <CircleHelp className="size-5" aria-hidden />, cls: "bg-amber-50 text-amber-900 ring-amber-200", text: "El cliente tiene una consulta. Respóndele en la conversación o envía una nueva versión." },
    draft: null,
  }[estimate.status];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Presupuesto · versión {estimate.version}</h1>
          <p className="text-sm text-muted-foreground">{ESTIMATE_STATUS_META[estimate.status].label}</p>
        </div>
        {!isLatest && (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            Esta versión ha sido sustituida por una más reciente.
          </p>
        )}
        {banner && (
          <div className={`flex gap-3 rounded-2xl p-4 text-sm ring-1 ring-inset ${banner.cls}`} role="status">
            <span className="shrink-0">{banner.icon}</span>
            <p>{banner.text}</p>
          </div>
        )}
        <EstimateSummary
          items={items}
          subtotal={estimate.subtotal}
          taxRate={estimate.tax_rate}
          taxAmount={estimate.tax_amount}
          total={estimate.total}
        />
      </div>

      <aside className="space-y-3 lg:sticky lg:top-22 lg:self-start">
        {isLatest && !closed && (
          <div className="space-y-3 rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Para cambiar importes o líneas se crea una nueva versión. El cliente tendrá que aceptarla de nuevo.
            </p>
            <Button size="xl" variant={estimate.status === "accepted" ? "outline" : "default"} className="w-full" onClick={newVersion} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <FilePlus2 aria-hidden />}
              Crear nueva versión
            </Button>
          </div>
        )}
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={routes.workshopConversation(view.repair.id)}>Ver conversación</Link>
        </Button>
      </aside>
    </div>
  );
}
