/*
 * Service worker de la app: muestra las notificaciones del móvil.
 *
 * - "push": llega un aviso del servidor aunque la app esté cerrada
 *   (Supabase → función send-push → servicio push de Apple/Google).
 * - "notificationclick": al tocar el aviso se abre (o se enfoca) la app
 *   en la pantalla correspondiente.
 *
 * No guarda nada en caché: la app siempre se carga de la web.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "" };
  }
  const scope = self.registration.scope; // termina en "/" e incluye el basePath
  event.waitUntil(
    self.registration.showNotification(data.title || "Taller", {
      body: data.body || "",
      icon: scope + "icon-192.png",
      badge: scope + "badge-96.png",
      // Mismo tag que el aviso local: si llegan los dos, el móvil muestra solo uno
      tag: data.id || undefined,
      data: { url: data.url || "" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  const path = (event.notification.data && event.notification.data.url) || "";
  const target = new URL(path.replace(/^\//, ""), scope).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(scope) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
