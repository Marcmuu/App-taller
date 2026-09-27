"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarX } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { getBookingCalendar, slotKey, type DayInfo } from "@/lib/domain/appointments";
import { WEEKDAYS } from "@/lib/domain/schedule";
import { useData } from "@/lib/data/hooks";
import { bookingAppointments, getDefaultWorkshop } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

/**
 * Calendario de reservas del cliente: próximas 3 semanas. Los días llenos o
 * cerrados no se pueden elegir y, dentro de un día, las horas completas
 * aparecen bloqueadas. Se actualiza en directo si otro cliente reserva.
 */
export function SlotPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (isoDate: string | null) => void;
}) {
  const days = useData((s) => {
    const workshop = getDefaultWorkshop(s.db);
    return getBookingCalendar(
      s.db.workshop_availability.filter((a) => a.workshop_id === workshop.id),
      s.db.workshop_closures.filter((c) => c.workshop_id === workshop.id),
      bookingAppointments(s, workshop.id),
    );
  });

  const firstOpen = days.find((d) => d.state === "open") ?? null;
  const [dayKey, setDayKey] = useState<string | null>(
    value ? format(new Date(value), "yyyy-MM-dd") : firstOpen?.key ?? null,
  );
  const selectedDay = days.find((d) => d.key === dayKey && d.state === "open") ?? firstOpen;

  // Si la hora elegida se llena mientras el cliente decide, se le avisa.
  const selectedSlot = value
    ? days.flatMap((d) => d.slots).find((s) => slotKey(s.start) === slotKey(new Date(value)))
    : null;
  const selectedLost = value !== null && (!selectedSlot || selectedSlot.available <= 0 || selectedSlot.past);
  useEffect(() => {
    if (selectedLost) {
      toast.warning("La hora que habías elegido se acaba de completar. Elige otra, por favor.");
      onChange(null);
    }
  }, [selectedLost, onChange]);

  if (!firstOpen) {
    return (
      <EmptyState
        icon={CalendarX}
        title="No hay huecos disponibles"
        description="El taller está completo las próximas semanas. Llámalos y te buscarán una hora."
      />
    );
  }

  // Rejilla lunes-domingo: huecos vacíos antes del primer día.
  const leading = (days[0].date.getDay() + 6) % 7;
  const cells: Array<DayInfo | null> = [...Array.from({ length: leading }, () => null), ...days];
  const months = Array.from(new Set(days.map((d) => format(d.date, "MMMM yyyy", { locale: es })))).join(" – ");

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-3">
        <p className="mb-2 px-1 text-sm font-medium first-letter:uppercase">{months}</p>
        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Elige un día">
          {WEEKDAYS.map((w) => (
            <span key={w.value} className="pb-1 text-xs font-medium text-muted-foreground" aria-hidden>
              {w.short}
            </span>
          ))}
          {cells.map((day, i) =>
            day ? (
              <DayCell key={day.key} day={day} selected={day.key === selectedDay?.key} onSelect={() => setDayKey(day.key)} />
            ) : (
              <span key={`pad-${i}`} />
            ),
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <Legend className="bg-card ring-1 ring-foreground/20">Disponible</Legend>
          <Legend className="bg-red-100 ring-1 ring-red-200">Completo</Legend>
          <Legend className="bg-muted">Cerrado</Legend>
        </div>
      </div>

      {selectedDay && (
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground first-letter:uppercase">
            {format(selectedDay.date, "EEEE d 'de' MMMM", { locale: es })} · {selectedDay.free}{" "}
            {selectedDay.free === 1 ? "plaza libre" : "plazas libres"}
          </p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Hora">
            {selectedDay.slots
              .filter((s) => !s.past)
              .map((slot) => {
                const iso = slot.start.toISOString();
                const full = slot.available <= 0;
                const active = value !== null && slotKey(new Date(value)) === slotKey(slot.start);
                const last = !full && slot.capacity > 1 && slot.available === 1;
                return (
                  <button
                    key={iso}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${format(slot.start, "HH:mm")}${full ? ", completo" : last ? ", última plaza" : ""}`}
                    disabled={full}
                    onClick={() => onChange(iso)}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center rounded-xl border text-base font-medium tabular-nums transition",
                      active && "border-primary bg-primary text-primary-foreground shadow-sm",
                      !active && !full && "bg-card hover:border-primary/40",
                      full && "cursor-not-allowed border-dashed bg-muted/60 text-muted-foreground",
                    )}
                  >
                    <span className={cn(full && "line-through")}>{format(slot.start, "HH:mm")}</span>
                    {(full || last) && (
                      <span className={cn("text-[11px] font-normal", active ? "text-primary-foreground/80" : full ? "" : "text-amber-700")}>
                        {full ? "Completo" : "Última plaza"}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function DayCell({ day, selected, onSelect }: { day: DayInfo; selected: boolean; onSelect: () => void }) {
  const disabled = day.state !== "open";
  const label = `${format(day.date, "EEEE d 'de' MMMM", { locale: es })}: ${
    day.state === "open" ? `${day.free} plazas libres` : day.state === "full" ? "completo" : day.state === "closed" ? day.reason ?? "cerrado" : "sin horas disponibles"
  }`;
  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={selected}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-medium transition",
        day.state === "open" && !selected && "bg-card ring-1 ring-foreground/15 hover:ring-primary/50",
        selected && "bg-primary text-primary-foreground shadow-sm",
        day.state === "full" && "cursor-not-allowed bg-red-50 text-red-700/70 ring-1 ring-red-200",
        (day.state === "closed" || day.state === "past") && "cursor-not-allowed bg-muted/70 text-muted-foreground/60",
      )}
    >
      <span className={cn(day.state === "full" && "line-through")}>{format(day.date, "d")}</span>
      <span className="text-[9px] leading-none font-normal">
        {day.state === "full" ? "Lleno" : day.state === "closed" ? (day.reason && day.reason !== "Cerrado" ? "Festivo" : "") : ""}
      </span>
    </button>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded", className)} aria-hidden />
      {children}
    </span>
  );
}
