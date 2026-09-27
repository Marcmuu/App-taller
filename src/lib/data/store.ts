"use client";

import * as mock from "@/lib/mock/store";
import * as supa from "@/lib/data/supabase/store";
import { BACKEND } from "@/lib/data/backend";
import type { MockState } from "@/lib/mock/types";

/**
 * Fuente de datos de la app (BBDD de prueba o Supabase). Las pantallas leen
 * siempre a través de lib/data/hooks.ts, que usa esto.
 */
type Listener = () => void;

const impl: {
  getState: () => MockState | null;
  subscribe: (l: Listener) => () => void;
  getSessionUserId: () => string | null | undefined;
  subscribeSession: (l: Listener) => () => void;
} = BACKEND === "supabase" ? supa : mock;

export const getState = () => impl.getState();
export const subscribe = (l: Listener) => impl.subscribe(l);
export const getSessionUserId = () => impl.getSessionUserId();
export const subscribeSession = (l: Listener) => impl.subscribeSession(l);
export { uuid } from "@/lib/mock/store";
