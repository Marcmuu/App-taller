"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  CircleCheck,
  CircleHelp,
  CircleX,
  FileText,
  Loader2,
  MessagesSquare,
  RefreshCw,
  SendHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { markMessagesRead, sendMessage } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getCommunicationTimeline, type TimelineEntry } from "@/lib/data/queries";
import { REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import { formatCurrency, formatDateTime, formatDayLabel, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

type Viewer = "customer" | "workshop";

/**
 * Cronología de una reparación: mensajes, cambios de estado y presupuestos.
 * No es un chat completo: mensajes sencillos ligados a la reparación.
 */
export function CommunicationTimeline({
  repairId,
  viewer,
  className,
  showComposer = true,
}: {
  repairId: string;
  viewer: Viewer;
  className?: string;
  showComposer?: boolean;
}) {
  const entries = useData((s) => getCommunicationTimeline(s.db, repairId));
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = entries.length;

  // Al abrir o recibir algo nuevo: marcar como leído y bajar al final.
  // Si está dentro de un panel con scroll ([data-scroll]) solo se mueve ese panel.
  useEffect(() => {
    markMessagesRead(repairId);
    const bottom = bottomRef.current;
    const panel = bottom?.closest<HTMLElement>("[data-scroll]");
    if (panel) panel.scrollTop = panel.scrollHeight;
    else bottom?.scrollIntoView({ block: "end" });
  }, [repairId, count]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1 space-y-3">
        {entries.length === 0 && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <MessagesSquare className="size-4" aria-hidden /> Sin mensajes todavía
          </p>
        )}
        {entries.map((entry, i) => {
          const prev = entries[i - 1];
          const newDay = !prev || formatDayLabel(prev.at) !== formatDayLabel(entry.at);
          return (
            <div key={entry.id} className="space-y-3">
              {newDay && (
                <p className="text-center text-xs font-medium text-muted-foreground first-letter:uppercase">{formatDayLabel(entry.at)}</p>
              )}
              <Entry entry={entry} viewer={viewer} />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {showComposer && <Composer repairId={repairId} />}
    </div>
  );
}

function Entry({ entry, viewer }: { entry: TimelineEntry; viewer: Viewer }) {
  const profile = useRequiredProfile();

  if (entry.kind === "message") {
    const mine = entry.message.sender_id === profile.id;
    const fromWorkshop = entry.sender ? entry.sender.role !== "customer" : false;
    const senderLabel = mine
      ? null
      : viewer === "customer"
        ? `${entry.sender?.full_name.split(" ")[0] ?? "Taller"} · Taller`
        : fromWorkshop
          ? entry.sender?.full_name
          : `${entry.sender?.full_name ?? "Cliente"} · Cliente`;
    return (
      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[85%] space-y-1", mine && "items-end text-right")}>
          {senderLabel && <p className="px-1 text-xs text-muted-foreground">{senderLabel}</p>}
          <p
            className={cn(
              "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-[15px] leading-snug",
              mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card",
            )}
          >
            {entry.message.body}
          </p>
          <p className="px-1 text-[11px] text-muted-foreground">{formatTime(entry.at)}</p>
        </div>
      </div>
    );
  }

  const estimateHref = (id: string) => (viewer === "customer" ? routes.customerEstimate(id) : routes.workshopEstimate(id));

  if (entry.kind === "status") {
    const actor = entry.actor?.full_name.split(" ")[0];
    return (
      <SystemEvent icon={<RefreshCw className="size-3.5" aria-hidden />} at={entry.at}>
        <strong className="font-medium text-foreground">{REPAIR_STATUS_META[entry.history.to_status].label}</strong>
        {viewer === "workshop" && actor && <> · {actor}</>}
        {entry.history.note && <span className="block">{entry.history.note}</span>}
      </SystemEvent>
    );
  }

  if (entry.kind === "appointment") {
    return (
      <SystemEvent icon={<CalendarPlus className="size-3.5" aria-hidden />} at={entry.at}>
        Cita solicitada para el <strong className="font-medium text-foreground">{formatDateTime(entry.appointment.scheduled_at)}</strong>
      </SystemEvent>
    );
  }

  const { estimate, event } = entry;
  const config = {
    sent: { icon: <FileText className="size-3.5" aria-hidden />, text: `Presupuesto${estimate.version > 1 ? ` v${estimate.version}` : ""} enviado · ${formatCurrency(estimate.total)}`, cls: "" },
    accepted: { icon: <CircleCheck className="size-3.5" aria-hidden />, text: "Presupuesto aceptado", cls: "bg-green-50 text-green-800 ring-green-200" },
    rejected: { icon: <CircleX className="size-3.5" aria-hidden />, text: "Presupuesto rechazado", cls: "bg-red-50 text-red-800 ring-red-200" },
    question: { icon: <CircleHelp className="size-3.5" aria-hidden />, text: "Consulta sobre el presupuesto", cls: "bg-amber-50 text-amber-900 ring-amber-200" },
  }[event];

  return (
    <SystemEvent icon={config.icon} at={entry.at} className={config.cls}>
      <Link href={estimateHref(estimate.id)} className="font-medium text-foreground underline-offset-2 hover:underline">
        {config.text}
      </Link>
    </SystemEvent>
  );
}

function SystemEvent({
  icon,
  at,
  className,
  children,
}: {
  icon: React.ReactNode;
  at: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center">
      <div className={cn("inline-flex max-w-[90%] items-start gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground ring-1 ring-inset ring-transparent", className)}>
        <span className="mt-px">{icon}</span>
        <span>
          {children} <span className="whitespace-nowrap opacity-70">· {formatTime(at)}</span>
        </span>
      </div>
    </div>
  );
}

function Composer({ repairId }: { repairId: string }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await sendMessage(repairId, body);
      setBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      className="sticky bottom-0 mt-4 flex items-end gap-2 border-t bg-background/95 py-3 backdrop-blur pb-safe"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="Escribe un mensaje…"
        aria-label="Mensaje"
        rows={1}
        maxLength={2000}
        className="max-h-32 min-h-11 resize-none text-base"
      />
      <Button type="submit" size="icon-lg" className="size-11 shrink-0 rounded-full" disabled={sending || !body.trim()} aria-label="Enviar">
        {sending ? <Loader2 className="animate-spin" aria-hidden /> : <SendHorizontal aria-hidden />}
      </Button>
    </form>
  );
}
