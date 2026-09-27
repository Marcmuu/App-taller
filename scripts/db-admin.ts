/**
 * Administración de la base de datos (usa la clave de servicio; solo en tu
 * ordenador o en un servidor, nunca en el navegador).
 *
 *   npm run db:demo -- reset            Carga/reinicia los datos demo (fechas de hoy)
 *   npm run db:demo -- purge            Borra TODO lo demo (usuarios, taller, fotos) y desactiva el modo demo
 *   npm run db:demo -- create-workshop "Taller Pérez" admin@tallerperez.es "Ana Pérez" [+34 600 000 000]
 *                                       Crea el taller real y su administrador (imprime una contraseña temporal)
 *
 * Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local
 * (o de las variables de entorno).
 */
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeed, IDS } from "@/lib/mock/seed";

let client: SupabaseClient | null = null;
function adminClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en .env.local o en el entorno).");
  }
  client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

async function removeFolder(prefix: string) {
  const admin = adminClient();
  const bucket = admin.storage.from("repair-media");
  const { data } = await bucket.list(prefix, { limit: 1000 });
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id) await bucket.remove([path]);
    else await removeFolder(path); // carpeta
  }
}

export async function resetDemo() {
  const admin = adminClient();
  const seed = createSeed(new Date());
  const { error: settingsError } = await admin.from("app_settings").upsert({ key: "demo_mode", value: "true" });
  if (settingsError) throw settingsError;
  await removeFolder(IDS.workshop);
  const { error } = await admin.rpc("reset_demo", { p_seed: { db: seed.db, auth_users: seed.auth_users } });
  if (error) throw error;
}

async function purgeDemo() {
  const admin = adminClient();
  await removeFolder(IDS.workshop);
  const { error } = await admin.rpc("purge_demo");
  if (error) throw error;
}

async function createWorkshop(name: string, email: string, adminName: string, phone = "") {
  const admin = adminClient();
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const { data: workshop, error: wsError } = await admin
    .from("workshops")
    .insert({ name, slug, phone, email, address: "", timezone: "Europe/Madrid" })
    .select()
    .single();
  if (wsError) throw wsError;

  const password = randomBytes(9).toString("base64url");
  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: adminName, phone },
  });
  if (userError) throw userError;
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "workshop_admin", workshop_id: workshop.id, full_name: adminName, phone, is_demo: false })
    .eq("id", user.user.id);
  if (profileError) throw profileError;

  // Horario inicial (L-V 9-14 y 16-19, 1 coche por franja); se cambia desde la app
  const rows = [1, 2, 3, 4, 5].flatMap((weekday) => [
    { workshop_id: workshop.id, weekday, start_time: "09:00", end_time: "14:00", slot_minutes: 30, capacity: 1 },
    { workshop_id: workshop.id, weekday, start_time: "16:00", end_time: "19:00", slot_minutes: 30, capacity: 1 },
  ]);
  const { error: availabilityError } = await admin.from("workshop_availability").insert(rows);
  if (availabilityError) throw availabilityError;

  console.log(`\nTaller creado: ${name} (${workshop.id})`);
  console.log(`Administrador: ${email}`);
  console.log(`Contraseña temporal: ${password}   ← cámbiala al entrar\n`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "reset":
      await resetDemo();
      console.log("Datos demo cargados.");
      break;
    case "purge":
      await purgeDemo();
      console.log("Datos demo borrados y modo demo desactivado.");
      break;
    case "create-workshop":
      if (args.length < 3) throw new Error('Uso: create-workshop "Nombre" email "Nombre del administrador" [teléfono]');
      await createWorkshop(args[0], args[1], args[2], args[3]);
      break;
    default:
      console.log("Comandos: reset | purge | create-workshop");
  }
}

if (process.argv[1]?.includes("db-admin")) {
  main().catch((error) => {
    console.error("Error:", error.message ?? error);
    process.exit(1);
  });
}
