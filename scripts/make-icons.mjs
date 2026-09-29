// Genera los iconos PNG de la app a partir de los SVG de /public.
// iPhone no admite SVG en la pantalla de inicio y Android pide PNG de 192 y 512.
//   node scripts/make-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const icon = readFileSync("public/icon.svg", "utf8");
const maskable = readFileSync("public/icon-maskable.svg", "utf8");
// En iOS el icono va a sangre: el sistema ya redondea las esquinas
const apple = icon.replace(' rx="112"', "");
// Insignia de las notificaciones de Android: solo la silueta (se pinta en blanco)
const badge = icon.replace(/<rect[^>]*\/>/, "").replace('stroke="#fff"', 'stroke="#000"');

const targets = [
  { svg: icon, size: 192, out: "public/icon-192.png" },
  { svg: icon, size: 512, out: "public/icon-512.png" },
  { svg: maskable, size: 512, out: "public/icon-maskable-512.png" },
  { svg: apple, size: 180, out: "src/app/apple-icon.png" },
  { svg: badge, size: 96, out: "public/badge-96.png" },
];

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
for (const { svg, size, out } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  writeFileSync(out, await page.locator("svg").screenshot({ omitBackground: true }));
  console.log(out);
}
await browser.close();
