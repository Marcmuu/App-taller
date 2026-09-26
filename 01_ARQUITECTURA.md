# Arquitectura propuesta

## Decisión principal

Para el MVP, usar una **única aplicación Next.js** con dos áreas diferenciadas:

- `/app/...` → área cliente
- `/taller/...` → área taller

No crear dos proyectos separados todavía.

## Frontend

### Next.js + TypeScript

Usar App Router.

Responsabilidades:
- renderizado de pantallas
- navegación
- formularios
- acciones de servidor cuando proceda
- control de sesión
- lectura/escritura en Supabase

### Diseño

- Mobile-first para cliente.
- Desktop/tablet-first para taller.
- Tailwind CSS.
- shadcn/ui para componentes base.
- Iconos: Lucide.

## Backend

### Supabase

Supabase funcionará como backend principal:

- Postgres → base de datos
- Auth → usuarios cliente y empleados
- Storage → fotografías y vídeos
- Realtime → cambios de estado y comunicaciones
- RLS → aislamiento por taller/usuario

## Multi-tenant

La aplicación debe diseñarse desde el inicio como multi-tenant.

Entidad raíz:

`workshops`

Toda información sensible de negocio debe pertenecer a un taller mediante `workshop_id`.

Ejemplo:

- workshop A nunca puede leer vehículos de workshop B.
- un cliente solo puede acceder a sus propios vehículos/reparaciones.
- un trabajador solo puede acceder a su taller.

## Realtime

Utilizar tiempo real inicialmente para:

- actualización del estado de reparación
- nuevos mensajes
- cambio del estado del presupuesto

Para el MVP puede comenzar con Postgres Changes por simplicidad.
Si el producto escala, migrar eventos críticos a Broadcast con triggers.

## Notificaciones

Fase MVP:
- notificaciones dentro de la app
- email opcional

Fase posterior:
- push notifications PWA
- WhatsApp/SMS mediante proveedor externo

## Despliegue

- Frontend/server: Vercel
- Base de datos/Auth/Storage: Supabase
- Variables de entorno gestionadas en Vercel

## Lo que NO construir

No implementar todavía:
- ERP
- almacén
- control de stock
- proveedores
- compras
- contabilidad
- facturación fiscal
- caja
- control horario
- planificación avanzada de recursos
- CRM complejo
