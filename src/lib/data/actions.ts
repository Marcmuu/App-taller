"use client";

import * as mock from "./mock-actions";
import * as supa from "./supabase/actions";
import { BACKEND } from "./backend";

/**
 * Acciones de la app. Las pantallas importan siempre de aquí; por debajo se
 * usa la BBDD de prueba (demo sin servidor) o Supabase según NEXT_PUBLIC_BACKEND.
 */

export { ActionError, SlotUnavailableError } from "./errors";
export type { EstimateResponse, MediaUpload, PushSubscriptionInput, WorkshopProfileInput } from "./mock-actions";

type Mock = typeof mock;
type ActionName = Exclude<keyof Mock, "ActionError" | "SlotUnavailableError">;
type Loose<F> = F extends (...args: infer A) => infer R ? (...args: A) => R | Promise<Awaited<R>> : never;

// Si falta una acción en Supabase (o cambia su firma), esto no compila.
const supabaseImpl: { [K in ActionName]: Loose<Mock[K]> } = supa;
const impl: { [K in ActionName]: Loose<Mock[K]> } = BACKEND === "supabase" ? supabaseImpl : mock;

export const signIn = (...a: Parameters<Mock["signIn"]>) => impl.signIn(...a);
export const signOut = (...a: Parameters<Mock["signOut"]>) => impl.signOut(...a);
export const signUp = (...a: Parameters<Mock["signUp"]>) => impl.signUp(...a);
export const addVehicle = (...a: Parameters<Mock["addVehicle"]>) => impl.addVehicle(...a);
export const requestAppointment = (...a: Parameters<Mock["requestAppointment"]>) => impl.requestAppointment(...a);
export const confirmAppointment = (...a: Parameters<Mock["confirmAppointment"]>) => impl.confirmAppointment(...a);
export const declineAppointment = (...a: Parameters<Mock["declineAppointment"]>) => impl.declineAppointment(...a);
export const acceptProposedTime = (...a: Parameters<Mock["acceptProposedTime"]>) => impl.acceptProposedTime(...a);
export const rescheduleConfirmedAppointment = (...a: Parameters<Mock["rescheduleConfirmedAppointment"]>) =>
  impl.rescheduleConfirmedAppointment(...a);
export const cancelAppointment = (...a: Parameters<Mock["cancelAppointment"]>) => impl.cancelAppointment(...a);
export const rescheduleDeclinedAppointment = (...a: Parameters<Mock["rescheduleDeclinedAppointment"]>) =>
  impl.rescheduleDeclinedAppointment(...a);
export const dismissDeclinedAppointment = (...a: Parameters<Mock["dismissDeclinedAppointment"]>) =>
  impl.dismissDeclinedAppointment(...a);
export const changeRepairStatus = (...a: Parameters<Mock["changeRepairStatus"]>) => impl.changeRepairStatus(...a);
export const setEstimatedReadyAt = (...a: Parameters<Mock["setEstimatedReadyAt"]>) => impl.setEstimatedReadyAt(...a);
export const getOrCreateDraftEstimate = (...a: Parameters<Mock["getOrCreateDraftEstimate"]>) => impl.getOrCreateDraftEstimate(...a);
export const saveEstimateDraft = (...a: Parameters<Mock["saveEstimateDraft"]>) => impl.saveEstimateDraft(...a);
export const sendEstimate = (...a: Parameters<Mock["sendEstimate"]>) => impl.sendEstimate(...a);
export const respondToEstimate = (...a: Parameters<Mock["respondToEstimate"]>) => impl.respondToEstimate(...a);
export const sendMessage = (...a: Parameters<Mock["sendMessage"]>) => impl.sendMessage(...a);
export const markMessagesRead = (...a: Parameters<Mock["markMessagesRead"]>) => void impl.markMessagesRead(...a);
export const markNotificationsRead = () => void impl.markNotificationsRead();
export const saveWorkshopSchedule = (...a: Parameters<Mock["saveWorkshopSchedule"]>) => impl.saveWorkshopSchedule(...a);
export const addWorkshopClosure = (...a: Parameters<Mock["addWorkshopClosure"]>) => impl.addWorkshopClosure(...a);
export const removeWorkshopClosure = (...a: Parameters<Mock["removeWorkshopClosure"]>) => impl.removeWorkshopClosure(...a);
export const updateWorkshopProfile = (...a: Parameters<Mock["updateWorkshopProfile"]>) => impl.updateWorkshopProfile(...a);
export const savePushSubscription = (...a: Parameters<Mock["savePushSubscription"]>) => impl.savePushSubscription(...a);
export const deletePushSubscription = (...a: Parameters<Mock["deletePushSubscription"]>) => impl.deletePushSubscription(...a);
export const switchDemoUser = (...a: Parameters<Mock["switchDemoUser"]>) => impl.switchDemoUser(...a);
export const resetDemoData = (...a: Parameters<Mock["resetDemoData"]>) => impl.resetDemoData(...a);
