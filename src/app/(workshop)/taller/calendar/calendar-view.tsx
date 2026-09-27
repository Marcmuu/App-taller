"use client";

import { useState } from "react";
import Link from "next/link";
import { addDays, addWeeks, format, isToday, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getWorkshopAgenda, type AgendaDay, type AgendaItem, type AgendaSlot } from "@/lib/data/queries";
import { REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import { formatTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Agenda del taller: qué coches llegan cada día y en qué franja, con la
 * ocupación de cada franja (reservas / capacidad).
 */
export function CalendarView() {
  const profile = useRequiredProfile();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const days = useData((s) => getWorkshopAgenda(s, profile.workshop_id ?? "", weekStart, 7));
  const [selectedKey, setSelectedKey] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const selected = days.find((d) => d.key === selectedKey) ?? days[0];

  const total = days.reduce((n, d) => n + d.total, 0);
  const pending = days.reduce((n, d) => n + d.pending, 0);
  const free = days.reduce((n, d) => n + d.slots.filter((s) => !s.past).reduce((m, s) => m + s.available, 0), 0);
  const range = `${format(weekStart, "d MMM", { locale: es })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{range}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario de citas</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border bg-card">
            <Button variant="ghost" size="icon-lg" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semana anterior">
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setWeekOffset(0);
                setSelectedKey(format(new Date(), "yyyy-MM-dd"));
              }}
            >
              Hoy
            </Button>
            <Button variant="ghost" size="icon-lg" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semana siguiente">
              <ChevronRight aria-hidden />
            </Button>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link href="/taller/settings">
              <Settings2 aria-hidden /> Horario y capacidad
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Stat label="Citas esta semana" value={total} />
        <Stat label="Pendientes de confirmar" value={pending} tone={pending > 0 ? "amber" : undefined} />
        <Stat label="Plazas libres" value={free} />
      </div>

      <Legend />

      {/* Escritorio: semana completa */}
      <WeekGrid days={days} />

      {/* Móvil: día a día */}
      <div className="space-y-4 lg:hidden">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelectedKey(d.key)}
              aria-pressed={d.key === selected?.key}
              className={cn(
                "flex flex-col items-center rounded-xl border py-2 text-xs",
                d.key === selected?.key ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                d.state === "closed" && d.key !== selected?.key && "bg-muted text-muted-foreground",
              )}
            >
              <span className="capitalize">{format(d.date, "EEEEE", { locale: es })}</span>
              <span className="text-base font-semibold">{format(d.date, "d")}</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", d.total > 0 ? (d.key === selected?.key ? "bg-primary-foreground" : "bg-primary") : "bg-transparent")} />
            </button>
          ))}
        </div>
        {selected && <DayList day={selected} />}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" }) {
  return (
    <span className={cn("rounded-full border bg-card px-3 py-1.5", tone === "amber" && "border-amber-300 bg-amber-50 text-amber-900")}>
      <strong className="tabular-nums">{value}</strong> <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-dashed border-amber-400 bg-amber-50" /> Solicitud sin confirmar</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-blue-100 ring-1 ring-blue-200" /> Cita confirmada</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-green-100 ring-1 ring-green-200" /> Coche en el taller</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-red-100 ring-1 ring-red-200" /> Franja llena</span>
    </div>
  );
}

function WeekGrid({ days }: { days: AgendaDay[] }) {
  const times = Array.from(new Set(days.flatMap((d) => d.slots.map((s) => format(s.start, "HH:mm"))))).sort();

  return (
    <div className="hidden overflow-x-auto rounded-2xl border bg-card lg:block">
      <table className="w-full min-w-225 table-fixed border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-16 border-b bg-muted/40 p-2" />
            {days.map((d) => (
              <th
                key={d.key}
                className={cn("border-b border-l p-2 text-left align-top font-medium", isToday(d.date) ? "bg-primary/5" : "bg-muted/40")}
              >
                <span className={cn("block text-sm capitalize", isToday(d.date) && "text-primary")}>
                  {format(d.date, "EEE d", { locale: es })}
                </span>
                <span className="block font-normal text-muted-foreground">
                  {d.state === "closed" ? d.reason : `${d.total} ${d.total === 1 ? "cita" : "citas"}${d.pending ? ` · ${d.pending} pend.` : ""}`}
                </span>
                {d.outside.length > 0 && (
                  <span className="mt-1 block space-y-1">
                    <span className="block text-[10px] uppercase tracking-wide text-amber-700">Fuera de horario</span>
                    {d.outside.map((i) => (
                      <Chip key={i.appointment.id} item={i} showTime />
                    ))}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.length === 0 && (
            <tr>
              <td colSpan={8} className="p-10 text-center text-muted-foreground">
                No hay horario configurado esta semana.
              </td>
            </tr>
          )}
          {times.map((time) => (
            <tr key={time}>
              <td className="border-t p-2 text-right align-top font-medium tabular-nums text-muted-foreground">{time}</td>
              {days.map((d) => {
                const slot = d.slots.find((s) => format(s.start, "HH:mm") === time);
                return (
                  <td
                    key={d.key}
                    className={cn(
                      "h-14 border-l border-t p-1 align-top",
                      !slot && "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,var(--color-muted)_6px,var(--color-muted)_7px)]",
                      slot?.past && "opacity-60",
                      isToday(d.date) && "bg-primary/3",
                    )}
                  >
                    {slot && <SlotCell slot={slot} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlotCell({ slot }: { slot: AgendaSlot }) {
  const full = slot.available <= 0;
  return (
    <div className={cn("flex h-full flex-col gap-1 rounded-lg p-1", full && "bg-red-50 ring-1 ring-red-200")}>
      <span className={cn("self-end rounded px-1 text-[10px] font-medium tabular-nums", full ? "text-red-700" : slot.booked ? "text-amber-700" : "text-muted-foreground/60")}>
        {slot.booked}/{slot.capacity}
      </span>
      {slot.items.map((i) => (
        <Chip key={i.appointment.id} item={i} />
      ))}
    </div>
  );
}

function chipStyle(item: AgendaItem) {
  if (item.appointment.status === "requested") return "border border-dashed border-amber-400 bg-amber-50 text-amber-900";
  if (item.repair && item.repair.current_status !== "appointment_confirmed") return "bg-green-100 text-green-900 ring-1 ring-green-200";
  return "bg-blue-100 text-blue-900 ring-1 ring-blue-200";
}

function Chip({ item, showTime }: { item: AgendaItem; showTime?: boolean }) {
  const href = item.repair ? routes.workshopRepair(item.repair.id) : "/taller";
  const status =
    item.appointment.status === "requested"
      ? "Sin confirmar"
      : item.repair
        ? REPAIR_STATUS_META[item.repair.current_status].shortLabel
        : "Confirmada";
  return (
    <Link
      href={href}
      title={`${item.vehicle.make} ${item.vehicle.model} · ${item.customer.full_name} · ${status}`}
      className={cn("block truncate rounded-md px-1.5 py-1 leading-tight hover:brightness-95", chipStyle(item))}
    >
      <span className="font-mono font-medium">{item.vehicle.license_plate}</span>{" "}
      {showTime && <span className="tabular-nums">{formatTime(item.appointment.scheduled_at)} </span>}
      <span className="opacity-80">{item.customer.full_name.split(" ")[0]}</span>
    </Link>
  );
}

function DayList({ day }: { day: AgendaDay }) {
  if (day.state === "closed" && day.outside.length === 0) {
    return <p className="rounded-2xl border bg-muted/50 p-6 text-center text-muted-foreground">{day.reason} · no hay citas</p>;
  }
  const busy = day.slots.filter((s) => s.items.length > 0);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium first-letter:uppercase">
        {format(day.date, "EEEE d 'de' MMMM", { locale: es })} · {day.total} {day.total === 1 ? "cita" : "citas"}
      </p>
      {busy.length === 0 && day.outside.length === 0 && (
        <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Sin citas este día</p>
      )}
      {busy.map((slot) => (
        <div key={slot.start.toISOString()} className="flex gap-3 rounded-2xl border bg-card p-3">
          <div className="w-14 shrink-0">
            <p className="font-semibold tabular-nums">{format(slot.start, "HH:mm")}</p>
            <p className={cn("text-xs tabular-nums", slot.available <= 0 ? "text-red-700" : "text-muted-foreground")}>
              {slot.booked}/{slot.capacity}
            </p>
          </div>
          <div className="grid min-w-0 flex-1 gap-1 text-sm">
            {slot.items.map((i) => (
              <Chip key={i.appointment.id} item={i} />
            ))}
          </div>
        </div>
      ))}
      {day.outside.map((i) => (
        <div key={i.appointment.id} className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-3 text-sm">
          <p className="w-14 shrink-0 font-semibold tabular-nums">{formatTime(i.appointment.scheduled_at)}</p>
          <div className="min-w-0 flex-1">
            <Chip item={i} />
            <p className="mt-1 text-xs text-amber-800">Fuera del horario actual</p>
          </div>
        </div>
      ))}
    </div>
  );
}
