"use client";

import { useState } from "react";
import { CalendarClock, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MediaGallery } from "@/components/media/media-gallery";
import { SlotPicker } from "@/components/customer/slot-picker";
import { confirmAppointment, declineAppointment } from "@/lib/data/actions";
import type { AppointmentRequestView } from "@/lib/data/queries";
import { DRIVABLE_LABELS, issueCategoryLabel } from "@/lib/domain/appointments";
import { formatDateTime, formatRelative, vehicleName } from "@/lib/format";

export function AppointmentRequestCard({ request }: { request: AppointmentRequestView }) {
  const { appointment, vehicle, customer, media } = request;
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [proposing, setProposing] = useState(false);
  const [proposedAt, setProposedAt] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmAppointment(appointment.id);
      toast.success(`Cita confirmada · ${customer.full_name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar");
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      await declineAppointment(appointment.id, reason.trim(), proposing ? proposedAt : null);
      toast(proposing && proposedAt ? "Hemos propuesto la nueva hora al cliente." : "Solicitud rechazada. Hemos avisado al cliente.");
      setDeclineOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo rechazar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">
            {vehicleName(vehicle)} <span className="font-mono text-xs font-normal text-muted-foreground">{vehicle.license_plate}</span>
          </h3>
          <p className="text-sm">{customer.full_name}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <CalendarClock className="size-3.5" aria-hidden /> {formatDateTime(appointment.scheduled_at)}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-medium">{issueCategoryLabel(appointment.issue_category)}</p>
        {appointment.issue_description && <p className="line-clamp-2 text-muted-foreground">{appointment.issue_description}</p>}
        {appointment.drivable_status && <p className="text-xs text-muted-foreground">{DRIVABLE_LABELS[appointment.drivable_status]}</p>}
      </div>

      {media.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Camera className="size-3.5" aria-hidden /> {media.length} {media.length === 1 ? "archivo" : "archivos"}
          </p>
          <MediaGallery media={media} />
        </div>
      )}

      <div className="mt-auto flex items-center gap-2">
        <Button size="lg" className="h-11 flex-1 font-semibold" onClick={confirm} disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          CONFIRMAR CITA
        </Button>
        <Button size="lg" variant="outline" className="h-11" onClick={() => setDeclineOpen(true)} disabled={busy}>
          No puedo
        </Button>
      </div>
      <p className="text-right text-[11px] text-muted-foreground">Solicitada {formatRelative(appointment.created_at)}</p>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No puedo a esa hora</DialogTitle>
            <DialogDescription>
              {customer.full_name} recibirá este mensaje. Puedes proponerle otra hora: la acepta con un toque.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: A esa hora estamos completos. ¿Te viene bien por la tarde?"
            className="min-h-20"
            aria-label="Mensaje para el cliente"
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={proposing}
              onChange={(e) => setProposing(e.target.checked)}
              className="size-4 accent-[var(--color-primary)]"
            />
            Proponer otra hora
          </label>
          {proposing && <SlotPicker value={proposedAt} onChange={setProposedAt} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant={proposing ? "default" : "destructive"} onClick={decline} disabled={busy || (proposing && !proposedAt)}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {proposing ? (proposedAt ? `Proponer ${formatDateTime(proposedAt)}` : "Elige una hora") : "Rechazar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
