# Decisión técnica recomendada

## ¿Web, app móvil o ambas?

### Recomendación

**Web app responsive + PWA primero.**

Razones:

1. una sola base de código;
2. desarrollo más rápido;
3. despliegue inmediato;
4. el cliente no necesita instalar nada para usarla;
5. puede añadirse a la pantalla de inicio;
6. el dashboard de taller funciona de forma natural en web;
7. si se valida el producto, posteriormente se puede crear app nativa o empaquetar partes concretas.

## ¿Necesita base de datos?

Sí.

El producto depende de información persistente y compartida:

- usuarios
- talleres
- vehículos
- citas
- estados
- historial
- presupuestos
- mensajes
- archivos

## ¿Supabase?

Sí, es una muy buena elección para este MVP.

Reduce servicios separados porque reúne:

- PostgreSQL
- Auth
- Storage
- Realtime
- RLS

Además permite mantener SQL/Postgres estándar y evita quedar atado a una base de datos propietaria.

## ¿Next.js?

Sí.

Una única aplicación Next.js permite:

- cliente mobile-first
- taller desktop-first
- rutas protegidas
- SSR
- Server Actions / endpoints cuando convenga
- despliegue sencillo en Vercel

## Arquitectura recomendada

```text
Browser / PWA
       │
       ▼
Next.js
       │
       ├── Supabase Auth
       ├── Supabase Postgres
       ├── Supabase Storage
       └── Supabase Realtime
```

## MVP recomendado

No empezar directamente por backend complejo.

Orden:

1. UI navegable con mocks.
2. validar flujo UX.
3. conectar Supabase.
4. añadir Auth/RLS.
5. hacer funcionales estados/presupuesto.
6. probar con un taller real.

## Cuándo plantearse app nativa

Solo cuando datos reales indiquen necesidad de:

- push más robustas
- cámara intensiva
- uso offline profundo
- funcionalidades nativas
- presencia fuerte en App Store/Google Play

Hasta entonces, una PWA es suficiente para validar el producto.
