import { expect, test, type Page } from "./fixtures";
import { card, dateIn, dayCell, loginAs, weekdayOffset } from "./helpers";

const T2 = dateIn(weekdayOffset(2));
const slot = (page: Page, time: string) => page.getByRole("radiogroup", { name: "Hora" }).getByRole("radio", { name: new RegExp(`^${time}`) });

async function logout(page: Page, area: "cliente" | "taller") {
  if (area === "cliente") {
    await page.goto("/app/profile");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
  } else {
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  }
  await expect(page).toHaveURL(/\/$/);
}

test.describe("Matrículas en el formulario", () => {
  test("valida el formato del país y detecta duplicados entre cuentas", async ({ page }) => {
    await loginAs(page, "Nuria Vidal", "cliente");
    await page.goto("/app/vehicles?nuevo=1");
    await page.getByLabel("Marca").fill("Seat");
    await page.getByLabel("Modelo").fill("Arona");

    // Vocales: no existe en España
    await page.getByLabel("Matrícula", { exact: true }).fill("1234 ABC");
    await page.getByRole("button", { name: "Guardar vehículo" }).click();
    await expect(page.getByText(/no llevan vocales/)).toBeVisible();

    // Formato incorrecto
    await page.getByLabel("Matrícula", { exact: true }).fill("12AB");
    await page.getByRole("button", { name: "Guardar vehículo" }).click();
    await expect(page.getByText(/Formato no válido para España/)).toBeVisible();

    // Ya registrada por otro cliente (Seat León de Carlos)
    await page.getByLabel("Matrícula", { exact: true }).fill("1234bbc");
    await page.getByRole("button", { name: "Guardar vehículo" }).click();
    await expect(page.getByText(/ya está registrada en otra cuenta/)).toBeVisible();

    // Portugal, escrita sin guiones → se guarda normalizada
    await page.getByRole("combobox", { name: "País de la matrícula" }).click();
    await page.getByRole("option", { name: "Portugal" }).click();
    await expect(page.getByLabel("Matrícula", { exact: true })).toHaveAttribute("placeholder", "AA-00-AA");
    await page.getByLabel("Matrícula", { exact: true }).fill("ab12cd");
    await page.getByRole("button", { name: "Guardar vehículo" }).click();
    await expect(page.getByText("AB-12-CD").first()).toBeVisible();
  });
});

test.describe("Chat cliente ↔ taller", () => {
  test("un cliente sin reparación escribe, el taller lo ve al entrar y responde", async ({ page }) => {
    // Nuria escribe una consulta general (no tiene coche en el taller)
    await loginAs(page, "Nuria Vidal", "cliente");
    await page.getByRole("link", { name: /^Mensajes/ }).click();
    await page.getByRole("link", { name: /Consulta con el taller/ }).click();
    await page.getByLabel("Mensaje").fill("¿Hacéis también el pre-ITV?");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.locator("p.whitespace-pre-wrap", { hasText: "¿Hacéis también el pre-ITV?" })).toBeVisible();
    await logout(page, "cliente");

    // Otro empleado (Javier) entra en el mismo navegador y lo ve
    await loginAs(page, "Javier Ruiz", "taller");
    await expect(page.getByRole("link", { name: /Comunicaciones/ })).toContainText(/\d/);
    await page.getByRole("link", { name: /Comunicaciones/ }).click();
    const convo = page.getByRole("link", { name: /Nuria Vidal[\s\S]*Consulta general/ });
    await expect(convo).toBeVisible();
    await convo.click();
    await expect(page.locator("p.whitespace-pre-wrap", { hasText: "¿Hacéis también el pre-ITV?" })).toBeVisible();
    await page.getByLabel("Mensaje").fill("Sí, cuesta 30 €. ¿Te reservo hora?");
    await page.getByRole("button", { name: "Enviar" }).click();
    await logout(page, "taller");

    // Laura (otra cuenta del taller) ve la misma conversación, con la respuesta de Javier
    await loginAs(page, "Laura Martínez", "taller");
    await page.goto("/taller/communications");
    await page.getByRole("link", { name: /Nuria Vidal[\s\S]*Consulta general/ }).click();
    await expect(page.locator("p.whitespace-pre-wrap", { hasText: "Sí, cuesta 30 €" })).toBeVisible();
    await expect(page.getByText("Javier Ruiz")).toBeVisible();
    await logout(page, "taller");

    // Nuria ve la respuesta, con contador de no leídos y su mensaje marcado como visto
    await loginAs(page, "Nuria Vidal", "cliente");
    await expect(page.getByRole("link", { name: /Mensajes \(1 sin leer\)/ })).toBeVisible();
    await page.getByRole("link", { name: /^Mensajes/ }).click();
    await page.getByRole("link", { name: /Consulta con el taller/ }).click();
    await expect(page.locator("p.whitespace-pre-wrap", { hasText: "Sí, cuesta 30 €" })).toBeVisible();
    await expect(page.getByText("· Visto").first()).toBeVisible();
    await page.goto("/app");
    await expect(page.getByRole("link", { name: "Mensajes", exact: true })).toBeVisible();
  });

  test("en directo: dos pestañas abiertas a la vez", async ({ page }) => {
    await loginAs(page, "Carlos López", "cliente");
    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    await staff.goto("/taller/communications");

    await page.goto("/app/messages/general");
    await page.getByLabel("Mensaje").fill("¿Abrís el sábado?");
    await page.getByLabel("Mensaje").press("Enter");

    const convo = staff.getByRole("link", { name: /Carlos López[\s\S]*Consulta general/ });
    await expect(convo).toBeVisible();
    await convo.click();
    await staff.getByLabel("Mensaje").fill("Sí, de 9 a 10.");
    await staff.getByLabel("Mensaje").press("Enter");
    await expect(page.locator("p.whitespace-pre-wrap", { hasText: "Sí, de 9 a 10." })).toBeVisible();
  });
});

test.describe("Cita rechazada por el taller", () => {
  test("el cliente elige otra fecha sin repetir la solicitud", async ({ page }) => {
    await loginAs(page, "Sergio Gil", "cliente");
    const declined = page.locator("article").filter({ hasText: "El taller no puede atenderte a esa hora" });
    await expect(declined).toContainText("Esa tarde no tenemos elevador libre");
    await declined.getByRole("link", { name: "Elegir otra fecha" }).click();
    await expect(page.getByText("Mantenemos lo que nos contaste")).toBeVisible();
    await dayCell(page, T2).click();
    await slot(page, "09:00").click();
    await page.getByRole("button", { name: /^Enviar nueva hora/ }).click();
    await expect(page.getByRole("heading", { name: "¡Nueva hora enviada!" })).toBeVisible();
    await page.getByRole("link", { name: "Volver al inicio" }).click();
    await expect(declined).toHaveCount(0);
    await expect(page.getByText("Solicitudes enviadas")).toBeVisible();

    // El taller recibe la solicitud con los datos originales y la confirma
    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    const request = card(staff, "M 4521 XZ");
    await expect(request).toContainText("Pierde aceite");
    await request.getByRole("button", { name: "CONFIRMAR CITA" }).click();
    await expect(card(staff, "M 4521 XZ").getByRole("button", { name: "MARCAR RECIBIDO" })).toBeVisible();
  });

  test("rechazar desde el taller → el cliente lo ve en el inicio y puede descartarlo", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Laura Martínez", "taller");
    await card(staff, "7531 KMN").getByRole("button", { name: "No puedo" }).click();
    await staff.getByRole("textbox").fill("Estamos completos esa mañana.");
    await staff.getByRole("button", { name: "Rechazar solicitud" }).click();

    const ana = await page.context().newPage();
    await loginAs(ana, "Ana García", "cliente");
    const declined = ana.locator("article").filter({ hasText: "El taller no puede atenderte a esa hora" });
    await expect(declined).toContainText("Estamos completos esa mañana.");
    await declined.getByRole("button", { name: "Descartar" }).click();
    await expect(declined).toHaveCount(0);
  });
});

test.describe("Estados simplificados", () => {
  test("terminar pasa directo a «Listos» (no se queda en Reparación)", async ({ page }) => {
    await loginAs(page, "Pablo Sánchez", "taller");
    await page.getByRole("tab", { name: /^Reparación/ }).click();
    const clio = card(page, "4321 JKL");
    await clio.getByRole("button", { name: "TERMINADO · LISTO PARA RECOGER" }).click();
    await expect(clio).toHaveCount(0);
    await page.getByRole("tab", { name: /^Listos/ }).click();
    await expect(card(page, "4321 JKL").getByRole("button", { name: "ENTREGADO AL CLIENTE" })).toBeVisible();

    const ana = await page.context().newPage();
    await loginAs(ana, "Ana García", "cliente");
    await expect(card(ana, "Renault Clio")).toContainText("Listo para recoger");
    await expect(card(ana, "Renault Clio")).toContainText("Paso 6 de 6");
  });

  test("reparar sin presupuesto cuando el trabajo ya está acordado", async ({ page }) => {
    await loginAs(page, "Laura Martínez", "taller");
    const kia = card(page, "1357 PRS");
    await kia.getByRole("button", { name: "REPARAR SIN PRESUPUESTO" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("ya está de acuerdo");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(card(page, "1357 PRS").getByRole("button", { name: "TERMINADO · LISTO PARA RECOGER" })).toBeVisible();

    const lucia = await page.context().newPage();
    await loginAs(lucia, "Lucía Navarro", "cliente");
    await expect(card(lucia, "Kia Sportage")).toContainText("Reparación iniciada");
  });
});
