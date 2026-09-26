# Guía de uso — App del taller

> **Demo online:** https://marcmuu.github.io/App-taller/
> **Guía visual con vídeo:** https://marcmuu.github.io/App-taller/guia/
> **Cliente y taller a la vez (ordenador):** https://marcmuu.github.io/App-taller/demo/

---

## 1. Qué es

Una app que conecta un taller mecánico con sus clientes:

- **El cliente**, desde el móvil, pide cita, explica la avería con fotos, sigue la reparación paso a paso (como el seguimiento de un pedido) y acepta o rechaza el presupuesto con un botón.
- **El taller**, desde el ordenador o la tablet, ve todos los coches, avanza cada reparación con un solo clic, envía presupuestos y habla con el cliente.

**No es un ERP**: no hay facturación, stock, proveedores ni contabilidad. Solo la comunicación entre taller y cliente.

### El flujo completo

```
Cliente pide cita → Taller confirma → Cliente deja el coche → Diagnóstico
→ Taller envía presupuesto → Cliente acepta → Reparación → Listo para recoger → Entregado
```

---

## 2. Cómo probar la demo

La demo trae **datos de prueba** (un taller, empleados, clientes, coches en distintos estados…). Lo que hagas se guarda **solo en tu navegador**: nadie más lo ve y puedes romper lo que quieras.

**Cuentas de prueba** (contraseña de todas: `demo1234`, o simplemente pulsa el nombre en la pantalla de entrada):

| Quién | Rol | Situación inicial |
| --- | --- | --- |
| Laura Martínez | Taller · administradora | — |
| Javier Ruiz / Pablo Sánchez | Taller · mecánicos | — |
| Carlos López | Cliente | Seat León con presupuesto pendiente + Toyota Yaris libre |
| Ana García | Cliente | Renault Clio en reparación + cita solicitada |
| Marta Fernández | Cliente | Peugeot 308 listo para recoger |

**La forma más fácil de verlo todo:**

1. En un ordenador, abre **«Cliente y taller a la vez»** (`/demo`): a la izquierda el móvil del cliente, a la derecha el panel del taller.
2. Entra como **Carlos** (izquierda) y como **Laura** (derecha).
3. Sigue el recorrido de la sección 5.

En el móvil: abre dos pestañas, una como cliente y otra como taller.

**Reiniciar:** botón **«Reiniciar»** en la vista doble, o botón **«Demo» → «Reiniciar datos de prueba»** dentro de la app. El botón «Demo» también sirve para cambiar de usuario al momento.

---

## 3. App del cliente (móvil)

Abajo siempre hay tres pestañas: **Inicio · Vehículos · Perfil**. Arriba, la **campana** con los avisos.

### 3.1 Inicio
Lo más importante, de un vistazo:
- Una **tarjeta por cada coche que está en el taller**, con el estado actual en grande, «Paso X de 7» y una barra de progreso.
- **Un único botón** con lo que toca hacer:
  - **Naranja «Ver presupuesto»**: el taller espera tu decisión.
  - **Verde «Ver recogida»**: el coche está listo.
  - **«Ver seguimiento»**: no tienes que hacer nada, solo mirar.
- Si hay mensajes nuevos del taller, aparece «1 mensaje nuevo».
- **Solicitudes enviadas**: citas pedidas que el taller aún no ha confirmado.
- Botón **«Solicitar cita»**.
- **Historial** de reparaciones terminadas.

Si el cliente aún no tiene coches, se le invita a añadir uno; si no tiene citas, se le indica cómo pedirla.

### 3.2 Mis vehículos
- Lista de coches (marca, modelo, matrícula y año).
- **«Añadir»**: matrícula, marca, modelo y año (opcional). La matrícula se pone en formato «1234 ABC» automáticamente.
- En cada coche: si está en el taller, su estado; si no, el botón **«Pedir cita para este coche»**.

### 3.3 Solicitar cita (6 pasos, una pregunta por pantalla)
1. **¿Qué coche traes?** Toca el coche (o añade uno nuevo desde aquí).
2. **¿Qué necesitas?** Avería · Mantenimiento · Testigo encendido · Ruido extraño · Otro.
3. **Cuéntanos qué pasa**: qué has notado (con tus palabras), desde cuándo (hoy / hace unos días / semanas / meses) y si **se puede conducir** (sí / no / no sé).
4. **Fotos y vídeos** (opcional): «Añadir foto» o «Añadir vídeo». Se ven en miniatura y se pueden quitar. Se puede **saltar este paso**.
5. **Día y hora**: próximos días con hueco y horas libres en botones grandes. Solo aparecen huecos reales del horario del taller que no estén ocupados.
6. **Revisa y envía**: resumen con «Cambiar» en cada dato → **«Enviar solicitud»**.

Queda como **«Pendiente de confirmar»** hasta que el taller la acepte. Si el taller no puede, el cliente recibe un aviso con el motivo.

### 3.4 Seguimiento de la reparación (la pantalla principal)
- Arriba, **el estado actual en grande** con una frase sencilla («Estamos revisando el coche para saber qué le pasa») y la hora de la última actualización.
- **Línea de tiempo** con los 7 pasos: ✔ los hechos (con día y hora), el actual resaltado y los que faltan en gris:
  1. Cita confirmada
  2. Vehículo recibido
  3. Diagnóstico
  4. Presupuesto pendiente de aprobación
  5. Reparación iniciada
  6. Reparación terminada
  7. Listo para recoger
- Botones: el principal según el momento (ver presupuesto / ver recogida) y **«Contactar con el taller»**.
- «Lo que nos contaste»: la descripción y las fotos de la cita.
- **Se actualiza solo**, sin recargar, cada vez que el taller avanza.

### 3.5 Presupuesto
- Desglose: **Trabajos · Piezas · Mano de obra · Subtotal · IVA · Total**.
- **«ACEPTAR PRESUPUESTO»** → pide confirmación («¿Aceptas el presupuesto de 159,12 €?»). Queda guardado cuándo se aceptó y qué versión.
- **«RECHAZAR / CONSULTAR»** abre tres opciones:
  - **Tengo una duda**: escribes la pregunta y le llega al taller como mensaje.
  - **Quiero hablar con el taller**: el taller recibe el aviso para llamarte.
  - **No quiero realizar la reparación**: rechaza el presupuesto (puedes indicar el motivo).
- Aceptar **no** inicia la reparación automáticamente: la inicia el taller.
- Si el taller envía una **nueva versión**, la anterior avisa de que hay una más reciente y solo se puede responder a la última.

### 3.6 Mensajes
- Conversación sencilla con el taller, ligada a esa reparación.
- En la misma línea de tiempo aparecen los cambios de estado y los presupuestos (enviado, aceptado…).
- Botón de **llamar** al taller arriba a la derecha.

### 3.7 Listo para recoger
- «Tu coche está listo» y desde cuándo.
- **Horario** del taller (hoy o el próximo día que abra).
- **Dirección** con enlace «Cómo llegar» (Google Maps).
- **Trabajos realizados** y **total a pagar**.
- Botones **Llamar** y **Mensaje**.

### 3.8 Avisos y perfil
- **Campana**: avisos de cita confirmada, coche recibido, diagnóstico, presupuesto recibido, reparación iniciada/terminada, listo para recoger y mensajes del taller. Los nuevos llevan un punto azul y además aparece un **aviso emergente** al llegar.
- **Perfil**: nombre, email y teléfono; datos del taller (teléfono, email, dirección); **cerrar sesión**.

---

## 4. Panel del taller (ordenador / tablet)

Barra superior: **Vehículos · Comunicaciones** (con contador de mensajes sin leer), **campana de avisos** y **menú de usuario** (cerrar sesión).

### 4.1 Panel de vehículos
**Solicitudes de cita** (arriba, cuando las hay): coche, cliente, día y hora pedidos, motivo, descripción, si se puede conducir y fotos (se amplían al tocarlas).
- **«CONFIRMAR CITA»**: avisa al cliente y crea el seguimiento en «Cita confirmada».
- **«No puedo»**: rechaza la solicitud con un mensaje para el cliente (p. ej. «¿Te viene bien por la tarde?»).

**Filtros rápidos** con contador: Todos · Citas · Recibidos · Diagnóstico · Presupuesto · Reparación · Listos.

**Tarjetas de vehículo**: coche y matrícula, cliente, hora de la cita, estado y, lo más importante, **el botón de la siguiente acción**. Se puede trabajar desde aquí sin abrir cada coche.
- Borde **ámbar** = necesita atención (el cliente aceptó, rechazó o preguntó por el presupuesto).
- «1 sin leer» = mensajes del cliente pendientes.

### 4.2 La siguiente acción (un clic por paso)
El sistema sabe qué toca después. No hay que elegir estados en una lista.

| Estado actual | Botón | Qué pasa |
| --- | --- | --- |
| Cita confirmada | **MARCAR RECIBIDO** | El cliente ve «Vehículo recibido» |
| Vehículo recibido | **INICIAR DIAGNÓSTICO** | El cliente ve «Diagnóstico» |
| Diagnóstico | **CREAR PRESUPUESTO** | Abre el editor de presupuesto |
| Presupuesto enviado | *Esperando al cliente* | No hay nada que hacer |
| Cliente aceptó | **INICIAR REPARACIÓN** | El cliente ve «Reparación iniciada» |
| Cliente rechazó o preguntó | **REVISAR PRESUPUESTO** | Crea una nueva versión |
| Reparación iniciada | **FINALIZAR REPARACIÓN** | El cliente ve «Reparación terminada» |
| Reparación terminada | **LISTO PARA RECOGER** | Aviso destacado al cliente |
| Listo para recoger | **ENTREGAR Y CERRAR** | Pide confirmación y pasa al historial |

Tras cada clic aparece un aviso con **«Deshacer»** por si fue un error.

### 4.3 Ficha del vehículo
Todo en una pantalla:
- Coche, matrícula, año, cita y **estado**.
- **Botón de siguiente acción** y **«Corregir estado»** (para errores: eliges cualquier estado y el motivo; queda registrado como corrección manual).
- **Problema indicado por el cliente**: motivo, descripción, si se puede conducir y fotos/vídeos.
- **Presupuesto**: estado, versión, número de líneas y total, con acceso a verlo o continuar el borrador.
- **Historial**: cada cambio de estado con quién lo hizo y cuándo.
- **Cliente**: teléfono y email (se pueden pulsar para llamar o escribir).
- **Comunicación**: la conversación con el cliente, para responder desde aquí.

### 4.4 Crear y enviar presupuesto
- Tres bloques: **Trabajos**, **Piezas** y **Mano de obra**. Cada línea: descripción, cantidad (u horas) y precio; el total de la línea se calcula solo.
- **Atajos** para añadir líneas habituales de un toque (Diagnosis electrónica, Revisión general, Aceite, Filtro, Mano de obra…).
- A la derecha: **subtotal, IVA (21 % por defecto, editable) y total** en tiempo real.
- **Guardar**: borrador que el cliente no ve.
- **Vista previa**: cómo lo verá el cliente en su móvil.
- **Enviar al cliente**: pide confirmación, avisa al cliente y la reparación pasa a «Presupuesto pendiente».

### 4.5 Respuesta del cliente y versiones
- Al momento se ve si el cliente **acepta**, **rechaza** o **consulta** (aviso, tarjeta en ámbar y mensaje en la conversación).
- Un presupuesto enviado no se edita: **«Crear nueva versión»** copia las líneas para modificarlas. El cliente tendrá que aceptar la nueva versión. Cada aceptación queda ligada a su versión.

### 4.6 Comunicaciones
- Lista de todas las conversaciones, la más reciente arriba, con **buscador** (cliente o matrícula), último mensaje, contador de no leídos y estado del coche.
- Al abrir una: línea de tiempo con mensajes, cambios de estado y presupuestos, y caja para responder. Enlace **«Ficha»** al vehículo.

### 4.7 Avisos
La campana reúne: nuevas solicitudes de cita, presupuestos aceptados, rechazados o con consulta, «el cliente quiere hablar» y mensajes nuevos. Cada aviso lleva al coche correspondiente.

---

## 5. Recorrido completo recomendado (5 minutos)

| # | Quién | Qué hacer |
| --- | --- | --- |
| 1 | Cliente (Carlos) | Inicio → **Solicitar cita** → Toyota Yaris → Testigo encendido → describe → foto → hora → **Enviar solicitud** |
| 2 | Taller (Laura) | La solicitud aparece arriba sola → **CONFIRMAR CITA** |
| 3 | Cliente | Inicio: el Yaris aparece en «Cita confirmada» |
| 4 | Taller | En la tarjeta del Yaris: **MARCAR RECIBIDO** → **INICIAR DIAGNÓSTICO** |
| 5 | Taller | **CREAR PRESUPUESTO** → atajos + una pieza → **Vista previa** → **Enviar al cliente** |
| 6 | Cliente | Botón naranja **Ver presupuesto** → **ACEPTAR** → «Sí, acepto» |
| 7 | Taller | **INICIAR REPARACIÓN** → **FINALIZAR REPARACIÓN** → **LISTO PARA RECOGER** |
| 8 | Cliente | Aviso «¡Listo para recoger!» → **Ver recogida** → escribe un mensaje |
| 9 | Taller | **Comunicaciones** → ve el mensaje y responde → **ENTREGAR Y CERRAR** |

Prueba también: rechazar o consultar un presupuesto (con Carlos y el Seat León), «Corregir estado», «Deshacer», crear una nueva versión de presupuesto o entrar como Marta para ver la recogida.

---

## 6. Preguntas frecuentes

**¿Se guarda lo que hago?** Solo en tu navegador (es una demo). Otro dispositivo u otro navegador empieza desde cero.

**¿Por qué los cambios aparecen solos?** Cliente y taller están conectados en tiempo real: lo que hace uno aparece en el otro sin recargar, con aviso emergente.

**¿Se puede instalar?** Sí: en el móvil, menú del navegador → «Añadir a pantalla de inicio».

**¿Límites de la demo?** Los vídeos subidos pueden ocupar hasta 2 MB. En la versión real con servidor, las fotos y los vídeos irán a un almacenamiento en la nube y los datos a una base de datos compartida.
