"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  CarFront,
  Check,
  CircleAlert,
  CircleHelp,
  Droplets,
  Loader2,
  Plus,
  Volume2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackHeader } from "@/components/customer/back-header";
import { SlotPicker } from "@/components/customer/slot-picker";
import { VehicleFormDialog } from "@/components/customer/vehicle-form-dialog";
import { MediaUploader, type UploadItem } from "@/components/media/media-uploader";
import { requestAppointment, SlotUnavailableError } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getCustomerVehicles, getDefaultWorkshop } from "@/lib/data/queries";
import {
  DRIVABLE_LABELS,
  ISSUE_CATEGORIES,
  issueCategoryLabel,
  SINCE_OPTIONS,
  type IssueCategory,
} from "@/lib/domain/appointments";
import { formatDateTime, formatLongDate, formatTime, vehicleName } from "@/lib/format";
import { appointmentRequestSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";
import type { DrivableStatus } from "@/types/database";

const STEPS = ["vehicle", "category", "issue", "media", "slot", "summary"] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLES: Record<Step, string> = {
  vehicle: "¿Qué coche traes?",
  category: "¿Qué necesitas?",
  issue: "Cuéntanos qué pasa",
  media: "¿Quieres añadir fotos o vídeos?",
  slot: "Elige día y hora",
  summary: "Revisa y envía",
};

const CATEGORY_ICONS: Record<IssueCategory, LucideIcon> = {
  averia: Wrench,
  mantenimiento: Droplets,
  testigo: CircleAlert,
  ruido: Volume2,
  otro: CircleHelp,
};

interface Draft {
  vehicleId: string | null;
  category: IssueCategory | null;
  description: string;
  since: string | null;
  drivable: DrivableStatus | null;
  scheduledAt: string | null;
}

export function AppointmentWizard() {
  const router = useRouter();
  const initialVehicleId = useSearchParams().get("vehiculo");
  const profile = useRequiredProfile();
  const vehicles = useData((s) => getCustomerVehicles(s.db, profile.id));
  const workshop = useData((s) => getDefaultWorkshop(s.db));

  const preselected =
    vehicles.find((v) => v.id === initialVehicleId)?.id ?? (vehicles.length === 1 ? vehicles[0].id : null);

  const [step, setStep] = useState<Step>(preselected ? "category" : "vehicle");
  const [draft, setDraft] = useState<Draft>({
    vehicleId: preselected,
    category: null,
    description: "",
    since: null,
    drivable: null,
    scheduledAt: null,
  });
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  const stepNumber = STEPS.indexOf(step);
  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const next = () => setStep(STEPS[Math.min(stepNumber + 1, STEPS.length - 1)]);
  const back = () => (stepNumber === 0 ? router.push("/app") : setStep(STEPS[stepNumber - 1]));

  const vehicle = vehicles.find((v) => v.id === draft.vehicleId) ?? null;
  const uploading = uploads.some((u) => !u.media);

  const submit = async () => {
    const parsed = appointmentRequestSchema.safeParse({
      vehicle_id: draft.vehicleId ?? "",
      issue_category: draft.category ?? "",
      issue_description: draft.description,
      since: draft.since ?? undefined,
      drivable_status: draft.drivable ?? "",
      scheduled_at: draft.scheduledAt ?? "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    setSubmitting(true);
    try {
      const id = await requestAppointment(
        parsed.data,
        uploads.flatMap((u) => (u.media ? [u.media] : [])),
      );
      setSentId(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la solicitud");
      if (error instanceof SlotUnavailableError) {
        update({ scheduledAt: null });
        setStep("slot");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (sentId && draft.scheduledAt) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 py-10 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-green-100 text-green-700">
          <CalendarCheck className="size-10" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">¡Solicitud enviada!</h1>
          <p className="text-muted-foreground">
            Has pedido cita para el <strong className="text-foreground">{formatLongDate(draft.scheduledAt)}</strong> a las{" "}
            <strong className="text-foreground">{formatTime(draft.scheduledAt)}</strong>.
          </p>
          <p className="text-muted-foreground">{workshop.name} te confirmará la cita en breve. Te avisaremos aquí.</p>
        </div>
        <Button asChild size="xl" className="w-full">
          <Link href="/app">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="Solicitar cita" onBack={back} />

      <div className="mb-6 space-y-3">
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= stepNumber ? "bg-primary" : "bg-foreground/10")} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Paso {stepNumber + 1} de {STEPS.length}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">{STEP_TITLES[step]}</h2>
      </div>

      <div className="flex-1">
        {step === "vehicle" && (
          <div className="grid gap-3">
            {vehicles.map((v) => (
              <OptionCard
                key={v.id}
                icon={CarFront}
                title={vehicleName(v)}
                description={v.license_plate}
                selected={draft.vehicleId === v.id}
                onClick={() => {
                  update({ vehicleId: v.id });
                  next();
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setVehicleDialog(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="size-5" aria-hidden /> Añadir otro vehículo
            </button>
            <VehicleFormDialog
              open={vehicleDialog}
              onOpenChange={setVehicleDialog}
              onCreated={(id) => {
                update({ vehicleId: id });
                next();
              }}
            />
          </div>
        )}

        {step === "category" && (
          <div className="grid gap-3">
            {ISSUE_CATEGORIES.map((c) => (
              <OptionCard
                key={c.value}
                icon={CATEGORY_ICONS[c.value]}
                title={c.label}
                description={c.description}
                selected={draft.category === c.value}
                onClick={() => {
                  update({ category: c.value });
                  next();
                }}
              />
            ))}
          </div>
        )}

        {step === "issue" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">
                ¿Qué has notado?
              </Label>
              <Textarea
                id="description"
                value={draft.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Ej.: hace un ruido al frenar, sobre todo en ciudad."
                className="min-h-28 text-base"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">No hace falta que sepas qué es, cuéntalo con tus palabras.</p>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-base font-medium">¿Desde cuándo?</legend>
              <div className="flex flex-wrap gap-2">
                {SINCE_OPTIONS.map((option) => (
                  <Chip key={option} selected={draft.since === option} onClick={() => update({ since: option })}>
                    {option}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-base font-medium">¿Se puede conducir?</legend>
              <div className="grid grid-cols-3 gap-2">
                {(["yes", "no", "unknown"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={draft.drivable === value}
                    onClick={() => update({ drivable: value })}
                    className={cn(
                      "h-14 rounded-xl border text-base font-medium transition",
                      draft.drivable === value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
                    )}
                  >
                    {value === "yes" ? "Sí" : value === "no" ? "No" : "No sé"}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === "media" && (
          <div className="space-y-3">
            <p className="text-muted-foreground">Una foto del testigo o un vídeo del ruido ayuda mucho al taller.</p>
            <MediaUploader items={uploads} onChange={setUploads} />
          </div>
        )}

        {step === "slot" && (
          <SlotPicker value={draft.scheduledAt} onChange={(iso) => update({ scheduledAt: iso })} />
        )}

        {step === "summary" && vehicle && draft.scheduledAt && (
          <dl className="divide-y rounded-2xl border bg-card">
            <SummaryRow label="Vehículo" value={`${vehicleName(vehicle)} · ${vehicle.license_plate}`} onEdit={() => setStep("vehicle")} />
            <SummaryRow label="Motivo" value={issueCategoryLabel(draft.category)} onEdit={() => setStep("category")} />
            <SummaryRow
              label="Descripción"
              value={
                [draft.description || "Sin descripción", draft.since && `Desde: ${draft.since}`, draft.drivable && DRIVABLE_LABELS[draft.drivable]]
                  .filter(Boolean)
                  .join(" · ")
              }
              onEdit={() => setStep("issue")}
            />
            <SummaryRow
              label="Fotos y vídeos"
              value={uploads.length === 0 ? "Ninguno" : `${uploads.length} ${uploads.length === 1 ? "archivo" : "archivos"}`}
              onEdit={() => setStep("media")}
            />
            <SummaryRow label="Fecha y hora" value={formatDateTime(draft.scheduledAt)} onEdit={() => setStep("slot")} />
          </dl>
        )}
      </div>

      {/* Acción principal fija abajo en los pasos que la necesitan */}
      {(step === "issue" || step === "media" || step === "slot" || step === "summary") && (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur pb-safe">
          {step === "issue" && (
            <Button size="xl" className="w-full" disabled={!draft.drivable} onClick={next}>
              Continuar
            </Button>
          )}
          {step === "media" && (
            <Button size="xl" className="w-full" variant={uploads.length ? "default" : "secondary"} disabled={uploading} onClick={next}>
              {uploading && <Loader2 className="animate-spin" aria-hidden />}
              {uploads.length ? "Continuar" : "Saltar este paso"}
            </Button>
          )}
          {step === "slot" && (
            <Button size="xl" className="w-full" disabled={!draft.scheduledAt} onClick={next}>
              {draft.scheduledAt ? `Continuar · ${formatDateTime(draft.scheduledAt)}` : "Elige una hora"}
            </Button>
          )}
          {step === "summary" && (
            <Button size="xl" className="w-full" disabled={submitting} onClick={submit}>
              {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              Enviar solicitud
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function OptionCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-4 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        selected && "border-primary ring-2 ring-primary/20",
      )}
    >
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-11 rounded-full border px-4 text-sm font-medium transition",
        selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-medium">{value}</dd>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-sm font-medium text-primary hover:underline">
        Cambiar
      </button>
    </div>
  );
}
