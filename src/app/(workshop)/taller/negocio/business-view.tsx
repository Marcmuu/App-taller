"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { ExternalLink, Loader2, Printer, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkshopProfile, type WorkshopProfileInput } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getWorkshop } from "@/lib/data/queries";
import { asset } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Workshop } from "@/types/database";

/**
 * Datos públicos del taller (los ven los clientes) y tarjetas QR imprimibles:
 * una abre la app y otra lleva a dejar una reseña.
 */
export function BusinessView() {
  const profile = useRequiredProfile();
  const workshop = useData((s) => getWorkshop(s.db, profile.workshop_id ?? ""));
  if (!workshop) return null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Mi taller</h1>
        <p className="text-muted-foreground">Los datos que ven tus clientes y las tarjetas QR para el mostrador o para dar con el coche.</p>
      </div>
      <WorkshopForm
        key={JSON.stringify([workshop.name, workshop.phone, workshop.email, workshop.address, workshop.review_url])}
        workshop={workshop}
        canEdit={profile.role === "workshop_admin"}
      />
      <QrCards workshop={workshop} />
    </div>
  );
}

function WorkshopForm({ workshop, canEdit }: { workshop: Workshop; canEdit: boolean }) {
  const initial: WorkshopProfileInput = {
    name: workshop.name,
    phone: workshop.phone,
    email: workshop.email,
    address: workshop.address,
    review_url: workshop.review_url ?? "",
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (key: keyof WorkshopProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      await updateWorkshopProfile(workshop.id, form);
      toast.success("Datos del taller guardados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4 rounded-2xl border bg-card p-5 print:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div>
        <h2 className="font-semibold">Datos del taller</h2>
        {!canEdit && <p className="text-sm text-muted-foreground">Solo el administrador puede cambiarlos.</p>}
      </div>
      <fieldset disabled={!canEdit || busy} className="grid gap-4 sm:grid-cols-2">
        <Field id="ws-name" label="Nombre">
          <Input id="ws-name" value={form.name} onChange={set("name")} required minLength={2} />
        </Field>
        <Field id="ws-phone" label="Teléfono">
          <Input id="ws-phone" type="tel" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field id="ws-email" label="Email">
          <Input id="ws-email" type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field id="ws-address" label="Dirección">
          <Input id="ws-address" value={form.address} onChange={set("address")} />
        </Field>
        <Field
          id="ws-review"
          label="Enlace para dejar reseñas"
          hint="Pega el enlace de tu ficha de Google («Pedir reseñas» en Google Business Profile). Es el que abre la tarjeta de reseñas."
          className="sm:col-span-2"
        >
          <Input
            id="ws-review"
            type="url"
            inputMode="url"
            placeholder="https://g.page/r/..."
            value={form.review_url ?? ""}
            onChange={set("review_url")}
          />
        </Field>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={!dirty || busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Guardar datos
          </Button>
        </div>
      )}
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjetas QR
// ---------------------------------------------------------------------------

type Sheet = "both" | "app" | "review";
const SHEETS: { value: Sheet; label: string }[] = [
  { value: "both", label: "Mitad y mitad" },
  { value: "app", label: "Solo app" },
  { value: "review", label: "Solo reseñas" },
];
/** Tarjetas por hoja A4: 2 columnas × 5 filas de 85 × 55 mm. */
const PER_SHEET = 10;

/** URL pública de la app (la raíz de esta web, con el basePath si lo hay). */
function useAppUrl(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => new URL(asset("/"), window.location.origin).toString(),
    () => "",
  );
}
const noopSubscribe = () => () => {};

function useQrSvg(text: string | null): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    let alive = true;
    QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M" }).then(
      (s) => alive && setSvg(s),
      () => alive && setSvg(null),
    );
    return () => {
      alive = false;
    };
  }, [text]);
  return text ? svg : null;
}

function QrCards({ workshop }: { workshop: Workshop }) {
  const appUrl = useAppUrl();
  const reviewUrl = workshop.review_url;
  const appQr = useQrSvg(appUrl || null);
  const reviewQr = useQrSvg(reviewUrl);
  const [sheet, setSheet] = useState<Sheet>(reviewUrl ? "both" : "app");
  const effective: Sheet = reviewUrl ? sheet : "app";

  const kinds: ("app" | "review")[] = Array.from({ length: PER_SHEET }, (_, i) =>
    effective === "both" ? (i % 2 === 0 ? "app" : "review") : effective,
  );

  return (
    <section id="tarjetas" className="scroll-mt-20 space-y-4 rounded-2xl border bg-card p-5 print:border-0 print:p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h2 className="font-semibold">Tarjetas QR</h2>
          <p className="text-sm text-muted-foreground">
            Imprime en A4 (10 tarjetas de 85 × 55 mm) y recorta. Déjalas en el mostrador o dentro del coche al entregarlo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reviewUrl && (
            <div className="inline-flex rounded-lg border p-1" role="radiogroup" aria-label="Qué tarjetas imprimir">
              {SHEETS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={sheet === s.value}
                  onClick={() => setSheet(s.value)}
                  className={cn(
                    "h-9 rounded-md px-3 text-sm font-medium",
                    sheet === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <Button size="lg" onClick={() => window.print()} disabled={!appQr}>
            <Printer aria-hidden /> Imprimir
          </Button>
        </div>
      </div>

      {!reviewUrl && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          Añade arriba el enlace de reseñas para imprimir también la tarjeta de reseñas.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 print:hidden">
        <CardPreview label="Tarjeta de la app" href={appUrl}>
          <QrCard kind="app" workshop={workshop} qr={appQr} />
        </CardPreview>
        {reviewUrl && (
          <CardPreview label="Tarjeta de reseñas" href={reviewUrl}>
            <QrCard kind="review" workshop={workshop} qr={reviewQr} />
          </CardPreview>
        )}
      </div>

      {/* Hoja que se imprime: solo visible en papel */}
      <div className="qr-sheet hidden print:grid" aria-hidden>
        {kinds.map((kind, i) => (
          <QrCard key={i} kind={kind} workshop={workshop} qr={kind === "app" ? appQr : reviewQr} printed />
        ))}
      </div>
    </section>
  );
}

function CardPreview({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-xl shadow-md ring-1 ring-black/5">{children}</div>
      <figcaption className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate hover:text-foreground">
            Probar enlace <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </figcaption>
    </figure>
  );
}

/** Tarjeta de 85 × 55 mm (en pantalla se escala manteniendo la proporción). */
function QrCard({
  kind,
  workshop,
  qr,
  printed = false,
}: {
  kind: "app" | "review";
  workshop: Workshop;
  qr: string | null;
  printed?: boolean;
}) {
  const review = kind === "review";
  return (
    <div className="@container w-full">
    <div
      className={cn(
        "qr-card flex aspect-[85/55] w-full items-center gap-[4%] overflow-hidden p-[5%] text-left text-[3.6cqw]",
        review ? "bg-[#fff8e6] text-[#3b2a00]" : "bg-[#2456d6] text-white",
        printed && "break-inside-avoid",
      )}
      data-testid={printed ? undefined : `qr-card-${kind}`}
    >
      <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-center gap-[0.5em] text-[0.9em] font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element -- icono estático */}
          <img src={asset("/icon.svg")} alt="" className={cn("size-[1.8em] shrink-0 rounded-[0.4em]", !review && "ring-[0.12em] ring-white")} />
          <span className="line-clamp-2 leading-tight">{workshop.name}</span>
        </div>
        {review ? (
          <div className="space-y-[0.3em]">
            <p className="flex gap-[0.1em] text-[#f5a300]" aria-label="5 estrellas">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-[1.1em] fill-current" aria-hidden />
              ))}
            </p>
            <p className="text-[1.35em] font-bold leading-tight">¿Qué tal te hemos tratado?</p>
            <p className="text-[0.8em] leading-snug opacity-80">Escanea y déjanos tu opinión. Nos ayuda muchísimo. ¡Gracias!</p>
          </div>
        ) : (
          <div className="space-y-[0.3em]">
            <p className="text-[1.35em] font-bold leading-tight">Sigue tu coche desde el móvil</p>
            <p className="text-[0.8em] leading-snug opacity-85">Pide cita, aprueba presupuestos y habla con el taller.</p>
          </div>
        )}
        <p className="truncate text-[0.7em] opacity-75">{workshop.phone || workshop.address}</p>
      </div>
      <div className="flex aspect-square w-[40%] shrink-0 items-center justify-center rounded-[0.6em] bg-white p-[3.5%]">
        {qr ? (
          <div
            className="size-full [&>svg]:size-full"
            role="img"
            aria-label={review ? "Código QR para dejar una reseña" : "Código QR para abrir la app"}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>
    </div>
    </div>
  );
}
