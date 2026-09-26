"use client";

import { useRef } from "react";
import { Camera, Film, Loader2, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { MediaError, prepareMedia, type PreparedMedia } from "@/lib/media";
import { uuid } from "@/lib/mock/store";
import { MEDIA_RULES } from "@/lib/validators";

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  media: PreparedMedia | null;
}

/** Selector de fotos y vídeos con miniaturas y progreso. Controlado desde fuera. */
export function MediaUploader({
  items,
  onChange,
}: {
  items: UploadItem[];
  onChange: (update: (prev: UploadItem[]) => UploadItem[]) => void;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = MEDIA_RULES.maxFiles - items.length;
    const selected = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > selected.length) toast.info(`Puedes añadir hasta ${MEDIA_RULES.maxFiles} archivos.`);

    for (const file of selected) {
      const id = uuid();
      onChange((prev) => [...prev, { id, name: file.name, progress: 5, media: null }]);
      try {
        const media = await prepareMedia(file, (progress) =>
          onChange((prev) => prev.map((i) => (i.id === id ? { ...i, progress } : i))),
        );
        onChange((prev) => prev.map((i) => (i.id === id ? { ...i, progress: 100, media } : i)));
      } catch (error) {
        onChange((prev) => prev.filter((i) => i.id !== id));
        toast.error(error instanceof MediaError ? error.message : "No se pudo añadir el archivo.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <PickButton icon={<Camera className="size-7" aria-hidden />} label="Añadir foto" onClick={() => photoInput.current?.click()} />
        <PickButton icon={<Film className="size-7" aria-hidden />} label="Añadir vídeo" onClick={() => videoInput.current?.click()} />
      </div>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <li key={item.id} className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
              {item.media ? (
                item.media.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL local
                  <img src={item.media.dataUrl} alt={item.name} className="size-full object-cover" />
                ) : (
                  <div className="relative size-full">
                    <video src={item.media.dataUrl} className="size-full object-cover" muted playsInline />
                    <Play className="absolute inset-0 m-auto size-8 rounded-full bg-black/50 p-2 text-white" aria-hidden />
                  </div>
                )
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 p-3">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
                  <Progress value={item.progress} className="h-1.5" aria-label={`Subiendo ${item.name}`} />
                </div>
              )}
              <button
                type="button"
                onClick={() => onChange((prev) => prev.filter((i) => i.id !== item.id))}
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label={`Quitar ${item.name}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PickButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed bg-card px-4 py-6 font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  );
}
