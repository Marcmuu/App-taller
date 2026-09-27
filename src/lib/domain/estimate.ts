import type {
  EstimateItemType,
  EstimateStatus,
} from "@/types/database";

export const DEFAULT_TAX_RATE = 21;

export const ESTIMATE_ITEM_TYPE_META: Record<
  EstimateItemType,
  { label: string; plural: string; order: number }
> = {
  work: { label: "Trabajo", plural: "Trabajos", order: 0 },
  part: { label: "Pieza", plural: "Piezas", order: 1 },
  labor: { label: "Mano de obra", plural: "Mano de obra", order: 2 },
};

export const ESTIMATE_STATUS_META: Record<
  EstimateStatus,
  { label: string; customerLabel: string }
> = {
  draft: { label: "Borrador", customerLabel: "En preparación" },
  sent: { label: "Enviado", customerLabel: "Pendiente de tu respuesta" },
  accepted: { label: "Aceptado", customerLabel: "Aceptado" },
  rejected: { label: "Rechazado", customerLabel: "Rechazado" },
  question: { label: "Consulta del cliente", customerLabel: "Consulta enviada" },
};

export interface EstimateLineInput {
  quantity: number;
  unit_price: number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineTotal(line: EstimateLineInput): number {
  return round2(line.quantity * line.unit_price);
}

export function calculateEstimateTotals(lines: EstimateLineInput[], taxRate: number) {
  const subtotal = round2(lines.reduce((sum, line) => sum + lineTotal(line), 0));
  const tax_amount = round2((subtotal * taxRate) / 100);
  return { subtotal, tax_rate: taxRate, tax_amount, total: round2(subtotal + tax_amount) };
}

interface CustomerResponseContext {
  status: EstimateStatus;
  /** ¿Es la última versión enviada? */
  isLatest: boolean;
  /** ¿La reparación sigue esperando respuesta al presupuesto? */
  repairAwaitingEstimate: boolean;
}

/**
 * El cliente puede aceptar un presupuesto enviado, con consulta o incluso
 * rechazado (si cambia de opinión), siempre que sea la última versión y el
 * taller no haya cerrado ya esa fase (p. ej. devolviendo el coche sin reparar).
 */
export function canCustomerAccept(ctx: CustomerResponseContext): boolean {
  return (
    ctx.isLatest &&
    ctx.repairAwaitingEstimate &&
    (ctx.status === "sent" || ctx.status === "question" || ctx.status === "rejected")
  );
}

/** Rechazar o consultar solo tiene sentido mientras está pendiente. */
export function canCustomerRejectOrAsk(ctx: CustomerResponseContext): boolean {
  return ctx.isLatest && ctx.repairAwaitingEstimate && (ctx.status === "sent" || ctx.status === "question");
}

/** El taller edita un borrador; si ya lo vio el cliente, se crea versión nueva. */
export function estimateNeedsNewVersion(status: EstimateStatus): boolean {
  return status !== "draft";
}
