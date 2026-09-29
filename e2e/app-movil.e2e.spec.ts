import { devices } from "@playwright/test";
import { expect, test, type Page } from "./fixtures";
import { card, loginAs } from "./helpers";

// Emulación de móvil con Chrome (los perfiles de Playwright traen su propio navegador)
const { defaultBrowserType: _iphoneBrowser, ...IPHONE } = devices["iPhone 13"];
const { defaultBrowserType: _androidBrowser, ...ANDROID } = devices["Pixel 7"];
void _iphoneBrowser;
void _androidBrowser;

const installBanner = (page: Page) => page.getByRole("region", { name: "Añadir a la pantalla de inicio" });
const pushBanner = (page: Page) => page.getByRole("region", { name: "Activar avisos" });

/** Simula que la web se ha abierto desde el icono de la pantalla de inicio. */
async function asInstalledApp(page: Page) {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes("display-mode: standalone")
        ? ({ matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false } as MediaQueryList)
        : original(query);
  });
}

test.describe("Web como app del móvil", () => {
  test("manifest, iconos y service worker listos para instalar", async ({ page, request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.display).toBe("standalone");
    const sizes = manifest.icons.map((i: { sizes: string; type: string }) => `${i.sizes} ${i.type}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192 image/png", "512x512 image/png"]));
    for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);

    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBe(true);
    expect(await sw.text()).toContain('addEventListener("push"');

    await page.goto("/login");
    const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect(appleIcon).toBeTruthy();
    expect((await request.get(appleIcon!)).headers()["content-type"]).toContain("image/png");
  });

  test("en el ordenador no sale el aviso de instalar", async ({ page }) => {
    await loginAs(page, "Ana García", "cliente");
    await page.waitForTimeout(2000);
    await expect(installBanner(page)).toHaveCount(0);
  });

  test.describe("iPhone", () => {
    test.use(IPHONE);

    test("explica cómo añadirla, deja claro que no ocupa espacio y se puede cerrar", async ({ page }) => {
      // En Safari (sin añadir a la pantalla de inicio) no existen las notificaciones
      await page.addInitScript(() => delete (window as { Notification?: unknown }).Notification);
      await loginAs(page, "Ana García", "cliente");
      const banner = installBanner(page);
      await expect(banner).toBeVisible();
      await expect(banner).toContainText("Añade Taller Martínez a tu móvil");
      await expect(banner).toContainText("No se descarga ninguna app");
      await expect(banner).toContainText("Apenas ocupa espacio");
      await expect(banner).toContainText("Compartir");
      await expect(banner).toContainText("Añadir a pantalla de inicio");
      await page.screenshot({ path: "test-results/app-movil-iphone.png" });

      // No tapa la barra de navegación
      const bannerBox = (await banner.boundingBox())!;
      const navBox = (await page.getByRole("navigation", { name: "Navegación principal" }).boundingBox())!;
      expect(bannerBox.y + bannerBox.height).toBeLessThanOrEqual(navBox.y + 1);

      await banner.getByRole("button", { name: "Cerrar" }).click();
      await expect(banner).toHaveCount(0);
      await page.reload();
      await page.waitForTimeout(2000);
      await expect(banner).toHaveCount(0);

      // En el perfil siguen las instrucciones, y los avisos piden instalar primero
      await page.goto("/app/profile");
      await expect(page.getByText("Añadir a la pantalla de inicio")).toBeVisible();
      await expect(page.getByText("En iPhone, primero añade la app a la pantalla de inicio")).toBeVisible();
    });

    test("no sale en pantallas con botones abajo (chat)", async ({ page }) => {
      await loginAs(page, "Ana García", "cliente");
      await page.goto("/app/messages/general");
      await page.waitForTimeout(2000);
      await expect(installBanner(page)).toHaveCount(0);
    });
  });

  test.describe("Android", () => {
    test.use(ANDROID);

    test("usa el botón de instalar del navegador", async ({ page }) => {
      await loginAs(page, "Ana García", "cliente");
      // Chrome lanza este evento cuando la web se puede instalar
      await page.evaluate(() => {
        const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & Record<string, unknown>;
        event.prompt = async () => void ((window as unknown as { __prompted: boolean }).__prompted = true);
        event.userChoice = Promise.resolve({ outcome: "accepted" });
        window.dispatchEvent(event);
      });
      const banner = installBanner(page);
      await banner.getByRole("button", { name: "Añadir a pantalla de inicio" }).click();
      await expect(page.getByText("Ya la tienes en la pantalla de inicio")).toBeVisible();
      expect(await page.evaluate(() => (window as unknown as { __prompted: boolean }).__prompted)).toBe(true);
      await expect(banner).toHaveCount(0);
    });

    test("abierta desde el icono: ofrece activar los avisos del móvil", async ({ page, context }) => {
      await context.grantPermissions(["notifications"]);
      await asInstalledApp(page);
      await loginAs(page, "Ana García", "cliente");
      await expect(installBanner(page)).toHaveCount(0);
      const banner = pushBanner(page);
      await expect(banner).toContainText("¿Te avisamos en el móvil?");
      await page.screenshot({ path: "test-results/app-movil-avisos.png" });
      await banner.getByRole("button", { name: "Activar avisos" }).click();
      await expect(page.getByText("Avisos activados")).toBeVisible();
      await expect(banner).toHaveCount(0);

      await page.goto("/app/profile");
      await expect(page.getByText("Avisos en el móvil activados")).toBeVisible();
      await page.getByRole("button", { name: "Desactivar" }).click();
      await expect(page.getByRole("button", { name: "Activar", exact: true })).toBeVisible();
    });
  });

  test("con la app en segundo plano, el aviso sale como notificación del sistema", async ({ page, context }) => {
    await context.grantPermissions(["notifications"]);
    const sergio = page;
    await loginAs(sergio, "Sergio Gil", "cliente");
    await sergio.goto("/app/profile");
    await sergio.getByRole("button", { name: "Activar", exact: true }).click();
    await expect(sergio.getByText("Avisos en el móvil activados")).toBeVisible();

    // La pestaña pasa a segundo plano
    await sergio.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    const staff = await context.newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    await card(staff, "8642 TVW").getByRole("button", { name: "INICIAR DIAGNÓSTICO" }).click();

    await expect
      .poll(
        () =>
          sergio.evaluate(async () =>
            (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => ({ title: n.title, url: n.data?.url })),
          ),
        { timeout: 15_000 },
      )
      .toEqual([expect.objectContaining({ url: expect.stringMatching(/^app\/repair\?id=/) })]);
  });

  test("el taller puede activar los avisos en su dispositivo", async ({ page, context }) => {
    await context.grantPermissions(["notifications"]);
    await loginAs(page, "Laura Martínez", "taller");
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await page.getByRole("menuitem", { name: "Activar avisos en este dispositivo" }).click();
    await expect(page.getByText("Avisos activados en este dispositivo")).toBeVisible();
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await expect(page.getByRole("menuitem", { name: "Desactivar avisos en este dispositivo" })).toBeVisible();
  });
});
