"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getAvailableDays, slotKey } from "@/lib/domain/appointments";
import { useData } from "@/lib/data/hooks";
import { getDefaultWorkshop } from "@/lib/data/queries";
import { formatDayLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Próximos días disponibles + huecos grandes. Sin calendario mensual. */
export function SlotPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (isoDate: string) => void;
}) {
  const days = useData((s) => {
    const workshop = getDefaultWorkshop(s.db);
    return getAvailableDays(
      s.db.workshop_availability.filter((a) => a.workshop_id === workshop.id),
      s.db.appointments.filter((a) => a.workshop_id === workshop.id),
    );
  });

  const selectedDayKey = value ? format(new Date(value), "yyyy-MM-dd") : null;
  const [dayKey, setDayKey] = useState<string | null>(
    selectedDayKey ?? (days[0] ? format(days[0].date, "yyyy-MM-dd") : null),
  );
  const day = days.find((d) => format(d.date, "yyyy-MM-dd") === dayKey) ?? days[0];

  if (!day) {
    return (
      <EmptyState
        icon={CalendarX}
        title="No hay huecos disponibles"
        description="Llama al taller y te buscamos una hora."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex gap-2" role="radiogroup" aria-label="Día">
          {days.map((d) => {
            const key = format(d.date, "yyyy-MM-dd");
            const active = key === format(day.date, "yyyy-MM-dd");
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDayKey(key)}
                className={cn(
                  "flex w-18 shrink-0 flex-col items-center rounded-2xl border px-2 py-3 transition",
                  active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-primary/40",
                )}
              >
                <span className={cn("text-xs capitalize", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {formatDayLabel(d.date).split(" ")[0]}
                </span>
                <span className="text-2xl font-semibold leading-tight">{format(d.date, "d")}</span>
                <span className={cn("text-xs capitalize", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {format(d.date, "MMM", { locale: es })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium first-letter:uppercase text-muted-foreground">
          {format(day.date, "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Hora">
          {day.slots.map((slot) => {
            const iso = slot.toISOString();
            const active = value !== null && slotKey(new Date(value)) === slotKey(slot);
            return (
              <button
                key={iso}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(iso)}
                className={cn(
                  "h-12 rounded-xl border text-base font-medium tabular-nums transition",
                  active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-primary/40",
                )}
              >
                {format(slot, "HH:mm")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
