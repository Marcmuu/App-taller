"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CircleCheck,
  CircleHelp,
  CircleX,
  Loader2,
  MessageCircleQuestion,
  PhoneCall,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { BackHeader } from "@/components/customer/back-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EstimateSummary } from "@/components/estimate/estimate-summary";
import { respondToEstimate, type EstimateResponse } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getEstimateItems, getLatestEstimate, getRepairView } from "@/lib/data/queries";
import { formatCurrency, formatDateTime, vehicleName } from "@/lib/format";
import { routes } from "@/lib/routes";

export default function CustomerEstimatePage() {
  const id = useSearchParams().get("id") ?? "";
  const profile = useRequiredProfile();
  const data = useData((s) => {
    const estimate = s.db.estimates.find((e) => e.id === id);
    if (!estimate || estimate.status === "draft") return null; // RLS: el cliente no ve borradores
    const view = getRepairView(s.db, estimate.repair_order_id, false);
    if (!view || view.repair.customer_id !== profile.id) return null;
    const latest = getLatestEstimate(s.db, estimate.repair_order_id, { includeDrafts: false });
    return {
      estimate,
      view,
      items: getEstimateItems(s.db, estimate.id),
      newerVersion: latest && latest.id !== estimate.id ? latest : null,
    };
  });

  const [confirmAccept, setConfirmAccept] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!data) {
    return (
      <>
        <BackHeader title="Presupuesto" />
        <EmptyState icon={SearchX} title="No encontramos este presupuesto" action={<Button asChild><Link href="/app">Ir al inicio</Link></Button>} />
      </>
    );
  }

  const { estimate, view, items, newerVersion } = data;
  const repairHref = routes.customerRepair(view.repair.id);

  const respond = async (response: EstimateResponse, message?: string) => {
    setBusy(true);
    try {
      await respondToEstimate(estimate.id, response, message);
      if (response === "accept") toast.success("¡Presupuesto aceptado!");
      else if (response === "reject") toast("Hemos avisado al taller de que no quieres realizar la reparación.");
      else toast.success("Mensaje enviado al taller");
      setSheetOpen(false);
      setConfirmAccept(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la respuesta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <BackHeader title="Presupuesto" href={repairHref} />

      <div>
        <p className="text-sm text-muted-foreground">
          {vehicleName(view.vehicle)} · {view.vehicle.license_plate}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Presupuesto{estimate.version > 1 && ` (versión ${estimate.version})`}
        </h1>
        {estimate.sent_at && <p className="text-sm text-muted-foreground">Recibido {formatDateTime(estimate.sent_at)}</p>}
      </div>

      {newerVersion && (
        <Link
          href={routes.customerEstimate(newerVersion.id)}
          className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
        >
          Hay una versión más reciente de este presupuesto <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}

      {estimate.status === "accepted" && estimate.accepted_at && (
        <StatusBanner tone="green" icon={<CircleCheck className="size-5" aria-hidden />}>
          Aceptaste este presupuesto el {formatDateTime(estimate.accepted_at)}. El taller te avisará cuando empiece la reparación.
        </StatusBanner>
      )}
      {estimate.status === "rejected" && (
        <StatusBanner tone="red" icon={<CircleX className="size-5" aria-hidden />}>
          Has rechazado este presupuesto. El taller se pondrá en contacto contigo.
        </StatusBanner>
      )}
      {estimate.status === "question" && (
        <StatusBanner tone="amber" icon={<CircleHelp className="size-5" aria-hidden />}>
          Has enviado una consulta. El taller te responderá en los{" "}
          <Link href={routes.customerMessages(view.repair.id)} className="font-medium underline">mensajes</Link>.
        </StatusBanner>
      )}

      <EstimateSummary
        items={items}
        subtotal={estimate.subtotal}
        taxRate={estimate.tax_rate}
        taxAmount={estimate.tax_amount}
        total={estimate.total}
      />

      {estimate.status === "sent" && !newerVersion && (
        <div className="sticky bottom-0 -mx-4 grid gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur pb-safe">
          <Button size="xl" className="h-14 w-full bg-green-600 text-white hover:bg-green-600/90" onClick={() => setConfirmAccept(true)}>
            <CircleCheck aria-hidden /> ACEPTAR PRESUPUESTO
          </Button>
          <Button size="xl" variant="outline" className="w-full" onClick={() => setSheetOpen(true)}>
            RECHAZAR / CONSULTAR
          </Button>
        </div>
      )}

      <AlertDialog open={confirmAccept} onOpenChange={setConfirmAccept}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aceptas el presupuesto de {formatCurrency(estimate.total)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Al aceptar, el taller podrá empezar la reparación de tu {vehicleName(view.vehicle)}. Quedará registrado que aceptas la versión {estimate.version}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-green-600 text-white hover:bg-green-600/90"
              onClick={(e) => {
                e.preventDefault();
                void respond("accept");
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Sí, acepto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RejectOrAskSheet open={sheetOpen} onOpenChange={setSheetOpen} busy={busy} onRespond={respond} />
    </div>
  );
}

function StatusBanner({
  tone,
  icon,
  children,
}: {
  tone: "green" | "red" | "amber";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls = {
    green: "bg-green-50 text-green-900 ring-green-200",
    red: "bg-red-50 text-red-900 ring-red-200",
    amber: "bg-amber-50 text-amber-900 ring-amber-200",
  }[tone];
  return (
    <div className={`flex gap-3 rounded-2xl p-4 text-sm ring-1 ring-inset ${cls}`} role="status">
      <span className="shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

type SheetStep = "choose" | "question" | "reject";

function RejectOrAskSheet({
  open,
  onOpenChange,
  busy,
  onRespond,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onRespond: (response: EstimateResponse, message?: string) => Promise<void>;
}) {
  const [step, setStep] = useState<SheetStep>("choose");
  const [text, setText] = useState("");

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setStep("choose");
      setText("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl pb-safe">
        <SheetHeader>
          <SheetTitle>
            {step === "choose" && "¿Qué quieres hacer?"}
            {step === "question" && "Escribe tu duda"}
            {step === "reject" && "No realizar la reparación"}
          </SheetTitle>
          <SheetDescription>
            {step === "choose" && "El taller recibirá tu respuesta al momento."}
            {step === "question" && "El taller te responderá lo antes posible."}
            {step === "reject" && "Si quieres, cuéntanos el motivo (opcional)."}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-3 px-4 pb-6">
          {step === "choose" && (
            <>
              <SheetOption icon={<MessageCircleQuestion className="size-6" aria-hidden />} label="Tengo una duda" onClick={() => setStep("question")} />
              <SheetOption
                icon={<PhoneCall className="size-6" aria-hidden />}
                label="Quiero hablar con el taller"
                disabled={busy}
                onClick={() => void onRespond("talk").then(() => close(false))}
              />
              <SheetOption
                icon={<CircleX className="size-6" aria-hidden />}
                label="No quiero realizar la reparación"
                destructive
                onClick={() => setStep("reject")}
              />
            </>
          )}

          {(step === "question" || step === "reject") && (
            <>
              <Textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={step === "question" ? "Ej.: ¿La bobina tiene garantía?" : "Ej.: Prefiero pensarlo un poco más."}
                className="min-h-28 text-base"
                maxLength={2000}
              />
              <Button
                size="xl"
                variant={step === "reject" ? "destructive" : "default"}
                disabled={busy || (step === "question" && !text.trim())}
                onClick={() => void onRespond(step === "question" ? "question" : "reject", text.trim() || undefined).then(() => close(false))}
              >
                {busy && <Loader2 className="animate-spin" aria-hidden />}
                {step === "question" ? "Enviar duda" : "Rechazar presupuesto"}
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setStep("choose")} disabled={busy}>
                Volver
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SheetOption({
  icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-4 rounded-2xl border p-4 text-left text-base font-medium transition hover:bg-muted disabled:opacity-50 ${destructive ? "text-destructive" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}
