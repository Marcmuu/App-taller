"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Cabecera de subpantallas del cliente: volver + título. */
export function BackHeader({
  title,
  href,
  onBack,
  right,
}: {
  title: string;
  href?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const className =
    "grid size-10 shrink-0 place-items-center rounded-full hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 border-b bg-background/90 px-2 backdrop-blur">
      <div className="flex h-14 items-center gap-1">
        {onBack ? (
          <button type="button" onClick={onBack} className={className} aria-label="Volver">
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <Link href={href ?? "/app"} className={className} aria-label="Volver">
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h1>
        {right}
      </div>
    </header>
  );
}
