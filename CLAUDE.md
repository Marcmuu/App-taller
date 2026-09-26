@AGENTS.md

# Notas del proyecto

- Especificación de producto en los `0X_*.md` y `PROMPT_MASTER_CLAUDE_CODEX.md` de la raíz. Textos de la UI en español.
- Fase actual: UI completa sobre una BBDD falsa en el navegador (`src/lib/mock/`). Supabase es la siguiente fase (ver "Plan de migración" en README).
- Las pantallas solo acceden a datos vía `src/lib/data/` (queries, actions, hooks). No importar `lib/mock` desde componentes (excepción: `DemoSwitcher`).
- La lógica de estados vive solo en `src/lib/domain/repair-status.ts` (`getNextRepairAction`).
- Si cambias la forma de los datos seed, sube `MOCK_SCHEMA_VERSION` en `src/lib/mock/seed.ts`.
- Next.js 16: `params`/`searchParams` son Promises; `middleware` se llama `proxy`.
- URLs con id: siempre vía `src/lib/routes.ts` (query params para que funcione la exportación estática de GitHub Pages, `npm run build:pages`).
