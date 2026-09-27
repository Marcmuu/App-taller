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
| B — Pantallas y flujo completo (BBDD de prueba) | ✅ |
| B+ — Calendario, capacidad por franja, festivos, fecha estimada, rechazados, registro | ✅ |
| B++ — Matrículas por país, chat general, estados simplificados, reprogramar citas | ✅ |
| B+++ — Proponer otra hora, cambiar cita confirmada, fotos en el chat, Mi taller, tarjetas QR, reseñas | ✅ |
| C — Supabase: migraciones, RLS, RPC, Storage privado, seed demo | ✅ |
| D — Autenticación real (Supabase Auth) | ✅ |
| E — Todo conectado a Supabase + Realtime (chat entre móviles) | ✅ |
| F — Publicar en Vercel + Supabase cloud | ⏳ ver [docs/DESPLIEGUE_Y_COSTES.md](docs/DESPLIEGUE_Y_COSTES.md) |

La app tiene dos motores de datos, que se eligen con `NEXT_PUBLIC_BACKEND`:

- `mock`: BBDD de prueba en el navegador. No necesita nada; es la demo de GitHub Pages.
- `supabase`: base de datos real, compartida entre todos los dispositivos.

## Requisitos

- Node.js 20.9 o superior (probado con Node 24)
- npm

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

Sin `.env.local` usa la BBDD de prueba del navegador.

### Con Supabase en local (Docker)

```bash
npx supabase start -x vector,logflare,imgproxy,studio,postgres-meta,edge-runtime,mailpit
cp .env.example .env.local        # las claves de local salen en: npx supabase status
npm run db:demo -- reset          # carga las cuentas y datos demo con fechas de hoy
npm run dev
```

Otros comandos:

```bash
npm run lint    # ESLint
npm run build   # build de producción (Turbopack)
npm test        # lógica + app completa en Chrome (BBDD de prueba)
npm run test:unit            # solo lógica de dominio
npm run test:e2e             # solo flujos de extremo a extremo (mock)
npm run test:e2e:supabase    # la misma batería contra Supabase local
npm run test:db              # seguridad de la base de datos (RLS)
npm run db:demo -- reset | purge | create-workshop "Nombre" email "Admin" [tel]
```

## Tests

Los tests usan Playwright y el **Chrome instalado** en el equipo (`channel: "chrome"` en `playwright.config.ts`). `npm test` compila la app y la arranca en el puerto 3100.

| Archivo | Qué cubre |
| --- | --- |
| `e2e/domain.unit.spec.ts` | Capacidad por franja, días llenos/cerrados/festivos, antelación mínima, validación de horario, siguiente acción, reglas de aceptación, totales |
| `e2e/auth.e2e.spec.ts` | Login demo y manual, cambio de usuario con «Demo», protección de rutas, registro, cierre de sesión |
| `e2e/booking.e2e.spec.ts` | Calendario del cliente, reserva con foto en directo, capacidad configurable, dos clientes a por la última plaza, anulaciones y rechazos de cita |
| `e2e/repairs.e2e.spec.ts` | Flujo completo con fecha estimada y deshacer, rechazados y cambio de opinión, devolver sin reparar, consultas y versiones, borradores, mensajes |
| `e2e/schedule.e2e.spec.ts` | Agenda semanal del taller, validación de tramos, cerrar días, festivos, franjas de 1 hora |
| `e2e/chat-and-flow.e2e.spec.ts` | Matrículas por país y duplicados, chat general cliente↔taller entre cuentas, elegir otra fecha tras un rechazo, terminado en un clic, reparar sin presupuesto |
| `e2e/extras.e2e.spec.ts` | El taller propone otra hora y el cliente la acepta, cambiar una cita confirmada, fotos en el chat, Mi taller (admin/mecánico), tarjetas QR, botón de reseña al entregar |
| `e2e/security.db.spec.ts` | RLS y RPC contra Supabase: anónimo, cliente (solo lo suyo, no escribe directo, no toca datos ajenos ni fotos ajenas), funciones internas bloqueadas, taller y mecánico |

Los tests `*.e2e.spec.ts` se ejecutan igual con los dos motores. Contra Supabase (`npm run test:e2e:supabase`) se reinician los datos demo antes de cada test y se espera a que el tiempo real esté al día. Antes, `scripts/local-realtime.mjs` sube el límite de mensajes por segundo del Realtime local (Docker), que con tantos reinicios seguidos descartaría mensajes; no afecta a la nube.

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
| Cliente (presupuesto rechazado) | David Romero | david@demo.es |
| Cliente (cita confirmada mañana) | Jorge Díaz | jorge@demo.es |
| Cliente recién registrada (sin coches) | Nuria Vidal | nuria@demo.es |
| Clientes | Lucía Navarro, Sergio Gil | lucia@ / sergio@demo.es |

Datos del calendario incluidos: mañana a las 10:00 la franja está llena (2/2), el próximo sábado está completo y hay un festivo dentro de ~9 días.

## Cómo probar el flujo completo

1. Abre **dos pestañas**: en una entra como **Laura** (taller) y en otra como **Carlos** (cliente). La sesión es por pestaña.
2. Cliente: *Solicitar cita* → vehículo → motivo → avería → foto → hora → enviar.
3. Taller: la solicitud aparece sola arriba del dashboard → **CONFIRMAR CITA** → **MARCAR RECIBIDO** → **INICIAR DIAGNÓSTICO** → **CREAR PRESUPUESTO** → enviar.
4. Cliente: *Ver presupuesto* → **ACEPTAR PRESUPUESTO** (o Rechazar / Consultar).
5. Taller: **INICIAR REPARACIÓN** → **TERMINADO · LISTO PARA RECOGER** (un clic) → **ENTREGADO AL CLIENTE**.
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

### Motor de datos

Las pantallas solo usan `lib/data/*`: `store.ts` (estado y suscripción), `actions.ts` (todas las escrituras) y `queries.ts` (selectores puros). Cada motor implementa lo mismo, y si a Supabase le falta una acción, no compila.

**BBDD de prueba** (`lib/mock/`, `lib/data/mock-actions.ts`)
- Mismas tablas y campos que `02_MODELO_DATOS.md` (ver `src/types/database.ts`), guardadas en `localStorage`. El evento `storage` hace de Realtime entre pestañas.
- Seed con fechas relativas a «ahora» (`src/lib/mock/seed.ts`). Si cambias campos, sube `MOCK_SCHEMA_VERSION`.

**Supabase** (`supabase/migrations/`, `lib/data/supabase/`)
- `…01_schema.sql`: tablas, índices, RLS de solo lectura, publicación Realtime, bucket privado `repair-media` con sus políticas.
- `…02_functions.sql`: todas las escrituras son funciones `security definer` que validan permisos y reglas: transiciones de estado, capacidad por franja con bloqueo, versiones de presupuesto, rutas de archivos, etc. Los errores de negocio llegan en español a la pantalla.
- `…03_demo.sql`: `reset_demo(seed)` carga el mismo seed que la BBDD de prueba (usuarios incluidos) y `purge_demo()` lo borra todo.
- `…04_booked_slots.sql`: ocupación pública de horas (sin datos personales) para el calendario del cliente.
- En el navegador: `store.ts` carga lo visible por RLS, se suscribe a `postgres_changes` y firma las URLs de las fotos. `actions.ts` llama a las RPC y sube los archivos a Storage.
- La clave `service_role` solo la usa `scripts/db-admin.ts` en tu ordenador. La web usa la clave pública.

## Demo estática en GitHub Pages

La demo se publica gratis como web estática (sin servidor, sin Vercel ni Supabase):

```bash
npm run build:pages   # genera ./out con basePath /App-taller
```

Después se sube el contenido de `out/` a la rama `gh-pages` de este repositorio (GitHub → Settings → Pages → *Deploy from a branch* → `gh-pages` / root).

- `scripts/build-pages.mjs` activa `output: "export"` (ver `next.config.ts`) y `scripts/fix-static-export.mjs` corrige los nombres de los payloads de prefetch de Next 16 y añade `.nojekyll`.
- Para que la exportación estática funcione, las pantallas con id usan parámetros de consulta (`/app/repair?id=…`) en vez de segmentos dinámicos. Todas esas URLs están en `src/lib/routes.ts`; al pasar a Vercel se puede volver a `/app/repairs/[id]`.
- `/guia` (guía visual con vídeo) y `/demo` (cliente y taller lado a lado) solo existen para la demo. Las capturas y el vídeo están en `public/guia/`.

## Deploy en Vercel + Supabase

Paso a paso, costes y cómo pasarlo a un cliente real: **[docs/DESPLIEGUE_Y_COSTES.md](docs/DESPLIEGUE_Y_COSTES.md)**.

## Documentación de producto

`01_ARQUITECTURA.md` … `08_DECISION_TECNICA.md` y `PROMPT_MASTER_CLAUDE_CODEX.md`.
