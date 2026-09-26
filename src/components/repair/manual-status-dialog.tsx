"use client";

import { useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { changeRepairStatus } from "@/lib/data/actions";
import { REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import { REPAIR_STATUSES, type RepairStatus } from "@/types/database";

/** Opción secundaria para corregir el estado a mano (queda en el historial). */
export function ManualStatusDialog({ repairId, current }: { repairId: string; current: RepairStatus }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RepairStatus>(current);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await changeRepairStatus(repairId, status, { manual: true, note: note.trim() || undefined });
      toast.success(`Estado corregido: ${REPAIR_STATUS_META[status].label}`);
      setOpen(false);
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo corregir");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setStatus(current);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <SlidersHorizontal aria-hidden /> Corregir estado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Corregir estado</DialogTitle>
          <DialogDescription>Úsalo solo para arreglar errores. El cambio queda registrado en el historial.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-status">Nuevo estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RepairStatus)}>
              <SelectTrigger id="manual-status" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPAIR_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {REPAIR_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-note">Motivo (opcional)</Label>
            <Textarea id="manual-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: pulsé el botón por error" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={busy || status === current}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
