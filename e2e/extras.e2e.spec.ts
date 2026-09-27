import path from "node:path";
import { expect, test, type Page } from "./fixtures";
import { card, dateIn, dayCell, loginAs, weekdayOffset } from "./helpers";

const T2 = dateIn(weekdayOffset(2));
const PHOTO = path.join(__dirname, "fixtures", "foto.png");
const slot = (page: Pick<Page, "getByRole">, time: string) => page.getByRole("radiogroup", { name: "Hora" }).getByRole("radio", { name: new RegExp(`^${time}`) });

test.describe("Cambios de hora", () => {
  test("el taller propone otra hora y el cliente la acepta con un toque", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Laura Martínez", "taller");
    const request = card(staff, "7531 KMN");
    await request.getByRole("button", { name: "No puedo" }).click();
    const dialog = staff.getByRole("dialog");
    await dialog.getByLabel("Mensaje para el cliente").fill("Por la mañana estamos completos.");
    await dialog.getByLabel("Proponer otra hora").check();
    await expect(dialog.getByRole("button", { name: "Elige una hora" })).toBeDisabled();
    await dayCell(dialog, T2).click();
    await slot(dialog, "11:00").click();
    await dialog.getByRole("button", { name: /^Proponer / }).click();
    await expect(request).toHaveCount(0);

    const ana = await page.context().newPage();
    await loginAs(ana, "Ana García", "cliente");
    await expect(ana.getByText("El taller te propone otra hora")).toBeVisible();
    await expect(ana.getByText("«Por la mañana estamos completos.»")).toBeVisible();
    await ana.getByRole("button", { name: "Aceptar esta hora" }).click();
    await expect(ana.getByText("El taller te propone otra hora")).toBeHidden();
    await expect(ana.getByText("Citroën C3").first()).toBeVisible();

    // En el taller aparece ya como cita confirmada (sin botón de confirmar)
    await staff.goto("/taller");
    await expect(card(staff, "7531 KMN").first()).toBeVisible();
    await expect(card(staff, "7531 KMN").getByRole("button", { name: "CONFIRMAR CITA" })).toHaveCount(0);
  });

  test("el cliente cambia la fecha de una cita confirmada y el taller recibe aviso", async ({ page }) => {
    await loginAs(page, "Jorge Díaz", "cliente");
    await card(page, "Volkswagen Polo").getByRole("link", { name: "Ver seguimiento" }).click();
    await page.getByRole("link", { name: "Cambiar fecha" }).click();
    await expect(page.getByRole("heading", { name: "¿Cuándo te viene mejor?" })).toBeVisible();
    await dayCell(page, T2).click();
    await slot(page, "12:00").click();
    await page.getByRole("button", { name: /^Cambiar a/ }).click();
    await expect(page.getByRole("heading", { name: "¡Cita confirmada!" })).toBeVisible();

    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    await staff.getByRole("button", { name: /Avisos/ }).click();
    await expect(staff.getByRole("menu").getByText("Cita cambiada por el cliente")).toBeVisible();
  });
});

test.describe("Fotos en el chat", () => {
  test("el cliente envía una foto y el taller la ve y la amplía", async ({ page }) => {
    await loginAs(page, "Nuria Vidal", "cliente");
    await page.goto("/app/messages/general");
    await page.locator('input[type="file"]').setInputFiles(PHOTO);
    await expect(page.getByAltText("Foto para enviar")).toBeVisible();
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByAltText("Foto para enviar")).toBeHidden();
    await expect(page.getByAltText("Foto enviada")).toBeVisible();

    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    await staff.goto("/taller/communications");
    await staff.getByRole("link", { name: /Nuria Vidal[\s\S]*Consulta general/ }).click();
    await expect(staff.getByAltText("Foto enviada")).toBeVisible();
    await staff.getByRole("button", { name: "Ver foto" }).click();
    await expect(staff.getByRole("dialog").getByAltText("Foto enviada")).toBeVisible();
  });
});

test.describe("Mi taller y tarjetas QR", () => {
  test("el administrador cambia el enlace de reseñas y ve las dos tarjetas", async ({ page }) => {
    await loginAs(page, "Laura Martínez", "taller");
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await page.getByRole("menuitem", { name: "Mi taller" }).click();
    await expect(page.getByRole("heading", { name: "Mi taller" })).toBeVisible();

    await page.getByLabel("Enlace para dejar reseñas").fill("https://g.page/r/taller-prueba/review");
    await page.getByRole("button", { name: "Guardar datos" }).click();
    await expect(page.getByText("Datos del taller guardados.")).toBeVisible();

    await expect(page.getByTestId("qr-card-app").getByRole("img", { name: /abrir la app/ }).locator("svg")).toBeVisible();
    await expect(page.getByTestId("qr-card-review").getByRole("img", { name: /reseña/ }).locator("svg")).toBeVisible();
    await expect(page.getByRole("link", { name: /Probar enlace/ }).last()).toHaveAttribute("href", "https://g.page/r/taller-prueba/review");
  });

  test("un mecánico ve los datos pero no puede cambiarlos", async ({ page }) => {
    await loginAs(page, "Javier Ruiz", "taller");
    await page.goto("/taller/negocio");
    await expect(page.getByText("Solo el administrador puede cambiarlos.")).toBeVisible();
    await expect(page.getByLabel("Nombre")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Guardar datos" })).toHaveCount(0);
    await expect(page.getByTestId("qr-card-app")).toBeVisible();
  });

  test("al entregar el coche el cliente ve el botón para dejar una reseña", async ({ page }) => {
    await loginAs(page, "Carlos López", "cliente");
    await page.locator("section", { has: page.getByRole("heading", { name: "Historial" }) }).getByRole("link", { name: /Toyota Yaris/ }).click();
    await expect(page.getByText("¿Qué tal ha ido?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Dejar una reseña" })).toHaveAttribute("href", /google\.com\/maps/);
  });
});
