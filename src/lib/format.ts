import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import { es } from "date-fns/locale";
import type { Vehicle } from "@/types/database";

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatCurrency(value: number): string {
  return currency.format(value);
}

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** "09:30" */
export function formatTime(value: string | Date): string {
  return format(toDate(value), "HH:mm");
}

/** "Hoy", "Mañana", "Ayer" o "lun 14 oct". */
export function formatDayLabel(value: string | Date): string {
  const d = toDate(value);
  if (isToday(d)) return "Hoy";
  if (isTomorrow(d)) return "Mañana";
  if (isYesterday(d)) return "Ayer";
  return format(d, "EEE d MMM", { locale: es });
}

/** "Hoy, 09:30" / "lun 14 oct, 09:30" */
export function formatDateTime(value: string | Date): string {
  return `${formatDayLabel(value)}, ${formatTime(value)}`;
}

/** "lunes, 14 de octubre" */
export function formatLongDate(value: string | Date): string {
  return format(toDate(value), "EEEE, d 'de' MMMM", { locale: es });
}

/** "hace 5 minutos" */
export function formatRelative(value: string | Date): string {
  return formatDistanceToNowStrict(toDate(value), { locale: es, addSuffix: true });
}

export function vehicleName(vehicle: Pick<Vehicle, "make" | "model">): string {
  return `${vehicle.make} ${vehicle.model}`;
}

/** Normaliza matrícula española: "1234abc" → "1234 ABC". */
export function formatPlate(plate: string): string {
  const clean = plate.replace(/[\s-]/g, "").toUpperCase();
  const match = clean.match(/^(\d{4})([A-Z]{3})$/);
  return match ? `${match[1]} ${match[2]}` : clean;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
