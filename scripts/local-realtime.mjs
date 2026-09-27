// Solo para la batería e2e contra Supabase LOCAL (Docker).
//
// Los tests reinician los datos demo antes de cada test (cientos de filas) y
// el Realtime local limita a 100 mensajes/segundo: tras un reinicio descarta
// mensajes durante unos segundos y los tests que esperan cambios en directo
// fallan al azar. Aquí se sube ese límite en el emulador local.
// No afecta a Supabase en la nube.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const project = /project_id\s*=\s*"([^"]+)"/.exec(readFileSync("supabase/config.toml", "utf8"))?.[1];
const realtime = `supabase_realtime_${project}`;
const db = `supabase_db_${project}`;
const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
const sql = (query) => run(`docker exec ${db} psql -U supabase_admin -d postgres -tAc "${query}"`);

// Al arrancar, el contenedor vuelve a crear el tenant con los valores por
// defecto: hay que esperar a que exista el nuevo y cambiarlo después.
const before = sql("select now()");
run(`docker restart ${realtime}`);
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  ready = sql(`select count(*) from _realtime.tenants where inserted_at > '${before}'::timestamptz`) === "1";
}
if (!ready) throw new Error("El Realtime local no arrancó a tiempo");
sql("update _realtime.tenants set max_events_per_second = 2000");
console.log("Realtime local: límite de mensajes subido a 2000/s");
