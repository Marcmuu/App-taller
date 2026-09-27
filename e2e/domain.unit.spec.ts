import { expect, test } from "@playwright/test";
import {
  checkSlotBookable,
  getBookingCalendar,
} from "@/lib/domain/appointments";
import {
  calculateEstimateTotals,
  canCustomerAccept,
  canCustomerRejectOrAsk,
} from "@/lib/domain/estimate";
import { getNextRepairAction, getCustomerStatusCopy } from "@/lib/domain/repair-status";
import { summarizeDay, toScheduleInput, validateSchedule } from "@/lib/domain/schedule";
import type { Appointment, WorkshopAvailability, WorkshopClosure } from "@/types/database";

// Lunes 5 de octubre de 2026, 08:00 (hora local del proceso).
const NOW = new Date(2026, 9, 5, 8, 0);
const W = "w1";

const rule = (weekday: number, start: string, end: string, capacity: number, slot = 30): WorkshopAvailability => ({
  id: `${weekday}-${start}`,
  workshop_id: W,
  weekday,
  start_time: start,
  end_time: end,
  slot_minutes: slot,
  capacity,
  is_active: true,
});

const appt = (date: Date, status: Appointment["status"] = "confirmed"): Appointment => ({
  id: `a-${date.getTime()}-${Math.random()}`,
  workshop_id: W,
  vehicle_id: "v",
  customer_id: "c",
  scheduled_at: date.toISOString(),
  status,
  issue_category: "averia",
  issue_description: null,
  drivable_status: "yes",
  created_at: NOW.toISOString(),
});

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);

test.describe("Calendario de reservas", () => {
  const availability = [rule(1, "09:00", "11:00", 2), rule(2, "09:00", "10:00", 1)];

  test("genera franjas con su capacidad", () => {
    const [monday] = getBookingCalendar(availability, [], [], { now: NOW, days: 1 });
    expect(monday.state).toBe("open");
    expect(monday.slots.map((s) => s.start.getHours() * 100 + s.start.getMinutes())).toEqual([900, 930, 1000, 1030]);
    expect(monday.slots.every((s) => s.capacity === 2 && s.available === 2)).toBe(true);
    expect(monday.free).toBe(8);
  });

  test("cuenta reservas y marca la franja llena al llegar a la capacidad", () => {
    const appointments = [appt(at(5, 9)), appt(at(5, 9), "requested")];
    const [monday] = getBookingCalendar(availability, [], appointments, { now: NOW, days: 1 });
    expect(monday.slots[0]).toMatchObject({ booked: 2, available: 0 });
    expect(monday.slots[1]).toMatchObject({ booked: 0, available: 2 });
  });

  test("las citas canceladas no ocupan plaza", () => {
    const [monday] = getBookingCalendar(availability, [], [appt(at(5, 9), "cancelled"), appt(at(5, 9), "cancelled")], { now: NOW, days: 1 });
    expect(monday.slots[0].available).toBe(2);
  });

  test("una cita a una hora intermedia cuenta en su franja", () => {
    const [monday] = getBookingCalendar(availability, [], [appt(at(5, 9, 15))], { now: NOW, days: 1 });
    expect(monday.slots[0].booked).toBe(1);
  });

  test("día completo cuando no queda ninguna plaza", () => {
    const tuesday = at(6, 9);
    const appointments = [appt(tuesday), appt(at(6, 9, 30))];
    const days = getBookingCalendar(availability, [], appointments, { now: NOW, days: 2 });
    expect(days[1].state).toBe("full");
    expect(days[1].free).toBe(0);
  });

  test("días sin horario o festivos salen cerrados", () => {
    const closures: WorkshopClosure[] = [{ id: "c", workshop_id: W, date: "2026-10-05", reason: "Festivo local", created_at: "" }];
    const days = getBookingCalendar(availability, closures, [], { now: NOW, days: 3 });
    expect(days[0]).toMatchObject({ state: "closed", reason: "Festivo local" });
    expect(days[2]).toMatchObject({ state: "closed", reason: "Cerrado" }); // miércoles sin horario
  });

  test("no ofrece franjas pasadas ni dentro de la antelación mínima", () => {
    const now = at(5, 9, 10); // 09:10 → antelación 60 min → primera reservable 10:30
    const [monday] = getBookingCalendar(availability, [], [], { now, days: 1 });
    expect(monday.slots.filter((s) => !s.past).map((s) => s.start.getHours() * 100 + s.start.getMinutes())).toEqual([1030]);
  });

  test("checkSlotBookable explica por qué no se puede reservar", () => {
    const full = [appt(at(5, 9)), appt(at(5, 9))];
    expect(checkSlotBookable(availability, [], full, at(5, 9).toISOString(), NOW)).toMatchObject({ ok: false });
    expect(checkSlotBookable(availability, [], [], at(5, 9, 15).toISOString(), NOW)).toMatchObject({ ok: false });
    expect(checkSlotBookable(availability, [], [], at(7, 9).toISOString(), NOW)).toMatchObject({ ok: false });
    expect(checkSlotBookable(availability, [], [], at(5, 9, 30).toISOString(), NOW)).toMatchObject({ ok: true });
  });
});

test.describe("Horario del taller", () => {
  test("detecta tramos solapados, capacidad inválida y tramos demasiado cortos", () => {
    const base = toScheduleInput([rule(1, "09:00", "13:00", 2)]);
    const monday = (ranges: { start: string; end: string; capacity: number }[]) => ({
      ...base,
      days: base.days.map((d) => (d.weekday === 1 ? { ...d, open: true, ranges } : d)),
    });
    expect(validateSchedule(base)).toEqual({});
    expect(validateSchedule(monday([{ start: "09:00", end: "13:00", capacity: 2 }, { start: "12:00", end: "14:00", capacity: 1 }]))[1]).toMatch(/solapan/);
    expect(validateSchedule(monday([{ start: "09:00", end: "13:00", capacity: 0 }]))[1]).toMatch(/entre 1/);
    expect(validateSchedule(monday([{ start: "09:00", end: "09:15", capacity: 1 }]))[1]).toMatch(/al menos/);
  });

  test("resume franjas y plazas", () => {
    expect(summarizeDay({ weekday: 1, open: true, ranges: [{ start: "09:00", end: "11:00", capacity: 3 }] }, 30)).toEqual({ slots: 4, places: 12 });
    expect(summarizeDay({ weekday: 1, open: false, ranges: [] }, 30)).toEqual({ slots: 0, places: 0 });
  });
});

test.describe("Siguiente acción del taller", () => {
  test("cubre todo el flujo", () => {
    expect(getNextRepairAction("appointment_confirmed").label).toBe("MARCAR RECIBIDO");
    expect(getNextRepairAction("vehicle_received").nextStatus).toBe("diagnosis");
    expect(getNextRepairAction("diagnosis").type).toBe("open_estimate");
    expect(getNextRepairAction("estimate_pending", { estimateStatus: "sent" }).type).toBe("wait_customer");
    expect(getNextRepairAction("estimate_pending", { estimateStatus: "accepted" }).nextStatus).toBe("repair_in_progress");
    expect(getNextRepairAction("repair_in_progress").nextStatus).toBe("repair_completed");
    expect(getNextRepairAction("repair_completed").nextStatus).toBe("ready_for_pickup");
    const close = getNextRepairAction("ready_for_pickup");
    expect(close).toMatchObject({ nextStatus: "closed", requiresConfirmation: true });
    expect(getNextRepairAction("closed").type).toBe("none");
  });

  test("presupuesto rechazado: nuevo presupuesto o devolver sin reparar", () => {
    const action = getNextRepairAction("estimate_pending", { estimateStatus: "rejected" });
    expect(action.type).toBe("open_estimate");
    expect(action.secondary).toMatchObject({ label: "DEVOLVER SIN REPARAR", nextStatus: "ready_for_pickup", requiresConfirmation: true });
  });

  test("textos del cliente según el presupuesto", () => {
    expect(getCustomerStatusCopy("estimate_pending", "rejected").label).toBe("Presupuesto rechazado");
    expect(getCustomerStatusCopy("estimate_pending", "sent").label).toBe("Presupuesto pendiente de aprobación");
    expect(getCustomerStatusCopy("diagnosis", null).label).toBe("Diagnóstico");
  });
});

test.describe("Reglas del presupuesto", () => {
  const ok = { isLatest: true, repairAwaitingEstimate: true };
  test("el cliente puede aceptar aunque antes lo rechazara", () => {
    expect(canCustomerAccept({ ...ok, status: "sent" })).toBe(true);
    expect(canCustomerAccept({ ...ok, status: "question" })).toBe(true);
    expect(canCustomerAccept({ ...ok, status: "rejected" })).toBe(true);
    expect(canCustomerAccept({ ...ok, status: "accepted" })).toBe(false);
    expect(canCustomerAccept({ ...ok, status: "draft" })).toBe(false);
  });
  test("no se puede responder a versiones antiguas ni si el taller cerró esa fase", () => {
    expect(canCustomerAccept({ status: "sent", isLatest: false, repairAwaitingEstimate: true })).toBe(false);
    expect(canCustomerAccept({ status: "rejected", isLatest: true, repairAwaitingEstimate: false })).toBe(false);
    expect(canCustomerRejectOrAsk({ ...ok, status: "rejected" })).toBe(false);
    expect(canCustomerRejectOrAsk({ ...ok, status: "sent" })).toBe(true);
  });
  test("totales con IVA y redondeo a céntimos", () => {
    expect(calculateEstimateTotals([{ quantity: 1.5, unit_price: 48 }, { quantity: 4, unit_price: 12.9 }], 21)).toEqual({
      subtotal: 123.6,
      tax_rate: 21,
      tax_amount: 25.96,
      total: 149.56,
    });
  });
});
