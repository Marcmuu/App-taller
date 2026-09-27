"use client";

import { BACKEND } from "@/lib/data/backend";
import { MEDIA_RULES } from "@/lib/validators";
import type { MediaType } from "@/types/database";

/**
 * Preparación de fotos/vídeos en el navegador antes de subirlos.
 *
 * En modo mock se convierten a data URL (las fotos se reducen para caber en
 * localStorage). Con Supabase Storage se subirá el fichero original al bucket
 * `repair-media` y solo cambiará `prepareMedia`.
 */

export interface PreparedMedia {
  dataUrl: string;
  mimeType: string;
  mediaType: MediaType;
}

export class MediaError extends Error {}

export function detectMediaType(file: File): MediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

export function validateMediaFile(file: File): MediaType {
  const type = detectMediaType(file);
  if (!type) throw new MediaError("Solo se admiten fotos o vídeos.");
  const rules = MEDIA_RULES[type];
  if (!(rules.mime as readonly string[]).includes(file.type)) {
    throw new MediaError(type === "image" ? "Formato de foto no admitido (usa JPG o PNG)." : "Formato de vídeo no admitido (usa MP4 o MOV).");
  }
  const mb = file.size / (1024 * 1024);
  if (mb > rules.maxMb) throw new MediaError(`El archivo supera ${rules.maxMb} MB.`);
  if (type === "video" && BACKEND === "mock" && mb > MEDIA_RULES.mockVideoMaxMb) {
    throw new MediaError(`En la versión de prueba los vídeos pueden ocupar hasta ${MEDIA_RULES.mockVideoMaxMb} MB.`);
  }
  return type;
}

export async function prepareMedia(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<PreparedMedia> {
  const mediaType = validateMediaFile(file);
  if (mediaType === "image") {
    onProgress?.(30);
    const dataUrl = await downscaleImage(file, 1280, 0.8);
    onProgress?.(100);
    return { dataUrl, mimeType: "image/jpeg", mediaType };
  }
  const dataUrl = await readAsDataUrl(file, onProgress);
  return { dataUrl, mimeType: file.type, mediaType };
}

async function downscaleImage(file: File, maxSize: number, quality: number): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new MediaError("No hemos podido leer esta foto. Prueba con otra en JPG o PNG.");
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new MediaError("Tu navegador no permite procesar la foto.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

function readAsDataUrl(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new MediaError("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}
