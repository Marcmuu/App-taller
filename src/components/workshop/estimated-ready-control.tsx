"use client";

import { useState } from "react";
import { Clock, Loader2 } from "lucide-react";
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
import { EstimatedReadyPicker } from "@/components/estimate/estimated-ready-picker";
import { setEstimatedReadyAt } from "@/lib/data/actions";
import { formatEstimate } from "@/lib/format";

/** Fecha orientativa de entrega en la ficha del taller, editable en cualquier momento. */
export function EstimatedReadyControl({ repairId, value }: { repairId: string; value: string | null }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(value);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await setEstimatedReadyAt(repairId, draft);
      toast.success(draft ? "Fecha estimada actualizada. Hemos avisado al cliente." : "Fecha estimada retirada");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Clock className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">Entrega prevista:</span>
      <span className="font-medium">{value ? formatEstimate(value) : "sin fecha"}</span>
      <Button
        variant="link"
        size="sm"
        className="h-auto px-1"
        onClick={() => {
          setDraft(value);
          setOpen(true);
        }}
      >
        {value ? "Cambiar" : "Poner fecha"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fecha estimada de entrega</DialogTitle>
            <DialogDescription>Orientativa. Si la cambias, el cliente recibirá un aviso.</DialogDescription>
          </DialogHeader>
          <EstimatedReadyPicker value={draft} onChange={setDraft} idPrefix="eta-detail" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={busy || draft === value}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
