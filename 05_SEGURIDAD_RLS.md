# Seguridad y RLS

## Objetivo

El aislamiento de datos debe resolverse en Postgres/Supabase mediante Row Level Security, no únicamente ocultando elementos en frontend.

## Roles

### customer
Puede:
- ver sus vehículos
- ver sus citas
- ver sus reparaciones
- ver y responder a sus presupuestos
- ver/escribir mensajes vinculados a sus reparaciones
- subir media a sus citas/reparaciones

No puede:
- leer otros clientes
- modificar estados del taller
- editar importes del presupuesto

### mechanic
Puede:
- leer vehículos/reparaciones pertenecientes a su workshop_id
- actualizar estados
- leer/subir información operativa permitida
- crear presupuestos si se decide permitirlo

### workshop_admin
Puede:
- todo lo anterior dentro de su workshop_id
- gestionar empleados
- gestionar disponibilidad
- gestionar configuración básica del taller

## RLS conceptual

### vehicles
Cliente:
`customer_id = auth.uid()`

Taller:
`workshop_id = current_user_workshop_id()`

### repair_orders
Cliente:
`customer_id = auth.uid()`

Taller:
`workshop_id = current_user_workshop_id()`

### estimates
Acceso indirecto a través de repair_order.

### messages
Acceso únicamente si el usuario pertenece a la reparación.

## Storage

Buckets sugeridos:

- `repair-media`
- `workshop-assets`

Rutas recomendadas:

`repair-media/{workshop_id}/{repair_order_id}/{uuid}`

Aplicar políticas para que el usuario solo acceda a ficheros asociados a reparaciones autorizadas.

## Secretos

Nunca exponer `service_role` al navegador.

Variables públicas únicamente para:
- Supabase URL
- publishable/anon key

Operaciones privilegiadas únicamente en servidor.
