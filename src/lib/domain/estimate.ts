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

/** El cliente solo puede responder a un presupuesto enviado. */
export function canCustomerRespond(status: EstimateStatus): boolean {
  return status === "sent";
}

/** El taller edita un borrador; si ya lo vio el cliente, se crea versión nueva. */
export function estimateNeedsNewVersion(status: EstimateStatus): boolean {
  return status !== "draft";
}
