# Reglas de negocio MVP

## Estados

Flujo por defecto:

appointment_confirmed
→ vehicle_received
→ diagnosis
→ estimate_pending
→ repair_in_progress
→ ready_for_pickup
→ closed

> Actualizado: `repair_completed` se unificó con `ready_for_pickup` para que terminar sea un solo clic. Desde `diagnosis` el taller puede pasar a `repair_in_progress` sin presupuesto (con confirmación) para trabajos ya acordados. Con un presupuesto rechazado puede enviar otra versión o devolver el coche sin reparar (`ready_for_pickup`).

## Automatizaciones de estado

### Confirmar cita
Crear/actualizar appointment.status = confirmed.

### Recibir vehículo
Crear repair_order si todavía no existe.
Cambiar a vehicle_received.
Registrar historial.
Generar notificación.

### Iniciar diagnóstico
Cambiar a diagnosis.
Registrar historial.
Generar notificación opcional.

### Enviar presupuesto
estimate.status = sent.
repair_order.current_status = estimate_pending.
Registrar historial.
Crear notificación para cliente.

### Cliente acepta
estimate.status = accepted.
Guardar accepted_at.
Crear evento/historial.
No iniciar automáticamente la reparación: el taller debe pulsar INICIAR REPARACIÓN.

### Cliente rechaza
estimate.status = rejected.
Mantener trazabilidad.
Crear mensaje/evento.

### Iniciar reparación
repair_order.current_status = repair_in_progress.
Notificar al cliente.

### Finalizar reparación
repair_order.current_status = repair_completed.
Notificar al cliente.

### Listo para recoger
repair_order.current_status = ready_for_pickup.
Notificación destacada.

## Presupuesto

Una aceptación debe estar ligada a una versión concreta.

Si un presupuesto aceptado se modifica de forma material:
- crear nueva versión
- requerir nueva aceptación

## Comunicaciones

No construir un sistema de chat sofisticado en la primera versión.
Mensajes sencillos ligados a una reparación.

## Auditoría mínima

Guardar siempre:
- quién cambió un estado
- estado anterior
- estado nuevo
- fecha/hora
