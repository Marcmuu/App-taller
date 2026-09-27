"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  X,
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MediaError, prepareMedia, type PreparedMedia } from "@/lib/media";
import { markMessagesRead, sendMessage } from "@/lib/data/actions";
import { useData, useRequiredProfile } from "@/lib/data/hooks";
import { getCommunicationTimeline, type ChatThread, type TimelineEntry } from "@/lib/data/queries";
import { REPAIR_STATUS_META } from "@/lib/domain/repair-status";
import { formatCurrency, formatDayLabel, formatTime, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

type Viewer = "customer" | "workshop";

/**
 * Conversación entre cliente y taller. En una reparación mezcla mensajes,
 * cambios de estado y presupuestos; en la consulta general, solo mensajes.
 * La ven el cliente y todos los empleados del taller.
 */
export function CommunicationTimeline({
  thread,
  viewer,
  className,
  showComposer = true,
}: {
  thread: ChatThread;
  viewer: Viewer;
  className?: string;
  showComposer?: boolean;
}) {
  const { customerId, repairId } = thread;
  const entries = useData((s) => getCommunicationTimeline(s.db, { customerId, repairId }));
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = entries.length;

  // Al abrir o recibir algo nuevo: marcar como leído y bajar al final.
  // Si está dentro de un panel con scroll ([data-scroll]) solo se mueve ese panel.
  useEffect(() => {
    markMessagesRead({ customerId, repairId });
    const bottom = bottomRef.current;
    const panel = bottom?.closest<HTMLElement>("[data-scroll]");
    if (panel) panel.scrollTop = panel.scrollHeight;
    else bottom?.scrollIntoView({ block: "end" });
  }, [customerId, repairId, count]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1 space-y-3">
        {entries.length === 0 && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <MessagesSquare className="size-4" aria-hidden />
            {viewer === "customer" ? "Escribe tu duda y el taller te responderá aquí" : "Sin mensajes todavía"}
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
      {showComposer && <Composer thread={{ customerId, repairId }} />}
    </div>
  );
}

function Entry({ entry, viewer }: { entry: TimelineEntry; viewer: Viewer }) {
  const profile = useRequiredProfile();

  if (entry.kind === "message") {
    const fromWorkshop = entry.sender ? entry.sender.role !== "customer" : false;
    // El taller es un equipo: sus mensajes van a la derecha aunque los escriba otro empleado.
    const mine = viewer === "workshop" ? fromWorkshop : !fromWorkshop;
    const byMe = entry.message.sender_id === profile.id;
    const senderLabel = byMe
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
          {entry.message.attachment_path && <ChatPhoto path={entry.message.attachment_path} mine={mine} />}
          {entry.message.body && (
            <p
              className={cn(
                "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-[15px] leading-snug",
                mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card",
              )}
            >
              {entry.message.body}
            </p>
          )}
          <p className="px-1 text-[11px] text-muted-foreground">
            {formatTime(entry.at)}
            {mine && entry.message.read_at && <span className="ml-1 text-primary">· Visto</span>}
          </p>
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
        Cita solicitada para <strong className="font-medium text-foreground">{formatWhen(entry.appointment.scheduled_at)}</strong>
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

/** Foto adjunta en un mensaje (se amplía al tocarla). */
function ChatPhoto({ path, mine }: { path: string; mine: boolean }) {
  const url = useData((s) => s.storage[path]?.url ?? null);
  const [open, setOpen] = useState(false);
  if (!url) {
    return <div className={cn("h-40 w-56 animate-pulse rounded-2xl bg-muted", mine && "ml-auto")} aria-label="Cargando foto" />;
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("block overflow-hidden rounded-2xl border", mine && "ml-auto")}
        aria-label="Ver foto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage / data URL */}
        <img src={url} alt="Foto enviada" className="max-h-64 w-auto max-w-full object-cover" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Foto</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage / data URL */}
          <img src={url} alt="Foto enviada" className="max-h-[80vh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Composer({ thread }: { thread: ChatThread }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<PreparedMedia | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!body.trim() && !photo) return;
    setSending(true);
    try {
      await sendMessage(thread, body, photo);
      setBody("");
      setPhoto(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setPreparing(true);
    try {
      const media = await prepareMedia(file);
      if (media.mediaType !== "image") throw new MediaError("En el chat solo se pueden enviar fotos.");
      setPhoto(media);
    } catch (error) {
      toast.error(error instanceof MediaError ? error.message : "No se pudo añadir la foto.");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <form
      className="sticky bottom-0 mt-4 space-y-2 border-t bg-background/95 py-3 backdrop-blur pb-safe"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {photo && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
          <img src={photo.dataUrl} alt="Foto para enviar" className="h-20 w-auto rounded-xl border object-cover" />
          <button
            type="button"
            onClick={() => setPhoto(null)}
            className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-black/70 text-white"
            aria-label="Quitar foto"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        aria-label="Adjuntar foto"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="size-11 shrink-0 rounded-full text-muted-foreground"
        onClick={() => fileInput.current?.click()}
        disabled={preparing || sending}
        aria-label="Adjuntar foto"
      >
        {preparing ? <Loader2 className="animate-spin" aria-hidden /> : <Camera aria-hidden />}
      </Button>
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
      <Button type="submit" size="icon-lg" className="size-11 shrink-0 rounded-full" disabled={sending || (!body.trim() && !photo)} aria-label="Enviar">
        {sending ? <Loader2 className="animate-spin" aria-hidden /> : <SendHorizontal aria-hidden />}
      </Button>
      </div>
    </form>
  );
}
