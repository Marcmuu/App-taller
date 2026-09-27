# UX/UI y flujo de pantallas

## Principios

- interfaz moderna y profesional
- extremadamente simple
- botones grandes
- una acción principal por pantalla
- estados visuales claros
- poco texto
- evitar tablas densas en móvil
- no esconder acciones importantes en menús
- cambios de estado en menos de 5 segundos

---

# CLIENTE

## 1. Inicio

Mostrar prioritariamente:
- vehículo actualmente en taller
- estado actual
- siguiente acción relevante
- próxima cita
- botón Solicitar cita

CTA principal contextual:
- Ver seguimiento
- Ver presupuesto
- Solicitar cita

## 2. Mis vehículos

Tarjetas:
- matrícula
- marca/modelo
- año opcional

Acción:
- Añadir vehículo

## 3. Solicitar cita

Paso 1:
- elegir vehículo

Paso 2:
- seleccionar motivo general
  - avería
  - mantenimiento
  - testigo
  - ruido
  - otro

## 4. Formulario de avería

Formulario guiado:
- qué has notado
- breve descripción
- desde cuándo
- se puede conducir: sí/no/no sé

No convertirlo en diagnóstico técnico.

## 5. Fotos y vídeos

- añadir foto
- añadir vídeo
- saltar paso

Mostrar miniaturas y progreso.

## 6. Fecha y hora

Mostrar próximos días disponibles y slots de hora grandes.

Preferible sobre un calendario mensual complejo.

## 7. Seguimiento de reparación

Pantalla central del producto.

Timeline:

Cita confirmada
→ Vehículo recibido
→ Diagnóstico
→ Presupuesto pendiente
→ Reparación iniciada
→ Listo para recoger

Mostrar:
- estado actual muy destacado
- timeline completo
- última actualización
- CTA contextual

Ejemplo CTA:
- Ver presupuesto
- Contactar con taller

## 8. Presupuesto

Mostrar:
- trabajos
- piezas
- mano de obra
- subtotal
- impuestos
- total

Acciones principales:
- ACEPTAR PRESUPUESTO
- RECHAZAR / CONSULTAR

Al aceptar:
- confirmación explícita
- registrar timestamp
- registrar versión aceptada

## 9. Reparación terminada / recogida

Mostrar:
- coche listo
- horario
- dirección
- trabajos realizados
- contacto

---

# TALLER

## 10. Login

Solo:
- email
- contraseña
- entrar
- recuperar contraseña

## 11. Dashboard de vehículos

Pantalla principal del trabajador.

Filtros rápidos:
- Todos
- Recibidos
- Diagnóstico
- Presupuesto
- Reparación
- Listos

Cada tarjeta muestra:
- matrícula
- modelo
- cliente
- hora/cita
- estado
- siguiente acción

Ejemplo:

Seat León · 1234 ABC
Carlos López
09:30
Estado: Vehículo recibido

[ INICIAR DIAGNÓSTICO ]

## 12. Detalle del vehículo

Mostrar:
- vehículo
- cliente
- problema
- multimedia
- estado
- historial
- presupuesto
- comunicación
- acciones rápidas

## 13. Crear/enviar presupuesto

Formulario sencillo:
- trabajos
- piezas
- mano de obra
- impuestos

Acciones:
- guardar borrador
- vista previa
- enviar al cliente

Enviar presupuesto cambia automáticamente el estado a `estimate_pending`.

## 14. Cambio rápido de estado

No mostrar un selector genérico de 8 estados como acción principal.

El sistema debe conocer la siguiente acción lógica.

Ejemplo:

vehicle_received
→ botón INICIAR DIAGNÓSTICO

diagnosis
→ botón CREAR PRESUPUESTO

estimate accepted
→ botón INICIAR REPARACIÓN

repair_in_progress
→ botón TERMINADO · LISTO PARA RECOGER (un clic; el cliente recibe el aviso)

repair_completed
→ botón LISTO PARA RECOGER

Debe existir una opción secundaria para correcciones manuales.

## 15. Historial de comunicaciones

Timeline unificada:
- mensajes
- cambios de estado
- envío/aceptación/rechazo de presupuesto
- notificaciones relevantes
