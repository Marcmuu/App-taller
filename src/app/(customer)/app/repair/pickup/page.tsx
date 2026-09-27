"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, MapPin, MessageCircle, PartyPopper, Phone, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackHeader } from "@/components/customer/back-header";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getDefaultWorkshop, getEstimateItems, getRepairView } from "@/lib/data/queries";
import { formatCurrency, formatWhen, vehicleName } from "@/lib/format";
import { routes } from "@/lib/routes";

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export default function PickupPage() {
  const id = useSearchParams().get("id") ?? "";
  const profile = useRequiredProfile();
  const data = useData((s) => {
    const view = getRepairView(s.db, id, false);
    if (!view || view.repair.customer_id !== profile.id) return null;
    const workshop = getDefaultWorkshop(s.db);
    const accepted = s.db.estimates
      .filter((e) => e.repair_order_id === id && e.status === "accepted")
      .sort((a, b) => b.version - a.version)[0];
    return {
      view,
      workshop,
      availability: s.db.workshop_availability.filter((a) => a.workshop_id === workshop.id && a.is_active),
      estimate: accepted ?? null,
      items: accepted ? getEstimateItems(s.db, accepted.id) : [],
      readyAt:
        s.db.repair_status_history.filter((h) => h.repair_order_id === id && h.to_status === "ready_for_pickup").at(-1)
          ?.created_at ?? null,
    };
  });

  if (!data) return <BackHeader title="Recogida" />;

  const { view, workshop, availability, estimate, items, readyAt } = data;
  const isReady = view.repair.current_status === "ready_for_pickup";

  // Horario de hoy o del siguiente día abierto.
  const today = new Date().getDay();
  let openDay = today;
  for (let i = 0; i < 7; i++) {
    const d = (today + i) % 7;
    if (availability.some((a) => a.weekday === d)) {
      openDay = d;
      break;
    }
  }
  const hours = availability
    .filter((a) => a.weekday === openDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((a) => `${a.start_time}–${a.end_time}`)
    .join(" y ");
  const dayLabel = openDay === today ? "Hoy" : WEEKDAYS[openDay].replace(/^./, (c) => c.toUpperCase());

  const workItems = items.filter((i) => i.type !== "labor");

  return (
    <div className="space-y-5 pb-6">
      <BackHeader title="Recogida" href={routes.customerRepair(id)} />

      <section className="flex flex-col items-center gap-3 rounded-3xl bg-green-600 p-8 text-center text-white">
        <span className="grid size-16 place-items-center rounded-full bg-white/20">
          <PartyPopper className="size-8" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold">
          {isReady ? `Tu ${vehicleName(view.vehicle)} está listo` : "Recogida"}
        </h1>
        <p className="text-white/85">
          {isReady ? "Ya puedes pasar a recogerlo." : "Te avisaremos cuando puedas pasar a recogerlo."}
          {readyAt && isReady && <span className="block text-sm">Listo desde {formatWhen(readyAt)}</span>}
        </p>
      </section>

      <section className="divide-y rounded-2xl border bg-card">
        <InfoRow icon={<Clock className="size-5" aria-hidden />} title="Horario" text={hours ? `${dayLabel}: ${hours}` : "Consulta con el taller"} />
        <InfoRow
          icon={<MapPin className="size-5" aria-hidden />}
          title={workshop.name}
          text={workshop.address}
          action={
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workshop.address)}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              Cómo llegar
            </a>
          }
        />
      </section>

      {!estimate && isReady && (
        <section className="rounded-2xl border bg-card p-5 text-sm">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Wrench className="size-4" aria-hidden /> Sin reparación
          </h2>
          <p className="text-muted-foreground">
            No se ha realizado la reparación. Si tienes cualquier duda sobre importes (por ejemplo, el diagnóstico), consúltalo con el taller.
          </p>
        </section>
      )}

      {estimate && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Wrench className="size-4" aria-hidden /> Trabajos realizados
          </h2>
          <ul className="space-y-2 text-sm">
            {workItems.map((item) => (
              <li key={item.id} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-green-600" aria-hidden />
                {item.description}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t pt-3">
            <span className="text-muted-foreground">Total a pagar</span>
            <span className="text-xl font-semibold tabular-nums">{formatCurrency(estimate.total)}</span>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button asChild size="xl" variant="outline">
          <a href={`tel:${workshop.phone.replace(/\s/g, "")}`}>
            <Phone aria-hidden /> Llamar
          </a>
        </Button>
        <Button asChild size="xl" variant="outline">
          <Link href={routes.customerMessages(id)}>
            <MessageCircle aria-hidden /> Mensaje
          </Link>
        </Button>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      {action}
    </div>
  );
}
