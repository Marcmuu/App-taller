"use client";

import { useState } from "react";
import { ImageOff, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { MediaView } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

export function MediaGallery({ media, className }: { media: MediaView[]; className?: string }) {
  const [open, setOpen] = useState<MediaView | null>(null);

  if (media.length === 0) {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <ImageOff className="size-4" aria-hidden /> Sin fotos ni vídeos
      </p>
    );
  }

  return (
    <>
      <ul className={cn("flex flex-wrap gap-2", className)}>
        {media.map((m, i) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setOpen(m)}
              className="relative block size-20 overflow-hidden rounded-xl border bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Ver ${m.media_type === "image" ? "foto" : "vídeo"} ${i + 1}`}
            >
              {m.media_type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL de storage / data URL
                <img src={m.url} alt="" className="size-full object-cover" />
              ) : (
                <>
                  <video src={m.url} className="size-full object-cover" muted playsInline />
                  <Play className="absolute inset-0 m-auto size-7 rounded-full bg-black/50 p-1.5 text-white" aria-hidden />
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Archivo adjunto</DialogTitle>
          {open?.media_type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element -- URL de storage / data URL
            <img src={open.url} alt="Foto adjunta" className="max-h-[80vh] w-full rounded-lg object-contain" />
          )}
          {open?.media_type === "video" && (
            <video src={open.url} controls autoPlay className="max-h-[80vh] w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
