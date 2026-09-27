import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import {
  card,
  dateIn,
  dayCell,
  loginAs,
  nextDowOffset,
  weekdayOffset,
  wizardToSlot,
} from "./helpers";

const T1 = dateIn(weekdayOffset(1)); // en el seed: 10:00 llena (2/2)
const T2 = dateIn(weekdayOffset(2));
const SATURDAY = dateIn(nextDowOffset(6)); // en el seed: completo
const HOLIDAY = dateIn(weekdayOffset(7)); // en el seed: festivo local

const slot = (page: Page, time: string) => page.getByRole("radiogroup", { name: "Hora" }).getByRole("radio", { name: new RegExp(`^${time}`) });

test.describe("Calendario del cliente", () => {
  test("bloquea horas llenas, días completos, festivos y días cerrados", async ({ page }) => {
    await loginAs(page, "Carlos López", "cliente");
    await wizardToSlot(page, /Toyota Yaris/);

    await dayCell(page, T1).click();
    await expect(slot(page, "10:00")).toBeDisabled();
    await expect(slot(page, "10:00")).toContainText("Completo");
    await expect(slot(page, "10:30")).toBeEnabled();

    await expect(dayCell(page, SATURDAY)).toBeDisabled();
    await expect(dayCell(page, SATURDAY)).toHaveAccessibleName(/completo/);
    await expect(dayCell(page, HOLIDAY)).toBeDisabled();
    await expect(dayCell(page, HOLIDAY)).toHaveAccessibleName(/Festivo local/);
    const sunday = dateIn(nextDowOffset(0));
    await expect(dayCell(page, sunday)).toBeDisabled();
  });

  test("solicitud completa con foto → llega al taller en directo → confirmar", async ({ page }) => {
    await loginAs(page, "Carlos López", "cliente");
    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");

    await page.goto("/app/appointments/new");
    await page.getByRole("button", { name: /Toyota Yaris/ }).click();
    await page.getByRole("button", { name: /Testigo encendido/ }).click();
    await page.getByLabel("¿Qué has notado?").fill("Testigo de motor encendido.");
    await page.getByRole("button", { name: "Hace unos días" }).click();
    await page.getByRole("button", { name: "Sí", exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(path.join(__dirname, "fixtures", "foto.png"));
    await expect(page.getByRole("button", { name: /Quitar foto.png/ })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await dayCell(page, T2).click();
    await slot(page, "11:00").click();
    await page.getByRole("button", { name: /^Continuar ·/ }).click();
    await expect(page.getByText("1 archivo")).toBeVisible();
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByRole("heading", { name: "¡Solicitud enviada!" })).toBeVisible();

    // El taller la ve sin recargar
    const request = card(staff, "5678 DFG").filter({ hasText: "CONFIRMAR CITA" });
    await expect(request).toBeVisible();
    await expect(request.getByText("1 archivo")).toBeVisible();
    await request.getByRole("button", { name: "CONFIRMAR CITA" }).click();
    await expect(card(staff, "5678 DFG").getByRole("button", { name: "MARCAR RECIBIDO" })).toBeVisible();

    // El cliente la ve confirmada con su hora
    await page.getByRole("link", { name: "Volver al inicio" }).click();
    const yaris = card(page, "Toyota Yaris");
    await expect(yaris).toContainText("Cita confirmada");
    await expect(yaris).toContainText("11:00");
  });

  test("la capacidad configurada por el taller manda: con 3 coches por franja, 10:00 vuelve a tener una plaza", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Javier Ruiz", "taller"); // un mecánico también puede configurar
    await staff.goto("/taller/settings");
    const weekdayName = T1.toLocaleDateString("es-ES", { weekday: "long" });
    const label = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);
    const counter = staff.getByLabel(`${label} tramo 1: coches por franja`);
    await expect(counter).toHaveText("2");
    await counter.locator("..").getByRole("button", { name: "Más coches por franja" }).click();
    await expect(counter).toHaveText("3");
    await staff.getByRole("button", { name: "Guardar horario" }).click();
    await expect(staff.getByText("Horario guardado")).toBeVisible();

    const carlos = await page.context().newPage();
    await loginAs(carlos, "Carlos López", "cliente");
    await wizardToSlot(carlos, /Toyota Yaris/);
    await dayCell(carlos, T1).click();
    await expect(slot(carlos, "10:00")).toBeEnabled();
    await expect(slot(carlos, "10:00")).toContainText("Última plaza");
    await slot(carlos, "10:00").click();
    await carlos.getByRole("button", { name: /^Continuar ·/ }).click();
    await carlos.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(carlos.getByRole("heading", { name: "¡Solicitud enviada!" })).toBeVisible();

    // Otra clienta ya no puede elegir esa hora
    const lucia = await page.context().newPage();
    await loginAs(lucia, "Lucía Navarro", "cliente");
    await wizardToSlot(lucia, /Kia Sportage/);
    await dayCell(lucia, T1).click();
    await expect(slot(lucia, "10:00")).toBeDisabled();
  });

  test("dos clientes a por la última plaza: el segundo recibe aviso y vuelve a elegir", async ({ page }) => {
    const carlos = page;
    await loginAs(carlos, "Carlos López", "cliente");
    const ana = await page.context().newPage();
    await loginAs(ana, "Ana García", "cliente");

    // Tarde de T2: 1 coche por franja. Carlos elige 16:00 y se queda en el resumen.
    await wizardToSlot(carlos, /Toyota Yaris/);
    await dayCell(carlos, T2).click();
    await slot(carlos, "16:00").click();
    await carlos.getByRole("button", { name: /^Continuar ·/ }).click();
    await expect(carlos.getByRole("button", { name: "Enviar solicitud" })).toBeVisible();

    // Ana reserva antes esa misma hora
    await wizardToSlot(ana, /Citroën C3/);
    await dayCell(ana, T2).click();
    await slot(ana, "16:00").click();
    await ana.getByRole("button", { name: /^Continuar ·/ }).click();
    await ana.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(ana.getByRole("heading", { name: "¡Solicitud enviada!" })).toBeVisible();

    // Carlos envía: el sistema lo detecta y le devuelve a elegir hora
    await carlos.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(carlos.getByText(/acaba de completarse/).first()).toBeVisible();
    await expect(carlos.getByRole("heading", { name: "Elige día y hora" })).toBeVisible();
    await dayCell(carlos, T2).click();
    await expect(slot(carlos, "16:00")).toBeDisabled();
  });

  test("si la hora elegida se llena mientras decide, se le avisa en el calendario", async ({ page }) => {
    const carlos = page;
    await loginAs(carlos, "Carlos López", "cliente");
    const ana = await page.context().newPage();
    await loginAs(ana, "Ana García", "cliente");

    await wizardToSlot(carlos, /Toyota Yaris/);
    await dayCell(carlos, T2).click();
    await slot(carlos, "17:00").click();
    await expect(carlos.getByRole("button", { name: /^Continuar ·/ })).toBeEnabled();

    await wizardToSlot(ana, /Citroën C3/);
    await dayCell(ana, T2).click();
    await slot(ana, "17:00").click();
    await ana.getByRole("button", { name: /^Continuar ·/ }).click();
    await ana.getByRole("button", { name: "Enviar solicitud" }).click();

    await expect(carlos.getByText(/se acaba de completar/).first()).toBeVisible();
    await expect(carlos.getByRole("button", { name: "Elige una hora" })).toBeDisabled();
    await expect(slot(carlos, "17:00")).toBeDisabled();
  });
});

test.describe("Anulaciones y rechazos de cita", () => {
  test("el cliente anula una solicitud: la plaza se libera y el taller recibe aviso", async ({ page }) => {
    const ana = page;
    await loginAs(ana, "Ana García", "cliente");
    await ana.getByRole("button", { name: "Anular" }).click();
    await ana.getByRole("button", { name: "Anular solicitud" }).click();
    await expect(ana.getByText("Solicitudes enviadas")).toBeHidden();

    const carlos = await page.context().newPage();
    await loginAs(carlos, "Carlos López", "cliente");
    await wizardToSlot(carlos, /Toyota Yaris/);
    await dayCell(carlos, T1).click();
    await expect(slot(carlos, "10:00")).toBeEnabled();

    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    await expect(staff.getByRole("heading", { name: "Solicitudes de cita" })).toBeHidden();
    await staff.getByRole("button", { name: /Avisos/ }).click();
    await expect(staff.getByRole("menu").getByText("Cita anulada por el cliente")).toBeVisible();
  });

  test("el cliente anula una cita confirmada antes de llevar el coche", async ({ page }) => {
    await loginAs(page, "Jorge Díaz", "cliente");
    await card(page, "Volkswagen Polo").getByRole("link", { name: "Ver seguimiento" }).click();
    await page.getByRole("button", { name: "Anular cita" }).click();
    await page.getByRole("button", { name: "Anular cita" }).last().click();
    await expect(page.getByText("Cita anulada").first()).toBeVisible();

    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    await expect(card(staff, "5566 FGH")).toHaveCount(0);
  });

  test("el taller rechaza una solicitud con un motivo y el cliente lo recibe", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Laura Martínez", "taller");
    const request = card(staff, "7531 KMN");
    await request.getByRole("button", { name: "No puedo" }).click();
    await staff.getByRole("textbox").fill("A esa hora estamos completos, ¿te viene por la tarde?");
    await staff.getByRole("button", { name: "Rechazar solicitud" }).click();
    await expect(request).toHaveCount(0);

    const ana = await page.context().newPage();
    await loginAs(ana, "Ana García", "cliente");
    await ana.goto("/app/notifications");
    await expect(ana.getByText("A esa hora estamos completos")).toBeVisible();
    await ana.goto("/app");
    await expect(ana.getByText("Solicitudes enviadas")).toBeHidden();
  });
});
