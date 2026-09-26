import type { EstimateStatus, RepairStatus } from "@/types/database";

/**
 * Única fuente de verdad sobre los estados de reparación: textos, orden,
 * colores y siguiente acción. Ningún componente debe decidir por su cuenta
 * qué viene después de un estado.
 */

export type StatusTone =
  | "slate"
  | "sky"
  | "violet"
  | "amber"
  | "blue"
  | "emerald"
  | "green"
  | "neutral";

interface RepairStatusMeta {
  /** Texto para el cliente (timeline, tarjeta principal). */
  label: string;
  /** Texto corto para badges y dashboard del taller. */
  shortLabel: string;
  /** Explicación sencilla para el cliente del estado actual. */
  customerDescription: string;
  tone: StatusTone;
}

export const REPAIR_STATUS_META: Record<RepairStatus, RepairStatusMeta> = {
  appointment_confirmed: {
    label: "Cita confirmada",
    shortLabel: "Cita",
    customerDescription: "Te esperamos en el taller el día de tu cita.",
    tone: "slate",
  },
  vehicle_received: {
    label: "Vehículo recibido",
    shortLabel: "Recibido",
    customerDescription: "Tu coche ya está en el taller. En breve empezamos a revisarlo.",
    tone: "sky",
  },
  diagnosis: {
    label: "Diagnóstico",
    shortLabel: "Diagnóstico",
    customerDescription: "Estamos revisando el coche para saber qué le pasa.",
    tone: "violet",
  },
  estimate_pending: {
    label: "Presupuesto pendiente de aprobación",
    shortLabel: "Presupuesto",
    customerDescription: "Revisa el presupuesto y dinos si quieres continuar.",
    tone: "amber",
  },
  repair_in_progress: {
    label: "Reparación iniciada",
    shortLabel: "Reparación",
    customerDescription: "Estamos reparando tu coche.",
    tone: "blue",
  },
  repair_completed: {
    label: "Reparación terminada",
    shortLabel: "Terminada",
    customerDescription: "La reparación ha terminado. Estamos preparando la entrega.",
    tone: "emerald",
  },
  ready_for_pickup: {
    label: "Listo para recoger",
    shortLabel: "Listo",
    customerDescription: "Ya puedes pasar a recoger tu coche.",
    tone: "green",
  },
  closed: {
    label: "Entregado",
    shortLabel: "Cerrado",
    customerDescription: "Has recogido el coche. ¡Gracias por confiar en nosotros!",
    tone: "neutral",
  },
};

/** Pasos visibles en el timeline del cliente (closed no se muestra como paso). */
export const CUSTOMER_TIMELINE_STEPS: RepairStatus[] = [
  "appointment_confirmed",
  "vehicle_received",
  "diagnosis",
  "estimate_pending",
  "repair_in_progress",
  "repair_completed",
  "ready_for_pickup",
];

export const ACTIVE_REPAIR_STATUSES: RepairStatus[] = CUSTOMER_TIMELINE_STEPS;

export function statusIndex(status: RepairStatus): number {
  return CUSTOMER_TIMELINE_STEPS.indexOf(status);
}

export function isActiveRepair(status: RepairStatus): boolean {
  return status !== "closed";
}

// ---------------------------------------------------------------------------
// Siguiente acción del taller
// ---------------------------------------------------------------------------

export type RepairActionType =
  /** Cambia el estado a `nextStatus` directamente. */
  | "transition"
  /** Abre el editor de presupuesto (crear, continuar o revisar). */
  | "open_estimate"
  /** No hay nada que hacer: se espera al cliente. */
  | "wait_customer"
  /** Reparación cerrada. */
  | "none";

export interface RepairActionContext {
  /** Estado del presupuesto vigente (última versión), si existe. */
  estimateStatus?: EstimateStatus | null;
}

export interface RepairAction {
  label: string;
  type: RepairActionType;
  nextStatus: RepairStatus | null;
  requiresConfirmation: boolean;
  /** Texto de apoyo breve (p. ej. "Esperando respuesta del cliente"). */
  hint?: string;
}

export function getNextRepairAction(
  status: RepairStatus,
  context: RepairActionContext = {},
): RepairAction {
  const estimateStatus = context.estimateStatus ?? null;

  switch (status) {
    case "appointment_confirmed":
      return transition("MARCAR RECIBIDO", "vehicle_received");

    case "vehicle_received":
      return transition("INICIAR DIAGNÓSTICO", "diagnosis");

    case "diagnosis":
      return {
        label: estimateStatus === "draft" ? "CONTINUAR PRESUPUESTO" : "CREAR PRESUPUESTO",
        type: "open_estimate",
        nextStatus: null,
        requiresConfirmation: false,
      };

    case "estimate_pending":
      if (estimateStatus === "accepted") {
        return transition("INICIAR REPARACIÓN", "repair_in_progress", {
          hint: "El cliente ha aceptado el presupuesto",
        });
      }
      if (estimateStatus === "rejected" || estimateStatus === "question") {
        return {
          label: "REVISAR PRESUPUESTO",
          type: "open_estimate",
          nextStatus: null,
          requiresConfirmation: false,
          hint:
            estimateStatus === "rejected"
              ? "El cliente ha rechazado el presupuesto"
              : "El cliente tiene una consulta",
        };
      }
      if (estimateStatus === "draft") {
        return {
          label: "CONTINUAR PRESUPUESTO",
          type: "open_estimate",
          nextStatus: null,
          requiresConfirmation: false,
        };
      }
      return {
        label: "Esperando al cliente",
        type: "wait_customer",
        nextStatus: null,
        requiresConfirmation: false,
        hint: "Presupuesto enviado, pendiente de respuesta",
      };

    case "repair_in_progress":
      return transition("FINALIZAR REPARACIÓN", "repair_completed");

    case "repair_completed":
      return transition("LISTO PARA RECOGER", "ready_for_pickup");

    case "ready_for_pickup":
      return transition("ENTREGAR Y CERRAR", "closed", { requiresConfirmation: true });

    case "closed":
      return {
        label: "Reparación cerrada",
        type: "none",
        nextStatus: null,
        requiresConfirmation: false,
      };
  }
}

function transition(
  label: string,
  nextStatus: RepairStatus,
  extra: Partial<Pick<RepairAction, "hint" | "requiresConfirmation">> = {},
): RepairAction {
  return {
    label,
    type: "transition",
    nextStatus,
    requiresConfirmation: extra.requiresConfirmation ?? false,
    hint: extra.hint,
  };
}

// ---------------------------------------------------------------------------
// Notificaciones al cliente por cambio de estado
// ---------------------------------------------------------------------------

/** Mensaje para el cliente cuando la reparación entra en un estado. null = no notificar. */
export function customerNotificationForStatus(
  status: RepairStatus,
  vehicleName: string,
): { title: string; body: string } | null {
  switch (status) {
    case "appointment_confirmed":
      return { title: "Cita confirmada", body: `Hemos confirmado la cita de tu ${vehicleName}.` };
    case "vehicle_received":
      return { title: "Vehículo recibido", body: `Tu ${vehicleName} ya está en el taller.` };
    case "diagnosis":
      return { title: "Diagnóstico iniciado", body: `Estamos revisando tu ${vehicleName}.` };
    case "repair_in_progress":
      return { title: "Reparación iniciada", body: `Hemos empezado a reparar tu ${vehicleName}.` };
    case "repair_completed":
      return { title: "Reparación terminada", body: `La reparación de tu ${vehicleName} ha terminado.` };
    case "ready_for_pickup":
      return { title: "¡Listo para recoger!", body: `Ya puedes pasar a recoger tu ${vehicleName}.` };
    case "estimate_pending":
    case "closed":
      return null;
  }
}
