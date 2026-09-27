import { expect, test } from "@playwright/test";
import { card, loginAs } from "./helpers";

test.describe("Flujo de reparación", () => {
  test("de recibido a entregado, con fecha estimada y deshacer", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Laura Martínez", "taller");
    const sergio = await page.context().newPage();
    await loginAs(sergio, "Sergio Gil", "cliente");

    const bmw = card(staff, "8642 TVW");
    await bmw.getByRole("button", { name: "INICIAR DIAGNÓSTICO" }).click();
    await expect(bmw.getByRole("button", { name: "CREAR PRESUPUESTO" })).toBeVisible();
    // Deshacer vuelve al estado anterior
    await staff.getByRole("button", { name: "Deshacer" }).first().click();
    await expect(bmw.getByRole("button", { name: "INICIAR DIAGNÓSTICO" })).toBeVisible();
    await bmw.getByRole("button", { name: "INICIAR DIAGNÓSTICO" }).click();
    await expect(card(sergio, "BMW Serie 1")).toContainText("Diagnóstico");

    // Presupuesto con fecha estimada
    await bmw.getByRole("button", { name: "CREAR PRESUPUESTO" }).click();
    await expect(staff.getByRole("heading", { name: "Nuevo presupuesto" })).toBeVisible();
    await staff.getByRole("button", { name: "Enviar al cliente" }).click();
    await expect(staff.getByText("Añade al menos una línea")).toBeVisible();
    await staff.getByRole("button", { name: /Revisión general/ }).click();
    await staff.getByRole("button", { name: /Añadir pieza/ }).click();
    await staff.getByLabel("Precio unitario").last().fill("25");
    await staff.getByRole("button", { name: "Enviar al cliente" }).click();
    await expect(staff.getByText("Describe la línea")).toBeVisible();
    await staff.getByLabel("Descripción").last().fill("Filtro de habitáculo");
    await staff.getByRole("button", { name: /Mano de obra \(horas\)/ }).click();
    await staff.getByRole("button", { name: "Mañana", exact: true }).click();
    await expect(staff.getByText(/El cliente verá: «Listo aprox\./)).toBeVisible();
    await staff.getByRole("button", { name: "Vista previa" }).click();
    await expect(staff.getByRole("dialog")).toContainText("Filtro de habitáculo");
    await staff.keyboard.press("Escape");
    await staff.getByRole("button", { name: "Enviar al cliente" }).click();
    await staff.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(staff.getByRole("button", { name: /Esperando al cliente/ })).toBeVisible();

    // El cliente ve el presupuesto con la fecha y lo acepta
    const bmwCustomer = card(sergio, "BMW Serie 1");
    await bmwCustomer.getByRole("link", { name: "Ver presupuesto" }).click();
    await expect(sergio.getByText(/Listo aproximadamente: .*hacia las 19:00/)).toBeVisible();
    await expect(sergio.getByText("Filtro de habitáculo")).toBeVisible();
    await sergio.getByRole("button", { name: "ACEPTAR PRESUPUESTO" }).click();
    await sergio.getByRole("button", { name: "Sí, acepto" }).click();
    await expect(sergio.getByText(/Aceptaste este presupuesto/)).toBeVisible();

    // El taller lo ve y repara
    await staff.getByRole("button", { name: "INICIAR REPARACIÓN" }).click();
    await sergio.goto("/app");
    await expect(card(sergio, "BMW Serie 1")).toContainText("Reparación iniciada");
    await expect(card(sergio, "BMW Serie 1")).toContainText(/Listo aprox\.: .*hacia las 19:00/);
    // Terminar es un solo clic: el coche pasa a «Listo para recoger» y el cliente recibe el aviso
    await staff.getByRole("button", { name: "TERMINADO · LISTO PARA RECOGER" }).click();
    await expect(staff.getByRole("button", { name: "ENTREGADO AL CLIENTE" })).toBeVisible();

    await expect(card(sergio, "BMW Serie 1")).toContainText("Listo para recoger");
    await card(sergio, "BMW Serie 1").getByRole("link", { name: "Ver recogida" }).click();
    await expect(sergio.getByText("Trabajos realizados")).toBeVisible();
    await expect(sergio.getByText("Filtro de habitáculo")).toBeVisible();

    // Entregar también es un clic (sin diálogo), con «Deshacer» por si acaso
    await staff.getByRole("button", { name: "ENTREGADO AL CLIENTE" }).click();
    await expect(staff.getByRole("button", { name: "ENTREGADO AL CLIENTE" })).toBeHidden();
    await sergio.goto("/app");
    await expect(sergio.getByText("Historial")).toBeVisible();
    await expect(sergio.getByRole("link", { name: /BMW Serie 1.*Cerrado/ })).toBeVisible();
  });

  test("corrección manual de estado queda en el historial", async ({ page }) => {
    await loginAs(page, "Laura Martínez", "taller");
    await card(page, "1357 PRS").getByRole("link").first().click();
    await page.getByRole("button", { name: "Corregir estado" }).click();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Vehículo recibido" }).click();
    await page.getByLabel("Motivo (opcional)").fill("Faltaba una pieza para diagnosticar");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Corrección manual: Faltaba una pieza para diagnosticar").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "INICIAR DIAGNÓSTICO" })).toBeVisible();
  });

  test("cambiar la fecha estimada avisa al cliente", async ({ page }) => {
    await loginAs(page, "Pablo Sánchez", "taller");
    await card(page, "4321 JKL").getByRole("link").first().click();
    await expect(page.getByRole("heading", { name: "Renault Clio" })).toBeVisible();
    await page.getByRole("button", { name: "Cambiar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "En 3 días" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/Fecha estimada actualizada/)).toBeVisible();

    const ana = await page.context().newPage();
    await loginAs(ana, "Ana García", "cliente");
    await ana.goto("/app/notifications");
    await expect(ana.getByText("Nueva fecha estimada")).toBeVisible();
  });
});

test.describe("Presupuestos: rechazos, consultas y versiones", () => {
  test("los rechazados van en su categoría y el cliente puede cambiar de opinión", async ({ page }) => {
    const staff = page;
    await loginAs(staff, "Laura Martínez", "taller");
    await staff.getByRole("tab", { name: /^Rechazados/ }).click();
    await expect(card(staff, "2468 LMN")).toBeVisible();
    await expect(card(staff, "2468 LMN").getByRole("button", { name: "DEVOLVER SIN REPARAR" })).toBeVisible();
    await staff.getByRole("tab", { name: /^Presupuesto/ }).click();
    await expect(card(staff, "2468 LMN")).toHaveCount(0);
    await expect(card(staff, "1234 BBC")).toBeVisible();

    const david = await page.context().newPage();
    await loginAs(david, "David Romero", "cliente");
    await expect(card(david, "Ford Focus")).toContainText("Presupuesto rechazado");
    await card(david, "Ford Focus").getByRole("link", { name: "Ver presupuesto" }).click();
    await expect(david.getByText(/todavía puedes aceptarlo/)).toBeVisible();
    await expect(david.getByRole("button", { name: "RECHAZAR / CONSULTAR" })).toBeHidden();
    await david.getByRole("button", { name: /HE CAMBIADO DE OPINIÓN/ }).click();
    await david.getByRole("button", { name: "Sí, acepto" }).click();
    await expect(david.getByText(/Aceptaste este presupuesto/)).toBeVisible();

    // En el taller pasa a aceptado, fuera de Rechazados
    await expect(card(staff, "2468 LMN").getByRole("button", { name: "INICIAR REPARACIÓN" })).toBeVisible();
    await expect(staff.getByRole("tab", { name: /^Rechazados/ })).toContainText("0");
    await staff.getByRole("button", { name: /Avisos/ }).click();
    await expect(staff.getByRole("menu").getByText("El cliente ha cambiado de opinión")).toBeVisible();
  });

  test("el cliente rechaza, el taller devuelve el coche sin reparar", async ({ page }) => {
    const carlos = page;
    await loginAs(carlos, "Carlos López", "cliente");
    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");

    await card(carlos, "Seat León").getByRole("link", { name: "Ver presupuesto" }).click();
    await carlos.getByRole("button", { name: "RECHAZAR / CONSULTAR" }).click();
    await carlos.getByRole("button", { name: "No quiero realizar la reparación" }).click();
    await carlos.getByRole("textbox").fill("Me lo arreglará un familiar.");
    await carlos.getByRole("button", { name: "Rechazar presupuesto" }).click();
    await expect(carlos.getByText(/Has rechazado este presupuesto/)).toBeVisible();

    await staff.getByRole("tab", { name: /^Rechazados/ }).click();
    const leon = card(staff, "1234 BBC");
    await expect(leon).toContainText("El cliente ha rechazado el presupuesto");
    await leon.getByRole("link").first().click();
    await expect(staff.getByText("Me lo arreglará un familiar.")).toBeVisible();
    await staff.getByRole("button", { name: "DEVOLVER SIN REPARAR" }).click();
    await staff.getByRole("button", { name: "Confirmar" }).click();
    await expect(staff.getByRole("button", { name: "ENTREGADO AL CLIENTE" })).toBeVisible();
    await expect(staff.getByText("Sin reparar: el cliente rechazó el presupuesto").first()).toBeVisible();

    // El cliente ya no puede aceptar y la recogida lo explica
    await carlos.reload();
    await expect(carlos.getByRole("button", { name: /ACEPTAR/ })).toBeHidden();
    await carlos.goto("/app");
    await card(carlos, "Seat León").getByRole("link", { name: "Ver recogida" }).click();
    await expect(carlos.getByText("Sin reparación")).toBeVisible();
    await carlos.goBack();
    await card(carlos, "Seat León").getByRole("link").first().click();
    await expect(carlos.getByText("No realizado").first()).toBeVisible();
  });

  test("consulta del cliente → nueva versión → el cliente acepta la última", async ({ page }) => {
    const carlos = page;
    await loginAs(carlos, "Carlos López", "cliente");
    await card(carlos, "Seat León").getByRole("link", { name: "Ver presupuesto" }).click();
    await expect(carlos).toHaveURL(/\/app\/estimate/);
    const v1Url = carlos.url();
    await carlos.getByRole("button", { name: "RECHAZAR / CONSULTAR" }).click();
    await carlos.getByRole("button", { name: "Tengo una duda" }).click();
    await carlos.getByRole("textbox").fill("¿Podéis poner bujías más baratas?");
    await carlos.getByRole("button", { name: "Enviar duda" }).click();
    await expect(carlos.getByText(/Has enviado una consulta/)).toBeVisible();

    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    await staff.getByRole("tab", { name: /^Presupuesto/ }).click();
    const leon = card(staff, "1234 BBC");
    await expect(leon).toContainText("El cliente tiene una consulta");
    await leon.getByRole("button", { name: "REVISAR PRESUPUESTO" }).click();
    await expect(staff.getByRole("heading", { name: /versión 2/ })).toBeVisible();
    await expect(staff.getByLabel("Descripción")).toHaveCount(4); // copia las líneas de la v1
    await staff.getByLabel("Precio unitario").nth(2).fill("8.5");
    await staff.getByRole("button", { name: "Enviar al cliente" }).click();
    await staff.getByRole("button", { name: "Enviar", exact: true }).click();

    await carlos.goto(v1Url);
    await expect(carlos.getByText("Hay una versión más reciente")).toBeVisible();
    await expect(carlos.getByRole("button", { name: /ACEPTAR/ })).toBeHidden();
    await carlos.getByText("Hay una versión más reciente").click();
    await expect(carlos.getByRole("heading", { name: /versión 2/ })).toBeVisible();
    await carlos.getByRole("button", { name: "ACEPTAR PRESUPUESTO" }).click();
    await carlos.getByRole("button", { name: "Sí, acepto" }).click();
    await expect(carlos.getByText(/aceptas la versión 2|Aceptaste este presupuesto/).first()).toBeVisible();
  });

  test("«Quiero hablar con el taller» deja un mensaje y avisa", async ({ page }) => {
    await loginAs(page, "Carlos López", "cliente");
    await card(page, "Seat León").getByRole("link", { name: "Ver presupuesto" }).click();
    await page.getByRole("button", { name: "RECHAZAR / CONSULTAR" }).click();
    await page.getByRole("button", { name: "Quiero hablar con el taller" }).click();
    await expect(page.getByText(/Has enviado una consulta/)).toBeVisible();

    const staff = await page.context().newPage();
    await loginAs(staff, "Laura Martínez", "taller");
    await staff.getByRole("button", { name: /Avisos/ }).click();
    await expect(staff.getByRole("menu").getByText("El cliente quiere hablar")).toBeVisible();
  });

  test("el borrador se guarda y se recupera", async ({ page }) => {
    await loginAs(page, "Laura Martínez", "taller");
    await card(page, "1357 PRS").getByRole("button", { name: "CREAR PRESUPUESTO" }).click();
    await page.getByRole("button", { name: /Diagnosis electrónica/ }).click();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Borrador guardado")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Descripción")).toHaveValue("Diagnosis electrónica");
    await page.goto("/taller");
    await expect(card(page, "1357 PRS").getByRole("button", { name: "CONTINUAR PRESUPUESTO" })).toBeVisible();

    // El cliente no ve borradores
    const lucia = await page.context().newPage();
    await loginAs(lucia, "Lucía Navarro", "cliente");
    await expect(card(lucia, "Kia Sportage")).toContainText("Diagnóstico");
    await expect(card(lucia, "Kia Sportage").getByRole("link", { name: "Ver presupuesto" })).toHaveCount(0);
  });
});

test.describe("Mensajes", () => {
  test("mensajes en ambos sentidos con contador de no leídos", async ({ page }) => {
    const ana = page;
    await loginAs(ana, "Ana García", "cliente");
    const staff = await page.context().newPage();
    await loginAs(staff, "Pablo Sánchez", "taller");
    const commsLink = staff.getByRole("link", { name: /Comunicaciones/ });
    await expect(commsLink).toContainText("3"); // seed: mensajes sin leer de Ana, David y Nuria

    await card(ana, "Renault Clio").getByRole("link").first().click();
    await ana.getByRole("link", { name: /Contactar con el taller/ }).click();
    await ana.getByLabel("Mensaje").fill("¿Puedo pasar a las 18:00?");
    await ana.getByLabel("Mensaje").press("Enter");
    await expect(ana.locator("p.whitespace-pre-wrap", { hasText: "¿Puedo pasar a las 18:00?" })).toBeVisible();
    await expect(commsLink).toContainText("4");

    await commsLink.click();
    await staff.getByRole("link", { name: /Ana García[\s\S]*Renault/ }).first().click();
    await expect(staff.locator("p.whitespace-pre-wrap", { hasText: "¿Puedo pasar a las 18:00?" })).toBeVisible();
    await expect(commsLink).toContainText("2"); // quedan los de David y Nuria
    await staff.getByLabel("Mensaje").fill("Sí, te esperamos.");
    await staff.getByRole("button", { name: "Enviar" }).click();

    await expect(ana.locator("p.whitespace-pre-wrap", { hasText: "Sí, te esperamos." })).toBeVisible();
  });
});
