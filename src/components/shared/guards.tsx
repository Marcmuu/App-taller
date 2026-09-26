"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCurrentProfile, useMockState, useSessionUserId } from "@/lib/data/hooks";

/**
 * Protección de rutas en modo mock (cliente). Con Supabase se sustituye por
 * `proxy.ts` + sesión SSR en cookies y comprobación de rol en el layout.
 */

export function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center text-muted-foreground" role="status">
      <Loader2 className="size-6 animate-spin" aria-hidden />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

/** Espera a que la BBDD falsa esté cargada en el navegador. */
export function DataGate({ children }: { children: React.ReactNode }) {
  const state = useMockState();
  if (!state) return <FullPageLoader />;
  return <>{children}</>;
}

export function AuthGuard({
  area,
  children,
}: {
  area: "customer" | "workshop";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const userId = useSessionUserId();
  const profile = useCurrentProfile();
  const allowed = profile && (area === "customer" ? profile.role === "customer" : profile.role !== "customer");

  useEffect(() => {
    if (userId === undefined) return;
    if (!allowed) router.replace(area === "customer" ? "/login?tipo=cliente" : "/login?tipo=taller");
  }, [allowed, area, router, userId]);

  if (!allowed) return <FullPageLoader />;
  return <>{children}</>;
}
