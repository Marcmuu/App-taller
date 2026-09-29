/**
 * Seguridad de la base de datos (RLS + RPC) contra Supabase local.
 * Se conecta como lo haría el navegador (clave pública + sesión de cada usuario)
 * y comprueba que nadie ve ni toca datos que no son suyos.
 *
 *   npx supabase start && npm run test:db
 */
import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_PASSWORD, IDS } from "@/lib/mock/seed";
import { resetDemo } from "../scripts/db-admin";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

test.skip(!URL || !KEY || !SERVICE, "Necesita Supabase local (.env.local)");
test.describe.configure({ mode: "serial" });

const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = () => createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

async function as(email: string): Promise<SupabaseClient> {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw error;
  return c;
}

async function rows<T = Record<string, unknown>>(c: SupabaseClient, table: string, columns = "*"): Promise<T[]> {
  const { data, error } = await c.from(table).select(columns);
  expect(error).toBeNull();
  return (data ?? []) as T[];
}

let anaRepairId = "";
let anaMessagePath = "";

test.beforeAll(async () => {
  await resetDemo();
  const { data } = await admin().from("repair_orders").select("id").eq("customer_id", IDS.ana).limit(1).single();
  anaRepairId = data!.id;
  // Una foto privada de Ana en el chat
  anaMessagePath = `${IDS.workshop}/messages/${IDS.ana}/test-privada.png`;
  await admin().storage.from("repair-media").upload(anaMessagePath, new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), { upsert: true });
});

test("sin sesión solo se ven los datos públicos del taller", async () => {
  const anon = client();
  expect(await rows(anon, "workshops")).toHaveLength(1);
  expect((await rows(anon, "workshop_availability")).length).toBeGreaterThan(0);
  for (const table of ["profiles", "vehicles", "appointments", "repair_orders", "estimates", "messages", "notifications"]) {
    expect(await rows(anon, table), table).toHaveLength(0);
  }
  // La ocupación se ve (para el calendario) pero sin datos personales
  const slots = await rows(anon, "booked_slots");
  expect(slots.length).toBeGreaterThan(0);
  expect(Object.keys(slots[0]).sort()).not.toContain("customer_id");
  const { error } = await anon.storage.from("repair-media").download(anaMessagePath);
  expect(error).not.toBeNull();
});

test("un cliente solo ve lo suyo", async () => {
  const carlos = await as("carlos@demo.es");
  for (const table of ["vehicles", "appointments", "repair_orders", "messages"]) {
    const list = await rows<{ customer_id: string }>(carlos, table, "customer_id");
    expect(list.length, table).toBeGreaterThan(0);
    expect(list.every((r) => r.customer_id === IDS.carlos), table).toBe(true);
  }
  const notifications = await rows<{ user_id: string }>(carlos, "notifications", "user_id");
  expect(notifications.every((n) => n.user_id === IDS.carlos)).toBe(true);
  // Perfiles: el suyo y los empleados del taller, nunca otros clientes
  const profiles = await rows<{ id: string; role: string }>(carlos, "profiles", "id, role");
  expect(profiles.filter((p) => p.role === "customer").map((p) => p.id)).toEqual([IDS.carlos]);
  // Presupuestos solo de sus reparaciones y nunca borradores
  const estimates = await rows<{ status: string }>(carlos, "estimates", "status");
  expect(estimates.some((e) => e.status === "draft")).toBe(false);
  // Fotos de otro cliente: no
  const { error } = await carlos.storage.from("repair-media").download(anaMessagePath);
  expect(error).not.toBeNull();
});

test("un cliente no puede escribir directamente ni actuar sobre datos ajenos", async () => {
  const carlos = await as("carlos@demo.es");
  // Sin políticas de escritura: las tablas solo cambian a través de las RPC
  const upd = await carlos.from("repair_orders").update({ current_status: "closed" }).eq("id", anaRepairId).select();
  expect(upd.data ?? []).toHaveLength(0);
  const role = await carlos.from("profiles").update({ role: "workshop_admin" }).eq("id", IDS.carlos).select();
  expect(role.data ?? []).toHaveLength(0);
  const ins = await carlos.from("messages").insert({ workshop_id: IDS.workshop, customer_id: IDS.ana, sender_id: IDS.carlos, body: "hola" });
  expect(ins.error).not.toBeNull();

  // RPC sobre la reparación de otro cliente
  const status = await carlos.rpc("change_repair_status", { p_repair_id: anaRepairId, p_to: "closed", p_note: null });
  expect(status.error).not.toBeNull();
  const msg = await carlos.rpc("send_message", { p_customer_id: IDS.ana, p_repair_id: null, p_body: "Soy Carlos" });
  expect(msg.error).not.toBeNull();
  // Adjuntar un archivo de otra carpeta
  const path = await carlos.rpc("send_message", { p_customer_id: IDS.carlos, p_repair_id: null, p_body: "", p_attachment_path: anaMessagePath });
  expect(path.error?.message).toMatch(/Ruta de archivo no válida/);
  // Subir a la carpeta de otro
  const up = await carlos.storage.from("repair-media").upload(`${IDS.workshop}/messages/${IDS.ana}/x.png`, new Blob(["x"], { type: "image/png" }));
  expect(up.error).not.toBeNull();
  // Acciones de taller
  const ws = await carlos.rpc("update_workshop_profile", {
    p_workshop_id: IDS.workshop, p_name: "Hackeado", p_phone: "", p_email: "", p_address: "", p_review_url: null,
  });
  expect(ws.error).not.toBeNull();
});

test("las funciones internas y de administración no se pueden llamar desde la app", async () => {
  const carlos = await as("carlos@demo.es");
  expect((await carlos.rpc("purge_demo")).error).not.toBeNull();
  expect((await carlos.rpc("_me")).error).not.toBeNull();
  expect((await client().rpc("send_message", { p_customer_id: IDS.carlos, p_repair_id: null, p_body: "anon" })).error).not.toBeNull();
});

test("el taller ve todo lo de su taller; un mecánico no cambia los datos del taller", async () => {
  const laura = await as("laura@tallerdemo.es");
  const { count } = await admin().from("repair_orders").select("id", { count: "exact", head: true });
  expect(await rows(laura, "repair_orders")).toHaveLength(count ?? -1);
  const { data } = await laura.storage.from("repair-media").download(anaMessagePath);
  expect(data).not.toBeNull();

  const javier = await as("javier@tallerdemo.es");
  const ws = await javier.rpc("update_workshop_profile", {
    p_workshop_id: IDS.workshop, p_name: "Otro nombre", p_phone: "", p_email: "", p_address: "", p_review_url: null,
  });
  expect(ws.error?.message).toMatch(/Solo el administrador/);
});

test("avisos del móvil: cada uno solo gestiona sus dispositivos", async () => {
  const endpoint = (who: string) => `https://push.example.com/${who}-${Date.now()}`;
  const ana = await as("ana@demo.es");
  const carlos = await as("carlos@demo.es");
  const anaEndpoint = endpoint("ana");
  const sub = { p_endpoint: anaEndpoint, p_p256dh: "BPk", p_auth: "au" };
  expect((await ana.rpc("save_push_subscription", sub)).error).toBeNull();

  // Carlos no ve la suscripción de Ana ni puede borrarla
  expect(await rows(carlos, "push_subscriptions")).toHaveLength(0);
  expect((await carlos.rpc("delete_push_subscription", { p_endpoint: anaEndpoint })).error).toBeNull();
  expect(await rows(ana, "push_subscriptions")).toHaveLength(1);

  // Sin sesión no se guarda nada y las direcciones que no son https se rechazan
  expect((await client().rpc("save_push_subscription", sub)).error).not.toBeNull();
  expect((await ana.rpc("save_push_subscription", { ...sub, p_endpoint: "http://intranet/x" })).error).not.toBeNull();
  // Nadie desde la app puede cambiar adónde se envían los avisos
  expect((await ana.rpc("configure_push", { p_function_url: "https://malo.example", p_secret: "x" })).error).not.toBeNull();
  expect((await ana.from("push_subscriptions").insert({ user_id: IDS.ana, endpoint: endpoint("x"), p256dh: "a", auth: "b" })).error).not.toBeNull();

  // Si en el mismo móvil entra Carlos, el dispositivo pasa a ser suyo
  expect((await carlos.rpc("save_push_subscription", sub)).error).toBeNull();
  expect(await rows(ana, "push_subscriptions")).toHaveLength(0);
  expect(await rows(carlos, "push_subscriptions")).toHaveLength(1);
  expect((await carlos.rpc("delete_push_subscription", { p_endpoint: anaEndpoint })).error).toBeNull();
  expect(await rows(carlos, "push_subscriptions")).toHaveLength(0);
});
