"use client";

import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { ActionError, SlotUnavailableError } from "@/lib/data/errors";
import type { ChatThread } from "@/lib/data/queries";
import { DEMO_PASSWORD, DEMO_PEOPLE, createSeed } from "@/lib/mock/seed";
import { uuid } from "@/lib/mock/store";
import type { ScheduleInput } from "@/lib/domain/schedule";
import type { Profile, RepairStatus } from "@/types/database";
import type {
  AppointmentRequestInput,
  EstimateFormInput,
  SignupInput,
  VehicleInput,
} from "@/lib/validators";
import type { EstimateResponse, MediaUpload, WorkshopProfileInput } from "../mock-actions";
import { MEDIA_BUCKET, getSessionUserId, getState, refreshTables, reloadAll, waitForProfile } from "./store";

/**
 * Acciones contra Supabase. Cada una llama a una función RPC de Postgres
 * (supabase/migrations/*_functions.sql) que comprueba permisos y reglas de
 * negocio en el servidor. Después se relee lo afectado para ver el cambio al
 * momento (Realtime avisa al resto de dispositivos).
 */

type Tables = Parameters<typeof refreshTables>[0];

function toActionError(error: PostgrestError | { message: string; code?: string }): ActionError {
  if (error.code === "TA001") return new SlotUnavailableError(error.message);
  if (error.code === "P0001") return new ActionError(error.message);
  if (error.code === "23505") return new ActionError("Ese dato ya existe.");
  return new ActionError("No se pudo completar la operación. Inténtalo de nuevo.");
}

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>, refresh: Tables): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, args);
  if (error) throw toActionError(error);
  await refreshTables(refresh);
  return data as T;
}

async function upload(path: string, media: MediaUpload): Promise<void> {
  const blob = await (await fetch(media.dataUrl)).blob();
  const { error } = await getSupabase().storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: media.mimeType, upsert: false });
  if (error) throw new ActionError("No se pudo subir el archivo. Inténtalo de nuevo.");
}

function extension(mime: string): string {
  return mime.split("/")[1]?.replace("quicktime", "mov").replace("jpeg", "jpg") ?? "bin";
}

function defaultWorkshopId(): string {
  return getState()?.db.workshops[0]?.id ?? "";
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<Profile> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) throw new ActionError("Email o contraseña incorrectos.");
  return waitForProfile(data.user.id);
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

export async function signUp(input: SignupInput): Promise<Profile> {
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { full_name: input.full_name.trim(), phone: input.phone.trim() } },
  });
  if (error) {
    if (/registered|already/i.test(error.message)) throw new ActionError("Ya existe una cuenta con ese email. Prueba a entrar.");
    throw new ActionError("No se pudo crear la cuenta. Revisa los datos.");
  }
  if (!data.session || !data.user) {
    throw new ActionError("Te hemos enviado un email para confirmar la cuenta. Ábrelo y después entra.");
  }
  return waitForProfile(data.user.id);
}

// ---------------------------------------------------------------------------
// Vehículos y citas
// ---------------------------------------------------------------------------

export async function addVehicle(input: VehicleInput): Promise<string> {
  return rpc<string>(
    "add_vehicle",
    { p_plate: input.license_plate, p_format: input.plate_format, p_make: input.make, p_model: input.model, p_year: input.year },
    ["vehicles"],
  );
}

export async function requestAppointment(input: AppointmentRequestInput, media: MediaUpload[]): Promise<string> {
  const description = [input.issue_description, input.since ? `Desde: ${input.since}.` : ""].filter(Boolean).join(" ");
  const { data, error } = await getSupabase().rpc("request_appointment", {
    p_vehicle_id: input.vehicle_id,
    p_category: input.issue_category,
    p_description: description,
    p_drivable: input.drivable_status,
    p_scheduled_at: input.scheduled_at,
  });
  if (error) throw toActionError(error);
  const appointmentId = data as string;
  const vehicle = getState()?.db.vehicles.find((v) => v.id === input.vehicle_id);
  const workshopId = vehicle?.workshop_id ?? defaultWorkshopId();
  for (const file of media) {
    const path = `${workshopId}/appointments/${appointmentId}/${uuid()}.${extension(file.mimeType)}`;
    await upload(path, file);
    const { error: mediaError } = await getSupabase().rpc("add_appointment_media", {
      p_appointment_id: appointmentId,
      p_path: path,
      p_type: file.mediaType,
    });
    if (mediaError) throw toActionError(mediaError);
  }
  await refreshTables(["appointments", "appointment_media", "notifications"]);
  return appointmentId;
}

export async function confirmAppointment(appointmentId: string): Promise<string> {
  return rpc<string>("confirm_appointment", { p_id: appointmentId }, ["appointments", "repair_orders", "repair_status_history"]);
}

export async function declineAppointment(appointmentId: string, reason: string, proposedAt: string | null = null): Promise<void> {
  await rpc("decline_appointment", { p_id: appointmentId, p_reason: reason, p_proposed_at: proposedAt }, ["appointments"]);
}

export async function acceptProposedTime(appointmentId: string): Promise<string> {
  return rpc<string>("accept_proposed_time", { p_id: appointmentId }, ["appointments", "repair_orders", "repair_status_history"]);
}

export async function rescheduleConfirmedAppointment(appointmentId: string, scheduledAt: string): Promise<void> {
  await rpc("reschedule_confirmed_appointment", { p_id: appointmentId, p_scheduled_at: scheduledAt }, ["appointments", "repair_orders"]);
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  await rpc("cancel_appointment", { p_id: appointmentId }, ["appointments", "repair_orders", "repair_status_history"]);
}

export async function rescheduleDeclinedAppointment(appointmentId: string, scheduledAt: string): Promise<void> {
  await rpc("reschedule_declined_appointment", { p_id: appointmentId, p_scheduled_at: scheduledAt }, ["appointments"]);
}

export async function dismissDeclinedAppointment(appointmentId: string): Promise<void> {
  await rpc("dismiss_declined_appointment", { p_id: appointmentId }, ["appointments"]);
}

// ---------------------------------------------------------------------------
// Reparaciones y presupuestos
// ---------------------------------------------------------------------------

const REPAIR_TABLES: Tables = ["repair_orders", "repair_status_history", "appointments", "estimates"];

export async function changeRepairStatus(
  repairId: string,
  to: RepairStatus,
  options: { note?: string; manual?: boolean; withoutEstimate?: boolean } = {},
): Promise<void> {
  await rpc(
    "change_repair_status",
    {
      p_repair_id: repairId,
      p_to: to,
      p_note: options.note ?? null,
      p_manual: options.manual ?? false,
      p_without_estimate: options.withoutEstimate ?? false,
    },
    REPAIR_TABLES,
  );
}

export async function setEstimatedReadyAt(repairId: string, estimatedReadyAt: string | null): Promise<void> {
  await rpc("set_estimated_ready_at", { p_repair_id: repairId, p_at: estimatedReadyAt }, ["repair_orders"]);
}

export async function getOrCreateDraftEstimate(repairId: string): Promise<string> {
  return rpc<string>("get_or_create_draft_estimate", { p_repair_id: repairId }, ["estimates", "estimate_items"]);
}

function estimateArgs(estimateId: string, input: EstimateFormInput) {
  return { p_estimate_id: estimateId, p_items: input.items, p_tax_rate: input.tax_rate, p_eta: input.estimated_ready_at };
}

export async function saveEstimateDraft(estimateId: string, input: EstimateFormInput): Promise<void> {
  await rpc("save_estimate_draft", estimateArgs(estimateId, input), ["estimates", "estimate_items"]);
}

export async function sendEstimate(estimateId: string, input: EstimateFormInput): Promise<void> {
  await rpc("send_estimate", estimateArgs(estimateId, input), ["estimates", "estimate_items", ...REPAIR_TABLES]);
}

export async function respondToEstimate(estimateId: string, response: EstimateResponse, message?: string): Promise<void> {
  await rpc("respond_estimate", { p_estimate_id: estimateId, p_response: response, p_message: message ?? null }, [
    "estimates",
    "messages",
  ]);
}

// ---------------------------------------------------------------------------
// Mensajes y avisos
// ---------------------------------------------------------------------------

export async function sendMessage(thread: ChatThread, body: string, attachment: MediaUpload | null = null): Promise<void> {
  const text = body.trim();
  if (!text && !attachment) return;
  if (attachment && attachment.mediaType !== "image") throw new ActionError("En el chat solo se pueden enviar fotos.");
  let path: string | null = null;
  if (attachment) {
    const state = getState();
    const me = state?.db.profiles.find((p) => p.id === getSessionUserId());
    const repair = thread.repairId ? state?.db.repair_orders.find((r) => r.id === thread.repairId) : null;
    const workshopId = repair?.workshop_id ?? (me?.role !== "customer" ? me?.workshop_id : null) ?? defaultWorkshopId();
    path = `${workshopId}/messages/${thread.customerId}/${uuid()}.${extension(attachment.mimeType)}`;
    await upload(path, attachment);
  }
  await rpc(
    "send_message",
    { p_customer_id: thread.customerId, p_repair_id: thread.repairId, p_body: text, p_attachment_path: path },
    ["messages"],
  );
}

export function markMessagesRead(thread: ChatThread) {
  const state = getState();
  const unread = state?.db.messages.some(
    (m) => m.customer_id === thread.customerId && m.repair_order_id === thread.repairId && !m.read_at,
  );
  if (!unread) return;
  void rpc("mark_messages_read", { p_customer_id: thread.customerId, p_repair_id: thread.repairId }, ["messages", "notifications"]).catch(
    () => undefined,
  );
}

export function markNotificationsRead() {
  if (!getState()?.db.notifications.some((n) => !n.read_at)) return;
  void rpc("mark_notifications_read", {}, ["notifications"]).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Horario y taller
// ---------------------------------------------------------------------------

export async function saveWorkshopSchedule(workshopId: string, input: ScheduleInput): Promise<{ outside: number }> {
  const outside = await rpc<number>(
    "save_workshop_schedule",
    { p_workshop_id: workshopId, p_slot_minutes: input.slot_minutes, p_days: input.days },
    ["workshop_availability"],
  );
  return { outside };
}

export async function addWorkshopClosure(workshopId: string, date: string, reason: string): Promise<{ affected: number }> {
  const affected = await rpc<number>(
    "add_workshop_closure",
    { p_workshop_id: workshopId, p_date: date, p_reason: reason },
    ["workshop_closures"],
  );
  return { affected };
}

export async function removeWorkshopClosure(closureId: string): Promise<void> {
  await rpc("remove_workshop_closure", { p_id: closureId }, ["workshop_closures"]);
}

export async function updateWorkshopProfile(workshopId: string, input: WorkshopProfileInput): Promise<void> {
  await rpc(
    "update_workshop_profile",
    {
      p_workshop_id: workshopId,
      p_name: input.name,
      p_phone: input.phone,
      p_email: input.email,
      p_address: input.address,
      p_review_url: input.review_url,
    },
    ["workshops"],
  );
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

/** Cambia a otra cuenta demo (inicia sesión con la contraseña demo). */
export async function switchDemoUser(userId: string): Promise<void> {
  const person = DEMO_PEOPLE.find((p) => p.id === userId);
  if (!person) throw new ActionError("Cuenta demo no encontrada.");
  await signIn(person.email, DEMO_PASSWORD);
}

/** Vuelve a cargar los datos demo con fechas de hoy (solo si la instalación está en modo demo). */
export async function resetDemoData(): Promise<void> {
  const current = getSessionUserId();
  const seed = createSeed(new Date());
  const { error } = await getSupabase().rpc("reset_demo", { p_seed: { db: seed.db, auth_users: seed.auth_users } });
  if (error) throw toActionError(error);
  // El reinicio recrea los usuarios demo: se vuelve a entrar con la misma cuenta.
  const person = DEMO_PEOPLE.find((p) => p.id === current);
  if (person) await signIn(person.email, DEMO_PASSWORD);
  else if (current) await signOut();
  await reloadAll();
}
