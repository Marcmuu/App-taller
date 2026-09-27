import type { WorkshopAvailability } from "@/types/database";

/** Días en orden de semana española (lunes primero). value = Date.getDay(). */
export const WEEKDAYS = [
  { value: 1, label: "Lunes", short: "L" },
  { value: 2, label: "Martes", short: "M" },
  { value: 3, label: "Miércoles", short: "X" },
  { value: 4, label: "Jueves", short: "J" },
  { value: 5, label: "Viernes", short: "V" },
  { value: 6, label: "Sábado", short: "S" },
  { value: 0, label: "Domingo", short: "D" },
] as const;

export const SLOT_OPTIONS = [15, 30, 60] as const;
export const MAX_CAPACITY = 20;

export interface ScheduleRange {
  start: string;
  end: string;
  capacity: number;
}

export interface ScheduleDay {
  weekday: number;
  open: boolean;
  ranges: ScheduleRange[];
}

export interface ScheduleInput {
  slot_minutes: number;
  days: ScheduleDay[];
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Pasa las filas de workshop_availability al formato editable. */
export function toScheduleInput(rows: WorkshopAvailability[]): ScheduleInput {
  const active = rows.filter((r) => r.is_active);
  return {
    slot_minutes: active[0]?.slot_minutes ?? 30,
    days: WEEKDAYS.map(({ value }) => {
      const ranges = active
        .filter((r) => r.weekday === value)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((r) => ({ start: r.start_time, end: r.end_time, capacity: r.capacity }));
      return { weekday: value, open: ranges.length > 0, ranges: ranges.length ? ranges : [{ start: "09:00", end: "13:00", capacity: 1 }] };
    }),
  };
}

/** Errores por día (clave = weekday). Vacío = válido. */
export function validateSchedule(input: ScheduleInput): Record<number, string> {
  const errors: Record<number, string> = {};
  if (!SLOT_OPTIONS.includes(input.slot_minutes as (typeof SLOT_OPTIONS)[number])) {
    errors[-1] = "Duración de franja no válida.";
  }
  for (const day of input.days) {
    if (!day.open) continue;
    if (day.ranges.length === 0) {
      errors[day.weekday] = "Añade al menos un tramo o marca el día como cerrado.";
      continue;
    }
    const sorted = [...day.ranges].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (!/^\d{2}:\d{2}$/.test(r.start) || !/^\d{2}:\d{2}$/.test(r.end)) {
        errors[day.weekday] = "Revisa las horas.";
        break;
      }
      if (minutes(r.end) - minutes(r.start) < input.slot_minutes) {
        errors[day.weekday] = `Cada tramo debe durar al menos ${input.slot_minutes} minutos.`;
        break;
      }
      if (!Number.isInteger(r.capacity) || r.capacity < 1 || r.capacity > MAX_CAPACITY) {
        errors[day.weekday] = `Los coches por franja deben estar entre 1 y ${MAX_CAPACITY}.`;
        break;
      }
      if (i > 0 && minutes(r.start) < minutes(sorted[i - 1].end)) {
        errors[day.weekday] = "Hay tramos que se solapan.";
        break;
      }
    }
  }
  return errors;
}

/** Número de franjas y plazas por día, para mostrar un resumen. */
export function summarizeDay(day: ScheduleDay, slotMinutes: number) {
  if (!day.open) return { slots: 0, places: 0 };
  let slots = 0;
  let places = 0;
  for (const r of day.ranges) {
    const n = Math.max(0, Math.floor((minutes(r.end) - minutes(r.start)) / slotMinutes));
    slots += n;
    places += n * r.capacity;
  }
  return { slots, places };
}
