"use client";

import { useSyncExternalStore } from "react";
import { getSessionUserId, getState, subscribe, subscribeSession } from "@/lib/data/store";
import type { MockState } from "@/lib/mock/types";
import type { Profile } from "@/types/database";

/**
 * Hooks de lectura. Las pantallas solo leen datos a través de aquí; al
 * conectar Supabase se reimplementan (queries + suscripción Realtime) sin
 * tocar los componentes.
 */

const getServerState = () => null;

/** Estado completo o null mientras se hidrata en el cliente. */
export function useMockState(): MockState | null {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

/** Igual que useMockState pero garantiza datos: usar dentro de <DataGate>. */
export function useData<T>(select: (state: MockState) => T): T {
  const state = useMockState();
  if (!state) throw new Error("useData debe usarse dentro de <DataGate>");
  return select(state);
}

const getServerSession = () => undefined;

/** undefined = aún no sabemos (SSR/hidratación); null = sin sesión. */
export function useSessionUserId(): string | null | undefined {
  return useSyncExternalStore(subscribeSession, getSessionUserId, getServerSession);
}

export function useCurrentProfile(): Profile | null {
  const userId = useSessionUserId();
  const state = useMockState();
  if (!userId || !state) return null;
  return state.db.profiles.find((p) => p.id === userId) ?? null;
}

/** Perfil garantizado: usar dentro de los layouts protegidos. */
export function useRequiredProfile(): Profile {
  const profile = useCurrentProfile();
  if (!profile) throw new Error("useRequiredProfile requiere sesión");
  return profile;
}
