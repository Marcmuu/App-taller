# Taller SaaS — MVP de comunicación taller-cliente

## Objetivo
Crear una aplicación SaaS extremadamente sencilla que actúe como capa de comunicación entre un taller mecánico y sus clientes.

No pretende sustituir el ERP del taller ni cubrir contabilidad, inventario, facturación, compras o gestión avanzada de operarios.

El núcleo del producto es:

**Cita → recepción del vehículo → diagnóstico → presupuesto → aprobación → reparación → recogida**

## Producto recomendado para el MVP

Construir una **web app responsive / PWA** con una sola base de código.

- Cliente: experiencia mobile-first.
- Taller: dashboard web optimizado para escritorio/tablet.
- Backend: Supabase.
- Frontend: Next.js + TypeScript.

Esto permite validar el producto antes de invertir en apps nativas iOS/Android.

## Stack recomendado

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui como base de componentes
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Supabase Row Level Security (RLS)
- Zod para validación
- React Hook Form para formularios
- Vercel para despliegue

## Principio UX

**Una pantalla = una decisión principal.**

El cliente debe entender siempre qué está pasando con su coche.
El trabajador debe poder actualizar el estado en menos de 5 segundos.

---

# Guía técnica

## Demo online

- App: https://marcmuu.github.io/App-taller/
- Guía visual con vídeo: https://marcmuu.github.io/App-taller/guia/
- Cliente y taller a la vez (ordenador): https://marcmuu.github.io/App-taller/demo/
- Manual de uso completo: [docs/GUIA_DE_USO.md](docs/GUIA_DE_USO.md)

## Estado actual

| Fase | Estado |
| --- | --- |
| A — Scaffold y design system | ✅ |
| B — 15 pantallas con datos falsos | ✅ (flujo completo navegable) |
| C — Supabase (migraciones, RLS, seed) | ⏳ siguiente |
| D — Autenticación real | ⏳ |
| E — Flujos conectados a Supabase + Realtime | ⏳ (hoy funcionan sobre la BBDD falsa) |

Ahora mismo **no hace falta Supabase ni variables de entorno**: la app usa una BBDD falsa en el navegador.

## Requisitos

- Node.js 20.9 o superior (probado con Node 24)
- npm

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

Otros comandos:

```bash
npm run lint    # ESLint
npm run build   # build de producción (Turbopack)
npm run start   # sirve el build
```

## Cuentas demo

Contraseña de todas: **`demo1234`**. En la pantalla de login aparecen como botones de un clic.

| Rol | Nombre | Email |
| --- | --- | --- |
| Admin del taller | Laura Martínez | laura@tallerdemo.es |
| Mecánico | Javier Ruiz | javier@tallerdemo.es |
| Mecánico | Pablo Sánchez | pablo@tallerdemo.es |
| Cliente (presupuesto pendiente) | Carlos López | carlos@demo.es |
| Cliente (en reparación + cita solicitada) | Ana García | ana@demo.es |
| Cliente (listo para recoger) | Marta Fernández | marta@demo.es |
| Clientes | David Romero, Lucía Navarro, Sergio Gil, Jorge Díaz | david@ / lucia@ / sergio@ / jorge@demo.es |

## Cómo probar el flujo completo

1. Abre **dos pestañas**: en una entra como **Laura** (taller) y en otra como **Carlos** (cliente). La sesión es por pestaña.
2. Cliente: *Solicitar cita* → vehículo → motivo → avería → foto → hora → enviar.
3. Taller: la solicitud aparece sola arriba del dashboard → **CONFIRMAR CITA** → **MARCAR RECIBIDO** → **INICIAR DIAGNÓSTICO** → **CREAR PRESUPUESTO** → enviar.
4. Cliente: *Ver presupuesto* → **ACEPTAR PRESUPUESTO** (o Rechazar / Consultar).
5. Taller: **INICIAR REPARACIÓN** → **FINALIZAR REPARACIÓN** → **LISTO PARA RECOGER**.
6. Cliente: ve cada cambio al momento y la pantalla de recogida.

El botón **Demo** (arriba a la derecha) permite cambiar de usuario al vuelo y **reiniciar los datos de prueba**.

## Arquitectura

```text
src/
  app/
    (public)/            / (inicio) y /login
    (customer)/app/      área cliente (móvil)
    (workshop)/taller/   área taller (escritorio/tablet)
    manifest.ts          PWA
  components/
    ui/                  shadcn/ui
    customer/ workshop/ repair/ estimate/ media/ shared/
  lib/
    domain/              reglas de negocio puras (estados, presupuesto, citas)
    data/                acceso a datos: queries.ts, actions.ts, hooks.ts
    mock/                BBDD falsa: seed.ts, store.ts   ← se elimina con Supabase
    routes.ts            todas las URLs con id
    validators.ts        esquemas Zod
  types/database.ts      tipos de tablas (= 02_MODELO_DATOS.md)
```

Piezas clave:

- **`getNextRepairAction(status, context)`** en `lib/domain/repair-status.ts`: única fuente de verdad de la siguiente acción del taller. Ningún componente decide el siguiente estado por su cuenta.
- **Cambio de estado atómico** (`changeRepairStatus` en `lib/data/actions.ts`): actualiza `repair_orders.current_status`, inserta en `repair_status_history` con usuario y hora y crea la notificación.
- **Presupuestos versionados**: modificar uno ya enviado o aceptado crea una versión nueva que requiere nueva aceptación. Aceptar nunca inicia la reparación automáticamente.

### La BBDD falsa

- Las tablas tienen **los mismos nombres y campos** que `02_MODELO_DATOS.md` (ver `src/types/database.ts`).
- Se guardan en `localStorage` (`taller:mock-db`) y se comparten entre pestañas mediante el evento `storage`, que hace de Realtime.
- Los datos seed (`src/lib/mock/seed.ts`) usan fechas relativas a "ahora", así el dashboard siempre parece de hoy. Los ids son uuids fijos, reutilizables en `supabase/seed.sql`.
- Para añadir o cambiar campos: edita `types/database.ts` y `seed.ts`, y **sube `MOCK_SCHEMA_VERSION`** para que el navegador regenere los datos.
- Las fotos se reducen y se guardan como data URL. Los vídeos están limitados a 2 MB solo en modo demo.

### Plan de migración a Supabase

Las pantallas solo usan `lib/data/*`, así que la migración se concentra ahí:

1. `supabase/migrations/`: enums, tablas, índices, constraints y RLS según `05_SEGURIDAD_RLS.md`; bucket privado `repair-media`.
2. `supabase/seed.sql` a partir de `lib/mock/seed.ts`.
3. `lib/supabase/{client,server}.ts` con `@supabase/ssr` y `proxy.ts` (antes llamado *middleware*) para la sesión en cookies.
4. `actions.ts` → Server Actions / RPC en Postgres (cambio de estado + historial + notificación en una transacción).
5. `hooks.ts` → queries + suscripciones Realtime (`repair_orders`, `messages`, `estimates`).
6. Eliminar `lib/mock/`, `DemoSwitcher` y los guards en cliente.

Variables de entorno previstas (aún no necesarias):

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo en servidor, nunca en el navegador
```

## Demo estática en GitHub Pages

La demo se publica gratis como web estática (sin servidor, sin Vercel ni Supabase):

```bash
npm run build:pages   # genera ./out con basePath /App-taller
```

Después se sube el contenido de `out/` a la rama `gh-pages` del repositorio (GitHub → Settings → Pages → *Deploy from a branch* → `gh-pages` / root).

- `scripts/build-pages.mjs` activa `output: "export"` (ver `next.config.ts`) y `scripts/fix-static-export.mjs` corrige los nombres de los payloads de prefetch de Next 16 y añade `.nojekyll`.
- Para que la exportación estática funcione, las pantallas con id usan parámetros de consulta (`/app/repair?id=…`) en vez de segmentos dinámicos. Todas esas URLs están en `src/lib/routes.ts`; al pasar a Vercel se puede volver a `/app/repairs/[id]`.
- `/guia` (guía visual con vídeo) y `/demo` (cliente y taller lado a lado) solo existen para la demo. Las capturas y el vídeo están en `public/guia/`.

## Deploy en Vercel

`npm run build` (sin `STATIC_EXPORT`) genera la versión con servidor. Hoy se puede importar en Vercel sin variables de entorno.

## Documentación de producto

`01_ARQUITECTURA.md` … `08_DECISION_TECNICA.md` y `PROMPT_MASTER_CLAUDE_CODEX.md`.
