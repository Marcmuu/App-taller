"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, CalendarOff, Copy, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addWorkshopClosure,
  removeWorkshopClosure,
  saveWorkshopSchedule,
} from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import {
  MAX_CAPACITY,
  SLOT_OPTIONS,
  summarizeDay,
  toScheduleInput,
  validateSchedule,
  WEEKDAYS,
  type ScheduleDay,
  type ScheduleInput,
} from "@/lib/domain/schedule";
import { cn } from "@/lib/utils";

/**
 * Configuración de citas del taller: qué días y horas se pueden traer coches
 * y cuántos por franja. Es lo que ven los clientes al reservar.
 */
export function SettingsView() {
  const profile = useRequiredProfile();
  const workshopId = profile.workshop_id ?? "";
  const saved = useData((s) => toScheduleInput(s.db.workshop_availability.filter((a) => a.workshop_id === workshopId)));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/taller/calendar" className="text-sm text-muted-foreground hover:text-foreground">
          ← Calendario
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Horario y citas</h1>
        <p className="text-muted-foreground">
          Define cuándo pueden traer el coche los clientes y cuántos coches recibís en cada franja. Las horas llenas dejan de
          ofrecerse automáticamente.
        </p>
      </div>
      {/* key: si otro empleado guarda cambios, el formulario se recarga con ellos */}
      <ScheduleEditor key={JSON.stringify(saved)} workshopId={workshopId} initial={saved} />
      <Closures workshopId={workshopId} />
    </div>
  );
}

function ScheduleEditor({ workshopId, initial }: { workshopId: string; initial: ScheduleInput }) {
  const [schedule, setSchedule] = useState<ScheduleInput>(initial);
  const [busy, setBusy] = useState(false);
  const errors = validateSchedule(schedule);
  const dirty = JSON.stringify(schedule) !== JSON.stringify(initial);
  const hasErrors = Object.keys(errors).length > 0;

  const updateDay = (weekday: number, patch: (day: ScheduleDay) => ScheduleDay) =>
    setSchedule((s) => ({ ...s, days: s.days.map((d) => (d.weekday === weekday ? patch(d) : d)) }));

  const copyToWeekdays = (from: ScheduleDay) =>
    setSchedule((s) => ({
      ...s,
      days: s.days.map((d) => (d.weekday >= 1 && d.weekday <= 5 ? { ...d, open: from.open, ranges: from.ranges.map((r) => ({ ...r })) } : d)),
    }));

  const save = async () => {
    setBusy(true);
    try {
      const { outside } = await saveWorkshopSchedule(workshopId, schedule);
      toast.success("Horario guardado. Los clientes ya ven los nuevos huecos.", {
        description: outside > 0 ? `Atención: ${outside} ${outside === 1 ? "cita reservada queda" : "citas reservadas quedan"} fuera del nuevo horario. Se mantienen; revísalas en el calendario.` : undefined,
        duration: outside > 0 ? 10000 : undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const weekTotal = schedule.days.reduce((n, d) => n + summarizeDay(d, schedule.slot_minutes).places, 0);

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
        <div>
          <h2 className="font-semibold">Duración de cada franja</h2>
          <p className="text-sm text-muted-foreground">Cada cuánto tiempo se puede reservar una hora.</p>
        </div>
        <div className="inline-flex rounded-lg border p-1" role="radiogroup" aria-label="Duración de franja">
          {SLOT_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={schedule.slot_minutes === m}
              onClick={() => setSchedule((s) => ({ ...s, slot_minutes: m }))}
              className={cn(
                "h-9 rounded-md px-4 text-sm font-medium",
                schedule.slot_minutes === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === 60 ? "1 hora" : `${m} min`}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-5">
          <div>
            <h2 className="font-semibold">Horario semanal</h2>
            <p className="text-sm text-muted-foreground">Tramos en los que se pueden traer coches y cuántos por franja.</p>
          </div>
          <p className="text-sm">
            <strong className="tabular-nums">{weekTotal}</strong> <span className="text-muted-foreground">plazas por semana</span>
          </p>
        </div>
        <ul className="divide-y">
          {schedule.days.map((day) => {
            const meta = WEEKDAYS.find((w) => w.value === day.weekday);
            const summary = summarizeDay(day, schedule.slot_minutes);
            return (
              <li key={day.weekday} className="grid gap-3 p-5 md:grid-cols-[180px_1fr]">
                <div className="flex items-start justify-between gap-2 md:flex-col md:justify-start">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={day.open}
                      aria-label={`${meta?.label}: ${day.open ? "abierto" : "cerrado"}`}
                      onClick={() => updateDay(day.weekday, (d) => ({ ...d, open: !d.open }))}
                      className={cn("relative h-6 w-11 shrink-0 rounded-full transition", day.open ? "bg-primary" : "bg-foreground/20")}
                    >
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", day.open ? "left-5.5" : "left-0.5")} />
                    </button>
                    <span className="font-medium">{meta?.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {day.open ? `${summary.slots} franjas · ${summary.places} plazas` : "Cerrado"}
                  </span>
                </div>

                {day.open ? (
                  <div className="space-y-2">
                    {day.ranges.map((range, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <Input
                          type="time"
                          step={schedule.slot_minutes * 60}
                          aria-label={`${meta?.label} tramo ${index + 1}: desde`}
                          value={range.start}
                          onChange={(e) => updateDay(day.weekday, (d) => ({ ...d, ranges: d.ranges.map((r, i) => (i === index ? { ...r, start: e.target.value } : r)) }))}
                          className="h-10 w-28"
                        />
                        <span className="text-muted-foreground">a</span>
                        <Input
                          type="time"
                          step={schedule.slot_minutes * 60}
                          aria-label={`${meta?.label} tramo ${index + 1}: hasta`}
                          value={range.end}
                          onChange={(e) => updateDay(day.weekday, (d) => ({ ...d, ranges: d.ranges.map((r, i) => (i === index ? { ...r, end: e.target.value } : r)) }))}
                          className="h-10 w-28"
                        />
                        <div className="flex items-center gap-1 rounded-lg border px-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Menos coches por franja"
                            disabled={range.capacity <= 1}
                            onClick={() => updateDay(day.weekday, (d) => ({ ...d, ranges: d.ranges.map((r, i) => (i === index ? { ...r, capacity: r.capacity - 1 } : r)) }))}
                          >
                            <Minus aria-hidden />
                          </Button>
                          <span className="w-6 text-center font-semibold tabular-nums" aria-label={`${meta?.label} tramo ${index + 1}: coches por franja`}>
                            {range.capacity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Más coches por franja"
                            disabled={range.capacity >= MAX_CAPACITY}
                            onClick={() => updateDay(day.weekday, (d) => ({ ...d, ranges: d.ranges.map((r, i) => (i === index ? { ...r, capacity: r.capacity + 1 } : r)) }))}
                          >
                            <Plus aria-hidden />
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground">{range.capacity === 1 ? "coche" : "coches"} por franja</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Quitar tramo"
                          className="text-muted-foreground"
                          onClick={() => updateDay(day.weekday, (d) => ({ ...d, ranges: d.ranges.filter((_, i) => i !== index) }))}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateDay(day.weekday, (d) => {
                            const last = d.ranges.at(-1);
                            return { ...d, ranges: [...d.ranges, last ? { start: "15:30", end: "18:30", capacity: last.capacity } : { start: "09:00", end: "13:00", capacity: 1 }] };
                          })
                        }
                      >
                        <Plus aria-hidden /> Añadir tramo
                      </Button>
                      {day.weekday === 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => copyToWeekdays(day)}>
                          <Copy aria-hidden /> Copiar a martes–viernes
                        </Button>
                      )}
                    </div>
                    {errors[day.weekday] && <p className="text-sm text-destructive">{errors[day.weekday]}</p>}
                  </div>
                ) : (
                  <p className="self-center text-sm text-muted-foreground">No se dan citas este día.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        {dirty && <span className="mr-auto text-sm text-muted-foreground">Tienes cambios sin guardar</span>}
        <Button variant="outline" size="lg" disabled={!dirty || busy} onClick={() => setSchedule(initial)}>
          Descartar
        </Button>
        <Button size="lg" disabled={!dirty || hasErrors || busy} onClick={save}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          Guardar horario
        </Button>
      </div>
    </div>
  );
}

function Closures({ workshopId }: { workshopId: string }) {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const closures = useData((s) =>
    s.db.workshop_closures
      .filter((c) => c.workshop_id === workshopId && c.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date)),
  );
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      const { affected } = await addWorkshopClosure(workshopId, date, reason);
      toast.success("Día cerrado. Ya no se ofrecerá a los clientes.", {
        description: affected > 0 ? `Ojo: ya hay ${affected} ${affected === 1 ? "cita" : "citas"} ese día. Avisa a los clientes.` : undefined,
        duration: affected > 0 ? 10000 : undefined,
      });
      setDate("");
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarOff className="size-4" aria-hidden /> Días cerrados
        </h2>
        <p className="text-sm text-muted-foreground">Festivos, vacaciones o cualquier día que no queráis recibir coches.</p>
      </div>
      <div className="space-y-4 p-5">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="closure-date">Día</Label>
            <Input id="closure-date" type="date" min={todayKey} value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-44" />
          </div>
          <div className="min-w-48 flex-1 space-y-1">
            <Label htmlFor="closure-reason">Motivo (opcional)</Label>
            <Input id="closure-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Festivo, vacaciones…" className="h-10" />
          </div>
          <Button type="submit" size="lg" disabled={!date || busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Cerrar este día
          </Button>
        </form>
        {closures.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden /> No hay días cerrados próximamente.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {closures.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium first-letter:uppercase">
                    {format(new Date(`${c.date}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                  {c.reason && <span className="text-muted-foreground"> · {c.reason}</span>}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => removeWorkshopClosure(c.id).then(() => toast("Día abierto de nuevo"))}
                >
                  Abrir de nuevo
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
