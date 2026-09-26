import type { StatusTone } from "@/lib/domain/repair-status";

/**
 * Clases por tono de estado. Strings completos para que Tailwind los detecte.
 */
export const TONE_CLASSES: Record<
  StatusTone,
  { badge: string; dot: string; soft: string; text: string; solid: string }
> = {
  slate: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
    soft: "bg-slate-50 ring-slate-200",
    text: "text-slate-700",
    solid: "bg-slate-600 text-white",
  },
  sky: {
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    soft: "bg-sky-50 ring-sky-200",
    text: "text-sky-700",
    solid: "bg-sky-600 text-white",
  },
  violet: {
    badge: "bg-violet-100 text-violet-800 ring-violet-200",
    dot: "bg-violet-500",
    soft: "bg-violet-50 ring-violet-200",
    text: "text-violet-700",
    solid: "bg-violet-600 text-white",
  },
  amber: {
    badge: "bg-amber-100 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    soft: "bg-amber-50 ring-amber-200",
    text: "text-amber-800",
    solid: "bg-amber-500 text-white",
  },
  blue: {
    badge: "bg-blue-100 text-blue-800 ring-blue-200",
    dot: "bg-blue-500",
    soft: "bg-blue-50 ring-blue-200",
    text: "text-blue-700",
    solid: "bg-blue-600 text-white",
  },
  emerald: {
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    soft: "bg-emerald-50 ring-emerald-200",
    text: "text-emerald-700",
    solid: "bg-emerald-600 text-white",
  },
  green: {
    badge: "bg-green-100 text-green-800 ring-green-300",
    dot: "bg-green-600",
    soft: "bg-green-50 ring-green-300",
    text: "text-green-700",
    solid: "bg-green-600 text-white",
  },
  neutral: {
    badge: "bg-neutral-100 text-neutral-600 ring-neutral-200",
    dot: "bg-neutral-400",
    soft: "bg-neutral-50 ring-neutral-200",
    text: "text-neutral-600",
    solid: "bg-neutral-500 text-white",
  },
};
