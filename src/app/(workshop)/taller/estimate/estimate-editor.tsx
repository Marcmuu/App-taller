"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EstimateSummary } from "@/components/estimate/estimate-summary";
import { saveEstimateDraft, sendEstimate } from "@/lib/data/actions";
import type { RepairView } from "@/lib/data/queries";
import {
  calculateEstimateTotals,
  ESTIMATE_ITEM_TYPE_META,
  lineTotal,
} from "@/lib/domain/estimate";
import { formatCurrency } from "@/lib/format";
import { estimateFormSchema, type EstimateFormInput } from "@/lib/validators";
import { cn } from "@/lib/utils";
import type { Estimate, EstimateItem, EstimateItemType } from "@/types/database";
import { routes } from "@/lib/routes";

const SECTIONS: EstimateItemType[] = ["work", "part", "labor"];

/** Atajos para rellenar rápido las líneas más habituales. */
const PRESETS: Record<EstimateItemType, Array<{ description: string; quantity: number; unit_price: number }>> = {
  work: [
    { description: "Diagnosis electrónica", quantity: 1, unit_price: 45 },
    { description: "Revisión general", quantity: 1, unit_price: 35 },
  ],
  part: [
    { description: "Aceite 5W30 (litros)", quantity: 5, unit_price: 11 },
    { description: "Filtro de aceite", quantity: 1, unit_price: 14.5 },
  ],
  labor: [{ description: "Mano de obra (horas)", quantity: 1, unit_price: 48 }],
};

export function EstimateEditor({
  estimate,
  items,
  view,
}: {
  estimate: Estimate;
  items: EstimateItem[];
  view: RepairView;
}) {
  const router = useRouter();
  const form = useForm<EstimateFormInput>({
    resolver: zodResolver(estimateFormSchema),
    defaultValues: {
      tax_rate: estimate.tax_rate,
      items: items.map(({ type, description, quantity, unit_price }) => ({ type, description, quantity, unit_price })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [preview, setPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message;

  const save = form.handleSubmit(async (values) => {
    setBusy("save");
    try {
      await saveEstimateDraft(estimate.id, values);
      form.reset(values);
      toast.success("Borrador guardado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(null);
    }
  });

  const askSend = form.handleSubmit(() => setConfirmSend(true));

  const send = async () => {
    setBusy("send");
    try {
      await sendEstimate(estimate.id, form.getValues());
      toast.success(`Presupuesto enviado a ${view.customer.full_name}`);
      router.push(routes.workshopRepair(view.repair.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar");
      setBusy(null);
      setConfirmSend(false);
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {estimate.version > 1 ? `Presupuesto · versión ${estimate.version}` : "Nuevo presupuesto"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Borrador · El cliente no lo verá hasta que lo envíes.
          </p>
        </div>

        {SECTIONS.map((type) => {
          const rows = fields.map((field, index) => ({ field, index })).filter(({ field }) => field.type === type);
          return (
            <section key={type} className="rounded-2xl border bg-card p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {ESTIMATE_ITEM_TYPE_META[type].plural}
              </h2>

              {rows.length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="hidden grid-cols-[minmax(0,1fr)_90px_110px_100px_40px] gap-2 px-1 text-xs text-muted-foreground sm:grid">
                    <span>Descripción</span>
                    <span>{type === "labor" ? "Horas" : "Cantidad"}</span>
                    <span>Precio (€)</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>
                  {rows.map(({ field, index }) => (
                    <LineRow key={field.id} index={index} control={form.control} form={form} onRemove={() => remove(index)} />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => append({ type, description: "", quantity: 1, unit_price: 0 })}
                >
                  <Plus aria-hidden /> Añadir {ESTIMATE_ITEM_TYPE_META[type].label.toLowerCase()}
                </Button>
                {PRESETS[type].map((preset) => (
                  <button
                    key={preset.description}
                    type="button"
                    onClick={() => append({ type, ...preset })}
                    className="h-9 rounded-full border border-dashed px-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  >
                    + {preset.description} · {formatCurrency(preset.unit_price)}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {itemsError && <p className="text-sm text-destructive">{itemsError}</p>}
      </div>

      <aside className="lg:sticky lg:top-22 lg:self-start">
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <Totals control={form.control} />
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="tax_rate" className="text-sm text-muted-foreground">
              IVA (%)
            </Label>
            <Input
              id="tax_rate"
              type="number"
              step="1"
              min={0}
              max={100}
              className="h-9 w-20 text-right"
              {...form.register("tax_rate", { valueAsNumber: true })}
            />
          </div>
          <div className="grid gap-2 pt-2">
            <Button type="button" size="xl" onClick={askSend} disabled={busy !== null}>
              {busy === "send" ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              Enviar al cliente
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="lg" onClick={() => void save()} disabled={busy !== null}>
                {busy === "save" ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                Guardar
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => setPreview(true)}>
                <Eye aria-hidden /> Vista previa
              </Button>
            </div>
          </div>
          {form.formState.isDirty && <p className="text-center text-xs text-muted-foreground">Tienes cambios sin guardar</p>}
        </div>
      </aside>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Así lo verá {view.customer.full_name.split(" ")[0]}</DialogTitle>
            <DialogDescription>Vista previa del presupuesto en el móvil del cliente.</DialogDescription>
          </DialogHeader>
          <PreviewSummary control={form.control} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar presupuesto a {view.customer.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente recibirá un aviso para revisarlo y la reparación pasará a «Presupuesto pendiente».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "send"}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy === "send"}
              onClick={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              {busy === "send" && <Loader2 className="animate-spin" aria-hidden />}
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function LineRow({
  index,
  control,
  form,
  onRemove,
}: {
  index: number;
  control: Control<EstimateFormInput>;
  form: ReturnType<typeof useForm<EstimateFormInput>>;
  onRemove: () => void;
}) {
  const line = useWatch({ control, name: `items.${index}` });
  const errors = form.formState.errors.items?.[index];
  const total = Number.isFinite(line?.quantity) && Number.isFinite(line?.unit_price) ? lineTotal(line) : 0;

  return (
    <div className="grid grid-cols-[1fr_1fr_40px] gap-2 rounded-xl bg-muted/40 p-2 sm:grid-cols-[minmax(0,1fr)_90px_110px_100px_40px] sm:items-center sm:bg-transparent sm:p-0">
      <Input
        placeholder="Descripción"
        aria-label="Descripción"
        className={cn("col-span-3 h-10 bg-background sm:col-span-1", errors?.description && "border-destructive")}
        {...form.register(`items.${index}.description`)}
      />
      <Input
        type="number"
        step="0.1"
        min={0}
        aria-label="Cantidad"
        className={cn("h-10 bg-background tabular-nums", errors?.quantity && "border-destructive")}
        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
      />
      <Input
        type="number"
        step="0.01"
        min={0}
        aria-label="Precio unitario"
        className={cn("h-10 bg-background tabular-nums", errors?.unit_price && "border-destructive")}
        {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
      />
      <p className="hidden text-right text-sm font-medium tabular-nums sm:block">{formatCurrency(total)}</p>
      <Button type="button" variant="ghost" size="icon-lg" onClick={onRemove} aria-label="Quitar línea" className="row-start-2 col-start-3 sm:row-auto sm:col-auto">
        <Trash2 className="text-muted-foreground" aria-hidden />
      </Button>
    </div>
  );
}

function useLiveTotals(control: Control<EstimateFormInput>) {
  const items = useWatch({ control, name: "items" }) ?? [];
  const taxRate = useWatch({ control, name: "tax_rate" });
  const valid = items.filter((i) => Number.isFinite(i.quantity) && Number.isFinite(i.unit_price));
  const totals = calculateEstimateTotals(valid, Number.isFinite(taxRate) ? taxRate : 0);
  return { items: valid, totals };
}

function Totals({ control }: { control: Control<EstimateFormInput> }) {
  const { totals } = useLiveTotals(control);
  return (
    <dl className="space-y-2">
      <div className="flex justify-between text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular-nums">{formatCurrency(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between text-sm">
        <dt className="text-muted-foreground">IVA</dt>
        <dd className="tabular-nums">{formatCurrency(totals.tax_amount)}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t pt-3">
        <dt className="font-semibold">Total</dt>
        <dd className="text-2xl font-semibold tabular-nums">{formatCurrency(totals.total)}</dd>
      </div>
    </dl>
  );
}

function PreviewSummary({ control }: { control: Control<EstimateFormInput> }) {
  const { items, totals } = useLiveTotals(control);
  return (
    <EstimateSummary
      items={items.map((i) => ({ ...i, description: i.description || "(sin descripción)", total: lineTotal(i) }))}
      subtotal={totals.subtotal}
      taxRate={totals.tax_rate}
      taxAmount={totals.tax_amount}
      total={totals.total}
    />
  );
}
