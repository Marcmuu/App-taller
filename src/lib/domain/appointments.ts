import { addDays, addMinutes, format, isAfter, startOfDay } from "date-fns";
import type {
  Appointment,
  DrivableStatus,
  WorkshopAvailability,
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

export interface DaySlots {
  date: Date;
  slots: Date[];
}

/**
 * Genera los próximos días con huecos libres a partir de la disponibilidad
 * semanal del taller, descontando las citas ya pedidas o confirmadas.
 */
export function getAvailableDays(
  availability: WorkshopAvailability[],
  appointments: Appointment[],
  options: { now?: Date; days?: number; maxLookahead?: number } = {},
): DaySlots[] {
  const now = options.now ?? new Date();
  const wanted = options.days ?? 6;
  const maxLookahead = options.maxLookahead ?? 21;

  const taken = new Set(
    appointments
      .filter((a) => a.status === "requested" || a.status === "confirmed")
      .map((a) => new Date(a.scheduled_at).getTime()),
  );

  const result: DaySlots[] = [];
  for (let offset = 0; offset < maxLookahead && result.length < wanted; offset++) {
    const day = startOfDay(addDays(now, offset));
    const rules = availability.filter((r) => r.is_active && r.weekday === day.getDay());
    const slots: Date[] = [];

    for (const rule of rules) {
      let cursor = atTime(day, rule.start_time);
      const end = atTime(day, rule.end_time);
      while (addMinutes(cursor, rule.slot_minutes) <= end) {
        // Margen de 1 h para no ofrecer huecos inminentes.
        if (isAfter(cursor, addMinutes(now, 60)) && !taken.has(cursor.getTime())) {
          slots.push(cursor);
        }
        cursor = addMinutes(cursor, rule.slot_minutes);
      }
    }

    slots.sort((a, b) => a.getTime() - b.getTime());
    if (slots.length > 0) result.push({ date: day, slots });
  }
  return result;
}

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

export function slotKey(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}
