"use client";

import { addDays, format, isSameDay } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEstimate } from "@/lib/format";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
const DEFAULT_HOUR = "19:00";

const PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "Mañana", days: 1 },
  { label: "En 2 días", days: 2 },
  { label: "En 3 días", days: 3 },
  { label: "En 1 semana", days: 7 },
] as const;

function build(date: Date, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Los domingos el taller está cerrado: se pasa al lunes. */
function skipSunday(date: Date): Date {
  return date.getDay() === 0 ? addDays(date, 1) : date;
}

/**
 * Fecha orientativa de entrega: atajos de un toque + fecha/hora exactas.
 * value = ISO o null (sin fecha).
 */
export function EstimatedReadyPicker({
  value,
  onChange,
  idPrefix = "eta",
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  idPrefix?: string;
}) {
  const current = value ? new Date(value) : null;
  const hour = current ? format(current, "HH:mm") : DEFAULT_HOUR;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const day = skipSunday(addDays(new Date(), p.days));
          const active = current !== null && isSameDay(current, day);
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(build(day, hour))}
              className={cn(
                "h-9 rounded-full border px-3 text-sm transition",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
              )}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cn(
            "h-9 rounded-full border border-dashed px-3 text-sm transition",
            value === null ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:border-foreground/30",
          )}
        >
          Sin fecha
        </button>
      </div>
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <Input
          id={`${idPrefix}-date`}
          type="date"
          aria-label="Fecha estimada"
          min={format(new Date(), "yyyy-MM-dd")}
          value={current ? format(current, "yyyy-MM-dd") : ""}
          onChange={(e) => {
            if (!e.target.value) return onChange(null);
            const [y, m, d] = e.target.value.split("-").map(Number);
            onChange(build(new Date(y, m - 1, d), hour));
          }}
          className="h-10"
        />
        <Select
          value={hour}
          onValueChange={(h) => current && onChange(build(current, h))}
          disabled={!current}
        >
          <SelectTrigger aria-label="Hora estimada" className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        {value ? `El cliente verá: «Listo aprox. ${formatEstimate(value)}». Es orientativo.` : "El cliente no verá ninguna fecha."}
      </p>
    </div>
  );
}
