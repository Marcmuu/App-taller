# PROMPT MAESTRO — CLAUDE CODE / CODEX

Quiero que actúes como Product Engineer senior y construyas un prototipo funcional de una aplicación SaaS para talleres mecánicos.

Lee primero todos los archivos Markdown de este repositorio antes de modificar código.

## 1. Objetivo del producto

La aplicación NO es un ERP.

Es una capa de comunicación entre un taller mecánico y sus clientes.

El objetivo principal es que:

1. el cliente pueda solicitar una cita y explicar fácilmente una avería;
2. el cliente sepa en todo momento qué está pasando con su vehículo;
3. el taller pueda actualizar el estado de una reparación en menos de 5 segundos;
4. el taller pueda enviar un presupuesto;
5. el cliente pueda aceptarlo, rechazarlo o consultar dudas;
6. ambos tengan un historial simple de comunicación.

NO desarrolles inventario, contabilidad, facturación fiscal, proveedores, compras, almacén, caja, control horario ni funcionalidades ERP.

## 2. Stack obligatorio

Construye el proyecto con:

- Next.js con App Router
- TypeScript estricto
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Supabase
  - Postgres
  - Auth
  - Storage
  - Realtime
  - Row Level Security
- Zod
- React Hook Form

El proyecto debe poder desplegarse en Vercel.

## 3. Estrategia de construcción

No intentes implementar todo de golpe.

Trabaja por fases y deja el proyecto funcionando al final de cada una.

### Fase A — Scaffold y Design System

1. crea/revisa el proyecto Next.js;
2. configura TypeScript;
3. configura Tailwind;
4. instala/configura shadcn/ui;
5. define componentes visuales básicos;
6. crea layout cliente;
7. crea layout taller.

Antes de continuar, asegúrate de que `npm run build` funciona.

### Fase B — UI completa con mocks

Construye las 15 pantallas usando datos mock.

#### CLIENTE

1. Inicio
2. Mis vehículos
3. Solicitar cita
4. Formulario de avería
5. Subir fotos/vídeos
6. Elegir fecha y hora
7. Seguimiento de reparación
8. Presupuesto
9. Reparación terminada / recogida

#### TALLER

10. Login
11. Dashboard de vehículos
12. Detalle del vehículo
13. Crear/enviar presupuesto
14. Cambio rápido de estado
15. Historial de comunicaciones

No conectes todavía cada pantalla a backend si eso ralentiza la construcción del prototipo visual.

Primero quiero poder recorrer el flujo completo.

### Fase C — Supabase

Después de que la UI esté completa:

1. configura Supabase;
2. crea migraciones SQL;
3. crea enums;
4. crea tablas;
5. crea índices;
6. crea constraints;
7. activa RLS;
8. crea políticas RLS;
9. añade datos seed.

Usa el modelo descrito en `02_MODELO_DATOS.md`.

### Fase D — Autenticación

Implementa:

- login cliente
- login empleado taller
- sesión SSR basada en cookies
- protección de rutas
- roles

Roles iniciales:

- customer
- mechanic
- workshop_admin

### Fase E — Flujos funcionales

Implementa:

#### Cliente

- añadir vehículo
- solicitar cita
- describir avería
- subir media
- seleccionar slot
- ver seguimiento
- recibir presupuesto
- aceptar presupuesto
- rechazar/consultar
- enviar mensaje

#### Taller

- ver vehículos activos
- filtrar por estado
- abrir reparación
- visualizar problema/media
- actualizar estado
- crear presupuesto
- enviar presupuesto
- responder mensajes

## 4. Regla UX fundamental

UNA PANTALLA = UNA DECISIÓN PRINCIPAL.

Evita interfaces densas.

No diseñes una interfaz típica de ERP.

Usa:
- mucho espacio
- tipografía clara
- tarjetas sencillas
- bordes suaves
- botones grandes
- iconografía obvia
- jerarquía visual fuerte

La aplicación debe poder usarla una persona poco acostumbrada al software.

## 5. Diseño cliente

Diseña mobile-first.

Navegación principal máxima:

- Inicio
- Vehículos
- Perfil

No llenes la barra inferior con opciones innecesarias.

La pantalla más importante es Seguimiento de reparación.

Debe sentirse conceptualmente como el tracking de un pedido.

Timeline:

Cita confirmada
→ Vehículo recibido
→ Diagnóstico
→ Presupuesto pendiente de aprobación
→ Reparación iniciada
→ Reparación terminada
→ Listo para recoger

El estado actual debe ser imposible de pasar por alto.

## 6. Diseño taller

Optimiza para escritorio y tablet.

El dashboard debe permitir actuar sin abrir cada reparación.

Cada vehículo debe mostrar:

- matrícula
- modelo
- cliente
- hora/cita
- estado actual
- siguiente acción

Ejemplo:

Seat León — 1234 ABC
Carlos López — 09:30
Vehículo recibido

[ INICIAR DIAGNÓSTICO ]

El trabajador debe poder cambiar el estado con un clic/tap.

## 7. Máquina de estados

Implementa el flujo:

appointment_confirmed
→ vehicle_received
→ diagnosis
→ estimate_pending
→ repair_in_progress
→ repair_completed
→ ready_for_pickup
→ closed

No hagas que el usuario seleccione normalmente un estado desde un dropdown.

Crea una función central, por ejemplo:

`getNextRepairAction(status, context)`

que devuelva:

- label
- nextStatus
- action type
- si requiere confirmación

Ejemplos:

vehicle_received
→ INICIAR DIAGNÓSTICO

diagnosis
→ CREAR PRESUPUESTO

estimate_pending + accepted
→ INICIAR REPARACIÓN

repair_in_progress
→ FINALIZAR REPARACIÓN

repair_completed
→ LISTO PARA RECOGER

## 8. Historial

Todo cambio de estado debe:

1. actualizar `repair_orders.current_status`;
2. insertar registro en `repair_status_history`;
3. guardar usuario que realizó el cambio;
4. guardar fecha/hora;
5. crear notificación cuando proceda.

Haz la operación de forma atómica siempre que sea posible.

## 9. Presupuestos

El presupuesto contiene:

- trabajos
- piezas
- mano de obra
- impuestos
- total

Estados:

- draft
- sent
- accepted
- rejected
- question

Al enviar:

- cambiar reparación a estimate_pending;
- notificar cliente.

Al aceptar:

- guardar timestamp;
- guardar versión aceptada;
- mostrar confirmación.

No iniciar automáticamente la reparación.

El taller debe pulsar INICIAR REPARACIÓN.

## 10. Realtime

El cliente debe ver cambios importantes sin refrescar manualmente.

Suscribirse como mínimo a:

- cambios de repair_orders relevantes
- mensajes de una reparación abierta
- cambios de estimate

Mantén las suscripciones limitadas a los datos autorizados del usuario.

## 11. Seguridad

La app es multi-tenant.

Nunca confíes solamente en filtros frontend.

Implementa RLS.

Reglas:

- customer solo accede a sus propios datos;
- mechanic accede solo a datos de su workshop_id;
- workshop_admin accede solo a su workshop_id;
- service role nunca se expone al navegador.

## 12. Storage

Permitir fotos y vídeos.

Bucket principal:

`repair-media`

Rutas:

`{workshop_id}/{repair_order_id}/{uuid}`

Valida:
- MIME types
- tamaño máximo
- permisos de acceso

No hagas público todo el bucket.

## 13. Datos seed

Genera un taller demo.

Genera como mínimo:

- 1 admin
- 2 mecánicos
- 3 clientes
- 5 vehículos
- varias citas
- varias reparaciones en estados distintos
- 1 presupuesto pendiente
- 1 presupuesto aceptado
- mensajes de ejemplo

El dashboard debe verse realista nada más arrancar el proyecto.

## 14. Calidad de código

Requisitos:

- TypeScript sin `any` salvo casos justificados
- componentes pequeños
- lógica de dominio separada de UI
- validación con Zod
- estados y tipos centralizados
- manejo de loading/error/empty states
- accesibilidad básica
- responsive

No dupliques lógica de estados entre componentes.

## 15. Estados vacíos

Diseña explícitamente:

- cliente sin vehículos
- cliente sin citas
- taller sin vehículos activos
- reparación sin presupuesto
- reparación sin fotos
- sin mensajes

## 16. Responsive

### Cliente

Prioridad:
- móvil 375–430px

También debe funcionar en tablet/escritorio.

### Taller

Prioridad:
- 1280px desktop
- tablet horizontal

Debe seguir siendo usable en móvil, aunque no sea la experiencia principal.

## 17. Resultado visual

Busco un producto SaaS moderno y limpio.

Inspiración conceptual:

- Linear por claridad
- Stripe por jerarquía
- apps de tracking/logística por seguimiento

NO copies literalmente sus interfaces.

Evita:
- gradients excesivos
- glassmorphism
- dashboards con 20 widgets
- gráficas irrelevantes
- sidebar enorme
- estética futurista

## 18. UX de presupuesto

Mostrar claramente:

TRABAJOS
PIEZAS
MANO DE OBRA
SUBTOTAL
IVA
TOTAL

Acciones grandes:

[ ACEPTAR PRESUPUESTO ]

[ RECHAZAR / CONSULTAR ]

Si pulsa RECHAZAR / CONSULTAR mostrar:

- Tengo una duda
- Quiero hablar con el taller
- No quiero realizar la reparación

## 19. Comunicación

No construir Slack/WhatsApp completo.

Crear mensajes simples vinculados a repair_order.

La cronología del vehículo puede combinar visualmente:

- mensajes
- cambios de estado
- presupuestos enviados
- presupuestos aceptados

## 20. PWA

Prepara el proyecto para poder instalarse como PWA.

No inviertas tiempo todavía en funcionalidades nativas complejas.

Objetivo:
que un cliente pueda guardarla en la pantalla de inicio y usarla casi como una app.

## 21. README técnico

Al finalizar crea/actualiza README con:

- requisitos
- instalación
- variables de entorno
- setup Supabase
- migraciones
- seed
- ejecución local
- build
- deploy en Vercel
- cuentas demo

## 22. Orden de trabajo obligatorio

Antes de escribir mucho código:

1. inspecciona el repositorio;
2. lee todos los `.md`;
3. explícame brevemente el plan;
4. implementa Fase A;
5. ejecuta lint/build;
6. corrige errores;
7. implementa Fase B;
8. ejecuta lint/build;
9. continúa con backend.

No borres código existente útil sin justificarlo.

## 23. Criterio de éxito

El prototipo será correcto si puedo demostrar este flujo:

CLIENTE

Solicita cita
→ explica avería
→ añade foto
→ elige horario
→ taller confirma
→ deja coche
→ ve estado en tiempo real
→ recibe presupuesto
→ lo acepta
→ ve reparación iniciada
→ recibe aviso de reparación terminada
→ ve listo para recoger

TALLER

Ve cita
→ marca vehículo recibido
→ inicia diagnóstico
→ crea presupuesto
→ lo envía
→ ve aceptación
→ inicia reparación
→ finaliza reparación
→ marca listo para recoger

Y todo ello sin ninguna funcionalidad de ERP innecesaria.

## 24. Prioridad final

Si tienes que elegir entre añadir funcionalidades y mejorar claridad de la experiencia, prioriza la claridad.

Si algo puede resolverse con un botón en lugar de una pantalla adicional, usa el botón.

Si algo no es necesario para demostrar el flujo principal, no lo construyas todavía.
