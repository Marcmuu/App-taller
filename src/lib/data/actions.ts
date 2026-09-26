"use client";

import { customerNotificationForStatus } from "@/lib/domain/repair-status";
import {
  calculateEstimateTotals,
  canCustomerRespond,
  DEFAULT_TAX_RATE,
  lineTotal,
} from "@/lib/domain/estimate";
import { issueCategoryLabel } from "@/lib/domain/appointments";
import { formatDateTime, vehicleName } from "@/lib/format";
import { getSessionUserId, getState, setSessionUserId, transact, uuid } from "@/lib/mock/store";
import type { MockState } from "@/lib/mock/types";
import type {
  Estimate,
  EstimateItemType,
  Profile,
  RepairOrder,
  RepairStatus,
} from "@/types/database";
import type {
  AppointmentRequestInput,
  EstimateFormInput,
  VehicleInput,
} from "@/lib/validators";

/**
 * Mutaciones de la app sobre la BBDD falsa.
 *
 * Son async a propósito: al conectar Supabase se convertirán en Server
 * Actions / RPC con la misma firma y las pantallas no tendrán que cambiar.
 * Las comprobaciones de permisos emulan lo que harán las políticas RLS.
 */

const LATENCY_MS = 250;
const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

export class ActionError extends Error {}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function nowIso() {
  return new Date().toISOString();
}

function currentProfile(draft: MockState): Profile {
  const userId = getSessionUserId();
  const profile = draft.db.profiles.find((p) => p.id === userId);
  if (!profile) throw new ActionError("Tu sesión ha caducado. Vuelve a entrar.");
  return profile;
}

function requireStaff(draft: MockState, workshopId: string): Profile {
  const profile = currentProfile(draft);
  if (profile.role === "customer" || profile.workshop_id !== workshopId) {
    throw new ActionError("No tienes permiso para hacer esto.");
  }
  return profile;
}

function requireCustomer(draft: MockState, customerId: string): Profile {
  const profile = currentProfile(draft);
  if (profile.id !== customerId) throw new ActionError("No tienes permiso para hacer esto.");
  return profile;
}

function findRepair(draft: MockState, repairId: string): RepairOrder {
  const repair = draft.db.repair_orders.find((r) => r.id === repairId);
  if (!repair) throw new ActionError("No encontramos esta reparación.");
  return repair;
}

function findEstimate(draft: MockState, estimateId: string): Estimate {
  const estimate = draft.db.estimates.find((e) => e.id === estimateId);
  if (!estimate) throw new ActionError("No encontramos este presupuesto.");
  return estimate;
}

function vehicleLabel(draft: MockState, vehicleId: string): string {
  const vehicle = draft.db.vehicles.find((v) => v.id === vehicleId);
  return vehicle ? vehicleName(vehicle) : "vehículo";
}

function notify(
  draft: MockState,
  userId: string,
  repairId: string | null,
  type: string,
  title: string,
  body: string,
) {
  draft.db.notifications.push({
    id: uuid(),
    user_id: userId,
    repair_order_id: repairId,
    type,
    title,
    body,
    read_at: null,
    created_at: nowIso(),
  });
}

function notifyStaff(
  draft: MockState,
  workshopId: string,
  repairId: string | null,
  type: string,
  title: string,
  body: string,
) {
  for (const staff of draft.db.profiles.filter((p) => p.workshop_id === workshopId && p.role !== "customer")) {
    notify(draft, staff.id, repairId, type, title, body);
  }
}

/** Cambia el estado + historial + notificación en un solo paso (atómico). */
function applyStatusChange(
  draft: MockState,
  repair: RepairOrder,
  to: RepairStatus,
  changedBy: string,
  note: string | null = null,
) {
  const at = nowIso();
  draft.db.repair_status_history.push({
    id: uuid(),
    repair_order_id: repair.id,
    from_status: repair.current_status,
    to_status: to,
    changed_by: changedBy,
    note,
    created_at: at,
  });
  repair.current_status = to;
  repair.updated_at = at;
  if (to === "repair_completed") repair.completed_at = at;

  if (to === "vehicle_received" && repair.appointment_id) {
    const appointment = draft.db.appointments.find((a) => a.id === repair.appointment_id);
    if (appointment) appointment.status = "completed";
  }

  const message = customerNotificationForStatus(to, vehicleLabel(draft, repair.vehicle_id));
  if (message) {
    notify(draft, repair.customer_id, repair.id, "status_changed", message.title, message.body);
  }
}

// ---------------------------------------------------------------------------
// Auth (mock)
// ---------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<Profile> {
  await delay();
  return transact((draft) => {
    const user = draft.auth_users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!user) throw new ActionError("Email o contraseña incorrectos.");
    const profile = draft.db.profiles.find((p) => p.id === user.id);
    if (!profile) throw new ActionError("Este usuario no tiene perfil.");
    setSessionUserId(profile.id);
    return profile;
  });
}

export async function signOut() {
  setSessionUserId(null);
}

// ---------------------------------------------------------------------------
// Vehículos
// ---------------------------------------------------------------------------

export async function addVehicle(input: VehicleInput): Promise<string> {
  await delay();
  return transact((draft) => {
    const profile = currentProfile(draft);
    const plate = input.license_plate;
    if (draft.db.vehicles.some((v) => v.customer_id === profile.id && v.license_plate === plate)) {
      throw new ActionError("Ya tienes un vehículo con esa matrícula.");
    }
    const id = uuid();
    draft.db.vehicles.push({
      id,
      customer_id: profile.id,
      workshop_id: draft.db.workshops[0]?.id ?? null,
      license_plate: plate,
      make: input.make,
      model: input.model,
      year: input.year ?? null,
      vin: null,
      created_at: nowIso(),
    });
    return id;
  });
}

// ---------------------------------------------------------------------------
// Citas
// ---------------------------------------------------------------------------

export interface MediaUpload {
  dataUrl: string;
  mimeType: string;
  mediaType: "image" | "video";
}

export async function requestAppointment(
  input: AppointmentRequestInput,
  media: MediaUpload[],
): Promise<string> {
  await delay();
  return transact((draft) => {
    const profile = currentProfile(draft);
    const vehicle = draft.db.vehicles.find((v) => v.id === input.vehicle_id && v.customer_id === profile.id);
    if (!vehicle) throw new ActionError("Elige uno de tus vehículos.");
    const workshop = draft.db.workshops[0];

    const taken = draft.db.appointments.some(
      (a) =>
        a.workshop_id === workshop.id &&
        (a.status === "requested" || a.status === "confirmed") &&
        a.scheduled_at === input.scheduled_at,
    );
    if (taken) throw new ActionError("Esa hora acaba de ocuparse. Elige otra, por favor.");

    const id = uuid();
    const createdAt = nowIso();
    const description = [input.issue_description, input.since ? `Desde: ${input.since}.` : ""]
      .filter(Boolean)
      .join(" ");

    draft.db.appointments.push({
      id,
      workshop_id: workshop.id,
      vehicle_id: vehicle.id,
      customer_id: profile.id,
      scheduled_at: input.scheduled_at,
      status: "requested",
      issue_category: input.issue_category,
      issue_description: description || null,
      drivable_status: input.drivable_status,
      created_at: createdAt,
    });

    for (const file of media) {
      const mediaId = uuid();
      const path = `${workshop.id}/appointments/${id}/${mediaId}`;
      draft.storage[path] = { url: file.dataUrl, mime_type: file.mimeType };
      draft.db.appointment_media.push({
        id: mediaId,
        appointment_id: id,
        uploaded_by: profile.id,
        storage_path: path,
        media_type: file.mediaType,
        created_at: createdAt,
      });
    }

    notifyStaff(
      draft,
      workshop.id,
      null,
      "appointment_requested",
      "Nueva solicitud de cita",
      `${profile.full_name} · ${vehicleName(vehicle)} · ${formatDateTime(input.scheduled_at)} · ${issueCategoryLabel(input.issue_category)}`,
    );
    return id;
  });
}

/** Confirma la cita y abre la reparación en "Cita confirmada". Devuelve el id de la reparación. */
export async function confirmAppointment(appointmentId: string): Promise<string> {
  await delay();
  return transact((draft) => {
    const appointment = draft.db.appointments.find((a) => a.id === appointmentId);
    if (!appointment) throw new ActionError("No encontramos esta cita.");
    const staff = requireStaff(draft, appointment.workshop_id);
    if (appointment.status !== "requested") throw new ActionError("Esta cita ya estaba gestionada.");

    appointment.status = "confirmed";

    const existing = draft.db.repair_orders.find((r) => r.appointment_id === appointment.id);
    if (existing) return existing.id;

    const at = nowIso();
    const repair: RepairOrder = {
      id: uuid(),
      workshop_id: appointment.workshop_id,
      vehicle_id: appointment.vehicle_id,
      customer_id: appointment.customer_id,
      appointment_id: appointment.id,
      current_status: "appointment_confirmed",
      opened_at: at,
      completed_at: null,
      created_at: at,
      updated_at: at,
    };
    draft.db.repair_orders.push(repair);
    draft.db.repair_status_history.push({
      id: uuid(),
      repair_order_id: repair.id,
      from_status: null,
      to_status: "appointment_confirmed",
      changed_by: staff.id,
      note: null,
      created_at: at,
    });
    notify(
      draft,
      appointment.customer_id,
      repair.id,
      "appointment_confirmed",
      "Cita confirmada",
      `Te esperamos el ${formatDateTime(appointment.scheduled_at)} con tu ${vehicleLabel(draft, appointment.vehicle_id)}.`,
    );
    return repair.id;
  });
}

export async function declineAppointment(appointmentId: string, reason: string): Promise<void> {
  await delay();
  transact((draft) => {
    const appointment = draft.db.appointments.find((a) => a.id === appointmentId);
    if (!appointment) throw new ActionError("No encontramos esta cita.");
    requireStaff(draft, appointment.workshop_id);
    appointment.status = "cancelled";
    notify(
      draft,
      appointment.customer_id,
      null,
      "appointment_cancelled",
      "No podemos atenderte a esa hora",
      reason || "Por favor, solicita otra hora para tu cita.",
    );
  });
}

// ---------------------------------------------------------------------------
// Estados de reparación
// ---------------------------------------------------------------------------

export async function changeRepairStatus(
  repairId: string,
  to: RepairStatus,
  options: { note?: string; manual?: boolean } = {},
): Promise<void> {
  await delay();
  transact((draft) => {
    const repair = findRepair(draft, repairId);
    const staff = requireStaff(draft, repair.workshop_id);
    if (repair.current_status === to) return;

    if (!options.manual && to === "repair_in_progress") {
      const accepted = draft.db.estimates.some(
        (e) => e.repair_order_id === repairId && e.status === "accepted",
      );
      if (!accepted) {
        throw new ActionError("El cliente todavía no ha aceptado el presupuesto.");
      }
    }

    const note = options.manual
      ? `Corrección manual${options.note ? `: ${options.note}` : ""}`
      : options.note ?? null;
    applyStatusChange(draft, repair, to, staff.id, note);
  });
}

// ---------------------------------------------------------------------------
// Presupuestos
// ---------------------------------------------------------------------------

/**
 * Devuelve el borrador en curso de la reparación. Si el último presupuesto ya
 * lo vio el cliente, crea una versión nueva copiando sus líneas.
 */
export async function getOrCreateDraftEstimate(repairId: string): Promise<string> {
  await delay();
  return transact((draft) => {
    const repair = findRepair(draft, repairId);
    requireStaff(draft, repair.workshop_id);

    const latest = draft.db.estimates
      .filter((e) => e.repair_order_id === repairId)
      .sort((a, b) => b.version - a.version)[0];
    if (latest?.status === "draft") return latest.id;

    const id = uuid();
    const at = nowIso();
    const baseItems = latest
      ? draft.db.estimate_items.filter((i) => i.estimate_id === latest.id)
      : [];

    const items = baseItems.map((item) => ({ ...item, id: uuid(), estimate_id: id }));
    draft.db.estimate_items.push(...items);
    draft.db.estimates.push({
      id,
      workshop_id: repair.workshop_id,
      repair_order_id: repairId,
      status: "draft",
      ...calculateEstimateTotals(items, latest?.tax_rate ?? DEFAULT_TAX_RATE),
      sent_at: null,
      accepted_at: null,
      rejected_at: null,
      version: (latest?.version ?? 0) + 1,
      created_at: at,
      updated_at: at,
    });
    return id;
  });
}

export async function saveEstimateDraft(estimateId: string, input: EstimateFormInput): Promise<void> {
  await delay();
  transact((draft) => writeDraft(draft, estimateId, input));
}

function writeDraft(draft: MockState, estimateId: string, input: EstimateFormInput) {
  const estimate = findEstimate(draft, estimateId);
  requireStaff(draft, estimate.workshop_id);
  if (estimate.status !== "draft") {
    throw new ActionError("Este presupuesto ya se envió. Crea una nueva versión para modificarlo.");
  }

  draft.db.estimate_items = draft.db.estimate_items.filter((i) => i.estimate_id !== estimateId);
  const typeOrder: EstimateItemType[] = ["work", "part", "labor"];
  const sorted = [...input.items].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
  draft.db.estimate_items.push(
    ...sorted.map((item, index) => ({
      id: uuid(),
      estimate_id: estimateId,
      type: item.type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: lineTotal(item),
      sort_order: index,
    })),
  );
  Object.assign(estimate, calculateEstimateTotals(input.items, input.tax_rate), { updated_at: nowIso() });
}

export async function sendEstimate(estimateId: string, input: EstimateFormInput): Promise<void> {
  await delay();
  transact((draft) => {
    writeDraft(draft, estimateId, input);
    const estimate = findEstimate(draft, estimateId);
    const staff = requireStaff(draft, estimate.workshop_id);
    const repair = findRepair(draft, estimate.repair_order_id);

    const at = nowIso();
    estimate.status = "sent";
    estimate.sent_at = at;
    estimate.updated_at = at;

    if (repair.current_status === "estimate_pending") {
      // Nueva versión sobre un presupuesto ya pendiente: queda en el historial.
      applyStatusChange(draft, repair, "estimate_pending", staff.id, `Presupuesto v${estimate.version} enviado`);
    } else {
      applyStatusChange(draft, repair, "estimate_pending", staff.id);
    }

    notify(
      draft,
      repair.customer_id,
      repair.id,
      "estimate_sent",
      estimate.version > 1 ? "Presupuesto actualizado" : "Tienes un presupuesto",
      `Revisa el presupuesto de tu ${vehicleLabel(draft, repair.vehicle_id)}.`,
    );
  });
}

export type EstimateResponse = "accept" | "reject" | "question" | "talk";

export async function respondToEstimate(
  estimateId: string,
  response: EstimateResponse,
  message?: string,
): Promise<void> {
  await delay();
  transact((draft) => {
    const estimate = findEstimate(draft, estimateId);
    const repair = findRepair(draft, estimate.repair_order_id);
    const customer = requireCustomer(draft, repair.customer_id);
    const newer = draft.db.estimates.some(
      (e) => e.repair_order_id === repair.id && e.version > estimate.version && e.status !== "draft",
    );
    if (!canCustomerRespond(estimate.status) || newer) {
      throw new ActionError("Este presupuesto ya no admite respuesta.");
    }

    const at = nowIso();
    estimate.updated_at = at;
    const vehicle = vehicleLabel(draft, repair.vehicle_id);

    const addMessage = (body: string) =>
      draft.db.messages.push({
        id: uuid(),
        workshop_id: repair.workshop_id,
        repair_order_id: repair.id,
        sender_id: customer.id,
        body,
        created_at: at,
        read_at: null,
      });

    switch (response) {
      case "accept":
        estimate.status = "accepted";
        estimate.accepted_at = at;
        notifyStaff(draft, repair.workshop_id, repair.id, "estimate_accepted",
          "Presupuesto aceptado", `${customer.full_name} ha aceptado el presupuesto v${estimate.version} · ${vehicle}`);
        break;
      case "reject":
        estimate.status = "rejected";
        estimate.rejected_at = at;
        if (message) addMessage(message);
        notifyStaff(draft, repair.workshop_id, repair.id, "estimate_rejected",
          "Presupuesto rechazado", `${customer.full_name} no quiere realizar la reparación · ${vehicle}`);
        break;
      case "question":
      case "talk": {
        estimate.status = "question";
        addMessage(
          response === "talk"
            ? message || "Me gustaría hablar con el taller sobre el presupuesto. ¿Podéis llamarme?"
            : message || "Tengo una duda sobre el presupuesto.",
        );
        notifyStaff(draft, repair.workshop_id, repair.id, "estimate_question",
          response === "talk" ? "El cliente quiere hablar" : "Consulta sobre presupuesto",
          `${customer.full_name} · ${vehicle}`);
        break;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Mensajes y notificaciones
// ---------------------------------------------------------------------------

export async function sendMessage(repairId: string, body: string): Promise<void> {
  const text = body.trim();
  if (!text) return;
  await delay();
  transact((draft) => {
    const repair = findRepair(draft, repairId);
    const sender = currentProfile(draft);
    const isStaff = sender.role !== "customer";
    if (isStaff) requireStaff(draft, repair.workshop_id);
    else requireCustomer(draft, repair.customer_id);

    draft.db.messages.push({
      id: uuid(),
      workshop_id: repair.workshop_id,
      repair_order_id: repair.id,
      sender_id: sender.id,
      body: text,
      created_at: nowIso(),
      read_at: null,
    });

    const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text;
    if (isStaff) {
      notify(draft, repair.customer_id, repair.id, "message", "Mensaje del taller", preview);
    } else {
      notifyStaff(draft, repair.workshop_id, repair.id, "message", `Nuevo mensaje de ${sender.full_name}`, preview);
    }
  });
}

/** Marca como leídos los mensajes de la otra parte. Síncrona: se llama al abrir la conversación. */
export function markMessagesRead(repairId: string) {
  const userId = getSessionUserId();
  if (!userId) return;
  const hasUnread = (state: MockState) => {
    const reader = state.db.profiles.find((p) => p.id === userId);
    if (!reader) return false;
    const readerIsStaff = reader.role !== "customer";
    return state.db.messages.some((m) => {
      if (m.repair_order_id !== repairId || m.read_at) return false;
      const sender = state.db.profiles.find((p) => p.id === m.sender_id);
      return (sender ? sender.role !== "customer" : false) !== readerIsStaff;
    });
  };
  // Evita escrituras (y re-renders) si no hay nada que marcar.
  if (!hasUnread(getState())) return;
  transact((draft) => {
    const reader = draft.db.profiles.find((p) => p.id === userId);
    if (!reader) return;
    const readerIsStaff = reader.role !== "customer";
    const at = nowIso();
    for (const message of draft.db.messages) {
      if (message.repair_order_id !== repairId || message.read_at) continue;
      const sender = draft.db.profiles.find((p) => p.id === message.sender_id);
      const senderIsStaff = sender ? sender.role !== "customer" : false;
      if (senderIsStaff !== readerIsStaff) message.read_at = at;
    }
    for (const notification of draft.db.notifications) {
      if (notification.user_id === userId && notification.repair_order_id === repairId && notification.type === "message" && !notification.read_at) {
        notification.read_at = at;
      }
    }
  });
}

export function markNotificationsRead() {
  const userId = getSessionUserId();
  if (!userId) return;
  if (!getState().db.notifications.some((n) => n.user_id === userId && !n.read_at)) return;
  transact((draft) => {
    const at = nowIso();
    for (const n of draft.db.notifications) {
      if (n.user_id === userId && !n.read_at) n.read_at = at;
    }
  });
}
