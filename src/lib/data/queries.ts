import {
  ACTIVE_REPAIR_STATUSES,
  statusIndex,
} from "@/lib/domain/repair-status";
import type {
  Appointment,
  AppointmentMedia,
  Database,
  Estimate,
  EstimateItem,
  Message,
  Profile,
  RepairOrder,
  RepairStatus,
  RepairStatusHistory,
  Vehicle,
  Workshop,
} from "@/types/database";
import type { MockState } from "@/lib/mock/types";
import {
  dayKey,
  getBookingCalendar,
  occupiesSlot,
  type DayInfo,
  type SlotInfo,
} from "@/lib/domain/appointments";

/**
 * Consultas de lectura. Son funciones puras sobre el estado de la BBDD, sin
 * efectos. Al migrar a Supabase cada una pasa a ser una query (o una vista)
 * y los tipos de retorno se mantienen.
 */

export interface MediaView extends AppointmentMedia {
  url: string;
}

export interface RepairView {
  repair: RepairOrder;
  vehicle: Vehicle;
  customer: Profile;
  appointment: Appointment | null;
  /** Última versión del presupuesto, si existe. */
  estimate: Estimate | null;
  unreadMessages: number;
}

export interface AppointmentRequestView {
  appointment: Appointment;
  vehicle: Vehicle;
  customer: Profile;
  media: MediaView[];
}

// ---------------------------------------------------------------------------
// Básicas
// ---------------------------------------------------------------------------

export function getProfile(db: Database, id: string): Profile | null {
  return db.profiles.find((p) => p.id === id) ?? null;
}

export function getWorkshop(db: Database, id: string | null): Workshop | null {
  if (!id) return null;
  return db.workshops.find((w) => w.id === id) ?? null;
}

/** En el MVP un cliente trabaja con un único taller (el de la demo). */
export function getDefaultWorkshop(db: Database): Workshop {
  return db.workshops[0];
}

/** Última versión del presupuesto. Los clientes nunca ven borradores. */
export function getLatestEstimate(
  db: Database,
  repairId: string,
  options: { includeDrafts?: boolean } = {},
): Estimate | null {
  const includeDrafts = options.includeDrafts ?? true;
  return (
    db.estimates
      .filter((e) => e.repair_order_id === repairId && (includeDrafts || e.status !== "draft"))
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}

export function getEstimateItems(db: Database, estimateId: string): EstimateItem[] {
  return db.estimate_items
    .filter((i) => i.estimate_id === estimateId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getRepairHistory(db: Database, repairId: string): RepairStatusHistory[] {
  return db.repair_status_history
    .filter((h) => h.repair_order_id === repairId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function getMessages(db: Database, repairId: string): Message[] {
  return db.messages
    .filter((m) => m.repair_order_id === repairId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function getAppointmentMedia(state: MockState, appointmentId: string | null): MediaView[] {
  if (!appointmentId) return [];
  return state.db.appointment_media
    .filter((m) => m.appointment_id === appointmentId)
    .map((m) => ({ ...m, url: state.storage[m.storage_path]?.url ?? "" }))
    .filter((m) => m.url);
}

function unreadFor(db: Database, repairId: string, readerIsStaff: boolean): number {
  return db.messages.filter((m) => {
    if (m.repair_order_id !== repairId || m.read_at) return false;
    const sender = getProfile(db, m.sender_id);
    const senderIsStaff = sender ? sender.role !== "customer" : false;
    return senderIsStaff !== readerIsStaff;
  }).length;
}

function toRepairView(db: Database, repair: RepairOrder, readerIsStaff: boolean): RepairView | null {
  const vehicle = db.vehicles.find((v) => v.id === repair.vehicle_id);
  const customer = getProfile(db, repair.customer_id);
  if (!vehicle || !customer) return null;
  return {
    repair,
    vehicle,
    customer,
    appointment: db.appointments.find((a) => a.id === repair.appointment_id) ?? null,
    estimate: getLatestEstimate(db, repair.id, { includeDrafts: readerIsStaff }),
    unreadMessages: unreadFor(db, repair.id, readerIsStaff),
  };
}

export function getRepairView(db: Database, repairId: string, readerIsStaff: boolean): RepairView | null {
  const repair = db.repair_orders.find((r) => r.id === repairId);
  return repair ? toRepairView(db, repair, readerIsStaff) : null;
}

// ---------------------------------------------------------------------------
// Taller
// ---------------------------------------------------------------------------

export type BoardFilter = "all" | RepairStatus;

export function getWorkshopBoard(state: MockState, workshopId: string) {
  const { db } = state;

  const requests: AppointmentRequestView[] = db.appointments
    .filter((a) => a.workshop_id === workshopId && a.status === "requested")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .flatMap((appointment) => {
      const vehicle = db.vehicles.find((v) => v.id === appointment.vehicle_id);
      const customer = getProfile(db, appointment.customer_id);
      if (!vehicle || !customer) return [];
      return [{ appointment, vehicle, customer, media: getAppointmentMedia(state, appointment.id) }];
    });

  const repairs = db.repair_orders
    .filter((r) => r.workshop_id === workshopId && ACTIVE_REPAIR_STATUSES.includes(r.current_status))
    .map((r) => toRepairView(db, r, true))
    .filter((r): r is RepairView => r !== null)
    .sort((a, b) => {
      // Primero lo más avanzado (listo para recoger arriba), luego por hora.
      const byStatus = statusIndex(b.repair.current_status) - statusIndex(a.repair.current_status);
      if (byStatus !== 0) return byStatus;
      return (a.appointment?.scheduled_at ?? a.repair.opened_at).localeCompare(
        b.appointment?.scheduled_at ?? b.repair.opened_at,
      );
    });

  return { requests, repairs };
}

/** Conversaciones del taller: reparaciones con actividad, la más reciente primero. */
export function getWorkshopConversations(db: Database, workshopId: string) {
  return db.repair_orders
    .filter((r) => r.workshop_id === workshopId)
    .map((r) => {
      const view = toRepairView(db, r, true);
      if (!view) return null;
      const messages = getMessages(db, r.id);
      const lastMessage = messages[messages.length - 1] ?? null;
      const lastActivity = [r.updated_at, lastMessage?.created_at ?? ""].sort().at(-1) ?? r.updated_at;
      return { ...view, lastMessage, lastActivity };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export function getCustomerVehicles(db: Database, customerId: string): Vehicle[] {
  return db.vehicles
    .filter((v) => v.customer_id === customerId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function getCustomerHome(db: Database, customerId: string) {
  const activeRepairs = db.repair_orders
    .filter((r) => r.customer_id === customerId && r.current_status !== "closed")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((r) => toRepairView(db, r, false))
    .filter((r): r is RepairView => r !== null);

  const now = new Date().toISOString();
  const pendingRequests = db.appointments
    .filter((a) => a.customer_id === customerId && a.status === "requested")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((appointment) => ({
      appointment,
      vehicle: db.vehicles.find((v) => v.id === appointment.vehicle_id) ?? null,
    }));

  // Próxima cita confirmada cuyo coche aún no ha llegado.
  const nextAppointment =
    activeRepairs
      .filter((r) => r.repair.current_status === "appointment_confirmed" && r.appointment)
      .filter((r) => (r.appointment?.scheduled_at ?? "") >= now.slice(0, 10))
      .sort((a, b) => (a.appointment?.scheduled_at ?? "").localeCompare(b.appointment?.scheduled_at ?? ""))[0] ??
    null;

  const pastRepairs = db.repair_orders
    .filter((r) => r.customer_id === customerId && r.current_status === "closed")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((r) => toRepairView(db, r, false))
    .filter((r): r is RepairView => r !== null);

  return {
    activeRepairs,
    pendingRequests,
    nextAppointment,
    pastRepairs,
    hasVehicles: db.vehicles.some((v) => v.customer_id === customerId),
  };
}

export function getNotifications(db: Database, userId: string) {
  return db.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------------------------------------------------------------------------
// Cronología unificada (mensajes + estados + presupuestos)
// ---------------------------------------------------------------------------

export type TimelineEntry =
  | { kind: "message"; id: string; at: string; message: Message; sender: Profile | null }
  | { kind: "status"; id: string; at: string; history: RepairStatusHistory; actor: Profile | null }
  | {
      kind: "estimate";
      id: string;
      at: string;
      estimate: Estimate;
      event: "sent" | "accepted" | "rejected" | "question";
    }
  | { kind: "appointment"; id: string; at: string; appointment: Appointment };

export function getCommunicationTimeline(db: Database, repairId: string): TimelineEntry[] {
  const repair = db.repair_orders.find((r) => r.id === repairId);
  if (!repair) return [];

  const entries: TimelineEntry[] = [];

  const appointment = db.appointments.find((a) => a.id === repair.appointment_id);
  if (appointment) {
    entries.push({ kind: "appointment", id: `a-${appointment.id}`, at: appointment.created_at, appointment });
  }

  for (const history of getRepairHistory(db, repairId)) {
    // El paso a estimate_pending ya se ve como "presupuesto enviado".
    if (history.to_status === "estimate_pending" && !history.note) continue;
    entries.push({
      kind: "status",
      id: `s-${history.id}`,
      at: history.created_at,
      history,
      actor: getProfile(db, history.changed_by),
    });
  }

  for (const estimate of db.estimates.filter((e) => e.repair_order_id === repairId)) {
    if (estimate.sent_at) {
      entries.push({ kind: "estimate", id: `e-sent-${estimate.id}`, at: estimate.sent_at, estimate, event: "sent" });
    }
    if (estimate.accepted_at) {
      entries.push({ kind: "estimate", id: `e-acc-${estimate.id}`, at: estimate.accepted_at, estimate, event: "accepted" });
    }
    if (estimate.rejected_at) {
      entries.push({ kind: "estimate", id: `e-rej-${estimate.id}`, at: estimate.rejected_at, estimate, event: "rejected" });
    }
    if (estimate.status === "question") {
      entries.push({ kind: "estimate", id: `e-q-${estimate.id}`, at: estimate.updated_at, estimate, event: "question" });
    }
  }

  for (const message of getMessages(db, repairId)) {
    entries.push({ kind: "message", id: `m-${message.id}`, at: message.created_at, message, sender: getProfile(db, message.sender_id) });
  }

  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

// ---------------------------------------------------------------------------
// Agenda del taller
// ---------------------------------------------------------------------------

export interface AgendaItem {
  appointment: Appointment;
  vehicle: Vehicle;
  customer: Profile;
  repair: RepairOrder | null;
}

export interface AgendaSlot extends SlotInfo {
  items: AgendaItem[];
}

export interface AgendaDay extends Omit<DayInfo, "slots"> {
  slots: AgendaSlot[];
  /** Citas a horas que no encajan en el horario actual. */
  outside: AgendaItem[];
  total: number;
  pending: number;
}

/** Días con sus franjas y las citas de cada una (sin canceladas). */
export function getWorkshopAgenda(state: MockState, workshopId: string, from: Date, days: number): AgendaDay[] {
  const { db } = state;
  const appointments = db.appointments.filter((a) => a.workshop_id === workshopId);
  const calendar = getBookingCalendar(
    db.workshop_availability.filter((a) => a.workshop_id === workshopId),
    db.workshop_closures.filter((c) => c.workshop_id === workshopId),
    appointments,
    { from, days, leadMinutes: 0 },
  );

  const items: AgendaItem[] = appointments.filter(occupiesSlot).flatMap((appointment) => {
    const vehicle = db.vehicles.find((v) => v.id === appointment.vehicle_id);
    const customer = getProfile(db, appointment.customer_id);
    if (!vehicle || !customer) return [];
    const repair = db.repair_orders.find((r) => r.appointment_id === appointment.id) ?? null;
    return [{ appointment, vehicle, customer, repair }];
  });

  return calendar.map((day) => {
    const dayItems = items
      .filter((i) => dayKey(new Date(i.appointment.scheduled_at)) === day.key)
      .sort((a, b) => a.appointment.scheduled_at.localeCompare(b.appointment.scheduled_at));
    const inSlot = (i: AgendaItem, s: SlotInfo) => {
      const t = new Date(i.appointment.scheduled_at).getTime();
      return t >= s.start.getTime() && t < s.end.getTime();
    };
    const slots = day.slots.map((s) => ({ ...s, items: dayItems.filter((i) => inSlot(i, s)) }));
    return {
      ...day,
      slots,
      outside: dayItems.filter((i) => !day.slots.some((s) => inSlot(i, s))),
      total: dayItems.length,
      pending: dayItems.filter((i) => i.appointment.status === "requested").length,
    };
  });
}
