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

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Fecha orientativa: "Mañana, hacia las 18:00" / "jue 1 oct, hacia las 19:00". */
export function formatEstimate(value: string | Date): string {
  return `${formatDayLabel(value)}, hacia las ${formatTime(value)}`;
}

/** Fecha para frases: "hoy a las 10:06", "mañana a las 10:00", "el lun 5 oct a las 09:30". */
export function formatWhen(value: string | Date): string {
  const d = toDate(value);
  const time = `a las ${formatTime(d)}`;
  if (isToday(d)) return `hoy ${time}`;
  if (isTomorrow(d)) return `mañana ${time}`;
  if (isYesterday(d)) return `ayer ${time}`;
  return `el ${format(d, "EEE d MMM", { locale: es })} ${time}`;
}
