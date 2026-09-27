@AGENTS.md

# Notas del proyecto

- Especificación de producto en los `0X_*.md` y `PROMPT_MASTER_CLAUDE_CODEX.md` de la raíz. Textos de la UI en español.
- Dos motores de datos (`NEXT_PUBLIC_BACKEND`): `mock` (BBDD en el navegador, `src/lib/mock/` + `lib/data/mock-actions.ts`, demo de GitHub Pages) y `supabase` (`supabase/migrations/`, `lib/data/supabase/`). Toda acción nueva va en los dos; `lib/data/actions.ts` no compila si falta en Supabase.
- Supabase: las tablas solo se leen (RLS); toda escritura es una RPC `security definer` que valida permisos y reglas. La clave service_role solo en `scripts/db-admin.ts`. Despliegue y costes: `docs/DESPLIEGUE_Y_COSTES.md`.
- Las pantallas solo acceden a datos vía `src/lib/data/` (queries, actions, hooks). No importar `lib/mock` desde componentes (excepción: cuentas demo `DEMO_PEOPLE`).
- La lógica de estados vive solo en `src/lib/domain/repair-status.ts` (`getNextRepairAction`).
- Si cambias la forma de los datos seed, sube `MOCK_SCHEMA_VERSION` en `src/lib/mock/seed.ts`.
- Next.js 16: `params`/`searchParams` son Promises; `middleware` se llama `proxy`.
- URLs con id: siempre vía `src/lib/routes.ts` (query params para que funcione la exportación estática de GitHub Pages, `npm run build:pages`).
- Estados: se eliminó repair_completed (terminar = un clic a ready_for_pickup). Mensajes: la conversación es cliente+taller; repair_order_id null = consulta general. Las acciones escriben primero y luego simulan latencia (withLatency).
