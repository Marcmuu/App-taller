"use client";

import { customerNotificationForStatus } from "@/lib/domain/repair-status";
import {
  calculateEstimateTotals,
  canCustomerAccept,
  canCustomerRejectOrAsk,
  DEFAULT_TAX_RATE,
  lineTotal,
} from "@/lib/domain/estimate";
import { checkSlotBookable, issueCategoryLabel } from "@/lib/domain/appointments";
import { validateSchedule, type ScheduleInput } from "@/lib/domain/schedule";
import { plateKey, validatePlate } from "@/lib/domain/plates";
import { formatDateTime, formatWhen, vehicleName } from "@/lib/format";
import { resetMockDatabase } from "@/lib/mock/store";
import { getSessionUserId, getState, setSessionUserId, transact, uuid } from "@/lib/mock/store";
import type { MockState } from "@/lib/mock/types";
import type { ChatThread } from "@/lib/data/queries";
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
  SignupInput,
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

/**
 * Ejecuta la escritura al momento y después simula la latencia de red (para
 * ver los estados de carga). Así, como con un servidor real, lo enviado queda
 * guardado aunque el usuario cierre sesión o recargue enseguida.
 */
async function withLatency<T>(write: () => T): Promise<T> {
  const result = write();
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  return result;
}

export { ActionError, SlotUnavailableError } from "./errors";
import { ActionError, SlotUnavailableError } from "./errors";

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
  if (to === "ready_for_pickup" && repair.current_status === "repair_in_progress") repair.completed_at = at;
  repair.current_status = to;
  repair.updated_at = at;

  if (to === "vehicle_received" && repair.appointment_id) {
    const appointment = draft.db.appointments.find((a) => a.id === repair.appointment_id);
    if (appointment) appointment.status = "completed";
  }

  const message = customerNotificationForStatus(to, vehicleLabel(draft, repair.vehicle_id));
  if (message) {
    notify(draft, repair.customer_id, repair.id, "status_changed", message.title, message.body);
  }
  if (to === "closed" && draft.db.workshops.find((w) => w.id === repair.workshop_id)?.review_url) {
    notify(draft, repair.customer_id, repair.id, "review_request", "¿Qué tal ha ido?", "Gracias por confiar en nosotros. Si te ha gustado, déjanos tu opinión: nos ayuda mucho.");
  }
}

// ---------------------------------------------------------------------------
// Auth (mock)
// ---------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<Profile> {
  return withLatency(() =>
    transact((draft) => {
      const user = draft.auth_users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
      );
      if (!user) throw new ActionError("Email o contraseña incorrectos.");
      const profile = draft.db.profiles.find((p) => p.id === user.id);
      if (!profile) throw new ActionError("Este usuario no tiene perfil.");
      setSessionUserId(profile.id);
      return profile;
    }),
  );
}

export async function signOut() {
  setSessionUserId(null);
}

/** Alta de cliente. Con Supabase: supabase.auth.signUp + trigger que crea el perfil. */
export async function signUp(input: SignupInput): Promise<Profile> {
  return withLatency(() =>
    transact((draft) => {
      const email = input.email.trim().toLowerCase();
      if (draft.auth_users.some((u) => u.email.toLowerCase() === email)) {
        throw new ActionError("Ya existe una cuenta con ese email. Prueba a entrar.");
      }
      const id = uuid();
      draft.auth_users.push({ id, email, password: input.password });
      const profile: Profile = {
        id,
        email,
        full_name: input.full_name.trim(),
        phone: input.phone.trim(),
        role: "customer",
        workshop_id: null,
        created_at: nowIso(),
      };
      draft.db.profiles.push(profile);
      setSessionUserId(id);
      return profile;
    }),
  );
}

// ---------------------------------------------------------------------------
// Vehículos
// ---------------------------------------------------------------------------

export async function addVehicle(input: VehicleInput): Promise<string> {
  return withLatency(() =>
    transact((draft) => {
      const profile = currentProfile(draft);
      const check = validatePlate(input.license_plate, input.plate_format);
      if (!check.ok) throw new ActionError(check.error);
      const plate = check.plate;
      const existing = draft.db.vehicles.find((v) => plateKey(v.license_plate) === plateKey(plate));
      if (existing?.customer_id === profile.id) {
        throw new ActionError("Ya tienes un vehículo con esa matrícula.");
      }
      if (existing) {
        throw new ActionError("Esta matrícula ya está registrada en otra cuenta. Si el coche es tuyo, habla con el taller.");
      }
      const id = uuid();
      draft.db.vehicles.push({
        id,
        customer_id: profile.id,
        workshop_id: draft.db.workshops[0]?.id ?? null,
        license_plate: plate,
        plate_format: input.plate_format,
        make: input.make,
        model: input.model,
        year: input.year ?? null,
        vin: null,
        created_at: nowIso(),
      });
      return id;
    }),
  );
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
  return withLatency(() =>
    transact((draft) => {
      const profile = currentProfile(draft);
      const vehicle = draft.db.vehicles.find((v) => v.id === input.vehicle_id && v.customer_id === profile.id);
      if (!vehicle) throw new ActionError("Elige uno de tus vehículos.");
      const workshop = draft.db.workshops[0];

      // Se comprueba en el momento de guardar: otra persona puede haber
      // reservado la última plaza mientras el cliente rellenaba el formulario.
      const check = checkSlotBookable(
        draft.db.workshop_availability.filter((a) => a.workshop_id === workshop.id),
        draft.db.workshop_closures.filter((c) => c.workshop_id === workshop.id),
        draft.db.appointments.filter((a) => a.workshop_id === workshop.id),
        input.scheduled_at,
      );
      if (!check.ok) throw new SlotUnavailableError(check.reason);

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
        cancelled_by: null,
        cancellation_reason: null,
        customer_dismissed_at: null,
        proposed_at: null,
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
    }),
  );
}

/** Confirma la cita y abre la reparación en "Cita confirmada". Devuelve el id de la reparación. */
export async function confirmAppointment(appointmentId: string): Promise<string> {
  return withLatency(() =>
    transact((draft) => {
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
        estimated_ready_at: null,
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
        `Te esperamos ${formatWhen(appointment.scheduled_at)} con tu ${vehicleLabel(draft, appointment.vehicle_id)}.`,
      );
      return repair.id;
    }),
  );
}

/**
 * El taller rechaza una solicitud. Puede proponer otra hora libre: el cliente
 * la acepta con un toque (queda confirmada) o elige otra.
 */
export async function declineAppointment(appointmentId: string, reason: string, proposedAt: string | null = null): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const appointment = draft.db.appointments.find((a) => a.id === appointmentId);
      if (!appointment) throw new ActionError("No encontramos esta cita.");
      requireStaff(draft, appointment.workshop_id);
      if (appointment.status !== "requested") throw new ActionError("Esta solicitud ya estaba gestionada.");
      if (proposedAt) {
        const others = draft.db.appointments.filter((a) => a.workshop_id === appointment.workshop_id && a.id !== appointment.id);
        const check = checkSlotBookable(
          draft.db.workshop_availability.filter((a) => a.workshop_id === appointment.workshop_id),
          draft.db.workshop_closures.filter((c) => c.workshop_id === appointment.workshop_id),
          others,
          proposedAt,
        );
        if (!check.ok) throw new SlotUnavailableError(`No se puede proponer esa hora: ${check.reason}`);
      }
      appointment.status = "cancelled";
      appointment.cancelled_by = "workshop";
      appointment.cancellation_reason = reason.trim() || null;
      appointment.customer_dismissed_at = null;
      appointment.proposed_at = proposedAt;
      notify(
        draft,
        appointment.customer_id,
        null,
        "appointment_cancelled",
        proposedAt ? "El taller te propone otra hora" : "No podemos atenderte a esa hora",
        proposedAt
          ? `${reason.trim() ? reason.trim() + " " : ""}Te proponemos ${formatWhen(proposedAt)}. Acéptala o elige otra desde la app.`
          : `${reason.trim() || "Elige otra hora para tu cita."} Puedes elegir otra fecha desde la app.`,
      );
    }),
  );
}

/** El cliente acepta la hora que le propuso el taller: la cita queda confirmada. */
export async function acceptProposedTime(appointmentId: string): Promise<string> {
  return withLatency(() =>
    transact((draft) => {
      const appointment = draft.db.appointments.find((a) => a.id === appointmentId);
      if (!appointment) throw new ActionError("No encontramos esta cita.");
      const customer = requireCustomer(draft, appointment.customer_id);
      if (appointment.status !== "cancelled" || appointment.cancelled_by !== "workshop" || !appointment.proposed_at) {
        throw new ActionError("Esta propuesta ya no está disponible.");
      }
      const check = checkSlotBookable(
        draft.db.workshop_availability.filter((a) => a.workshop_id === appointment.workshop_id),
        draft.db.workshop_closures.filter((c) => c.workshop_id === appointment.workshop_id),
        draft.db.appointments.filter((a) => a.workshop_id === appointment.workshop_id && a.id !== appointment.id),
        appointment.proposed_at,
      );
      if (!check.ok) throw new SlotUnavailableError(`Esa hora ya no está libre. Elige otra, por favor.`);

      const at = nowIso();
      appointment.scheduled_at = appointment.proposed_at;
      appointment.status = "confirmed";
      appointment.cancelled_by = null;
      appointment.cancellation_reason = null;
      appointment.proposed_at = null;
      const repair: RepairOrder = {
        id: uuid(),
        workshop_id: appointment.workshop_id,
        vehicle_id: appointment.vehicle_id,
        customer_id: appointment.customer_id,
        appointment_id: appointment.id,
        current_status: "appointment_confirmed",
        opened_at: at,
        completed_at: null,
        estimated_ready_at: null,
        created_at: at,
        updated_at: at,
      };
      draft.db.repair_orders.push(repair);
      draft.db.repair_status_history.push({
        id: uuid(),
        repair_order_id: repair.id,
        from_status: null,
        to_status: "appointment_confirmed",
        changed_by: customer.id,
        note: "El cliente aceptó la hora propuesta por el taller",
        created_at: at,
      });
      notifyStaff(
        draft,
        appointment.workshop_id,
        repair.id,
        "appointment_confirmed",
        "Hora propuesta aceptada",
        `${customer.full_name} · ${vehicleLabel(draft, appointment.vehicle_id)} · ${formatDateTime(appointment.scheduled_at)}`,
      );
      return repair.id;
    }),
  );
}

/**
 * El cliente cambia la hora de una cita ya confirmada (el coche aún no ha
 * llegado). Sigue confirmada: el taller ya aceptó el trabajo y la nueva hora
 * respeta su capacidad. Se avisa al taller.
 */
export async function rescheduleConfirmedAppointment(appointmentId: string, scheduledAt: string): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const appointment = draft.db.appointments.find((a) => a.id === appointmentId);
      if (!appointment) throw new ActionError("No encontramos esta cita.");
      const customer = requireCustomer(draft, appointment.customer_id);
      const repair = draft.db.repair_orders.find((r) => r.appointment_id === appointment.id);
      if (appointment.status !== "confirmed" || (repair && repair.current_status !== "appointment_confirmed")) {
        throw new ActionError("Esta cita ya no se puede cambiar. Habla con el taller.");
      }
      const check = checkSlotBookable(
        draft.db.workshop_availability.filter((a) => a.workshop_id === appointment.workshop_id),
        draft.db.workshop_closures.filter((c) => c.workshop_id === appointment.workshop_id),
        draft.db.appointments.filter((a) => a.workshop_id === appointment.workshop_id && a.id !== appointment.id),
        scheduledAt,
      );
      if (!check.ok) throw new SlotUnavailableError(check.reason);
      const before = appointment.scheduled_at;
      appointment.scheduled_at = scheduledAt;
      if (repair) repair.updated_at = nowIso();
      notifyStaff(
        draft,
        appointment.workshop_id,
        repair?.id ?? null,
        "appointment_rescheduled",
        "Cita cambiada por el cliente",
        `${customer.full_name} · ${vehicleLabel(draft, appointment.vehicle_id)} · de ${formatDateTime(before)} a ${formatDateTime(scheduledAt)}`,
      );
    }),
  );
}

// ---------------------------------------------------------------------------
// Estados de reparación
// ---------------------------------------------------------------------------

export async function changeRepairStatus(
  repairId: string,
  to: RepairStatus,
  options: { note?: string; manual?: boolean; withoutEstimate?: boolean } = {},
): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const repair = findRepair(draft, repairId);
      const staff = requireStaff(draft, repair.workshop_id);
      if (repair.current_status === to) return;

      if (!options.manual && !options.withoutEstimate && to === "repair_in_progress") {
        const latest = draft.db.estimates
          .filter((e) => e.repair_order_id === repairId && e.status !== "draft")
          .sort((a, b) => b.version - a.version)[0];
        if (latest?.status !== "accepted") {
          throw new ActionError("El cliente todavía no ha aceptado el presupuesto.");
        }
      }

      const note = options.manual
        ? `Corrección manual${options.note ? `: ${options.note}` : ""}`
        : options.note ?? null;
      applyStatusChange(draft, repair, to, staff.id, note);
    }),
  );
}

// ---------------------------------------------------------------------------
// Presupuestos
// ---------------------------------------------------------------------------

/**
 * Devuelve el borrador en curso de la reparación. Si el último presupuesto ya
 * lo vio el cliente, crea una versión nueva copiando sus líneas.
 */
export async function getOrCreateDraftEstimate(repairId: string): Promise<string> {
  return withLatency(() =>
    transact((draft) => {
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
        estimated_ready_at: latest?.estimated_ready_at ?? repair.estimated_ready_at ?? null,
        version: (latest?.version ?? 0) + 1,
        created_at: at,
        updated_at: at,
      });
      return id;
    }),
  );
}

export async function saveEstimateDraft(estimateId: string, input: EstimateFormInput): Promise<void> {
  await withLatency(() => transact((draft) => writeDraft(draft, estimateId, input)));
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
  Object.assign(estimate, calculateEstimateTotals(input.items, input.tax_rate), {
    estimated_ready_at: input.estimated_ready_at,
    updated_at: nowIso(),
  });
}

export async function sendEstimate(estimateId: string, input: EstimateFormInput): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      writeDraft(draft, estimateId, input);
      const estimate = findEstimate(draft, estimateId);
      const staff = requireStaff(draft, estimate.workshop_id);
      const repair = findRepair(draft, estimate.repair_order_id);

      const at = nowIso();
      estimate.status = "sent";
      estimate.sent_at = at;
      estimate.updated_at = at;
      repair.estimated_ready_at = estimate.estimated_ready_at;

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
    }),
  );
}

export type EstimateResponse = "accept" | "reject" | "question" | "talk";

export async function respondToEstimate(
  estimateId: string,
  response: EstimateResponse,
  message?: string,
): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const estimate = findEstimate(draft, estimateId);
      const repair = findRepair(draft, estimate.repair_order_id);
      const customer = requireCustomer(draft, repair.customer_id);
      const newer = draft.db.estimates.some(
        (e) => e.repair_order_id === repair.id && e.version > estimate.version && e.status !== "draft",
      );
      const ctx = {
        status: estimate.status,
        isLatest: !newer,
        repairAwaitingEstimate: repair.current_status === "estimate_pending",
      };
      const allowed = response === "accept" ? canCustomerAccept(ctx) : canCustomerRejectOrAsk(ctx);
      if (!allowed) {
        throw new ActionError("Este presupuesto ya no admite respuesta.");
      }
      const changedMind = response === "accept" && estimate.status === "rejected";

      const at = nowIso();
      estimate.updated_at = at;
      const vehicle = vehicleLabel(draft, repair.vehicle_id);

      const addMessage = (body: string) =>
        draft.db.messages.push({
          id: uuid(),
          workshop_id: repair.workshop_id,
          customer_id: repair.customer_id,
          repair_order_id: repair.id,
          sender_id: customer.id,
          body,
          attachment_path: null,
          created_at: at,
          read_at: null,
        });

      switch (response) {
        case "accept":
          // rejected_at se conserva para la trazabilidad si había cambiado de opinión.
          estimate.status = "accepted";
          estimate.accepted_at = at;
          if (changedMind) addMessage("He cambiado de opinión: acepto el presupuesto.");
          notifyStaff(draft, repair.workshop_id, repair.id, "estimate_accepted",
            changedMind ? "El cliente ha cambiado de opinión" : "Presupuesto aceptado",
            `${customer.full_name} ha aceptado el presupuesto v${estimate.version} · ${vehicle}`);
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
    }),
  );
}

// ---------------------------------------------------------------------------
// Mensajes y notificaciones
// ---------------------------------------------------------------------------

/**
 * Envía un mensaje en una conversación (la general del cliente o la de una
 * reparación). Lo lee cualquier empleado del taller y el propio cliente.
 */
export async function sendMessage(thread: ChatThread, body: string, attachment: MediaUpload | null = null): Promise<void> {
  const text = body.trim();
  if (!text && !attachment) return;
  if (text.length > 2000) throw new ActionError("El mensaje es demasiado largo.");
  if (attachment && attachment.mediaType !== "image") throw new ActionError("En el chat solo se pueden enviar fotos.");
  await withLatency(() =>
    transact((draft) => {
      const sender = currentProfile(draft);
      const isStaff = sender.role !== "customer";
      const customer = draft.db.profiles.find((p) => p.id === thread.customerId && p.role === "customer");
      if (!customer) throw new ActionError("No encontramos a este cliente.");

      let workshopId: string;
      if (thread.repairId) {
        const repair = findRepair(draft, thread.repairId);
        if (repair.customer_id !== thread.customerId) throw new ActionError("Esta conversación no es de este cliente.");
        workshopId = repair.workshop_id;
      } else {
        // MVP con un solo taller: la consulta general va a él.
        workshopId = isStaff ? sender.workshop_id ?? "" : draft.db.workshops[0]?.id ?? "";
      }
      if (isStaff) requireStaff(draft, workshopId);
      else requireCustomer(draft, thread.customerId);

      let attachmentPath: string | null = null;
      if (attachment) {
        attachmentPath = `${workshopId}/messages/${thread.customerId}/${uuid()}`;
        draft.storage[attachmentPath] = { url: attachment.dataUrl, mime_type: attachment.mimeType };
      }
      draft.db.messages.push({
        id: uuid(),
        workshop_id: workshopId,
        customer_id: thread.customerId,
        repair_order_id: thread.repairId,
        sender_id: sender.id,
        body: text,
        attachment_path: attachmentPath,
        created_at: nowIso(),
        read_at: null,
      });

      const preview = text ? (text.length > 80 ? `${text.slice(0, 77)}…` : text) : "📷 Foto";
      if (isStaff) {
        notify(draft, thread.customerId, thread.repairId, "message", "Mensaje del taller", preview);
      } else {
        notifyStaff(
          draft,
          workshopId,
          thread.repairId,
          "message",
          thread.repairId ? `Nuevo mensaje de ${sender.full_name}` : `Nueva consulta de ${sender.full_name}`,
          preview,
        );
      }
    }),
  );
}

/** Marca como leídos los mensajes de la otra parte. Síncrona: se llama al abrir la conversación. */
export function markMessagesRead(thread: ChatThread) {
  const userId = getSessionUserId();
  if (!userId) return;
  const inThisThread = (m: MockState["db"]["messages"][number]) =>
    m.customer_id === thread.customerId && m.repair_order_id === thread.repairId;
  const hasUnread = (state: MockState) => {
    const reader = state.db.profiles.find((p) => p.id === userId);
    if (!reader) return false;
    const readerIsStaff = reader.role !== "customer";
    return state.db.messages.some((m) => {
      if (!inThisThread(m) || m.read_at) return false;
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
      if (!inThisThread(message) || message.read_at) continue;
      const sender = draft.db.profiles.find((p) => p.id === message.sender_id);
      const senderIsStaff = sender ? sender.role !== "customer" : false;
      if (senderIsStaff !== readerIsStaff) message.read_at = at;
    }
    for (const notification of draft.db.notifications) {
      if (notification.user_id === userId && notification.repair_order_id === thread.repairId && notification.type === "message" && !notification.read_at) {
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

// ---------------------------------------------------------------------------
// Citas: anulación por el cliente
// ---------------------------------------------------------------------------

/**
 * El cliente anula una solicitud o una cita confirmada (mientras el coche no
 * haya llegado). La plaza queda libre al instante.
 */
export async function cancelAppointment(appointmentId: string): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const appointment = draft.db.appointments.find((a) => a.id === appointmentId);
      if (!appointment) throw new ActionError("No encontramos esta cita.");
      const customer = requireCustomer(draft, appointment.customer_id);
      if (appointment.status !== "requested" && appointment.status !== "confirmed") {
        throw new ActionError("Esta cita ya no se puede anular.");
      }
      const repair = draft.db.repair_orders.find((r) => r.appointment_id === appointment.id);
      if (repair && repair.current_status !== "appointment_confirmed") {
        throw new ActionError("El coche ya está en el taller: habla con ellos para cualquier cambio.");
      }

      appointment.status = "cancelled";
      appointment.cancelled_by = "customer";
      if (repair) applyStatusChange(draft, repair, "closed", customer.id, "Cita anulada por el cliente");

      notifyStaff(
        draft,
        appointment.workshop_id,
        repair?.id ?? null,
        "appointment_cancelled",
        "Cita anulada por el cliente",
        `${customer.full_name} · ${vehicleLabel(draft, appointment.vehicle_id)} · ${formatDateTime(appointment.scheduled_at)}`,
      );
    }),
  );
}

// ---------------------------------------------------------------------------
// Fecha estimada de entrega
// ---------------------------------------------------------------------------

export async function setEstimatedReadyAt(repairId: string, estimatedReadyAt: string | null): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const repair = findRepair(draft, repairId);
      requireStaff(draft, repair.workshop_id);
      if (repair.estimated_ready_at === estimatedReadyAt) return;
      repair.estimated_ready_at = estimatedReadyAt;
      repair.updated_at = nowIso();
      if (repair.current_status !== "closed") {
        notify(
          draft,
          repair.customer_id,
          repair.id,
          "estimated_ready_changed",
          estimatedReadyAt ? "Nueva fecha estimada" : "Fecha estimada retirada",
          estimatedReadyAt
            ? `Tu ${vehicleLabel(draft, repair.vehicle_id)} estará listo aproximadamente ${formatWhen(estimatedReadyAt)}.`
            : `El taller te avisará cuando tenga una nueva fecha para tu ${vehicleLabel(draft, repair.vehicle_id)}.`,
        );
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Horario del taller y días cerrados
// ---------------------------------------------------------------------------

/**
 * Sustituye el horario semanal. Las citas ya reservadas se mantienen aunque
 * queden fuera del nuevo horario; se devuelve cuántas hay para avisar.
 */
export async function saveWorkshopSchedule(workshopId: string, input: ScheduleInput): Promise<{ outside: number }> {
  return withLatency(() =>
    transact((draft) => {
      requireStaff(draft, workshopId);
      const errors = validateSchedule(input);
      const first = Object.values(errors)[0];
      if (first) throw new ActionError(first);

      draft.db.workshop_availability = [
        ...draft.db.workshop_availability.filter((r) => r.workshop_id !== workshopId),
        ...input.days
          .filter((d) => d.open)
          .flatMap((d) =>
            d.ranges.map((r) => ({
              id: uuid(),
              workshop_id: workshopId,
              weekday: d.weekday,
              start_time: r.start,
              end_time: r.end,
              slot_minutes: input.slot_minutes,
              capacity: r.capacity,
              is_active: true,
            })),
          ),
      ];

      // Citas futuras que ya no encajan en el horario nuevo.
      const now = Date.now();
      const rows = draft.db.workshop_availability.filter((r) => r.workshop_id === workshopId);
      const outside = draft.db.appointments.filter((a) => {
        if (a.workshop_id !== workshopId || a.status === "cancelled" || a.status === "completed") return false;
        const when = new Date(a.scheduled_at);
        if (when.getTime() < now) return false;
        const hhmm = `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
        return !rows.some((r) => r.weekday === when.getDay() && r.start_time <= hhmm && hhmm < r.end_time);
      }).length;
      return { outside };
    }),
  );
}

/** Cierra un día concreto (festivo, vacaciones…). Devuelve las citas ya reservadas ese día. */
export async function addWorkshopClosure(
  workshopId: string,
  date: string,
  reason: string,
): Promise<{ affected: number }> {
  return withLatency(() =>
    transact((draft) => {
      requireStaff(draft, workshopId);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ActionError("Elige una fecha.");
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      if (date < todayKey) throw new ActionError("No puedes cerrar un día que ya ha pasado.");
      if (draft.db.workshop_closures.some((c) => c.workshop_id === workshopId && c.date === date)) {
        throw new ActionError("Ese día ya está marcado como cerrado.");
      }
      draft.db.workshop_closures.push({
        id: uuid(),
        workshop_id: workshopId,
        date,
        reason: reason.trim() || null,
        created_at: nowIso(),
      });
      const affected = draft.db.appointments.filter(
        (a) =>
          a.workshop_id === workshopId &&
          (a.status === "requested" || a.status === "confirmed") &&
          localDateKey(a.scheduled_at) === date,
      ).length;
      return { affected };
    }),
  );
}

export async function removeWorkshopClosure(closureId: string): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const closure = draft.db.workshop_closures.find((c) => c.id === closureId);
      if (!closure) return;
      requireStaff(draft, closure.workshop_id);
      draft.db.workshop_closures = draft.db.workshop_closures.filter((c) => c.id !== closureId);
    }),
  );
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Solicitudes rechazadas por el taller: elegir otra fecha sin repetir todo
// ---------------------------------------------------------------------------

/**
 * El cliente propone otra hora para una solicitud que el taller no pudo
 * atender. Se reutiliza la misma solicitud (descripción, fotos…) y vuelve a
 * quedar pendiente de confirmar.
 */
export async function rescheduleDeclinedAppointment(appointmentId: string, scheduledAt: string): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const appointment = draft.db.appointments.find((a) => a.id === appointmentId);
      if (!appointment) throw new ActionError("No encontramos esta cita.");
      const customer = requireCustomer(draft, appointment.customer_id);
      if (appointment.status !== "cancelled" || appointment.cancelled_by !== "workshop") {
        throw new ActionError("Esta cita ya no se puede reprogramar.");
      }
      const check = checkSlotBookable(
        draft.db.workshop_availability.filter((a) => a.workshop_id === appointment.workshop_id),
        draft.db.workshop_closures.filter((c) => c.workshop_id === appointment.workshop_id),
        draft.db.appointments.filter((a) => a.workshop_id === appointment.workshop_id),
        scheduledAt,
      );
      if (!check.ok) throw new SlotUnavailableError(check.reason);

      appointment.status = "requested";
      appointment.scheduled_at = scheduledAt;
      appointment.cancelled_by = null;
      appointment.cancellation_reason = null;
      appointment.customer_dismissed_at = null;

      notifyStaff(
        draft,
        appointment.workshop_id,
        null,
        "appointment_requested",
        "Nueva hora propuesta",
        `${customer.full_name} · ${vehicleLabel(draft, appointment.vehicle_id)} · ${formatDateTime(scheduledAt)}`,
      );
    }),
  );
}

/** El cliente oculta el aviso de una solicitud rechazada. */
export async function dismissDeclinedAppointment(appointmentId: string): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const appointment = draft.db.appointments.find((a) => a.id === appointmentId);
      if (!appointment) return;
      requireCustomer(draft, appointment.customer_id);
      appointment.customer_dismissed_at = nowIso();
    }),
  );
}

// ---------------------------------------------------------------------------
// Datos del taller (solo administrador)
// ---------------------------------------------------------------------------

export interface WorkshopProfileInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  review_url: string | null;
}

export async function updateWorkshopProfile(workshopId: string, input: WorkshopProfileInput): Promise<void> {
  await withLatency(() =>
    transact((draft) => {
      const profile = requireStaff(draft, workshopId);
      if (profile.role !== "workshop_admin") throw new ActionError("Solo el administrador puede cambiar los datos del taller.");
      const workshop = draft.db.workshops.find((w) => w.id === workshopId);
      if (!workshop) throw new ActionError("No encontramos el taller.");
      if (input.name.trim().length < 2) throw new ActionError("Escribe el nombre del taller.");
      const reviewUrl = input.review_url?.trim();
      if (reviewUrl && !/^https?:\/\//i.test(reviewUrl)) throw new ActionError("El enlace de reseñas debe empezar por https://");
      Object.assign(workshop, {
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        address: input.address.trim(),
        review_url: input.review_url?.trim() || null,
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

/** Entra como otra cuenta demo sin contraseña (solo en la demo). */
export async function switchDemoUser(userId: string): Promise<void> {
  setSessionUserId(userId);
}

export async function resetDemoData(): Promise<void> {
  resetMockDatabase();
}
