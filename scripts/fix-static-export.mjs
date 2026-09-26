// Ajuste posterior a `next build` con output: "export" (Next 16.3).
//
// Next escribe los payloads de prefetch en carpetas:
//   out/taller/__next.!KHdv…/taller/__PAGE__.txt
// pero el navegador los pide con puntos:
//   out/taller/__next.!KHdv….taller.__PAGE__.txt
// En un hosting estático (GitHub Pages) eso da 404 y cada navegación recarga
// la página entera. Creamos una copia con el nombre que se pide.
//
// Además añade .nojekyll para que GitHub Pages sirva la carpeta _next.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "out");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

let copies = 0;
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) {
      for (const file of walk(full)) {
        const rel = path.relative(full, file).split(path.sep).join(".");
        fs.copyFileSync(file, path.join(dir, `${entry.name}.${rel}`));
        copies++;
      }
    } else {
      visit(full);
    }
  }
}

visit(OUT);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
console.log(`fix-static-export: ${copies} payloads copiados, .nojekyll creado en ${OUT}`);
