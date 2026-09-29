// Envía un aviso de la app al móvil (Web Push) de su destinatario.
//
// La llama el trigger notifications_push (supabase/migrations/*_push.sql) con
// { notification_id } y la cabecera x-push-secret. No se llama desde la app.
//
// Secretos (npx supabase secrets set … / supabase/functions/.env en local):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), PUSH_WEBHOOK_SECRET
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Notification = { id: string; user_id: string; repair_order_id: string | null; type: string; title: string; body: string };

const env = (name: string) => Deno.env.get(name) ?? "";

webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:avisos@example.com", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Misma lógica que src/lib/notification-links.ts (ruta relativa a la app)
function linkFor(n: Notification, staff: boolean): string {
  const repair = n.repair_order_id;
  if (staff) {
    if (repair) return `taller/vehicle?id=${repair}`;
    return n.type === "message" ? "taller/communications" : "taller";
  }
  if (repair) return n.type === "message" ? `app/repair/messages?id=${repair}` : `app/repair?id=${repair}`;
  if (n.type === "message") return "app/messages/general";
  return n.type === "appointment_cancelled" ? "app" : "app/notifications";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const secret = env("PUSH_WEBHOOK_SECRET");
  if (req.method !== "POST" || !secret || !timingSafeEqual(req.headers.get("x-push-secret") ?? "", secret)) {
    return new Response("No autorizado", { status: 401 });
  }

  const { notification_id } = await req.json().catch(() => ({}));
  if (typeof notification_id !== "string") return new Response("Falta notification_id", { status: 400 });

  const { data: n } = await admin.from("notifications").select("*").eq("id", notification_id).maybeSingle<Notification>();
  if (!n) return new Response("Aviso no encontrado", { status: 404 });

  const [{ data: profile }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", n.user_id).maybeSingle<{ role: string }>(),
    admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", n.user_id),
  ]);

  const payload = JSON.stringify({
    id: n.id,
    title: n.title,
    body: n.body,
    url: linkFor(n, profile?.role !== "customer"),
  });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: "high",
          topic: n.id.replace(/-/g, "").slice(0, 32),
        });
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410: el móvil ya no acepta avisos (desinstalada o permiso quitado)
        if (status === 404 || status === 410) gone.push(s.id);
        else console.error("push", status, (error as Error).message);
      }
    }),
  );
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);

  return Response.json({ sent, removed: gone.length });
});
