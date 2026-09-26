import { ESTIMATE_ITEM_TYPE_META } from "@/lib/domain/estimate";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EstimateItemType } from "@/types/database";

interface SummaryLine {
  type: EstimateItemType;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

const ORDER: EstimateItemType[] = ["work", "part", "labor"];

/** Desglose claro: TRABAJOS · PIEZAS · MANO DE OBRA · SUBTOTAL · IVA · TOTAL */
export function EstimateSummary({
  items,
  subtotal,
  taxRate,
  taxAmount,
  total,
  className,
}: {
  items: SummaryLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card", className)}>
      {ORDER.map((type) => {
        const lines = items.filter((i) => i.type === type);
        if (lines.length === 0) return null;
        return (
          <section key={type} className="border-b p-5 last:border-b-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {ESTIMATE_ITEM_TYPE_META[type].plural}
            </h3>
            <ul className="space-y-3">
              {lines.map((line, i) => (
                <li key={`${type}-${i}`} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{line.description}</p>
                    {(line.quantity !== 1 || type === "labor") && (
                      <p className="text-sm text-muted-foreground">
                        {line.quantity.toLocaleString("es-ES")} × {formatCurrency(line.unit_price)}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatCurrency(line.total)}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <dl className="space-y-2 rounded-b-2xl bg-muted/50 p-5">
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">IVA ({taxRate.toLocaleString("es-ES")}%)</dt>
          <dd className="tabular-nums">{formatCurrency(taxAmount)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t pt-3">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatCurrency(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
