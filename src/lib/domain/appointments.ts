import { addDays, addMinutes, format, isBefore, startOfDay } from "date-fns";
import type {
  Appointment,
  DrivableStatus,
  WorkshopAvailability,
  WorkshopClosure,
} from "@/types/database";

export const ISSUE_CATEGORIES = [
  { value: "averia", label: "Avería", description: "Algo no funciona bien" },
  { value: "mantenimiento", label: "Mantenimiento", description: "Revisión, aceite, ITV…" },
  { value: "testigo", label: "Testigo encendido", description: "Una luz en el salpicadero" },
  { value: "ruido", label: "Ruido extraño", description: "Suena algo raro" },
  { value: "otro", label: "Otro", description: "Cualquier otra cosa" },
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]["value"];

export function issueCategoryLabel(value: string | null): string {
  return ISSUE_CATEGORIES.find((c) => c.value === value)?.label ?? "Sin motivo";
}

export const DRIVABLE_LABELS: Record<DrivableStatus, string> = {
  yes: "Sí, se puede conducir",
  no: "No se puede conducir",
  unknown: "No lo sé",
};

export const SINCE_OPTIONS = [
  "Hoy",
  "Hace unos días",
  "Hace semanas",
  "Hace meses",
] as const;

// ---------------------------------------------------------------------------
// Reservas: capacidad por franja
// ---------------------------------------------------------------------------

/** Antelación mínima para reservar (no se ofrecen huecos inminentes). */
export const BOOKING_LEAD_MINUTES = 60;
/** Días hacia delante que puede reservar el cliente. */
export const BOOKING_WINDOW_DAYS = 21;

/** Una cita ocupa plaza salvo que esté cancelada. */
export function occupiesSlot(appointment: Pick<Appointment, "status">): boolean {
  return appointment.status !== "cancelled";
}

export interface SlotInfo {
  start: Date;
  end: Date;
  capacity: number;
  booked: number;
  available: number;
  /** Ya no se puede reservar (pasado o dentro de la antelación mínima). */
  past: boolean;
}

export type DayState = "open" | "full" | "closed" | "past";

export interface DayInfo {
  date: Date;
  /** "yyyy-MM-dd" */
  key: string;
  state: DayState;
  /** Motivo si está cerrado (festivo…). */
  reason: string | null;
  slots: SlotInfo[];
  /** Plazas libres reservables en el día. */
  free: number;
}

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Calendario de reservas: para cada día, sus franjas con capacidad, plazas
 * ocupadas y libres. Lo usan el cliente (elegir hueco), el taller (agenda) y
 * la validación al reservar.
 */
export function getBookingCalendar(
  availability: WorkshopAvailability[],
  closures: WorkshopClosure[],
  appointments: Appointment[],
  options: { now?: Date; from?: Date; days?: number; leadMinutes?: number } = {},
): DayInfo[] {
  const now = options.now ?? new Date();
  const from = startOfDay(options.from ?? now);
  const days = options.days ?? BOOKING_WINDOW_DAYS;
  const bookable = addMinutes(now, options.leadMinutes ?? BOOKING_LEAD_MINUTES);

  const booked = appointments.filter(occupiesSlot).map((a) => new Date(a.scheduled_at).getTime());

  const result: DayInfo[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = addDays(from, offset);
    const key = dayKey(date);
    const closure = closures.find((c) => c.date === key);
    const rules = availability
      .filter((r) => r.is_active && r.weekday === date.getDay())
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    if (closure || rules.length === 0) {
      result.push({ date, key, state: "closed", reason: closure ? closure.reason ?? "Cerrado" : "Cerrado", slots: [], free: 0 });
      continue;
    }

    const slots: SlotInfo[] = [];
    for (const rule of rules) {
      let cursor = atTime(date, rule.start_time);
      const end = atTime(date, rule.end_time);
      while (addMinutes(cursor, rule.slot_minutes) <= end) {
        const slotEnd = addMinutes(cursor, rule.slot_minutes);
        const count = booked.filter((t) => t >= cursor.getTime() && t < slotEnd.getTime()).length;
        slots.push({
          start: cursor,
          end: slotEnd,
          capacity: rule.capacity,
          booked: count,
          available: Math.max(0, rule.capacity - count),
          past: isBefore(cursor, bookable),
        });
        cursor = slotEnd;
      }
    }

    const future = slots.filter((s) => !s.past);
    const free = future.reduce((sum, s) => sum + s.available, 0);
    const state: DayState = future.length === 0 ? "past" : free === 0 ? "full" : "open";
    result.push({ date, key, state, reason: null, slots, free });
  }
  return result;
}

export type SlotCheck = { ok: true; slot: SlotInfo } | { ok: false; reason: string };

/** Comprueba en el momento de reservar que la hora sigue libre. */
export function checkSlotBookable(
  availability: WorkshopAvailability[],
  closures: WorkshopClosure[],
  appointments: Appointment[],
  scheduledAt: string,
  now: Date = new Date(),
): SlotCheck {
  const when = new Date(scheduledAt);
  const [day] = getBookingCalendar(availability, closures, appointments, { now, from: when, days: 1 });
  if (!day || day.state === "closed") return { ok: false, reason: "El taller no abre ese día. Elige otro, por favor." };
  const slot = day.slots.find((s) => s.start.getTime() === when.getTime());
  if (!slot) return { ok: false, reason: "Esa hora no está disponible. Elige otra, por favor." };
  if (slot.past) return { ok: false, reason: "Esa hora ya ha pasado. Elige otra, por favor." };
  if (slot.available <= 0) return { ok: false, reason: "Esa hora acaba de completarse. Elige otra, por favor." };
  return { ok: true, slot };
}

export function slotKey(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}
