import { expect, test, type Page } from "./fixtures";
import { differenceInCalendarWeeks, format } from "date-fns";
import { dateIn, dayCell, loginAs, nextDowOffset, weekdayOffset, wizardToSlot } from "./helpers";

const T1 = dateIn(weekdayOffset(1));
const T2 = dateIn(weekdayOffset(2));

async function openWeekOf(page: Page, date: Date) {
  await page.goto("/taller/calendar");
  const weeks = differenceInCalendarWeeks(date, new Date(), { weekStartsOn: 1 });
  for (let i = 0; i < weeks; i++) await page.getByRole("button", { name: "Semana siguiente" }).click();
}

const slot = (page: Page, time: string) => page.getByRole("radiogroup", { name: "Hora" }).getByRole("radio", { name: new RegExp(`^${time}`) });

test.describe("Calendario del taller", () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test("muestra las citas por franja con su ocupación", async ({ page }) => {
    await loginAs(page, "Laura Martínez", "taller");
    await openWeekOf(page, T1);
    const table = page.getByRole("table");
    await expect(table.getByRole("link", { name: /5566 FGH/ })).toBeVisible(); // confirmada
    await expect(table.getByRole("link", { name: /7531 KMN/ })).toBeVisible(); // solicitud
    const row = table.getByRole("row").filter({ has: page.getByRole("cell", { name: "10:00", exact: true }) });
    await expect(row).toContainText("2/2");
    await expect(page.getByText(/Pendientes de confirmar/)).toBeVisible();

    await table.getByRole("link", { name: /5566 FGH/ }).click();
    await expect(page.getByRole("heading", { name: "Volkswagen Polo" })).toBeVisible();
  });

  test("navegar entre semanas", async ({ page }) => {
    await loginAs(page, "Laura Martínez", "taller");
    await page.goto("/taller/calendar");
    const range = page.locator("p").filter({ hasText: /–/ }).first();
    const before = await range.textContent();
    await page.getByRole("button", { name: "Semana siguiente" }).click();
    await expect(range).not.toHaveText(before ?? "");
    await page.getByRole("button", { name: "Hoy" }).click();
    await expect(range).toHaveText(before ?? "");
  });
});

test.describe("Configuración del horario", () => {
  test("no deja guardar tramos que se solapan", async ({ page }) => {
    await loginAs(page, "Laura Martínez", "taller");
    await page.goto("/taller/settings");
    await page.getByLabel("Martes tramo 2: desde").fill("12:00");
    await expect(page.getByText("Hay tramos que se solapan.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar horario" })).toBeDisabled();
    await page.getByRole("button", { name: "Descartar" }).click();
    await expect(page.getByText("Hay tramos que se solapan.")).toBeHidden();
  });

  test("cerrar un día de la semana lo quita del calendario del cliente", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Laura Martínez", "taller");
    await staff.goto("/taller/settings");
    await staff.getByRole("switch", { name: /Martes/ }).click();
    await expect(staff.getByRole("switch", { name: /Martes/ })).toHaveAttribute("aria-checked", "false");
    await staff.getByRole("button", { name: "Guardar horario" }).click();
    await expect(staff.getByText("Horario guardado")).toBeVisible();

    const carlos = await page.context().newPage();
    await loginAs(carlos, "Carlos López", "cliente");
    await wizardToSlot(carlos, /Toyota Yaris/);
    const tuesday = dateIn(nextDowOffset(2));
    await expect(dayCell(carlos, tuesday)).toBeDisabled();
    await expect(dayCell(carlos, tuesday)).toHaveAccessibleName(/Cerrado/);
  });

  test("días cerrados puntuales: cerrar y volver a abrir", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Laura Martínez", "taller");
    const day = dateIn(weekdayOffset(3));
    await staff.goto("/taller/settings");
    await staff.getByLabel("Día").fill(format(day, "yyyy-MM-dd"));
    await staff.getByLabel("Motivo (opcional)").fill("Inventario");
    await staff.getByRole("button", { name: "Cerrar este día" }).click();
    await expect(staff.getByText("Día cerrado")).toBeVisible();
    await staff.getByLabel("Día").fill(format(day, "yyyy-MM-dd"));
    await staff.getByRole("button", { name: "Cerrar este día" }).click();
    await expect(staff.getByText("Ese día ya está marcado como cerrado.")).toBeVisible();

    const carlos = await page.context().newPage();
    await loginAs(carlos, "Carlos López", "cliente");
    await wizardToSlot(carlos, /Toyota Yaris/);
    await expect(dayCell(carlos, day)).toBeDisabled();
    await expect(dayCell(carlos, day)).toHaveAccessibleName(/Inventario/);

    await staff.getByRole("listitem").filter({ hasText: "Inventario" }).getByRole("button", { name: "Abrir de nuevo" }).click();
    await expect(dayCell(carlos, day)).toBeEnabled();
  });

  test("franjas de 1 hora: el cliente ve horas en punto del tramo", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Laura Martínez", "taller");
    await staff.goto("/taller/settings");
    await staff.getByRole("radio", { name: "1 hora" }).click();
    await staff.getByRole("button", { name: "Guardar horario" }).click();
    await expect(staff.getByText("Horario guardado")).toBeVisible();

    const carlos = await page.context().newPage();
    await loginAs(carlos, "Carlos López", "cliente");
    await wizardToSlot(carlos, /Toyota Yaris/);
    await dayCell(carlos, T2).click();
    await expect(slot(carlos, "08:30")).toBeVisible();
    await expect(slot(carlos, "09:30")).toBeVisible();
    await expect(slot(carlos, "09:00")).toHaveCount(0);
  });
});
