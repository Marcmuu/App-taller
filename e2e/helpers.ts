import { expect, type Page } from "@playwright/test";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";

export const AREA_URL = { cliente: /\/app\/?$/, taller: /\/taller\/?$/ } as const;

/** Entra con una cuenta demo pulsando su nombre en la pantalla de login. */
export async function loginAs(page: Page, name: string, area: "cliente" | "taller") {
  await page.goto(`/login?tipo=${area}`);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(AREA_URL[area]);
}

/** Desplazamiento (días) del n-ésimo día laborable a partir de mañana (igual que el seed). */
export function weekdayOffset(n: number, now = new Date()): number {
  let offset = 0;
  let found = 0;
  while (found < n) {
    offset++;
    const day = addDays(now, offset).getDay();
    if (day >= 1 && day <= 5) found++;
  }
  return offset;
}

export function nextDowOffset(dow: number, now = new Date()): number {
  let offset = 1;
  while (addDays(now, offset).getDay() !== dow) offset++;
  return offset;
}

export function dateIn(days: number): Date {
  return addDays(new Date(), days);
}

/** Texto con el que empieza la etiqueta accesible de un día en el calendario del cliente. */
export function dayLabel(date: Date): string {
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

/** Tarjeta (article) que contiene una matrícula. */
export function card(page: Page, plate: string) {
  return page.locator("article").filter({ hasText: plate });
}

/** Avanza el asistente de cita hasta el paso de fecha/hora. */
export async function wizardToSlot(page: Page, vehicle: RegExp) {
  await page.goto("/app/appointments/new");
  // Con un solo coche el asistente empieza directamente en el motivo.
  const firstStep = page.getByRole("heading", { name: /¿Qué coche traes\?|¿Qué necesitas\?/ });
  await expect(firstStep).toBeVisible();
  if ((await firstStep.textContent())?.includes("coche")) await page.getByRole("button", { name: vehicle }).click();
  await page.getByRole("button", { name: /Mantenimiento/ }).click();
  await page.getByLabel("¿Qué has notado?").fill("Revisión general del coche.");
  await page.getByRole("button", { name: "Sí", exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Saltar este paso/ }).click();
  await expect(page.getByRole("heading", { name: "Elige día y hora" })).toBeVisible();
}

/** Elige un día del calendario del cliente por fecha. */
export function dayCell(page: Pick<Page, "getByRole">, date: Date) {
  return page.getByRole("gridcell", { name: new RegExp(`^${dayLabel(date)}:`) });
}
