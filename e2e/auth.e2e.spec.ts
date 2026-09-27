import { expect, test } from "./fixtures";
import { AREA_URL, loginAs } from "./helpers";

test.describe("Acceso", () => {
  test("entrar pulsando una cuenta demo lleva directamente a su zona", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Soy cliente/ }).click();
    await page.getByRole("button", { name: /Carlos López/ }).click();
    await expect(page).toHaveURL(AREA_URL.cliente);
    await expect(page.getByRole("heading", { name: "Hola, Carlos" })).toBeVisible();
  });

  test("cambiar de usuario con el botón Demo entre taller y cliente (fallo corregido)", async ({ page }) => {
    await loginAs(page, "Laura Martínez", "taller");
    const switchTo = async (name: string) => {
      await page.getByRole("button", { name: "Demo", exact: true }).click();
      await page.getByRole("menuitem", { name: new RegExp(name) }).click();
    };

    await switchTo("Carlos López");
    await expect(page).toHaveURL(AREA_URL.cliente);
    await expect(page.getByRole("heading", { name: "Hola, Carlos" })).toBeVisible();

    await switchTo("Ana García");
    await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();

    await switchTo("Javier Ruiz");
    await expect(page).toHaveURL(AREA_URL.taller);
    await expect(page.getByRole("button", { name: "Menú de usuario" })).toHaveText("JR");
  });

  test("email y contraseña escritos a mano; contraseña incorrecta da error", async ({ page }) => {
    await page.goto("/login?tipo=taller");
    await page.getByLabel("Email").fill("laura@tallerdemo.es");
    await page.getByLabel("Contraseña").fill("mala");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("form [role=alert]")).toHaveText(/incorrectos/);
    await page.getByLabel("Contraseña").fill("demo1234");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(AREA_URL.taller);
  });

  test("sin sesión, las zonas protegidas llevan al login; un cliente no entra al taller", async ({ page }) => {
    await page.goto("/taller");
    await expect(page).toHaveURL(/\/login\?tipo=taller/);
    await loginAs(page, "Carlos López", "cliente");
    await page.goto("/taller");
    await expect(page).toHaveURL(AREA_URL.cliente);
  });

  test("con sesión abierta, el login lo indica y permite continuar", async ({ page }) => {
    await loginAs(page, "Ana García", "cliente");
    await page.goto("/login?tipo=cliente");
    await expect(page.getByText("Ya has entrado como")).toContainText("Ana García");
    await page.getByRole("link", { name: "Continuar" }).click();
    await expect(page).toHaveURL(AREA_URL.cliente);
  });

  test("cerrar sesión", async ({ page }) => {
    await loginAs(page, "Carlos López", "cliente");
    await page.getByRole("link", { name: "Perfil" }).click();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?tipo=cliente/);
  });

  test("registro de cliente nuevo → estado vacío → añadir coche", async ({ page }) => {
    await page.goto("/login?tipo=cliente");
    await page.getByRole("link", { name: "Crea tu cuenta" }).click();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Escribe tu nombre y apellido")).toBeVisible();

    await page.getByLabel("Nombre y apellidos").fill("Pedro Prueba");
    await page.getByLabel("Teléfono").fill("600 123 456");
    await page.getByLabel("Email").fill("carlos@demo.es");
    await page.getByLabel("Contraseña").fill("secreta123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.locator("form [role=alert]")).toHaveText(/Ya existe una cuenta/);

    await page.getByLabel("Email").fill("pedro@prueba.es");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Hola, Pedro" })).toBeVisible();
    await expect(page.getByText("Añade tu coche para empezar")).toBeVisible();

    await page.getByRole("link", { name: "Añadir vehículo" }).click();
    await page.getByLabel("Matrícula", { exact: true }).fill("9999zzz");
    await page.getByLabel("Marca").fill("Dacia");
    await page.getByLabel("Modelo").fill("Sandero");
    await page.getByLabel("Año (opcional)").fill("1800");
    await page.getByRole("button", { name: "Guardar vehículo" }).click();
    await expect(page.getByText("Año no válido")).toBeVisible();
    await page.getByLabel("Año (opcional)").fill("2020");
    await page.getByRole("button", { name: "Guardar vehículo" }).click();
    await expect(page.getByText("9999 ZZZ")).toBeVisible();

    // La cuenta nueva sirve para volver a entrar
    await page.getByRole("link", { name: "Perfil" }).click();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.goto("/login?tipo=cliente");
    await page.getByLabel("Email").fill("pedro@prueba.es");
    await page.getByLabel("Contraseña").fill("secreta123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Hola, Pedro" })).toBeVisible();
  });
});
